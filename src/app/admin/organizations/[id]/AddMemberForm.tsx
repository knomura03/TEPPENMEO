"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { addOrganizationMemberAction, type AdminOrgActionState } from "@/server/actions/admin-organizations";

const initialState: AdminOrgActionState = { error: null, success: null };

export function AddMemberForm({ organizationId }: { organizationId: string }) {
  const [state, action] = useFormState(addOrganizationMemberAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs text-slate-200">メールアドレス</label>
          <input
            name="email"
            type="email"
            placeholder="member@example.com"
            className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-200">ロール</label>
          <select
            name="role"
            defaultValue="member"
            className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <option value="owner">オーナー</option>
            <option value="admin">管理者</option>
            <option value="member">メンバー</option>
            <option value="viewer">閲覧</option>
          </select>
        </div>
      </div>
      {state.error && (
        <p className="text-xs text-rose-300">{state.error}</p>
      )}
      {state.success && (
        <p className="text-xs text-emerald-300">{state.success}</p>
      )}
      <Button
        type="submit"
        className="w-full bg-amber-400 text-slate-900 hover:bg-amber-300 focus-visible:outline-amber-300"
      >
        メンバーを追加
      </Button>
    </form>
  );
}
