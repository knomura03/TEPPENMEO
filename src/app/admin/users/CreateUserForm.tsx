"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  adminActionPrimaryClass,
  adminFieldClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/ui/FilterBar";
import { INVITE_LINK_STORAGE_KEY } from "@/lib/invite-template";
import {
  createAdminUserAction,
  type AdminUserActionState,
} from "@/server/actions/admin-users";

const initialState: AdminUserActionState = {
  error: null,
  success: null,
  tempPassword: null,
  inviteLink: null,
};

function MessageBox({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (!error && !success) return null;
  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        error
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-emerald-300 bg-emerald-50 text-emerald-900"
      }`}
    >
      {error ?? success}
    </div>
  );
}

export function CreateUserForm() {
  const [state, action] = useFormState(createAdminUserAction, initialState);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!state.inviteLink) return;
    try {
      localStorage.setItem(INVITE_LINK_STORAGE_KEY, state.inviteLink);
    } catch {
      // ストレージ不可でも致命的ではないため無視する
    }
  }, [state.inviteLink]);

  const handleCopy = async () => {
    if (!state.inviteLink) return;
    try {
      await navigator.clipboard.writeText(state.inviteLink);
      setCopyStatus("招待リンクをコピーしました。");
    } catch {
      setCopyStatus("コピーに失敗しました。手動でコピーしてください。");
    }
  };

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className={adminLabelClass}>メールアドレス</label>
          <input
            name="email"
            type="email"
            placeholder="admin@example.com"
            className={adminFieldClass}
            required
          />
        </div>
        <div>
          <label className={adminLabelClass}>作成方式</label>
          <select
            name="mode"
            defaultValue="invite"
            className={adminSelectClass}
          >
            <option value="invite">招待メール</option>
            <option value="invite_link">招待リンク</option>
            <option value="temp">仮パスワード</option>
          </select>
        </div>
      </div>
      <MessageBox error={state.error} success={state.success} />
      {state.inviteLink && (
        <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">招待リンク（機密）</p>
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[44px] rounded-md border border-emerald-200 px-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              コピー
            </button>
          </div>
          <input
            readOnly
            value={state.inviteLink}
            className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900"
          />
          {copyStatus && <p className="text-sm">{copyStatus}</p>}
          <p className="text-sm text-emerald-700">
            リンクは共有範囲を限定し、漏洩しないよう注意してください。
          </p>
          <p className="text-sm text-emerald-700">
            招待テンプレで「直近の招待リンクを反映」できます。
          </p>
        </div>
      )}
      {state.tempPassword && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">仮パスワード（この画面でのみ表示）</p>
          <p className="mt-1 break-all">{state.tempPassword}</p>
        </div>
      )}
      <Button
        type="submit"
        className={`${adminActionPrimaryClass} w-full`}
      >
        ユーザーを作成
      </Button>
    </form>
  );
}
