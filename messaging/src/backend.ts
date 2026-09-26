import { logger } from "./logger.js";
import type { InboundMessage } from "./types.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST an inbound Photon message to the FastAPI backend's
 * `/api/photon/inbound`, retrying a few times with exponential backoff.
 * Never throws — logs and gives up after `retries` attempts so one bad
 * delivery can't take down the inbound listener loop.
 */
export async function forwardInbound(
  backendUrl: string,
  message: InboundMessage,
  retries: number,
  baseDelayMs: number,
): Promise<boolean> {
  const url = `${backendUrl.replace(/\/+$/, "")}/api/photon/inbound`;
  let attempt = 0;

  while (attempt <= retries) {
    attempt += 1;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(message),
      });
      if (res.ok) {
        logger.info("forwarded inbound message to backend", {
          attempt,
          chat_id: message.chat_id,
          sender: message.sender,
        });
        return true;
      }
      logger.warn("backend rejected inbound message", {
        attempt,
        status: res.status,
        statusText: res.statusText,
      });
    } catch (err) {
      logger.warn("failed to reach backend with inbound message", {
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (attempt <= retries) {
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }

  logger.error("giving up forwarding inbound message after retries", {
    attempts: attempt,
    chat_id: message.chat_id,
    sender: message.sender,
  });
  return false;
}
