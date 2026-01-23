import { describe, expect, it } from "vitest";

import { normalizeTemplateTargets } from "@/server/services/post-templates";

describe("post_templates targets", () => {
  it("オブジェクト以外は空で返す", () => {
    expect(normalizeTemplateTargets(null)).toEqual({});
    expect(normalizeTemplateTargets("text")).toEqual({});
    expect(normalizeTemplateTargets(123)).toEqual({});
  });

  it("booleanのみを取り出す", () => {
    const result = normalizeTemplateTargets({
      facebook: true,
      instagram: false,
      google: true,
      extra: "ignore",
    });
    expect(result).toEqual({ facebook: true, instagram: false, google: true });
  });

  it("boolean以外は無視する", () => {
    const result = normalizeTemplateTargets({
      facebook: "true",
      instagram: 1,
      google: null,
    });
    expect(result).toEqual({});
  });
});
