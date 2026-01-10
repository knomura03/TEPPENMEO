"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { adminFieldClass } from "@/components/ui/FilterBar";
import {
  toggleAdminUserDisabledAction,
  type AdminUserActionState,
} from "@/server/actions/admin-users";

const initialState: AdminUserActionState = {
  error: null,
  success: null,
  tempPassword: null,
  inviteLink: null,
};

export function ToggleUserStatusForm({
  userId,
  email,
  isDisabled,
  userBlocksReady,
  userBlocksMessage,
}: {
  userId: string;
  email: string | null;
  isDisabled: boolean;
  userBlocksReady: boolean;
  userBlocksMessage: string | null;
}) {
  const [state, action] = useFormState(
    toggleAdminUserDisabledAction,
    initialState
  );
  const disabled = !email || !userBlocksReady;

  if (!userBlocksReady) {
    return (
      <p className="text-sm text-amber-300">
        {userBlocksMessage ?? "無効化/有効化は利用できません。"}
      </p>
    );
  }

  if (isDisabled) {
    return (
      <form action={action} className="space-y-2 text-sm text-slate-300">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="mode" value="enable" />
        {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
        {state.success && (
          <p className="text-sm text-emerald-300">{state.success}</p>
        )}
        <Button
          type="submit"
          variant="secondary"
          className="w-full min-h-[44px] bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/60"
          disabled={disabled}
        >
          有効化
        </Button>
      </form>
    );
  }

  return (
    <details className="text-sm text-slate-300">
      <summary className="cursor-pointer text-amber-300 hover:text-amber-200">
        無効化
      </summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="mode" value="disable" />
        <input
          name="confirmEmail"
          type="email"
          placeholder="確認用メールを入力"
          className={adminFieldClass}
          required
          disabled={disabled}
        />
        <input
          name="reason"
          type="text"
          placeholder="無効化理由（必須、200文字以内）"
          className={adminFieldClass}
          required
          maxLength={200}
          disabled={disabled}
        />
        {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
        {state.success && (
          <p className="text-sm text-emerald-300">{state.success}</p>
        )}
        <Button
          type="submit"
          variant="secondary"
          className="w-full min-h-[44px] bg-amber-900/40 text-amber-200 hover:bg-amber-900/60"
          disabled={disabled}
        >
          利用停止
        </Button>
      </form>
    </details>
  );
}
