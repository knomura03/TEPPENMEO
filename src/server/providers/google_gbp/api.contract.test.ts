import { afterEach, describe, expect, it, vi } from "vitest";

import { createGooglePost } from "@/server/providers/google_gbp/api";

function stubFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => void) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      handler(input, init);
      return {
        ok: true,
        status: 200,
        json: async () => ({ name: "accounts/1/locations/2/localPosts/post-123" }),
        text: async () => JSON.stringify({ ok: true }),
      } as Response;
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GBP Local Posts contract", () => {
  it("localPosts.create のURLと必須フィールドを送る", async () => {
    const locationName = "accounts/123/locations/456";
    const imageUrl = "https://example.com/test.jpg";

    stubFetch((input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      expect(url).toBe(
        `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`
      );
      expect(init?.method).toBe("POST");

      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization).toBe("Bearer token");

      const body = JSON.parse((init?.body as string) ?? "{}");
      expect(body.languageCode).toBe("ja");
      expect(body.summary).toBe("テスト投稿");
      expect(body.topicType).toBe("STANDARD");
      expect(body.media?.[0]?.sourceUrl).toBe(imageUrl);
    });

    const result = await createGooglePost({
      accessToken: "token",
      locationName,
      summary: "テスト投稿",
      imageUrl,
    });

    expect(result.id).toBe("post-123");
  });

  it("画像なしの場合はmediaを省略する", async () => {
    const locationName = "accounts/123/locations/999";

    stubFetch((input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      expect(url).toBe(
        `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`
      );

      const body = JSON.parse((init?.body as string) ?? "{}");
      expect(body.media ?? null).toBeNull();
      expect(body.summary).toBe("画像なし投稿");
    });

    const result = await createGooglePost({
      accessToken: "token",
      locationName,
      summary: "画像なし投稿",
      imageUrl: null,
    });

    expect(result.id).toBe("post-123");
  });
});
