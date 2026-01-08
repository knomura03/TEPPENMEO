import { describe, expect, it } from "vitest";

import {
  buildGoogleScopeMetadata,
  buildMetaPermissionMetadata,
  resolvePermissionDiff,
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

  it("付与済みがある場合は不足分を返す", () => {
    const result = resolvePermissionDiff({
      required: ["a", "b"],
      granted: ["a"],
    });
    expect(result.state).toBe("missing");
    expect(result.missing).toEqual(["b"]);
  });

  it("要求済みのみの場合は推定扱いになる", () => {
    const result = resolvePermissionDiff({
      required: ["a", "b"],
      requested: ["a", "b"],
    });
    expect(result.state).toBe("requested");
    expect(result.missing).toEqual([]);
  });
});
