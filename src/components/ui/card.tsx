import * as React from "react";

import { cn } from "@/lib/cn";

type CardTone = "light" | "dark" | "amber";

const toneStyles: Record<CardTone, string> = {
  light: "border-slate-200 bg-white/80 text-slate-900",
  dark: "border-slate-700 bg-slate-900 text-slate-100",
  amber: "border-amber-400/40 bg-amber-900/20 text-amber-100",
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
  <div ref={ref} className={cn("border-b border-slate-100 px-6 py-4", className)} {...props} />
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
