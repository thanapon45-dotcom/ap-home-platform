/**
 * TASK-107: Structured JSON logger
 * Output format: { level, ts, msg, ...meta }
 */

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  const entry = {
    level,
    ts: new Date().toISOString(),
    msg,
    ...(meta ?? {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  info:  (msg: string, meta?: Record<string, unknown>) => log("info",  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => log("warn",  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
};
