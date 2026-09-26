import type { Case } from "@/types";

/**
 * Decide whether an incoming Case snapshot (SSE or mutation response) should
 * replace the cached one. Timeline and messages are append-only, so a snapshot
 * with fewer events is stale. Ties go to the incoming snapshot.
 */
export function isAtLeastAsFresh(incoming: Case, current: Case | undefined): boolean {
  if (!current || current.id !== incoming.id) return true;
  if (incoming.timeline.length !== current.timeline.length) {
    return incoming.timeline.length > current.timeline.length;
  }
  if (incoming.messages.length !== current.messages.length) {
    return incoming.messages.length > current.messages.length;
  }
  const incomingAt = incoming.assessment?.computed_at ?? "";
  const currentAt = current.assessment?.computed_at ?? "";
  return incomingAt >= currentAt;
}
