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
        className="min-h-[140px] w-full rounded-md border border-slate-800 bg-slate-950/60 p-2 text-[11px] text-slate-200"
      />
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>{copied ? "コピーしました" : "内容を確認して貼り付け"}</span>
        <Button
          type="button"
          variant="secondary"
          className="h-8 px-3 text-xs"
          onClick={handleCopy}
        >
          コピー
        </Button>
      </div>
    </div>
  );
}
