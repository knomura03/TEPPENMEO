"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setSetupStepDone } from "@/server/actions/setup-progress";

type SetupProgressToggleProps = {
  stepKey: string;
  initialChecked: boolean;
  disabledReason?: string | null;
};

export function SetupProgressToggle({
  stepKey,
  initialChecked,
  disabledReason,
}: SetupProgressToggleProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(initialChecked);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const disabled = Boolean(disabledReason) || isPending;

  const handleChange = (next: boolean) => {
    setChecked(next);
    startTransition(async () => {
      const result = await setSetupStepDone({
        stepKey,
        isDone: next,
      });
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-1 text-[11px] text-slate-600">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => handleChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span>{checked ? "完了にする（保存済み）" : "完了にする"}</span>
      </label>
      {disabledReason && (
        <p className="text-[11px] text-amber-600">{disabledReason}</p>
      )}
      {message && <p className="text-[11px] text-slate-500">{message}</p>}
    </div>
  );
}
