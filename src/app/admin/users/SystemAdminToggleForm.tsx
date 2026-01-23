"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  toggleSystemAdminAction,
  type AdminUserActionState,
} from "@/server/actions/admin-users";

const initialState: AdminUserActionState = {
  error: null,
  success: null,
  tempPassword: null,
  inviteLink: null,
};

export function SystemAdminToggleForm({
  userId,
  email,
  isSystemAdmin,
  currentUserId,
  canManage,
}: {
  userId: string;
  email: string | null;
  isSystemAdmin: boolean;
  currentUserId: string | null;
  canManage: boolean;
}) {
  const [state, action] = useFormState(
    toggleSystemAdminAction,
    initialState
  );

  if (!canManage) {
    return <p className="text-xs text-slate-400">システム管理者のみ操作できます。</p>;
  }

  if (!email) {
    return <p className="text-xs text-slate-400">メール不明のため操作できません。</p>;
  }

  const isSelf = currentUserId === userId;
  const mode = isSystemAdmin ? "revoke" : "grant";
  const summaryLabel = isSystemAdmin ? "システム管理者を解除" : "システム管理者を付与";

  return (
    <details className="text-sm text-slate-300">
      <summary className="cursor-pointer text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]">
        {summaryLabel}
      </summary>
      <form action={action} className="mt-2 space-y-3">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="mode" value={mode} />
        <FormField label="確認用メール" required tone="dark">
          <Input
            name="confirmEmail"
            type="email"
            placeholder="対象メールを再入力"
            tone="dark"
            required
            disabled={isSelf}
          />
        </FormField>
        <FormField label="確認入力（CONFIRM）" required tone="dark">
          <Input
            name="confirmToken"
            type="text"
            placeholder="CONFIRM"
            tone="dark"
            required
            disabled={isSelf}
          />
        </FormField>
        {isSelf && (
          <p className="text-xs text-amber-300">
            自分自身のシステム管理者権限は解除できません。
          </p>
        )}
        {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
        {state.success && (
          <p className="text-sm text-emerald-300">{state.success}</p>
        )}
        <Button
          type="submit"
          variant={isSystemAdmin ? "danger" : "primary"}
          className="w-full min-h-[44px]"
          disabled={isSelf}
        >
          {isSystemAdmin ? "システム管理者を解除" : "システム管理者を付与"}
        </Button>
      </form>
    </details>
  );
}
