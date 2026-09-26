/** Small, concise structured-ish console logger. No dependency pulled in for this. */

function ts(): string {
  return new Date().toISOString();
}

function fmt(level: string, msg: string, meta?: Record<string, unknown>): string {
  const metaStr = meta ? " " + JSON.stringify(meta) : "";
  return `[${ts()}] [${level}] ${msg}${metaStr}`;
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>): void {
    console.log(fmt("info", msg, meta));
  },
  warn(msg: string, meta?: Record<string, unknown>): void {
    console.warn(fmt("warn", msg, meta));
  },
  error(msg: string, meta?: Record<string, unknown>): void {
    console.error(fmt("error", msg, meta));
  },
};
