"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
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
      className={`rounded-md border p-3 text-xs ${
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
          <label className="text-xs text-slate-200">メールアドレス</label>
          <input
            name="email"
            type="email"
            placeholder="admin@example.com"
            className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-200">作成方式</label>
          <select
            name="mode"
            defaultValue="invite"
            className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <option value="invite">招待メール</option>
            <option value="invite_link">招待リンク</option>
            <option value="temp">仮パスワード</option>
          </select>
        </div>
      </div>
      <MessageBox error={state.error} success={state.success} />
      {state.inviteLink && (
        <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">招待リンク（機密）</p>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              コピー
            </button>
          </div>
          <input
            readOnly
            value={state.inviteLink}
            className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] text-emerald-900"
          />
          {copyStatus && <p className="text-[11px]">{copyStatus}</p>}
          <p className="text-[11px] text-emerald-700">
            リンクは共有範囲を限定し、漏洩しないよう注意してください。
          </p>
        </div>
      )}
      {state.tempPassword && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">仮パスワード（この画面でのみ表示）</p>
          <p className="mt-1 break-all">{state.tempPassword}</p>
        </div>
      )}
      <Button
        type="submit"
        className="w-full bg-amber-400 text-slate-900 hover:bg-amber-300 focus-visible:outline-amber-300"
      >
        ユーザーを作成
      </Button>
    </form>
  );
}
