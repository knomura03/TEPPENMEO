import * as React from "react";

import { cn } from "@/lib/cn";

type TextareaTone = "light" | "dark";

const toneStyles: Record<TextareaTone, string> = {
  light:
    "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-default)] placeholder:text-[color:var(--text-muted)] focus-visible:outline-[color:var(--focus-ring)]",
  dark:
    "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus-visible:outline-amber-300",
};

const invalidStyles = "border-rose-400 focus-visible:outline-rose-300";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  tone?: TextareaTone;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, tone = "light", ...props }, ref) => {
    const ariaInvalid = props["aria-invalid"];
    const isInvalid = ariaInvalid === true || ariaInvalid === "true";
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[120px] w-full rounded-md border px-3 py-2 text-base shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          toneStyles[tone],
          isInvalid ? invalidStyles : null,
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
