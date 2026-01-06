import { ProviderType } from "@/server/providers/types";

export type ProviderErrorCode =
  | "not_supported"
  | "not_configured"
  | "auth_required"
  | "rate_limited"
  | "upstream_error"
  | "validation_error"
  | "unknown";

export class ProviderError extends Error {
  code: ProviderErrorCode;
  provider: ProviderType;
  status?: number;

  constructor(
    provider: ProviderType,
    code: ProviderErrorCode,
    message: string,
    status?: number
  ) {
    super(message);
    this.provider = provider;
    this.code = code;
    this.status = status;
  }
}

export function toProviderError(
  provider: ProviderType,
  error: unknown
): ProviderError {
  if (error instanceof ProviderError) return error;
  const message = error instanceof Error ? error.message : "Unknown error";
  return new ProviderError(provider, "unknown", message);
}
