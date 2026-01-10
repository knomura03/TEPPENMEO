"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
        <FormField label="組織名" tone="dark">
          <Input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="組織名を入力"
            tone="dark"
          />
        </FormField>
        <FormField label="招待リンク" tone="dark">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                onChange={(event) => setInviteLink(event.target.value)}
                placeholder="招待リンクを貼り付け"
                tone="dark"
              />
              <Button
                type="button"
                variant="secondary"
                className="min-h-[44px] whitespace-nowrap bg-slate-800 px-4 text-sm text-slate-100 hover:bg-slate-700"
                onClick={handleApplyStoredInviteLink}
                disabled={!storedInviteLink}
              >
                直近の招待リンクを反映
              </Button>
            </div>
            {storedInviteLink && (
              <p className="text-sm text-slate-400">
                直近の招待リンクを読み込み済みです。
              </p>
            )}
          </div>
        </FormField>
      </div>
      {organizations.length > 0 && (
        <FormField label="組織を選択" tone="dark">
          <Select
            value={selectedOrgId}
            onChange={(event) => handleSelectOrganization(event.target.value)}
            tone="dark"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <div>
        <FormField label="任意メッセージ（1行）" tone="dark">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="例: 初回ログイン後にロールの確認をお願いします。"
            tone="dark"
          />
        </FormField>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-200">件名</p>
            <Button
              type="button"
              variant="secondary"
              className="min-h-[44px] px-4 text-sm"
              onClick={() => handleCopy(template.subject, "件名")}
              disabled={!inviteLink}
            >
              件名をコピー
            </Button>
          </div>
          <input
            readOnly
            value={template.subject}
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-200">本文</p>
            <Button
              type="button"
              variant="secondary"
              className="min-h-[44px] px-4 text-sm"
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
            className="mt-2 w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      </div>
      {copyStatus && <p className="text-sm text-emerald-300">{copyStatus}</p>}
      {!inviteLink && (
        <p className="text-sm text-amber-200">
          招待リンクを入力するとコピーできます。
        </p>
      )}
    </div>
  );
}
