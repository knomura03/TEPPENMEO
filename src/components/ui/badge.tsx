import * as React from "react";

import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "muted";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  muted: "bg-slate-50 text-slate-500",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
);

Badge.displayName = "Badge";

export { Badge };
