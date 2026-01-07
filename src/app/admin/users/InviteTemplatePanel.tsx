"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  buildInviteTemplate,
  INVITE_LINK_STORAGE_KEY,
} from "@/lib/invite-template";

type OrganizationOption = {
  id: string;
  name: string;
};

export function InviteTemplatePanel({
  organizations,
}: {
  organizations: OrganizationOption[];
}) {
  const defaultOrg = organizations[0];
  const initialStoredInviteLink =
    typeof window === "undefined"
      ? null
      : (() => {
          try {
            return localStorage.getItem(INVITE_LINK_STORAGE_KEY);
          } catch {
            return null;
          }
        })();
  const [organizationName, setOrganizationName] = useState(
    defaultOrg?.name ?? ""
  );
  const [selectedOrgId, setSelectedOrgId] = useState(
    defaultOrg?.id ?? ""
  );
  const [inviteLink, setInviteLink] = useState(initialStoredInviteLink ?? "");
  const [message, setMessage] = useState("");
  const [storedInviteLink, setStoredInviteLink] = useState<string | null>(
    initialStoredInviteLink
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleSelectOrganization = (orgId: string) => {
    setSelectedOrgId(orgId);
    const matched = organizations.find((org) => org.id === orgId);
    if (matched) {
      setOrganizationName(matched.name);
    }
  };

  const handleApplyStoredInviteLink = () => {
    try {
      const saved = localStorage.getItem(INVITE_LINK_STORAGE_KEY);
      setStoredInviteLink(saved);
      if (saved) setInviteLink(saved);
    } catch {
      setStoredInviteLink(null);
    }
  };

  const template = useMemo(
    () => buildInviteTemplate({ organizationName, inviteLink, message }),
    [organizationName, inviteLink, message]
  );

  const handleCopy = async (text: string, label: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label}をコピーしました。`);
    } catch {
      setCopyStatus("コピーに失敗しました。手動でコピーしてください。");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs text-slate-200">組織名</label>
          <input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="組織名を入力"
            className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          />
          {organizations.length > 0 && (
            <select
              value={selectedOrgId}
              onChange={(event) => handleSelectOrganization(event.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="text-xs text-slate-200">招待リンク</label>
          <div className="mt-1 flex gap-2">
            <input
              value={inviteLink}
              onChange={(event) => setInviteLink(event.target.value)}
              placeholder="招待リンクを貼り付け"
              className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            />
            <Button
              type="button"
              variant="secondary"
              className="h-10 whitespace-nowrap bg-slate-800 text-xs text-slate-100 hover:bg-slate-700"
              onClick={handleApplyStoredInviteLink}
              disabled={!storedInviteLink}
            >
              直近の招待リンクを反映
            </Button>
          </div>
          {storedInviteLink && (
            <p className="mt-1 text-[11px] text-slate-400">
              直近の招待リンクを読み込み済みです。
            </p>
          )}
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-200">任意メッセージ（1行）</label>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="例: 初回ログイン後にロールの確認をお願いします。"
          className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-200">件名</p>
            <Button
              type="button"
              variant="secondary"
              className="h-7 px-3 text-[11px]"
              onClick={() => handleCopy(template.subject, "件名")}
              disabled={!inviteLink}
            >
              件名をコピー
            </Button>
          </div>
          <input
            readOnly
            value={template.subject}
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
          />
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-200">本文</p>
            <Button
              type="button"
              variant="secondary"
              className="h-7 px-3 text-[11px]"
              onClick={() => handleCopy(template.body, "本文")}
              disabled={!inviteLink}
            >
              本文をコピー
            </Button>
          </div>
          <textarea
            readOnly
            rows={8}
            value={template.body}
            className="mt-2 w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
          />
        </div>
      </div>
      {copyStatus && <p className="text-xs text-emerald-300">{copyStatus}</p>}
      {!inviteLink && (
        <p className="text-xs text-amber-200">
          招待リンクを入力するとコピーできます。
        </p>
      )}
    </div>
  );
}
