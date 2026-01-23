"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  removeOrganizationMemberAction,
  updateOrganizationMemberRoleAction,
  type AdminOrgActionState,
} from "@/server/actions/admin-organizations";
import type { MembershipRole } from "@/server/auth/rbac";

const initialState: AdminOrgActionState = { error: null, success: null };

export function MemberRoleForm({
  organizationId,
  userId,
  role,
}: {
  organizationId: string;
  userId: string;
  role: MembershipRole;
}) {
  const [state, action] = useFormState(updateOrganizationMemberRoleAction, initialState);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={role}
        className="min-h-[44px] rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]"
      >
        <option value="owner">オーナー</option>
        <option value="admin">組織管理者</option>
        <option value="member">メンバー</option>
        <option value="viewer">閲覧</option>
      </select>
      <Button
        type="submit"
        variant="secondary"
        className="min-h-[44px] bg-slate-700 px-4 text-sm text-slate-900 hover:bg-slate-600"
      >
        変更
      </Button>
      {state.error && (
        <span className="text-sm text-rose-300">{state.error}</span>
      )}
      {state.success && (
        <span className="text-sm text-emerald-600">{state.success}</span>
      )}
    </form>
  );
}

export function MemberRemoveForm({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const [state, action] = useFormState(removeOrganizationMemberAction, initialState);

  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="userId" value={userId} />
      <Button
        type="submit"
        variant="secondary"
        className="min-h-[44px] bg-rose-900/40 px-4 text-sm text-rose-200 hover:bg-rose-900/60"
      >
        削除
      </Button>
      {state.error && (
        <p className="text-sm text-rose-300">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-600">{state.success}</p>
      )}
    </form>
  );
}
