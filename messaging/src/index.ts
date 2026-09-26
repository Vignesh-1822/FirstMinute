import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { UnsupportedError } from "spectrum-ts";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { connectBridge, type Bridge } from "./photon.js";
import { forwardInbound } from "./backend.js";
import { groupRequestSchema, sendRequestSchema } from "./types.js";

const config = loadConfig();
let bridge: Bridge | undefined;

const app = new Hono();

app.get("/health", (c) => {
  return c.json({
    ok: true,
    connected: bridge?.isConnected() ?? false,
    channel: config.channel,
  });
});

app.post("/send", async (c) => {
  if (!bridge || !bridge.isConnected()) {
    return c.json(
      {
        ok: false,
        error: "Photon bridge is not connected — messaging is running in simulated mode.",
      },
      503,
    );
  }

  const parsed = sendRequestSchema.safeParse(await c.req.json().catch(() => undefined));
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.message }, 400);
  }
  const { to, chat_id, text } = parsed.data;

  try {
    const space = chat_id ? await bridge.resolveChat(chat_id) : await bridge.resolveDm(to as string);
    const sent = await space.send(text);
    return c.json({ ok: true, message_id: sent?.id ?? null, chat_id: space.id });
  } catch (err) {
    logger.error("POST /send failed", { error: err instanceof Error ? err.message : String(err) });
    return c.json({ ok: false, error: err instanceof Error ? err.message : "send failed" }, 502);
  }
});

app.post("/group", async (c) => {
  if (!bridge || !bridge.isConnected()) {
    return c.json(
      {
        ok: false,
        error: "Photon bridge is not connected — messaging is running in simulated mode.",
      },
      503,
    );
  }

  const parsed = groupRequestSchema.safeParse(await c.req.json().catch(() => undefined));
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.message }, 400);
  }
  const { name, participants, text } = parsed.data;

  if (bridge.supportsGroups) {
    try {
      const group = await bridge.createGroup(participants, name);
      await group.send(text);
      return c.json({ chat_id: group.id });
    } catch (err) {
      if (!(err instanceof UnsupportedError)) {
        logger.error("POST /group failed", { error: err instanceof Error ? err.message : String(err) });
        return c.json({ ok: false, error: err instanceof Error ? err.message : "group creation failed" }, 502);
      }
      logger.warn("group creation unsupported on this channel — falling back to individual sends", {
        channel: bridge.channel,
      });
      // fall through to the individual-send fallback below
    }
  }

  const results = await Promise.allSettled(
    participants.map(async (participant) => {
      const space = await (bridge as Bridge).resolveDm(participant);
      await space.send(text);
    }),
  );
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    logger.warn("some individual fallback sends failed", {
      failed: failures.length,
      total: participants.length,
    });
  }

  return c.json({ chat_id: null, fallback: "individual" });
});

async function main(): Promise<void> {
  bridge = await connectBridge(config);

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    logger.info("messaging bridge listening", {
      port: info.port,
      channel: config.channel,
      connected: bridge?.isConnected() ?? false,
      backendUrl: config.backendUrl,
    });
  });
}

process.on("SIGINT", () => {
  logger.info("shutting down…");
  void bridge?.stop().finally(() => process.exit(0));
  setTimeout(() => process.exit(0), 500);
});

main().catch((err) => {
  logger.error("fatal startup error", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});

// Re-export for potential programmatic/test use.
export { app, forwardInbound };
