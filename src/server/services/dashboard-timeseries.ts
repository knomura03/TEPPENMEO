import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { listLocations } from "@/server/services/locations";
import { mockPosts, mockReviews } from "@/server/services/mock-data";
import { isSupabaseConfigured } from "@/server/utils/env";

export type DashboardRange = "7d" | "30d" | "90d";

export type DashboardSeriesPoint = {
  date: string;
  label: string;
  inboundCount: number;
  replyCount: number;
  postCount: number;
};

type Totals = {
  inboundCount: number;
  replyCount: number;
  postCount: number;
};

type Delta = {
  diff: number;
  percent: number | null;
};

type Deltas = {
  inboundCount: Delta | null;
  replyCount: Delta | null;
  postCount: Delta | null;
};

export type DashboardTimeseries = {
  range: DashboardRange;
  compare: boolean;
  series: DashboardSeriesPoint[];
  compareSeries: DashboardSeriesPoint[] | null;
  totals: Totals;
  deltas: Deltas;
  status: "ok" | "unknown";
  hasData: boolean;
};

type Bucket = {
  key: string;
  label: string;
  date: Date;
};

function normalizeRange(value?: string | string[] | null): DashboardRange {
  const resolved = Array.isArray(value) ? value[0] : value ?? "";
  if (resolved === "30d") return "30d";
  if (resolved === "90d") return "90d";
  return "7d";
}

function rangeToDays(range: DashboardRange) {
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  return 7;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDayBuckets(days: number, endDate: Date) {
  const buckets: Bucket[] = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - index);
    date.setHours(0, 0, 0, 0);
    buckets.push({
      key: formatDateKey(date),
      label: date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
      date,
    });
  }
  return buckets;
}

