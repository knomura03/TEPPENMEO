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
    const users = await listAdminUsers("member");
    expect(users.every((user) => user.email?.includes("member"))).toBe(true);
  });
});
