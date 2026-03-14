export type AbuseProtectionCode =
  | 'draft_generation_rate_limited'
  | 'analysis_rate_limited';

export type AbuseProtectionResponse = {
  error: {
    code: AbuseProtectionCode;
    message: string;
    retryAfterSeconds: number;
  };
};

export class AbuseProtectionError extends Error {
  readonly status = 429;

  constructor(
    readonly code: AbuseProtectionCode,
    message: string,
    readonly retryAfterSeconds: number
  ) {
    super(message);
    this.name = 'AbuseProtectionError';
  }
}

export function isAbuseProtectionError(error: unknown): error is AbuseProtectionError {
  return error instanceof AbuseProtectionError;
}
