import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export const adminFieldClass =
  "h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300";

export const adminSelectClass =
  "h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300";

export const adminLabelClass = "mb-1 block text-sm font-semibold text-slate-200";

export const adminActionPrimaryClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-md bg-amber-400 px-4 text-sm font-semibold text-slate-900 hover:bg-amber-300";

export const adminActionSecondaryClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-md border border-slate-700 bg-slate-950 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-900";

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
    <Card tone="dark" className={className}>
      <CardHeader className="border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            {description && (
              <p className="text-sm text-slate-300">{description}</p>
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
