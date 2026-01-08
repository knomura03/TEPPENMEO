"use server";

import { getActiveSessionUser } from "@/server/auth/session";
import { isSystemAdmin } from "@/server/auth/rbac";
import { checkGoogleHealth, checkMetaHealth, type ProviderHealthResult } from "@/server/services/provider-health";
import { getPrimaryOrganization } from "@/server/services/organizations";

export type ProviderHealthActionState = {
  result: ProviderHealthResult | null;
  error: string | null;
  updatedAt: string | null;
};

type AccessResult =
  | { error: string }
  | { userId: string; organizationId: string };

async function requireSystemAdmin(): Promise<AccessResult> {
  const user = await getActiveSessionUser();
  if (!user) {
    return { error: "ログインが必要です。" };
  }
  const isAdmin = await isSystemAdmin(user.id);
  if (!isAdmin) {
    return { error: "権限がありません。システム管理者のみ実行できます。" };
  }
  const organization = await getPrimaryOrganization(user.id);
  if (!organization) {
    return { error: "所属組織が見つかりません。" };
  }
  return { userId: user.id, organizationId: organization.id };
}

function successState(result: ProviderHealthResult): ProviderHealthActionState {
  return {
    result,
    error: null,
    updatedAt: new Date().toISOString(),
  };
}

function errorState(message: string): ProviderHealthActionState {
  return {
    result: null,
    error: message,
    updatedAt: new Date().toISOString(),
  };
}

export async function runGoogleHealthCheckAction(
  _prev: ProviderHealthActionState,
  _formData: FormData
): Promise<ProviderHealthActionState> {
  void _prev;
  void _formData;
  const access = await requireSystemAdmin();
  if ("error" in access) {
    return errorState(access.error);
  }

  try {
    const result = await checkGoogleHealth({
      organizationId: access.organizationId,
      actorUserId: access.userId,
    });
    return successState(result);
  } catch {
    return errorState("Googleヘルスチェックに失敗しました。");
  }
}

export async function runMetaHealthCheckAction(
  _prev: ProviderHealthActionState,
  _formData: FormData
): Promise<ProviderHealthActionState> {
  void _prev;
  void _formData;
  const access = await requireSystemAdmin();
  if ("error" in access) {
    return errorState(access.error);
  }

  try {
    const result = await checkMetaHealth({
      organizationId: access.organizationId,
      actorUserId: access.userId,
    });
    return successState(result);
  } catch {
    return errorState("Metaヘルスチェックに失敗しました。");
  }
}
