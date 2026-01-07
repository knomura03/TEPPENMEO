import { afterEach, describe, expect, it, vi } from "vitest";

import {
  publishFacebookPost,
  publishInstagramPost,
} from "@/server/providers/meta/api";

const graphBase = "https://graph.facebook.com/v20.0";

function parseFormBody(body?: BodyInit | null) {
  if (!body) return new URLSearchParams();
  if (typeof body === "string") return new URLSearchParams(body);
  if (body instanceof URLSearchParams) return body;
  return new URLSearchParams();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Meta API contract", () => {
  it("Facebookページ投稿（テキスト）は /feed にPOSTする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        expect(url).toBe(`${graphBase}/page-1/feed`);
        expect(init?.method).toBe("POST");
        const headers = init?.headers as Record<string, string> | undefined;
        expect(headers?.["Content-Type"]).toBe(
          "application/x-www-form-urlencoded"
        );

        const body = parseFormBody(init?.body ?? null);
        expect(body.get("message")).toBe("テキスト投稿");
        expect(body.get("access_token")).toBe("page-token");
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "post-1" }),
          text: async () => JSON.stringify({ ok: true }),
        } as Response;
      })
    );

    const result = await publishFacebookPost({
      pageId: "page-1",
      pageAccessToken: "page-token",
      content: "テキスト投稿",
      imageUrl: null,
    });

    expect(result.id).toBe("post-1");
  });

  it("Facebookページ投稿（画像）は /photos にPOSTする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        expect(url).toBe(`${graphBase}/page-1/photos`);
        const body = parseFormBody(init?.body ?? null);
        expect(body.get("url")).toBe("https://example.com/image.jpg");
        expect(body.get("caption")).toBe("画像投稿");
        expect(body.get("published")).toBe("true");
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "post-2" }),
          text: async () => JSON.stringify({ ok: true }),
        } as Response;
      })
    );

    const result = await publishFacebookPost({
      pageId: "page-1",
      pageAccessToken: "page-token",
      content: "画像投稿",
      imageUrl: "https://example.com/image.jpg",
    });

    expect(result.id).toBe("post-2");
  });

  it("Instagram投稿は media → media_publish の順で呼ばれる", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        call += 1;
        const url = typeof input === "string" ? input : input.toString();
        if (call === 1) {
          expect(url).toBe(`${graphBase}/ig-1/media`);
          const body = parseFormBody(init?.body ?? null);
          expect(body.get("image_url")).toBe("https://example.com/ig.jpg");
          expect(body.get("caption")).toBe("IG投稿");
          expect(body.get("access_token")).toBe("page-token");
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: "creation-1" }),
            text: async () => JSON.stringify({ ok: true }),
          } as Response;
        }

        expect(url).toBe(`${graphBase}/ig-1/media_publish`);
        const body = parseFormBody(init?.body ?? null);
        expect(body.get("creation_id")).toBe("creation-1");
        expect(body.get("access_token")).toBe("page-token");
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "ig-post-1" }),
          text: async () => JSON.stringify({ ok: true }),
        } as Response;
      })
    );

    const result = await publishInstagramPost({
      instagramAccountId: "ig-1",
      pageAccessToken: "page-token",
      caption: "IG投稿",
      imageUrl: "https://example.com/ig.jpg",
    });

    expect(result.id).toBe("ig-post-1");
    expect(call).toBe(2);
  });
});
