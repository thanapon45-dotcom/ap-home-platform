/**
 * TASK-107: Time utilities
 */

/** Current time as ISO8601 UTC */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Current time as Thai locale string (Asia/Bangkok, UTC+7) */
export function nowTh(): string {
  return new Date().toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Minutes elapsed since a given ISO8601 date string */
export function minutesSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000);
}

/** Format minutes as human-readable "Xh Ym" or "Xm" */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
