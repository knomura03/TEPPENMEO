const sensitiveKeyPatterns = [
  /token/i,
  /secret/i,
  /password/i,
  /refresh/i,
  /authorization/i,
  /api[_-]?key/i,
  /access[_-]?key/i,
  /private[_-]?key/i,
  /client[_-]?secret/i,
];

const sensitiveValuePatterns = [...sensitiveKeyPatterns];

function isSensitiveKey(value: string) {
  return sensitiveKeyPatterns.some((pattern) => pattern.test(value));
}

function isSensitiveValue(value: string) {
  return sensitiveValuePatterns.some((pattern) => pattern.test(value));
}

export function maskSensitiveText(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "なし";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value.toString();
  if (isSensitiveValue(value)) {
    return "***";
  }
  return value;
}

export function maskSensitiveJson(
  input: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (isSensitiveKey(key)) {
        return [key, "***"];
      }
      if (Array.isArray(value)) {
        return [
          key,
          value.map((item) =>
            item && typeof item === "object"
              ? maskSensitiveJson(item as Record<string, unknown>)
              : item
          ),
        ];
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return [key, maskSensitiveJson(value as Record<string, unknown>)];
      }
      return [key, value];
    })
  );
}
