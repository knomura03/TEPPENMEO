import { NextResponse } from "next/server";

import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getActiveSessionUser } from "@/server/auth/session";
import { getLocationById } from "@/server/services/locations";
import {
  isMediaError,
  uploadImageForLocation,
} from "@/server/services/media";

export async function POST(request: Request) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { cause: "ログインが必要です。", nextAction: "サインインしてください。" } },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const locationId = formData.get("locationId");
  const file = formData.get("file");

  if (typeof locationId !== "string" || locationId.length === 0) {
    return NextResponse.json(
      {
        error: {
          cause: "ロケーションが指定されていません。",
          nextAction: "ロケーション詳細から再実行してください。",
        },
      },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error: {
          cause: "画像ファイルが選択されていません。",
          nextAction: "画像ファイルを選択してください。",
        },
      },
      { status: 400 }
    );
  }

  const location = await getLocationById(locationId);
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

  try {
    const result = await uploadImageForLocation({
      organizationId: location.organizationId,
      locationId: location.id,
      file,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (isMediaError(error)) {
      return NextResponse.json(
        { error: { cause: error.cause, nextAction: error.nextAction } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error: {
          cause: "アップロードに失敗しました。",
          nextAction: "時間をおいて再実行してください。",
        },
      },
      { status: 500 }
    );
  }
}
