export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export interface ErrorPayload {
  code: string;
  message: string;
  traceId: string;
}

export function toErrorPayload(
  error: unknown,
  traceId: string,
): ErrorPayload & { status: number } {
  if (error instanceof AppError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      traceId,
    };
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Something went wrong while processing this conversion.",
    traceId,
  };
}
