const SENSITIVE_KEYS = new Set([
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "client_secret",
  "secret",
]);

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        SENSITIVE_KEYS.has(key.toLowerCase()) ? "［伏せ字］" : redactValue(val),
      ])
    );
  }
  return value;
}

export const logger = {
  info(message: string, payload?: unknown) {
    if (payload) {
      console.info(message, redactValue(payload));
      return;
    }
    console.info(message);
  },
  warn(message: string, payload?: unknown) {
    if (payload) {
      console.warn(message, redactValue(payload));
      return;
    }
    console.warn(message);
  },
  error(message: string, payload?: unknown) {
    if (payload) {
      console.error(message, redactValue(payload));
      return;
    }
    console.error(message);
  },
};
