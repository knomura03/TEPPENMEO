"use server";

import { revalidatePath } from "next/cache";

import { getActiveSessionUser } from "@/server/auth/session";
import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getPrimaryOrganization } from "@/server/services/organizations";
import {
  runGbpBulkReviewSync,
} from "@/server/services/jobs/gbp-bulk-review-sync";

export type BulkReviewSyncActionResult = {
  ok: boolean;
  message: string;
  reason?: string | null;
};

export async function runGbpBulkReviewSyncAction(): Promise<BulkReviewSyncActionResult> {
  const user = await getActiveSessionUser();
  if (!user) {
    return { ok: false, message: "ログインが必要です。" };
  }

  const organization = await getPrimaryOrganization(user.id);
  if (!organization) {
    return { ok: false, message: "所属組織が見つかりません。" };
  }

  const role = await getMembershipRole(user.id, organization.id);
  if (!hasRequiredRole(role, "admin")) {
    return { ok: false, message: "組織管理者のみ実行できます。" };
  }

  const result = await runGbpBulkReviewSync({
    organizationId: organization.id,
    actorUserId: user.id,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      reason: result.reason ?? null,
    };
  }

  revalidatePath("/app/setup");
  return { ok: true, message: result.message };
}
