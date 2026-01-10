"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { deleteAdminUserAction, type AdminUserActionState } from "@/server/actions/admin-users";

const initialState: AdminUserActionState = {
  error: null,
  success: null,
  tempPassword: null,
  inviteLink: null,
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
    <details className="text-sm text-slate-300">
      <summary className="cursor-pointer text-rose-300 hover:text-rose-200">
        削除
      </summary>
      <form action={action} className="mt-2 space-y-3">
        <input type="hidden" name="userId" value={userId} />
        <FormField label="確認用メール" required tone="dark">
          <Input
            name="confirmEmail"
            type="email"
            placeholder="確認用メールを入力"
            tone="dark"
            required
            disabled={disabled}
          />
        </FormField>
        {state.error && (
          <p className="text-sm text-rose-300">{state.error}</p>
        )}
        {state.success && (
          <p className="text-sm text-emerald-300">{state.success}</p>
        )}
        <Button
          type="submit"
          variant="secondary"
          className="w-full min-h-[44px] bg-rose-900/40 text-rose-200 hover:bg-rose-900/60"
          disabled={disabled}
        >
          完全削除
        </Button>
      </form>
    </details>
  );
}
