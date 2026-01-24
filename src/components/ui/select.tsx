import * as React from "react";

import { cn } from "@/lib/cn";

type SelectTone = "light" | "dark";

const toneStyles: Record<SelectTone, string> = {
  light:
    "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-default)] focus-visible:outline-[color:var(--focus-ring)]",
  dark:
    "border-slate-700 bg-slate-950 text-slate-100 focus-visible:outline-amber-300",
};

const invalidStyles = "border-rose-400 focus-visible:outline-rose-300";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  tone?: SelectTone;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, tone = "light", ...props }, ref) => {
    const ariaInvalid = props["aria-invalid"];
    const isInvalid = ariaInvalid === true || ariaInvalid === "true";
    return (
      <select
        ref={ref}
        className={cn(
          "min-h-[44px] w-full rounded-md border px-3 text-base shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          toneStyles[tone],
          isInvalid ? invalidStyles : null,
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";

export { Select };
