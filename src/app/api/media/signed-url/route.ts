import { NextResponse } from "next/server";

import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getActiveSessionUser } from "@/server/auth/session";
import { getLocationById } from "@/server/services/locations";
import {
  createSignedImageUrl,
  getMediaConfig,
  isLocationMediaPath,
  isMediaError,
  isStorageConfigured,
  parseStorageReference,
} from "@/server/services/media";
import { isMockMode } from "@/server/utils/feature-flags";

export async function GET(request: Request) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { cause: "ログインが必要です。", nextAction: "サインインしてください。" } },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const locationId = url.searchParams.get("locationId");
  const ref = url.searchParams.get("ref");
  const path = url.searchParams.get("path");
  const bucket = url.searchParams.get("bucket");

  if (!locationId) {
    return NextResponse.json(
      {
        error: {
          cause: "店舗が指定されていません。",
          nextAction: "店舗詳細から再実行してください。",
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
          nextAction: "管理者に権限付与を依頼してください。",
        },
      },
      { status: 403 }
    );
  }

  const storageRef = ref ? parseStorageReference(ref) : null;
  const targetPath = storageRef?.path ?? path;
  const targetBucket = storageRef?.bucket ?? bucket ?? getMediaConfig().bucket;

  if (!targetPath || !targetBucket) {
    return NextResponse.json(
      {
        error: {
          cause: "画像の参照が不正です。",
          nextAction: "投稿履歴を更新して再試行してください。",
        },
      },
      { status: 400 }
    );
  }

  if (!isLocationMediaPath(targetPath, location.organizationId, location.id)) {
    return NextResponse.json(
      {
        error: {
          cause: "画像へのアクセスが許可されていません。",
          nextAction: "管理者に確認してください。",
        },
      },
      { status: 403 }
    );
  }

  const config = getMediaConfig();
  if (config.bucket && targetBucket !== config.bucket) {
    return NextResponse.json(
      {
        error: {
          cause: "バケットが一致しません。",
          nextAction: "Storage設定を確認してください。",
        },
      },
      { status: 400 }
    );
  }

  if (!isStorageConfigured()) {
    if (isMockMode()) {
      return NextResponse.json(
        {
          signedUrl: "/fixtures/mock-upload.png",
          expiresAt: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: {
          cause: "署名URLを発行できません。",
          nextAction: "Supabase Storageの設定を確認してください。",
        },
      },
      { status: 400 }
    );
  }

  try {
    const signedUrl = await createSignedImageUrl(
      targetBucket,
      targetPath,
      config.signedUrlTtlSeconds
    );
    return NextResponse.json(
      {
        signedUrl,
        expiresAt: new Date(Date.now() + config.signedUrlTtlSeconds * 1000).toISOString(),
      },
      { status: 200 }
    );
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
          cause: "署名URLの発行に失敗しました。",
          nextAction: "時間をおいて再実行してください。",
        },
      },
      { status: 500 }
    );
  }
}
