import { beforeEach, describe, expect, it } from "vitest";

import {
  listAdminOrganizations,
  listOrganizationMembers,
} from "@/server/services/admin-organizations";
import { mockOrganization } from "@/server/services/mock-data";
import { resetEnvForTests } from "@/server/utils/env";

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  resetEnvForTests();
});

describe("管理組織一覧（モック）", () => {
  it("組織一覧が返る", async () => {
    const orgs = await listAdminOrganizations();
    expect(orgs.length).toBeGreaterThan(0);
    expect(orgs[0]?.memberCount).toBeGreaterThan(0);
  });

  it("組織メンバー一覧が返る", async () => {
    const members = await listOrganizationMembers(mockOrganization.id);
    expect(members.length).toBeGreaterThan(0);
    expect(members[0]?.role).toBeTruthy();
  });
});
