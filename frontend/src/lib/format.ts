/** Formatting helpers. All numeric output is rendered in mono / tabular figures by callers. */

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "–";
  if (ms < 10) return `${ms.toFixed(1)} ms`;
  return `${Math.round(ms)} ms`;
}

/** Timeline stamp: t+0.184s, t+12.4s, t+2m05s */
export function formatOffset(tMs: number): string {
  const seconds = Math.max(0, tMs) / 1000;
  if (seconds < 10) return `t+${seconds.toFixed(3)}s`;
  if (seconds < 60) return `t+${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `t+${minutes}m${String(rest).padStart(2, "0")}s`;
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

export function formatUsd(value: number): string {
  if (value === 0) return "$0.0000";
  if (value < 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function secondsSince(iso: string, now: number): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round((now - then) / 1000));
}

export function formatAgo(iso: string, now: number): string {
  const seconds = secondsSince(iso, now);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatLkw(minutes: number | null): string {
  if (minutes === null) return "unknown";
  if (minutes < 90) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
}

export function toNumberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
