import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseConfigured } from "@/server/utils/env";
import { listLocations } from "@/server/services/locations";
import { listPostsForOrganization } from "@/server/services/posts";
import { listReviewsInboxPage } from "@/server/services/reviews-inbox";
import { mockReviews } from "@/server/services/mock-data";
import { getLatestJobRun } from "@/server/services/jobs/job-runs";
import { getJobSchedule } from "@/server/services/jobs/job-schedules";
import { GBP_BULK_REVIEW_SYNC_JOB_KEY } from "@/server/services/jobs/gbp-bulk-review-sync";

type ReviewSeriesPoint = { label: string; count: number };

export type DashboardMetrics = {
  locationsCount: number;
  reviews: {
    unrepliedCount: number | null;
    last7DaysCount: number | null;
    latestAt: string | null;
    latestRating: number | null;
    latestComment: string | null;
    series: ReviewSeriesPoint[];
    seriesStatus: "ok" | "unknown";
  };
  posts: {
    total: number;
    lastAt: string | null;
    lastStatus: string | null;
    lastProviders: string[];
  };
  jobs: {
    lastStatus: string | null;
    lastFinishedAt: string | null;
    nextRunAt: string | null;
    scheduleEnabled: boolean | null;
  };
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDayBuckets(days: number) {
  const today = new Date();
  const buckets = [] as Array<{ key: string; label: string }>;
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    date.setHours(0, 0, 0, 0);
    buckets.push({
      key: formatDateKey(date),
      label: date.toLocaleDateString("ja-JP", {
        month: "numeric",
        day: "numeric",
      }),
    });
  }
  return buckets;
}

function countByBuckets(dates: string[], buckets: Array<{ key: string }>) {
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

async function buildReviewSeries(organizationId: string): Promise<{
  series: ReviewSeriesPoint[];
  status: "ok" | "unknown";
}> {
  const buckets = buildDayBuckets(7);

  if (!isSupabaseConfigured()) {
    const dates = Object.values(mockReviews).flatMap((reviews) =>
      reviews.map((review) => review.createdAt)
    );
    const counts = countByBuckets(dates, buckets);
    return {
      series: buckets.map((bucket, index) => ({
        label: bucket.label,
        count: counts[index] ?? 0,
      })),
      status: "ok",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      series: buckets.map((bucket) => ({ label: bucket.label, count: 0 })),
      status: "unknown",
    };
  }

  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);

  const { data, error } = await admin
    .from("reviews")
    .select("created_at, locations!inner(organization_id)")
    .eq("locations.organization_id", organizationId)
    .gte("created_at", from.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error || !data) {
    return {
      series: buckets.map((bucket) => ({ label: bucket.label, count: 0 })),
      status: "unknown",
    };
  }

  const dates = (data as Array<{ created_at?: string | null }>)
    .map((row) => row.created_at)
    .filter((value): value is string => Boolean(value));
  const counts = countByBuckets(dates, buckets);

  return {
    series: buckets.map((bucket, index) => ({
      label: bucket.label,
      count: counts[index] ?? 0,
    })),
    status: "ok",
  };
}

export async function getDashboardMetrics(
  organizationId: string
): Promise<DashboardMetrics> {
  const locations = await listLocations(organizationId);
  const posts = await listPostsForOrganization(organizationId);

  const latestReviewPage = await listReviewsInboxPage({
    organizationId,
    page: 1,
    pageSize: 1,
    filters: {
      onlyUnreplied: false,
      provider: "all",
      locationId: null,
      from: null,
      to: null,
      query: "",
    },
  });
  const unrepliedPage = await listReviewsInboxPage({
    organizationId,
    page: 1,
    pageSize: 1,
    filters: {
      onlyUnreplied: true,
      provider: "all",
      locationId: null,
      from: null,
      to: null,
      query: "",
    },
  });

  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  const last7DaysPage = await listReviewsInboxPage({
    organizationId,
    page: 1,
    pageSize: 1,
    filters: {
      onlyUnreplied: false,
      provider: "all",
      locationId: null,
      from: from.toISOString(),
      to: null,
      query: "",
    },
  });

  const seriesResult = await buildReviewSeries(organizationId);

  const latestReview = latestReviewPage.items[0] ?? null;
  const lastPost = posts[0] ?? null;

  const latestJob = await getLatestJobRun({
    organizationId,
    jobKey: GBP_BULK_REVIEW_SYNC_JOB_KEY,
  });
  const schedule = await getJobSchedule({
    organizationId,
    jobKey: GBP_BULK_REVIEW_SYNC_JOB_KEY,
  });

  return {
    locationsCount: locations.length,
    reviews: {
      unrepliedCount: unrepliedPage.total ?? null,
      last7DaysCount:
        seriesResult.status === "ok" ? last7DaysPage.total ?? null : null,
      latestAt: latestReview?.createdAt ?? null,
      latestRating: latestReview?.rating ?? null,
      latestComment: latestReview?.comment ?? null,
      series: seriesResult.series,
      seriesStatus: seriesResult.status,
    },
    posts: {
      total: posts.length,
      lastAt: lastPost?.createdAt ?? null,
      lastStatus: lastPost?.status ?? null,
      lastProviders: lastPost?.providers ?? [],
    },
    jobs: {
      lastStatus: latestJob?.status ?? null,
      lastFinishedAt: latestJob?.finishedAt ?? latestJob?.startedAt ?? null,
      nextRunAt: schedule?.enabled ? schedule.nextRunAt : null,
      scheduleEnabled: schedule?.enabled ?? null,
    },
  };
}
