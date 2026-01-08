import { describe, expect, it } from "vitest";

import {
  buildGoogleScopeMetadata,
  buildMetaPermissionMetadata,
} from "@/server/services/provider-permissions";

describe("provider permission metadata", () => {
  it("Googleの要求スコープを重複なく保存する", () => {
    const result = buildGoogleScopeMetadata([
      "scope-a",
      "scope-b",
      "scope-a",
    ]);
    expect(result.requested_scopes).toEqual(["scope-a", "scope-b"]);
  });

  it("Metaの権限情報を分類して保存する", () => {
    const result = buildMetaPermissionMetadata({
      requestedPermissions: ["pages_manage_posts", "pages_manage_posts"],
      status: {
        granted: ["pages_manage_posts", "pages_manage_posts"],
        declined: ["instagram_basic"],
        pending: [],
      },
    });

    expect(result.requested_permissions).toEqual(["pages_manage_posts"]);
    expect(result.permissions_granted).toEqual(["pages_manage_posts"]);
    expect(result.permissions_declined).toEqual(["instagram_basic"]);
    expect(result.permissions_pending).toBeNull();
  });
});
