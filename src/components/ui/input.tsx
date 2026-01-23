import * as React from "react";

import { cn } from "@/lib/cn";

type InputTone = "light" | "dark";

const toneStyles: Record<InputTone, string> = {
  light:
    "border-slate-200 bg-white text-slate-900 placeholder:text-slate-500 focus-visible:outline-slate-400",
  dark:
    "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus-visible:outline-[color:var(--primary)]",
};

const invalidStyles = "border-rose-400 focus-visible:outline-rose-300";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  tone?: InputTone;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, tone = "light", ...props }, ref) => {
    const ariaInvalid = props["aria-invalid"];
    const isInvalid = ariaInvalid === true || ariaInvalid === "true";
    return (
      <input
        ref={ref}
        className={cn(
          "min-h-[44px] w-full rounded-md border px-3 text-base shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          toneStyles[tone],
          isInvalid ? invalidStyles : null,
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
