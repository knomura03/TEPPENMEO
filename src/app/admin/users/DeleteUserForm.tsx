"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { deleteAdminUserAction, type AdminUserActionState } from "@/server/actions/admin-users";

const initialState: AdminUserActionState = {
  error: null,
  success: null,
  tempPassword: null,
};

export function DeleteUserForm({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [state, action] = useFormState(deleteAdminUserAction, initialState);
  const disabled = !email;

  return (
    <details className="text-xs text-slate-300">
      <summary className="cursor-pointer text-rose-300 hover:text-rose-200">
        削除
      </summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="userId" value={userId} />
        <input
          name="confirmEmail"
          type="email"
          placeholder="確認用メールを入力"
          className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
          required
          disabled={disabled}
        />
        {state.error && (
          <p className="text-[11px] text-rose-300">{state.error}</p>
        )}
        {state.success && (
          <p className="text-[11px] text-emerald-300">{state.success}</p>
        )}
        <Button
          type="submit"
          variant="secondary"
          className="w-full bg-rose-900/40 text-rose-200 hover:bg-rose-900/60"
          disabled={disabled}
        >
          完全削除
        </Button>
      </form>
    </details>
  );
}
