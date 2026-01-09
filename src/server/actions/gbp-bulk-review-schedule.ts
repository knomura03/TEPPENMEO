"use server";

import { revalidatePath } from "next/cache";

import { getActiveSessionUser } from "@/server/auth/session";
import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { writeAuditLog } from "@/server/services/audit-logs";
import { checkJobSchedulesSchema } from "@/server/services/diagnostics";
import {
  upsertJobSchedule,
  normalizeCadenceMinutes,
} from "@/server/services/jobs/job-schedules";

export type BulkReviewScheduleActionResult = {
  ok: boolean;
  message: string;
};

export async function saveGbpBulkReviewSchedule(params: {
  enabled: boolean;
  cadenceMinutes: number;
}): Promise<BulkReviewScheduleActionResult> {
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
    return { ok: false, message: "管理者のみ保存できます。" };
  }

  const scheduleSchema = await checkJobSchedulesSchema();
  if (scheduleSchema.status !== "ok") {
    return {
      ok: false,
      message:
        scheduleSchema.message ??
        "job_schedules マイグレーションが未適用のため保存できません。",
    };
  }

  const cadenceMinutes = normalizeCadenceMinutes(params.cadenceMinutes);
  const result = await upsertJobSchedule({
    organizationId: organization.id,
    jobKey: "gbp_reviews_bulk_sync",
    enabled: params.enabled,
    cadenceMinutes,
  });

  if (!result.ok) {
    return { ok: false, message: result.reason ?? "保存に失敗しました。" };
  }

  await writeAuditLog({
    actorUserId: user.id,
    organizationId: organization.id,
    action: "reviews.bulk_sync_schedule_update",
    targetType: "job",
    targetId: "gbp_reviews_bulk_sync",
    metadata: {
      enabled: params.enabled,
      cadence_minutes: cadenceMinutes,
    },
  });

  revalidatePath("/app/setup");
  return { ok: true, message: "保存しました。" };
}
