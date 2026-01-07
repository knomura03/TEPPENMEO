import { NextResponse } from "next/server";
import { z } from "zod";

import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getActiveSessionUser } from "@/server/auth/session";
import { getLocationById } from "@/server/services/locations";
import { retryPostTarget } from "@/server/services/post-history";

const bodySchema = z.object({
  postId: z.string().min(1),
  target: z.enum(["facebook", "instagram"]),
  locationId: z.string().min(1),
});

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          cause: "再実行の入力が不正です。",
          nextAction: "投稿履歴を更新して再試行してください。",
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
          cause: "ロケーションが見つかりません。",
          nextAction: "ロケーション一覧から選び直してください。",
        },
      },
      { status: 404 }
    );
  }

  const role = await getMembershipRole(user.id, location.organizationId);
  if (!hasRequiredRole(role, "admin")) {
    return NextResponse.json(
      {
        error: {
          cause: "権限がありません。",
          nextAction: "管理者に権限付与を依頼してください。",
        },
      },
      { status: 403 }
    );
  }

  const result = await retryPostTarget({
    organizationId: location.organizationId,
    locationId: location.id,
    postId: parsed.data.postId,
    target: parsed.data.target,
    actorUserId: user.id,
  });

  if (result.status === "failed") {
    return NextResponse.json(
      {
        error:
          result.error ??
          ({
            cause: "再実行に失敗しました。",
            nextAction: "時間をおいて再実行してください。",
          } as const),
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { status: result.status, externalPostId: result.externalPostId ?? null },
    { status: 200 }
  );
}
