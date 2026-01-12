import type { ReactNode } from "react";

import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { maskSensitiveText } from "@/lib/redaction";

type DetailItem = {
  label: string;
  value: ReactNode;
  mono?: boolean;
  mask?: boolean;
  valueClassName?: string;
  fullWidth?: boolean;
};

type DetailsDisclosureProps = {
  items: DetailItem[];
  title?: string;
  tone?: "light" | "dark";
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
};

export function DetailsDisclosure({
  items,
  title = "詳細",
  tone = "light",
  className,
  contentClassName,
  children,
}: DetailsDisclosureProps) {
  const summaryTone =
    tone === "dark"
      ? "text-slate-200 hover:text-slate-100 hover:bg-slate-800/40 group-open:text-slate-100"
      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 group-open:text-slate-900";
  const contentTone =
    tone === "dark"
      ? "border-slate-800 bg-slate-950 text-slate-200"
      : "border-slate-200 bg-slate-50 text-slate-700";
  const labelTone = tone === "dark" ? "text-slate-400" : "text-slate-500";

  const renderValue = (item: DetailItem) => {
    if (item.mask === false) {
      return item.value ?? "なし";
    }
    if (
      item.value === null ||
      item.value === undefined ||
      typeof item.value === "string" ||
      typeof item.value === "number" ||
      typeof item.value === "boolean"
    ) {
      return maskSensitiveText(
        item.value as string | number | boolean | null | undefined
      );
    }
    return item.value;
  };

  return (
    <details className={cn("group", className)}>
      <summary
        className={cn(
          buttonStyles({ variant: "ghost", size: "sm", className: "px-0" }),
          "list-none cursor-pointer",
          summaryTone
        )}
      >
        {title}
      </summary>
      <div
        className={cn(
          "mt-2 rounded-md border p-3 text-sm",
          contentTone,
          contentClassName
        )}
      >
        {items.length > 0 && (
          <dl className="grid gap-x-4 gap-y-2 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.label}
              className={cn("flex gap-2", item.fullWidth ? "md:col-span-2" : null)}
            >
                <dt className={cn("min-w-[96px]", labelTone)}>{item.label}</dt>
                <dd
                  className={cn(
                    "flex-1 whitespace-pre-wrap break-words",
                    item.mono ? "font-mono text-xs" : null,
                    item.valueClassName
                  )}
                >
                  {renderValue(item)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {children && <div className="mt-3 space-y-3">{children}</div>}
      </div>
    </details>
  );
}
