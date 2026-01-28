import Link from "next/link";

import { ActionGroup } from "@/components/ui/ActionGroup";
import { buttonStyles } from "@/components/ui/button";
import { buildHrefWithParams } from "@/lib/pagination";

type RangeOption = {
  value: string;
  label: string;
};

type RangeTabsProps = {
  basePath: string;
  currentParams: Record<string, string | string[] | undefined>;
  options: RangeOption[];
  value: string;
  ariaLabel?: string;
  testIdPrefix?: string;
};

export function RangeTabs({
  basePath,
  currentParams,
  options,
  value,
  ariaLabel = "期間の切り替え",
  testIdPrefix = "range",
}: RangeTabsProps) {
  return (
    <ActionGroup>
      <span className="text-xs font-semibold text-[color:var(--text-muted)]" aria-hidden>
        期間
      </span>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={ariaLabel}>
        {options.map((option) => {
          const isActive = option.value === value;
          const href = buildHrefWithParams(basePath, currentParams, {
            range: option.value,
            page: null,
          });
          return (
            <Link
              key={option.value}
              href={href}
              role="tab"
              aria-selected={isActive}
              data-testid={`${testIdPrefix}-${option.value}`}
              className={buttonStyles({
                variant: isActive ? "primary" : "secondary",
                size: "sm",
              })}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </ActionGroup>
  );
}
