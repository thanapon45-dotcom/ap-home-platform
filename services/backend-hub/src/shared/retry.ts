/**
 * TASK-107: withRetry utility
 * Exponential backoff with jitter
 */

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, onRetry } = opts;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;
      onRetry?.(attempt, err);
      // Exponential backoff: 1s, 2s, 4s... + small jitter
      const wait = delayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
      await sleep(wait);
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
