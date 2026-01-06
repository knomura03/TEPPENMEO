import { ProviderError } from "@/server/providers/errors";
import { ProviderType } from "@/server/providers/types";
import { HttpError, httpRequestJson } from "@/server/utils/http";

export type MetaPage = {
  id: string;
  name: string;
  instagram_business_account?: {
    id: string;
    username?: string;
  } | null;
  connected_instagram_account?: {
    id: string;
    username?: string;
  } | null;
};

export type MetaPageDetails = {
  id: string;
  name: string;
  accessToken?: string;
  instagram?: {
    id: string;
    username?: string;
  } | null;
};

type MetaPageListResponse = {
  data?: MetaPage[];
  paging?: { next?: string };
};

type MetaPageDetailsResponse = {
  id: string;
  name: string;
  access_token?: string;
  instagram_business_account?: {
    id: string;
    username?: string;
  } | null;
  connected_instagram_account?: {
    id: string;
    username?: string;
  } | null;
};

type MetaErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

const graphBase = "https://graph.facebook.com/v20.0";

function parseMetaError(body: string): MetaErrorBody["error"] | null {
  try {
    const payload = JSON.parse(body) as MetaErrorBody;
    return payload.error ?? null;
  } catch {
    return null;
  }
}

function mapMetaApiError(error: unknown, fallback: string): ProviderError {
  if (error instanceof HttpError) {
    const status = error.status;
    const metaError = parseMetaError(error.body);
    const code = metaError?.code;
    const subcode = metaError?.error_subcode;

    const authSubcodes = [458, 459, 460, 463, 467];
    if (status === 401 || code === 190 || authSubcodes.includes(subcode ?? -1)) {
      return new ProviderError(
        ProviderType.Meta,
        "auth_required",
        "認証が無効です。再認可してください。",
        status
      );
    }
    if (code === 10 || code === 200 || code === 250) {
      return new ProviderError(
        ProviderType.Meta,
        "auth_required",
        "権限が不足しています。必要な権限を追加して再認可してください。",
        status
      );
    }
    if (status === 429 || code === 4 || code === 17 || code === 32 || code === 613) {
      return new ProviderError(
        ProviderType.Meta,
        "rate_limited",
        "レート制限に達しました。しばらく待って再実行してください。",
        status
      );
    }
    if (status >= 500) {
      return new ProviderError(
        ProviderType.Meta,
        "upstream_error",
        "Meta側のエラーが発生しました。時間をおいて再実行してください。",
        status
      );
    }
    if (status >= 400) {
      return new ProviderError(
        ProviderType.Meta,
        "validation_error",
        "入力内容または連携状態を確認してください。",
        status
      );
    }
  }
  return new ProviderError(ProviderType.Meta, "unknown", fallback);
}

function buildPagesUrl(accessToken: string): string {
  const url = new URL(`${graphBase}/me/accounts`);
  url.searchParams.set(
    "fields",
    "id,name,instagram_business_account{id,username},connected_instagram_account{id,username}"
  );
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", accessToken);
  return url.toString();
}

export async function listMetaPages(accessToken: string): Promise<MetaPage[]> {
  try {
    const pages: MetaPage[] = [];
    let nextUrl: string | undefined = buildPagesUrl(accessToken);

    while (nextUrl) {
      const response: MetaPageListResponse =
        await httpRequestJson<MetaPageListResponse>(nextUrl);
      pages.push(...(response.data ?? []));
      nextUrl = response.paging?.next;
    }
    return pages;
  } catch (error) {
    throw mapMetaApiError(error, "Facebookページの取得に失敗しました。");
  }
}

export async function fetchMetaPageDetails(params: {
  accessToken: string;
  pageId: string;
}): Promise<MetaPageDetails> {
  try {
    const url = new URL(`${graphBase}/${params.pageId}`);
    url.searchParams.set(
      "fields",
      "id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}"
    );
    url.searchParams.set("access_token", params.accessToken);

    const response = await httpRequestJson<MetaPageDetailsResponse>(url.toString());
    const instagram =
      response.instagram_business_account ??
      response.connected_instagram_account ??
      null;

    return {
      id: response.id,
      name: response.name,
      accessToken: response.access_token,
      instagram: instagram
        ? { id: instagram.id, username: instagram.username }
        : null,
    };
  } catch (error) {
    throw mapMetaApiError(error, "Facebookページ情報の取得に失敗しました。");
  }
}

export async function publishFacebookPost(params: {
  pageId: string;
  pageAccessToken: string;
  content: string;
  imageUrl?: string | null;
}): Promise<{ id: string }> {
  try {
    const endpoint = params.imageUrl
      ? `${graphBase}/${params.pageId}/photos`
      : `${graphBase}/${params.pageId}/feed`;

    const body = new URLSearchParams();
    body.set("access_token", params.pageAccessToken);
    if (params.imageUrl) {
      body.set("url", params.imageUrl);
      body.set("caption", params.content);
      body.set("published", "true");
    } else {
      body.set("message", params.content);
    }

    return await httpRequestJson<{ id: string }>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (error) {
    throw mapMetaApiError(error, "Facebook投稿に失敗しました。");
  }
}

async function createInstagramMedia(params: {
  instagramAccountId: string;
  pageAccessToken: string;
  caption?: string;
  imageUrl: string;
}): Promise<{ id: string }> {
  const endpoint = `${graphBase}/${params.instagramAccountId}/media`;
  const body = new URLSearchParams();
  body.set("access_token", params.pageAccessToken);
  body.set("image_url", params.imageUrl);
  if (params.caption) {
    body.set("caption", params.caption);
  }

  return httpRequestJson<{ id: string }>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

async function publishInstagramMedia(params: {
  instagramAccountId: string;
  pageAccessToken: string;
  creationId: string;
}): Promise<{ id: string }> {
  const endpoint = `${graphBase}/${params.instagramAccountId}/media_publish`;
  const body = new URLSearchParams();
  body.set("access_token", params.pageAccessToken);
  body.set("creation_id", params.creationId);

  return httpRequestJson<{ id: string }>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

export async function publishInstagramPost(params: {
  instagramAccountId: string;
  pageAccessToken: string;
  caption?: string;
  imageUrl: string;
}): Promise<{ id: string }> {
  try {
    const created = await createInstagramMedia({
      instagramAccountId: params.instagramAccountId,
      pageAccessToken: params.pageAccessToken,
      caption: params.caption,
      imageUrl: params.imageUrl,
    });
    return await publishInstagramMedia({
      instagramAccountId: params.instagramAccountId,
      pageAccessToken: params.pageAccessToken,
      creationId: created.id,
    });
  } catch (error) {
    throw mapMetaApiError(error, "Instagram投稿に失敗しました。");
  }
}
