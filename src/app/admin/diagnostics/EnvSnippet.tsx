"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type EnvSnippetProps = {
  value: string;
};

export function EnvSnippet({ value }: EnvSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <textarea
        readOnly
        value={value}
        className="min-h-[160px] w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>{copied ? "コピーしました" : "内容を確認して貼り付け"}</span>
        <Button
          type="button"
          variant="secondary"
          className="min-h-[44px] px-4 text-sm"
          onClick={handleCopy}
        >
          コピー
        </Button>
      </div>
    </div>
  );
}
