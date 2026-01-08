"use server";

import { revalidatePath } from "next/cache";

import { getActiveSessionUser } from "@/server/auth/session";
import { getMembershipRole } from "@/server/auth/rbac";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { writeAuditLog } from "@/server/services/audit-logs";
import {
  isValidSetupStepKey,
  upsertSetupProgress,
} from "@/server/services/setup-progress";

export type SetupProgressActionResult = {
  ok: boolean;
  message: string;
};

export async function setSetupStepDone(params: {
  stepKey: string;
  isDone: boolean;
  note?: string | null;
}): Promise<SetupProgressActionResult> {
  const user = await getActiveSessionUser();
  if (!user) {
    return { ok: false, message: "ログインが必要です。" };
  }

  const organization = await getPrimaryOrganization(user.id);
  if (!organization) {
    return { ok: false, message: "所属組織が見つかりません。" };
  }

  const role = await getMembershipRole(user.id, organization.id);
  if (!role || (role !== "owner" && role !== "admin")) {
    return { ok: false, message: "管理者のみ保存できます。" };
  }

  if (!isValidSetupStepKey(params.stepKey)) {
    return { ok: false, message: "不正なステップです。" };
  }

  const result = await upsertSetupProgress({
    organizationId: organization.id,
    stepKey: params.stepKey,
    isDone: params.isDone,
    doneByUserId: user.id,
    note: params.note ?? null,
  });

  if (!result.ok) {
    return { ok: false, message: result.reason ?? "保存に失敗しました。" };
  }

  await writeAuditLog({
    actorUserId: user.id,
    organizationId: organization.id,
    action: "setup.progress_update",
    targetType: "setup",
    targetId: params.stepKey,
    metadata: {
      step_key: params.stepKey,
      is_done: params.isDone,
    },
  });

  revalidatePath("/app/setup");
  return { ok: true, message: "保存しました。" };
}
