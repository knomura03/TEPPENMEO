"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  adminActionPrimaryClass,
  adminFieldClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/ui/FilterBar";
import { addOrganizationMemberAction, type AdminOrgActionState } from "@/server/actions/admin-organizations";

const initialState: AdminOrgActionState = { error: null, success: null };

export function AddMemberForm({ organizationId }: { organizationId: string }) {
  const [state, action] = useFormState(addOrganizationMemberAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className={adminLabelClass}>メールアドレス</label>
          <input
            name="email"
            type="email"
            placeholder="member@example.com"
            className={adminFieldClass}
            required
          />
        </div>
        <div>
          <label className={adminLabelClass}>ロール</label>
          <select
            name="role"
            defaultValue="member"
            className={adminSelectClass}
          >
            <option value="owner">オーナー</option>
            <option value="admin">組織管理者</option>
            <option value="member">メンバー</option>
            <option value="viewer">閲覧</option>
          </select>
        </div>
      </div>
      {state.error && (
        <p className="text-sm text-rose-300">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-600">{state.success}</p>
      )}
      <Button
        type="submit"
        className={`${adminActionPrimaryClass} w-full`}
      >
        メンバーを追加
      </Button>
    </form>
  );
}
