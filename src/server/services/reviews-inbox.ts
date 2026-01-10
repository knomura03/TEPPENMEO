import { ProviderType } from "@/server/providers/types";
import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseConfigured } from "@/server/utils/env";
import { mockLocations, mockReviews } from "@/server/services/mock-data";
import { listLatestReviewReplies } from "@/server/services/review-replies";

export type ReviewInboxItem = {
  id: string;
  provider: ProviderType;
  externalReviewId: string;
  locationId: string;
  locationName: string;
  rating: number | null;
  comment: string | null;
  author: string | null;
  createdAt: string;
  reply: { replyText: string; createdAt: string } | null;
};

export type ReviewsInboxFilters = {
  onlyUnreplied: boolean;
  provider: ProviderType | "all";
  locationId: string | null;
  from: string | null;
  to: string | null;
  query: string;
};

export type ReviewsInboxPage = {
  items: ReviewInboxItem[];
  page: number;
  pageSize: number;
  total: number;
  filters: ReviewsInboxFilters;
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

function normalizeFilters(
  filters?: Partial<ReviewsInboxFilters>
): ReviewsInboxFilters {
  const providerValues = Object.values(ProviderType);
  const provider =
    filters?.provider &&
    providerValues.includes(filters.provider as ProviderType)
      ? (filters.provider as ProviderType)
      : "all";

  return {
    onlyUnreplied: Boolean(filters?.onlyUnreplied),
    provider,
    locationId: filters?.locationId?.trim() || null,
    from: filters?.from?.trim() || null,
    to: filters?.to?.trim() || null,
    query: filters?.query?.trim() || "",
  };
}

function resolveLocationName(
  value: { name?: string | null } | Array<{ name?: string | null }> | null
): string {
  if (!value) return "不明";
  if (Array.isArray(value)) {
    return value[0]?.name ?? "不明";
  }
  return value.name ?? "不明";
}

function matchesText(value: string | null | undefined, query: string) {
  if (!value) return false;
  return value.toLowerCase().includes(query.toLowerCase());
}

export async function listReviewsInboxPage(params: {
  organizationId: string;
  page?: number;
  pageSize?: number;
  filters?: Partial<ReviewsInboxFilters>;
}): Promise<ReviewsInboxPage> {
  const pageSize = normalizePageSize(params.pageSize);
  const page = normalizePage(params.page);
  const filters = normalizeFilters(params.filters);

  if (!isSupabaseConfigured()) {
    const all = Object.entries(mockReviews).flatMap(([locationId, reviews]) => {
      const locationName =
        mockLocations.find((location) => location.id === locationId)?.name ??
        "不明";
      return reviews.map((review) => ({
        id: review.id,
        provider: review.provider,
        externalReviewId: review.externalReviewId,
        locationId: review.locationId,
        locationName,
        rating: review.rating ?? null,
        comment: review.comment ?? null,
        author: review.author ?? null,
        createdAt: review.createdAt,
        reply: null,
      }));
    });

    const providerFiltered =
      filters.provider === "all"
        ? all
        : all.filter((review) => review.provider === filters.provider);

    const locationFiltered = filters.locationId
      ? providerFiltered.filter(
          (review) => review.locationId === filters.locationId
        )
      : providerFiltered;

    const fromMs = filters.from ? Date.parse(filters.from) : null;
    const toMs = filters.to ? Date.parse(filters.to) : null;
    const dateFiltered =
      fromMs || toMs
        ? locationFiltered.filter((review) => {
            const ts = Date.parse(review.createdAt);
            if (Number.isNaN(ts)) return false;
            if (fromMs && ts < fromMs) return false;
            if (toMs && ts > toMs) return false;
            return true;
          })
        : locationFiltered;

    const searchFiltered = filters.query
      ? dateFiltered.filter(
          (review) =>
            matchesText(review.comment, filters.query) ||
            matchesText(review.author, filters.query) ||
            matchesText(review.locationName, filters.query)
        )
      : dateFiltered;

    const replyFiltered = filters.onlyUnreplied
      ? searchFiltered.filter((review) => !review.reply)
      : searchFiltered;

    const total = replyFiltered.length;
    const offset = (page - 1) * pageSize;
    const items = replyFiltered.slice(offset, offset + pageSize);

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

  const selectParts = [
    "id",
    "provider",
    "external_review_id",
    "location_id",
    "rating",
    "comment",
    "author",
    "created_at",
    "locations!inner(id,name,organization_id)",
  ];

  if (filters.onlyUnreplied) {
    selectParts.push("review_replies!left(id)");
  }

  let query = admin
    .from("reviews")
    .select(selectParts.join(","), { count: "exact" })
    .eq("locations.organization_id", params.organizationId);

  if (filters.locationId) {
    query = query.eq("location_id", filters.locationId);
  }

  if (filters.provider !== "all") {
    query = query.eq("provider", filters.provider);
  }

  if (filters.from) {
    query = query.gte("created_at", filters.from);
  }

  if (filters.to) {
    query = query.lte("created_at", filters.to);
  }

  if (filters.query) {
    const escaped = filters.query.replace(/[%_]/g, "\\$&");
    query = query.or(
      `comment.ilike.%${escaped}%,author.ilike.%${escaped}%,locations.name.ilike.%${escaped}%`
    );
  }

  if (filters.onlyUnreplied) {
    query = query.is("review_replies.id", null);
  }

  const offset = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error || !data) {
    return { items: [], page, pageSize, total: 0, filters };
  }

  const rows = data as unknown as Array<Record<string, unknown>>;
  const reviewIds = rows.map((row) => row.id as string);
  const replyMap = await listLatestReviewReplies(reviewIds);

  const items = rows.map((row) => {
    const reply = replyMap[row.id as string] ?? null;
    return {
      id: row.id as string,
      provider: row.provider as ProviderType,
      externalReviewId: row.external_review_id as string,
      locationId: row.location_id as string,
      locationName: resolveLocationName(
        (row as { locations?: { name?: string | null } | Array<{ name?: string | null }> })
          .locations ?? null
      ),
      rating:
        typeof row.rating === "number"
          ? row.rating
          : row.rating === null
            ? null
            : Number(row.rating),
      comment: (row.comment as string | null) ?? null,
      author: (row.author as string | null) ?? null,
      createdAt: row.created_at as string,
      reply: reply
        ? { replyText: reply.replyText, createdAt: reply.createdAt }
        : null,
    } satisfies ReviewInboxItem;
  });

  return {
    items,
    page,
    pageSize,
    total: count ?? 0,
    filters,
  };
}
