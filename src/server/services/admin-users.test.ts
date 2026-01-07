import { beforeEach, describe, expect, it } from "vitest";

import { listAdminUsers } from "@/server/services/admin-users";
import { resetEnvForTests } from "@/server/utils/env";

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  resetEnvForTests();
});

describe("管理ユーザー一覧（モック）", () => {
  it("ユーザーと所属数が返る", async () => {
    const users = await listAdminUsers();
    expect(users.length).toBeGreaterThan(0);
    const admin = users.find((user) => user.email === "admin@example.com");
    expect(admin?.membershipCount).toBeGreaterThan(0);
  });

  it("検索でフィルタできる", async () => {
    const users = await listAdminUsers({ query: "member" });
    expect(users.every((user) => user.email?.includes("member"))).toBe(true);
  });

  it("状態フィルタで絞り込める", async () => {
    const invited = await listAdminUsers({ status: "invited" });
    expect(invited.length).toBeGreaterThan(0);
    expect(invited.every((user) => user.status === "invited")).toBe(true);
  });

  it("組織フィルタで絞り込める", async () => {
    const users = await listAdminUsers({ organizationId: "org-1" });
    expect(users.length).toBeGreaterThan(0);
  });
});
