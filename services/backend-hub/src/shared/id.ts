/**
 * TASK-107: ID generation utilities
 */

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomStr(length: number): string {
  return Array.from({ length }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
}

export function generateRunId(): string {
  return `run_${randomStr(8)}`;
}

export function generateInspectionId(): string {
  return `insp_${randomStr(10)}`;
}

export function generateQueueId(): string {
  return `q_${randomStr(8)}`;
}
