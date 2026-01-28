import { describe, expect, it } from "vitest";

import { getDashboardTimeseries, dashboardRangeUtils } from "@/server/services/dashboard-timeseries";
import { resetEnvForTests } from "@/server/utils/env";

describe("dashboard timeseries", () => {
  it("範囲の正規化ができる", () => {
    expect(dashboardRangeUtils.normalizeRange(undefined)).toBe("7d");
    expect(dashboardRangeUtils.normalizeRange("30d")).toBe("30d");
    expect(dashboardRangeUtils.normalizeRange("90d")).toBe("90d");
    expect(dashboardRangeUtils.normalizeRange("invalid")).toBe("7d");
    expect(dashboardRangeUtils.normalizeRange(["30d"])).toBe("30d");
  });

  it("前期間がゼロの場合は比率を出さない", () => {
    const delta = dashboardRangeUtils.buildDelta(10, 0);
    expect(delta.diff).toBe(10);
    expect(delta.percent).toBeNull();
  });

  it("モック運用でも系列が返る", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvForTests();

    const result = await getDashboardTimeseries({
      organizationId: "org-1",
    });

    expect(result.series.length).toBe(7);
    expect(result.status).toBe("ok");
  });

  it("比較ONで比較系列が返る", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvForTests();

    const result = await getDashboardTimeseries({
      organizationId: "org-1",
      range: "30d",
      compare: true,
    });

    expect(result.series.length).toBe(30);
    expect(result.compareSeries?.length).toBe(30);
    expect(result.deltas.inboundCount).not.toBeNull();
  });
});
