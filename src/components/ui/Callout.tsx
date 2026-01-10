import { cn } from "@/lib/cn";

type CalloutTone = "info" | "warning" | "danger";

const toneStyles: Record<CalloutTone, string> = {
  info: "border-slate-600 bg-slate-900/60 text-slate-200",
  warning: "border-amber-400/60 bg-amber-900/20 text-amber-100",
  danger: "border-rose-400/60 bg-rose-900/20 text-rose-100",
};

type CalloutProps = {
  title: string;
  tone?: CalloutTone;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function Callout({
  title,
  tone = "info",
  children,
  actions,
  className,
}: CalloutProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        toneStyles[tone],
        className
      )}
    >
      <p className="text-base font-semibold">{title}</p>
      {children && <div className="mt-2 space-y-2">{children}</div>}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
