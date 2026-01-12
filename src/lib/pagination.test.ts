import { describe, expect, it } from "vitest";

import { buildHrefWithParams } from "./pagination";

describe("buildHrefWithParams", () => {
  it("既存のパラメータを維持して上書きできる", () => {
    const href = buildHrefWithParams("/app/reviews", { q: "test", page: "2" }, { page: 3 });
    expect(href).toBe("/app/reviews?q=test&page=3");
  });

  it("null/undefined は削除される", () => {
    const href = buildHrefWithParams("/admin/users", { status: "active", page: "1" }, { page: null });
    expect(href).toBe("/admin/users?status=active");
  });

  it("配列パラメータを保持できる", () => {
    const href = buildHrefWithParams(
      "/admin/audit-logs",
      { tag: ["a", "b"] },
      { page: 2 }
    );
    expect(href).toBe("/admin/audit-logs?tag=a&tag=b&page=2");
  });
});
