import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type PaginationTone = "light" | "dark";

type PaginationProps = {
  prevHref?: string | null;
  nextHref?: string | null;
  summary?: string;
  tone?: PaginationTone;
  className?: string;
};

export function Pagination({
  prevHref,
  nextHref,
  summary,
  tone = "light",
  className,
}: PaginationProps) {
  const activeClass = buttonStyles({
    variant: "secondary",
    size: "md",
    className:
      tone === "dark"
        ? "border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900"
        : undefined,
  });
  const disabledClass = buttonStyles({
    variant: "secondary",
    size: "md",
    className:
      tone === "dark"
        ? "border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed"
        : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed",
  });

  return (
    <div
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
    >
      {summary ? (
        <p
          className={cn(
            "text-sm",
            tone === "dark" ? "text-slate-300" : "text-slate-600"
          )}
        >
          {summary}
        </p>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link href={prevHref} className={activeClass}>
            前へ
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            前へ
          </span>
        )}
        {nextHref ? (
          <Link href={nextHref} className={activeClass}>
            次へ
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            次へ
          </span>
        )}
      </div>
    </div>
  );
}
