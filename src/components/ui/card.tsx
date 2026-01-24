import * as React from "react";

import { cn } from "@/lib/cn";

type CardTone = "light" | "dark" | "amber";

const toneStyles: Record<CardTone, string> = {
  light:
    "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-default)]",
  dark:
    "border-[color:var(--border-muted)] bg-[color:var(--surface-muted)] text-[color:var(--text-default)]",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
};

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone;
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone = "light", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border shadow-sm backdrop-blur",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  )
);

Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("border-b border-[color:var(--border-muted)] px-6 py-4", className)}
    {...props}
  />
));

CardHeader.displayName = "CardHeader";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 py-4", className)} {...props} />
));

CardContent.displayName = "CardContent";

export { Card, CardHeader, CardContent };
