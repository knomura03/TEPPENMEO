import { afterEach, describe, expect, it, vi } from "vitest";

import {
  listFacebookComments,
  listInstagramComments,
  publishFacebookPost,
  publishInstagramPost,
  replyFacebookComment,
  replyInstagramComment,
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

  it("Facebookコメント取得は /posts にGETする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        expect(url).toContain(`${graphBase}/page-1/posts`);
        expect(url).toContain("comments");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: "post-1",
                comments: {
                  data: [
                    {
                      id: "comment-1",
                      message: "投稿へのコメント",
                      from: { name: "お客様" },
                      created_time: "2024-01-01T00:00:00Z",
                    },
                  ],
                },
              },
            ],
          }),
          text: async () => JSON.stringify({ ok: true }),
        } as Response;
      })
    );

    const comments = await listFacebookComments({
      pageId: "page-1",
      pageAccessToken: "page-token",
    });

    expect(comments.length).toBe(1);
    expect(comments[0].id).toBe("comment-1");
  });

  it("Facebookコメント返信は /comments にPOSTする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        expect(url).toBe(`${graphBase}/comment-1/comments`);
        expect(init?.method).toBe("POST");
        const body = parseFormBody(init?.body ?? null);
        expect(body.get("message")).toBe("返信内容");
        expect(body.get("access_token")).toBe("page-token");
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "reply-1" }),
          text: async () => JSON.stringify({ ok: true }),
        } as Response;
      })
    );

    const result = await replyFacebookComment({
      commentId: "comment-1",
      pageAccessToken: "page-token",
      message: "返信内容",
    });

    expect(result.id).toBe("reply-1");
  });

  it("Instagramコメント取得は media → comments の順で呼ばれる", async () => {
    const calledUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        calledUrls.push(url);
        if (calledUrls.length === 1) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: [{ id: "media-1" }] }),
            text: async () => JSON.stringify({ ok: true }),
          } as Response;
        }
        if (calledUrls.length === 2) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: [
                { id: "ig-comment-1", text: "コメント", username: "user" },
              ],
            }),
            text: async () => JSON.stringify({ ok: true }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
          text: async () => JSON.stringify({ ok: true }),
        } as Response;
      })
    );

    const comments = await listInstagramComments({
      instagramAccountId: "ig-1",
      pageAccessToken: "page-token",
    });

    expect(comments.length).toBe(1);
    expect(comments[0].id).toBe("ig-comment-1");
    expect(calledUrls[0]).toBe(
      `${graphBase}/ig-1/media?fields=id&limit=10&access_token=page-token`
    );
    const commentsUrl = new URL(calledUrls[1]);
    expect(commentsUrl.origin + commentsUrl.pathname).toBe(
      `${graphBase}/media-1/comments`
    );
    expect(commentsUrl.searchParams.get("fields")).toBe(
      "id,text,username,timestamp"
    );
    expect(commentsUrl.searchParams.get("limit")).toBe("20");
    expect(commentsUrl.searchParams.get("access_token")).toBe("page-token");
  });

  it("Instagramコメント返信は /replies にPOSTする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        expect(url).toBe(`${graphBase}/ig-comment-1/replies`);
        expect(init?.method).toBe("POST");
        const body = parseFormBody(init?.body ?? null);
        expect(body.get("message")).toBe("返信内容");
        expect(body.get("access_token")).toBe("page-token");
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "ig-reply-1" }),
          text: async () => JSON.stringify({ ok: true }),
        } as Response;
      })
    );

    const result = await replyInstagramComment({
      commentId: "ig-comment-1",
      pageAccessToken: "page-token",
      message: "返信内容",
    });

    expect(result.id).toBe("ig-reply-1");
  });
});
