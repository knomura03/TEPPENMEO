import { cn } from "@/lib/cn";

type PageHeaderTone = "light" | "dark";

const toneStyles: Record<PageHeaderTone, { title: string; description: string }> = {
  light: { title: "text-slate-900", description: "text-slate-600" },
  dark: { title: "text-slate-100", description: "text-slate-300" },
};

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tone?: PageHeaderTone;
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  tone = "dark",
  className,
}: PageHeaderProps) {
  const toneStyle = toneStyles[tone];
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        <h1 className={cn("text-2xl font-semibold", toneStyle.title)}>
          {title}
        </h1>
        {description && (
          <p className={cn("text-base leading-relaxed", toneStyle.description)}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
