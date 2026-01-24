import { describe, expect, test, beforeEach, afterEach } from "vitest";

import { getReleaseAcceptanceStatus } from "./release-acceptance";
import { resetEnvForTests } from "@/server/utils/env";

const ORIGINAL_ENV = { ...process.env };

describe("release-acceptance", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    resetEnvForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    resetEnvForTests();
  });

  test("Supabase未設定ならunknownになる", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvForTests();

    const result = await getReleaseAcceptanceStatus({
      organizationId: "org-1",
      locationIds: ["loc-1"],
    });

    expect(result.googleInboxFetch.status).toBe("unknown");
    expect(result.metaPostPublish.status).toBe("unknown");
  });

  test("店舗が未登録ならpendingになる", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    resetEnvForTests();

    const result = await getReleaseAcceptanceStatus({
      organizationId: "org-1",
      locationIds: [],
    });

    expect(result.googleInboxFetch.status).toBe("pending");
    expect(result.mediaUpload.status).toBe("pending");
  });
});
