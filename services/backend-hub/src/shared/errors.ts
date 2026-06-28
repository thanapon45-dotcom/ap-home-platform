/**
 * TASK-107: Custom error types
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, detail?: unknown) {
    super("VALIDATION_ERROR", message, detail);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "ConflictError";
  }
}

/** Format any error for API response */
export function toErrorResponse(err: unknown): { code: string; message: string; detail?: unknown } {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message, detail: err.detail };
  }
  if (err instanceof Error) {
    return { code: "INTERNAL_ERROR", message: err.message };
  }
  return { code: "INTERNAL_ERROR", message: "Unknown error" };
}
