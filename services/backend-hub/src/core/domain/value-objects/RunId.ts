/**
 * TASK-101: RunId Value Object
 * Type-safe branded string — prevents accidental mixing of plain strings with RunIds
 */

// Branded type — invisible at runtime, enforced at compile time
export type RunId = string & { readonly _brand: "RunId" };

/**
 * Generate a new unique RunId
 * Format: run_<8 random chars>
 * Uses Math.random — nanoid can be swapped in after npm install
 */
export function createRunId(): RunId {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const rand = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `run_${rand}` as RunId;
}

/** Cast a known string to RunId (use only when reading from DB/storage) */
export function toRunId(value: string): RunId {
  return value as RunId;
}
