"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
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
}: {
  userId: string;
  email: string | null;
  isDisabled: boolean;
}) {
  const [state, action] = useFormState(
    toggleAdminUserDisabledAction,
    initialState
  );
  const disabled = !email;

  if (isDisabled) {
    return (
      <form action={action} className="space-y-1 text-xs text-slate-300">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="mode" value="enable" />
        {state.error && <p className="text-[11px] text-rose-300">{state.error}</p>}
        {state.success && (
          <p className="text-[11px] text-emerald-300">{state.success}</p>
        )}
        <Button
          type="submit"
          variant="secondary"
          className="w-full bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/60"
          disabled={disabled}
        >
          有効化
        </Button>
      </form>
    );
  }

  return (
    <details className="text-xs text-slate-300">
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
          className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          required
          disabled={disabled}
        />
        {state.error && <p className="text-[11px] text-rose-300">{state.error}</p>}
        {state.success && (
          <p className="text-[11px] text-emerald-300">{state.success}</p>
        )}
        <Button
          type="submit"
          variant="secondary"
          className="w-full bg-amber-900/40 text-amber-200 hover:bg-amber-900/60"
          disabled={disabled}
        >
          利用停止
        </Button>
      </form>
    </details>
  );
}
