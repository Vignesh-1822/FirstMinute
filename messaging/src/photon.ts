/**
 * Photon Spectrum client wiring.
 *
 * Every method/type name below was cross-checked against the installed
 * package's own .d.ts files (not just the docs) — see README.md "SDK
 * research notes" for the exact file paths and line references:
 *   - Spectrum(), SpectrumInstance.messages / .send / .stop
 *       node_modules/@spectrum-ts/core/dist/app-*.d.ts
 *   - imessage.config(), imessage(app) narrowing, space.create/get, rename
 *       node_modules/@spectrum-ts/imessage/dist/index.d.ts
 *   - whatsappBusiness.config()
 *       node_modules/@spectrum-ts/whatsapp-business/dist/index.d.ts
 */
import { Spectrum, UnsupportedError } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { whatsappBusiness } from "spectrum-ts/providers/whatsapp-business";
import type {
  Message,
  PlatformProviderConfig,
  Space,
  SpectrumInstance,
} from "spectrum-ts";
import type { Config } from "./config.js";
import { logger } from "./logger.js";
import { forwardInbound } from "./backend.js";
import type { InboundMessage } from "./types.js";

/** Plain-text body of an inbound message; "" for non-text content (attachments, reactions, membership events, ...). */
function messageText(message: Message): string {
  const content = message.content as { type?: string; text?: string; markdown?: string };
  if (content.type === "text" && typeof content.text === "string") return content.text;
  if (content.type === "markdown" && typeof content.markdown === "string") return content.markdown;
  return "";
}

export interface Bridge {
  readonly channel: Config["channel"];
  /** Live connection state — flips to false if the inbound stream ends or crashes. */
  isConnected(): boolean;
  /** Resolve (or create) the 1:1 space for a single handle (phone/email/etc). */
  resolveDm(participant: string): Promise<Space>;
  /** Resolve an existing chat by its platform id. */
  resolveChat(chatId: string): Promise<Space>;
  /**
   * Create a group chat with the given participants and set its display
   * name. Only implemented for channels whose Spectrum provider supports
   * multi-participant `space.create` + `rename` (iMessage). Other channels
   * should never call this — callers check `supportsGroups` first and use
   * the individual-send fallback instead.
   */
  createGroup(participants: string[], name: string): Promise<Space>;
  readonly supportsGroups: boolean;
  stop(): Promise<void>;
}

/**
 * Attempt to bring up the configured Spectrum channel. Returns `undefined`
 * (never throws) when credentials are missing or the connection attempt
 * fails — callers treat that as "bridge absent" per docs/SPEC.md.
 */
export async function connectBridge(config: Config): Promise<Bridge | undefined> {
  if (!config.hasCredentials) {
    logger.warn("no Photon credentials configured — starting in disconnected mode", {
      channel: config.channel,
    });
    return undefined;
  }

  const state = { connected: true };

  try {
    if (config.channel === "whatsapp") {
      if (!config.whatsapp) throw new Error("whatsapp channel selected but not configured");
      const app = await Spectrum({
        projectId: config.projectId as string,
        projectSecret: config.projectSecret as string,
        providers: [whatsappBusiness.config(config.whatsapp)],
      });
      const platform = whatsappBusiness(app);
      const bridge: Bridge = {
        channel: "whatsapp",
        isConnected: () => state.connected,
        supportsGroups: false,
        async resolveDm(participant: string): Promise<Space> {
          return platform.space.create(participant);
        },
        async resolveChat(chatId: string): Promise<Space> {
          return platform.space.get(chatId);
        },
        async createGroup(): Promise<Space> {
          throw new UnsupportedError({ kind: "action", action: "space.create(group)", platform: "whatsapp_business" });
        },
        async stop(): Promise<void> {
          state.connected = false;
          await app.stop();
        },
      };
      startInboundLoop(app, config, state);
      logger.info("Photon bridge connected", { channel: "whatsapp" });
      return bridge;
    }

    // Default / "imessage"
    const clients = config.imessageClient ? { clients: config.imessageClient } : {};
    const app = await Spectrum({
      projectId: config.projectId as string,
      projectSecret: config.projectSecret as string,
      providers: [imessage.config(clients)],
    });
    const platform = imessage(app);
    const bridge: Bridge = {
      channel: "imessage",
      isConnected: () => state.connected,
      supportsGroups: true,
      async resolveDm(participant: string): Promise<Space> {
        return platform.space.create(participant);
      },
      async resolveChat(chatId: string): Promise<Space> {
        return platform.space.get(chatId);
      },
      async createGroup(participants: string[], name: string): Promise<Space> {
        const group = await platform.space.create(participants);
        await group.rename(name);
        return group;
      },
      async stop(): Promise<void> {
        state.connected = false;
        await app.stop();
      },
    };
    startInboundLoop(app, config, state);
    logger.info("Photon bridge connected", { channel: "imessage" });
    return bridge;
  } catch (err) {
    logger.error("failed to connect Photon bridge — starting in disconnected mode", {
      channel: config.channel,
      error: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}

/** Consume every inbound Spectrum message and forward it to the backend. Never awaited by the caller — runs for the lifetime of the process. */
function startInboundLoop(
  app: SpectrumInstance<PlatformProviderConfig[]>,
  config: Config,
  state: { connected: boolean },
): void {
  void (async () => {
    logger.info("listening for inbound Photon messages…");
    try {
      for await (const [space, message] of app.messages) {
        try {
          if (message.direction === "outbound") continue;
          if (message.sender?.kind === "agent") continue;

          const text = messageText(message);
          if (!text.trim()) continue; // skip attachments/reactions/membership events for now

          const inbound: InboundMessage = {
            sender: message.sender?.id ?? "unknown",
            text,
            chat_id: space.id,
          };
          await forwardInbound(config.backendUrl, inbound, config.inboundRetries, config.inboundRetryBaseMs);
        } catch (err) {
          logger.error("error handling inbound Photon message", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      logger.warn("Photon inbound message stream ended");
    } catch (err) {
      logger.error("Photon inbound message loop crashed", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      state.connected = false;
    }
  })();
}
