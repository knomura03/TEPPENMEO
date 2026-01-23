import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export const adminFieldClass =
  "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]";

export const adminSelectClass =
  "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]";

export const adminLabelClass = "mb-1 block text-sm font-semibold text-slate-700";

export const adminActionPrimaryClass = buttonStyles({
  variant: "primary",
  size: "md",
  className:
    "bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary-hover)] focus-visible:outline-[color:var(--primary)]",
});

export const adminActionSecondaryClass = buttonStyles({
  variant: "secondary",
  size: "md",
  className: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
});

type FilterBarProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function FilterBar({
  title,
  description,
  actions,
  children,
  footer,
  className,
  contentClassName,
}: FilterBarProps) {
  return (
    <Card tone="light" className={className}>
      <CardHeader className="border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="text-sm text-slate-600">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("grid gap-4 md:grid-cols-6", contentClassName)}>
          {children}
        </div>
        {footer && <div className="mt-4 flex flex-wrap gap-2">{footer}</div>}
      </CardContent>
    </Card>
  );
}
