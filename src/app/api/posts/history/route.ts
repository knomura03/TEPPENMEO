import { NextResponse } from "next/server";
import { z } from "zod";

import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getActiveSessionUser } from "@/server/auth/session";
import { getLocationById } from "@/server/services/locations";
import { listPostHistoryPage } from "@/server/services/post-history";

const querySchema = z.object({
  locationId: z.string().min(1),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  status: z.enum(["all", "published", "failed", "queued"]).optional(),
  target: z.enum(["all", "facebook", "instagram", "google"]).optional(),
  search: z.string().optional(),
});

export async function GET(request: Request) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          cause: "ログインが必要です。",
          nextAction: "サインインしてください。",
        },
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    locationId: url.searchParams.get("locationId"),
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    status: url.searchParams.get("status"),
    target: url.searchParams.get("target"),
    search: url.searchParams.get("search"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          cause: "検索条件が不正です。",
          nextAction: "条件を見直して再実行してください。",
        },
      },
      { status: 400 }
    );
  }

  const location = await getLocationById(parsed.data.locationId);
  if (!location) {
    return NextResponse.json(
      {
        error: {
          cause: "店舗が見つかりません。",
          nextAction: "店舗一覧から選び直してください。",
        },
      },
      { status: 404 }
    );
  }

  const role = await getMembershipRole(user.id, location.organizationId);
  if (!hasRequiredRole(role, "viewer")) {
    return NextResponse.json(
      {
        error: {
          cause: "権限がありません。",
          nextAction: "組織管理者に権限付与を依頼してください。",
        },
      },
      { status: 403 }
    );
  }

  const page = await listPostHistoryPage({
    organizationId: location.organizationId,
    locationId: location.id,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    filters: {
      status: parsed.data.status,
      target: parsed.data.target,
      search: parsed.data.search,
    },
  });

  return NextResponse.json(page, { status: 200 });
}
