"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
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
      <p className="text-sm text-amber-700">
        {userBlocksMessage ?? "無効化/有効化は利用できません。"}
      </p>
    );
  }

  if (isDisabled) {
    return (
      <form action={action} className="space-y-2 text-sm text-slate-600">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="mode" value="enable" />
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.success && (
          <p className="text-sm text-emerald-600">{state.success}</p>
        )}
        <Button
          type="submit"
          variant="secondary"
          className="w-full min-h-[44px] bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          disabled={disabled}
        >
          有効化
        </Button>
      </form>
    );
  }

  return (
    <details className="text-sm text-slate-600">
      <summary className="cursor-pointer text-amber-700 hover:text-amber-700">
        無効化
      </summary>
      <form action={action} className="mt-2 space-y-3">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="mode" value="disable" />
        <FormField label="確認用メール" required tone="light">
          <Input
            name="confirmEmail"
            type="email"
            placeholder="確認用メールを入力"
            tone="light"
            required
            disabled={disabled}
          />
        </FormField>
        <FormField label="無効化理由" required tone="light">
          <Input
            name="reason"
            type="text"
            placeholder="無効化理由（必須、200文字以内）"
            tone="light"
            required
            maxLength={200}
            disabled={disabled}
          />
        </FormField>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.success && (
          <p className="text-sm text-emerald-600">{state.success}</p>
        )}
        <Button
          type="submit"
          variant="secondary"
          className="w-full min-h-[44px] bg-amber-100 text-amber-800 hover:bg-amber-200"
          disabled={disabled}
        >
          利用停止
        </Button>
      </form>
    </details>
  );
}
