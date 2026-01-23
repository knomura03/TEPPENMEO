import { ProviderType } from "@/server/providers/types";
import { normalizeMediaEntries, type MediaItem } from "@/server/services/media";
import { isSupabaseConfigured } from "@/server/utils/env";
import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { mockPostHistory } from "@/server/services/mock-data";
import { isMockMode } from "@/server/utils/feature-flags";
import { retryMetaPostTarget, type UiError } from "@/server/services/meta";
import { retryGooglePostTarget } from "@/server/services/google-business-profile";

export type PostTargetInfo = {
  provider: ProviderType;
  status: string;
  error?: string | null;
  externalPostId?: string | null;
};

export type PostHistoryItem = {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  media: MediaItem[];
  targets: PostTargetInfo[];
};

export type PostHistoryStatus = "all" | "published" | "failed" | "queued";
export type PostHistoryTarget = "all" | "facebook" | "instagram" | "google";

export type PostHistoryFilters = {
  status: PostHistoryStatus;
  target: PostHistoryTarget;
  search: string;
};

export type PostHistoryPage = {
  items: PostHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  filters: PostHistoryFilters;
};

export type PostHistoryRetryResult = {
  status: "published" | "failed";
  externalPostId?: string | null;
  error?: UiError | null;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function normalizePageSize(pageSize?: number) {
  if (!pageSize || pageSize <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

function normalizePage(page?: number) {
  if (!page || page <= 0) return 1;
  return page;
}

function extractTargetKey(target: PostTargetInfo): PostHistoryTarget | null {
  if (target.provider === ProviderType.GoogleBusinessProfile) return "google";
  if (!target.externalPostId) return null;
  const prefix = target.externalPostId.split(":")[0];
  if (prefix === "facebook" || prefix === "instagram") {
    return prefix as PostHistoryTarget;
  }
  return null;
}

function matchesTargetFilter(
  post: PostHistoryItem,
  target: PostHistoryTarget
): boolean {
  if (target === "all") return true;
  return post.targets.some((item) => extractTargetKey(item) === target);
}

function normalizeFilters(filters?: Partial<PostHistoryFilters>): PostHistoryFilters {
  return {
    status: filters?.status ?? "all",
    target: filters?.target ?? "all",
    search: filters?.search?.trim() ?? "",
  };
}

function toHistoryItem(row: {
  id: string;
  content: string;
  status: string;
  created_at: string;
  media: unknown;
  post_targets?: Array<{
    provider: ProviderType;
    status: string;
    error?: string | null;
    external_post_id?: string | null;
  }> | null;
}): PostHistoryItem {
  return {
    id: row.id,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    media: normalizeMediaEntries(row.media),
    targets:
      row.post_targets?.map((target) => ({
        provider: target.provider,
        status: target.status,
        error: target.error ?? null,
        externalPostId: target.external_post_id ?? null,
      })) ?? [],
  };
}

export async function listPostHistoryPage(params: {
  organizationId: string;
  locationId: string;
  page?: number;
  pageSize?: number;
  filters?: Partial<PostHistoryFilters>;
}): Promise<PostHistoryPage> {
  const pageSize = normalizePageSize(params.pageSize);
  const page = normalizePage(params.page);
  const filters = normalizeFilters(params.filters);

  if (!isSupabaseConfigured()) {
    const all = mockPostHistory
      .filter((post) => post.locationId === params.locationId)
      .map((post) => ({
        id: post.id,
        content: post.content,
        status: post.status,
        createdAt: post.createdAt,
        media: normalizeMediaEntries(post.media),
        targets: post.targets,
      }));

    const searched = filters.search
      ? all.filter((post) =>
          post.content.toLowerCase().includes(filters.search.toLowerCase())
        )
      : all;

    const statusFiltered =
      filters.status === "all"
        ? searched
        : searched.filter((post) => post.status === filters.status);

    const targetFiltered = statusFiltered.filter((post) =>
      matchesTargetFilter(post, filters.target)
    );

    const total = targetFiltered.length;
    const offset = (page - 1) * pageSize;
    const items = targetFiltered.slice(offset, offset + pageSize);

    return {
      items,
      page,
      pageSize,
      total,
      filters,
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { items: [], page, pageSize, total: 0, filters };
  }

  const selectClause =
    filters.target === "all"
      ? "id, content, status, created_at, media, post_targets(provider, status, error, external_post_id)"
      : "id, content, status, created_at, media, post_targets!inner(provider, status, error, external_post_id)";

  let query = admin
    .from("posts")
    .select(selectClause, { count: "exact" })
    .eq("organization_id", params.organizationId)
    .eq("location_id", params.locationId);

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    query = query.ilike("content", `%${filters.search}%`);
  }

  if (filters.target !== "all") {
    if (filters.target === "google") {
      query = query.eq("post_targets.provider", ProviderType.GoogleBusinessProfile);
    } else {
      query = query.ilike(
        "post_targets.external_post_id",
        `${filters.target}:%`
      );
    }
  }

  const offset = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error || !data) {
    return { items: [], page, pageSize, total: 0, filters };
  }

  return {
    items: data.map((row) =>
      toHistoryItem({
        id: row.id as string,
        content: row.content as string,
        status: row.status as string,
        created_at: row.created_at as string,
        media: row.media,
        post_targets: row.post_targets,
      })
    ),
    page,
    pageSize,
    total: count ?? 0,
    filters,
  };
}

export async function listPostsForLocation(params: {
  organizationId: string;
  locationId: string;
}): Promise<PostHistoryItem[]> {
  const page = await listPostHistoryPage({
    organizationId: params.organizationId,
    locationId: params.locationId,
  });
  return page.items;
}

export async function retryPostTarget(params: {
  organizationId: string;
  locationId: string;
  postId: string;
  target: Exclude<PostHistoryTarget, "all">;
  actorUserId?: string | null;
}): Promise<PostHistoryRetryResult> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return {
      status: "published",
      externalPostId: `${params.target}:mock-retry`,
      error: null,
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      status: "failed",
      error: {
        cause: "再実行に失敗しました。",
        nextAction: "時間をおいて再実行してください。",
      },
    };
  }

  const { data: post, error } = await admin
    .from("posts")
    .select("id, content, media, organization_id, location_id")
    .eq("id", params.postId)
    .maybeSingle();

  if (error || !post) {
    return {
      status: "failed",
      error: {
        cause: "投稿が見つかりません。",
        nextAction: "投稿履歴を更新して再試行してください。",
      },
    };
  }

  if (
    post.organization_id !== params.organizationId ||
    post.location_id !== params.locationId
  ) {
    return {
      status: "failed",
      error: {
        cause: "権限がありません。",
        nextAction: "組織管理者に確認してください。",
      },
    };
  }

  const media = normalizeMediaEntries(post.media);

  if (params.target === "google") {
    return retryGooglePostTarget({
      organizationId: params.organizationId,
      locationId: params.locationId,
      postId: params.postId,
      content: post.content as string,
      media,
      actorUserId: params.actorUserId ?? null,
    });
  }

  return retryMetaPostTarget({
    organizationId: params.organizationId,
    locationId: params.locationId,
    postId: params.postId,
    target: params.target,
    content: post.content as string,
    media,
    actorUserId: params.actorUserId ?? null,
  });
}
