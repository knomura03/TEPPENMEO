import { describe, expect, test } from "vitest";

import {
  parsePreflightEnv,
  parsePreflightMode,
  validateAppBaseUrlForEnv,
} from "./preflight-env";

describe("preflight env parsing", () => {
  test("modeは--mode=で上書きされる", () => {
    expect(parsePreflightMode(["--mode=mock"], "real")).toBe("mock");
    expect(parsePreflightMode(["--mode=real"], "mock")).toBe("real");
  });

  test("envは--env=で上書きされる", () => {
    expect(parsePreflightEnv(["--env=staging"], "local")).toBe("staging");
    expect(parsePreflightEnv(["--env=prod"], "local")).toBe("prod");
    expect(parsePreflightEnv(["--env=local"], "prod")).toBe("local");
  });

  test("envは不正値ならfallback", () => {
    expect(parsePreflightEnv(["--env=unknown"], "local")).toBe("local");
  });
});

describe("APP_BASE_URL validation", () => {
  test("localは値があればOK", () => {
    expect(validateAppBaseUrlForEnv("http://localhost:3000", "local").ok).toBe(
      true
    );
  });

  test("staging/prodはhttps必須", () => {
    const result = validateAppBaseUrlForEnv("http://example.com", "staging");
    expect(result.ok).toBe(false);
  });

  test("staging/prodはlocalhost不可", () => {
    const result = validateAppBaseUrlForEnv(
      "https://localhost:3000",
      "prod"
    );
    expect(result.ok).toBe(false);
  });
});