function countByBuckets(dates: string[], buckets: Bucket[]) {
  const counts = new Map(buckets.map((bucket) => [bucket.key, 0]));
  dates.forEach((value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    const key = formatDateKey(date);
    if (!counts.has(key)) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return buckets.map((bucket) => counts.get(bucket.key) ?? 0);
}

function buildDelta(current: number, previous: number): Delta {
  const diff = current - previous;
  if (previous <= 0) {
    return { diff, percent: null };
  }
  return { diff, percent: (diff / previous) * 100 };
}

function buildSeries(
  buckets: Bucket[],
  inboundCounts: number[],
  replyCounts: number[],
  postCounts: number[]
): DashboardSeriesPoint[] {
  return buckets.map((bucket, index) => ({
    date: bucket.key,
    label: bucket.label,
    inboundCount: inboundCounts[index] ?? 0,
    replyCount: replyCounts[index] ?? 0,
    postCount: postCounts[index] ?? 0,
  }));
}

function aggregateTotals(series: DashboardSeriesPoint[]): Totals {
  return {
    inboundCount: series.reduce((total, point) => total + point.inboundCount, 0),
    replyCount: series.reduce((total, point) => total + point.replyCount, 0),
    postCount: series.reduce((total, point) => total + point.postCount, 0),
  };
}

async function fetchDatesFromSupabase(params: {
  organizationId: string;
  fromISO: string;
  toISO: string;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { status: "unknown" as const, inbound: [], replies: [], posts: [] };
  }

  const locations = await listLocations(params.organizationId);
  const locationIds = locations.map((loc) => loc.id);

  const [{ data: reviewRows, error: reviewError }, { data: replyRows, error: replyError }, { data: postRows, error: postError }] =
    await Promise.all([
      admin
        .from("reviews")
        .select("created_at, locations!inner(organization_id)")
        .eq("locations.organization_id", params.organizationId)
        .gte("created_at", params.fromISO)
        .lte("created_at", params.toISO)
        .order("created_at", { ascending: false })
        .limit(10000),
      locationIds.length
        ? admin
            .from("review_replies")
            .select("created_at, reviews!inner(location_id)")
            .in("reviews.location_id", locationIds)
            .gte("created_at", params.fromISO)
            .lte("created_at", params.toISO)
            .order("created_at", { ascending: false })
            .limit(10000)
        : Promise.resolve({ data: [], error: null }),
      admin
        .from("posts")
        .select("created_at")
        .eq("organization_id", params.organizationId)
        .gte("created_at", params.fromISO)
        .lte("created_at", params.toISO)
        .order("created_at", { ascending: false })
        .limit(10000),
    ]);

  if (reviewError || replyError || postError || !reviewRows || !postRows) {
    return { status: "unknown" as const, inbound: [], replies: [], posts: [] };
  }

  const inbound = (reviewRows as Array<{ created_at?: string | null }>)
    .map((row) => row.created_at)
    .filter((value): value is string => Boolean(value));
  const replies = (replyRows as Array<{ created_at?: string | null }>)
    .map((row) => row.created_at)
    .filter((value): value is string => Boolean(value));
  const posts = (postRows as Array<{ created_at?: string | null }>)
    .map((row) => row.created_at)
    .filter((value): value is string => Boolean(value));

  return { status: "ok" as const, inbound, replies, posts };
}

function fetchDatesFromMock() {
  const inbound = Object.values(mockReviews).flatMap((reviews) =>
    reviews.map((review) => review.createdAt)
  );
  const posts = mockPosts.map((post) => post.createdAt);
  return { status: "ok" as const, inbound, replies: [], posts };
}

export async function getDashboardTimeseries(params: {
  organizationId: string;
  range?: string | string[] | null;
  compare?: boolean;
}): Promise<DashboardTimeseries> {
  const range = normalizeRange(params.range);
  const rangeDays = rangeToDays(range);
  const compare = Boolean(params.compare);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentBuckets = buildDayBuckets(rangeDays, today);

  const compareEnd = new Date(today);
  compareEnd.setDate(compareEnd.getDate() - rangeDays);
  const compareBuckets = compare ? buildDayBuckets(rangeDays, compareEnd) : [];

  const queryStart = compare ? compareBuckets[0].date : currentBuckets[0].date;
  const queryEnd = new Date(today);
  queryEnd.setHours(23, 59, 59, 999);

  const dateSource = isSupabaseConfigured()
    ? await fetchDatesFromSupabase({
        organizationId: params.organizationId,
        fromISO: queryStart.toISOString(),
        toISO: queryEnd.toISOString(),
      })
    : fetchDatesFromMock();

  const currentInbound = countByBuckets(dateSource.inbound, currentBuckets);
  const currentReplies = countByBuckets(dateSource.replies, currentBuckets);
  const currentPosts = countByBuckets(dateSource.posts, currentBuckets);

  const series = buildSeries(currentBuckets, currentInbound, currentReplies, currentPosts);
  const totals = aggregateTotals(series);

  const compareSeries = compare
    ? buildSeries(
        compareBuckets,
        countByBuckets(dateSource.inbound, compareBuckets),
        countByBuckets(dateSource.replies, compareBuckets),
        countByBuckets(dateSource.posts, compareBuckets)
      )
    : null;

  const compareTotals = compareSeries ? aggregateTotals(compareSeries) : null;

  const deltas: Deltas = compareTotals
    ? {
        inboundCount: buildDelta(totals.inboundCount, compareTotals.inboundCount),
        replyCount: buildDelta(totals.replyCount, compareTotals.replyCount),
        postCount: buildDelta(totals.postCount, compareTotals.postCount),
      }
    : { inboundCount: null, replyCount: null, postCount: null };

  const hasData =
    totals.inboundCount > 0 || totals.replyCount > 0 || totals.postCount > 0;

  return {
    range,
    compare,
    series,
    compareSeries,
    totals,
    deltas,
    status: dateSource.status,
    hasData,
  };
}

export const dashboardRangeUtils = {
  normalizeRange,
  rangeToDays,
  buildDelta,
};
