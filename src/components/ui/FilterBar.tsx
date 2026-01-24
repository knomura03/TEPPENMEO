import { ActionGroup } from "@/components/ui/ActionGroup";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export const adminFieldClass =
  "h-11 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-base text-[color:var(--text-default)] placeholder:text-[color:var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]";

export const adminSelectClass =
  "h-11 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-base text-[color:var(--text-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]";

export const adminLabelClass =
  "mb-1 block text-sm font-semibold text-[color:var(--text-default)]";

export const adminActionPrimaryClass = buttonStyles({
  variant: "primary",
  size: "md",
  className:
    "bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary-hover)] focus-visible:outline-[color:var(--primary)]",
});

export const adminActionSecondaryClass = buttonStyles({
  variant: "secondary",
  size: "md",
  className:
    "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-default)] hover:bg-[color:var(--surface-muted)]",
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
      <CardHeader className="border-[color:var(--border-muted)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-[color:var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
          {actions && <ActionGroup>{actions}</ActionGroup>}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("grid gap-4 md:grid-cols-6", contentClassName)}>
          {children}
        </div>
        {footer && <ActionGroup className="mt-4">{footer}</ActionGroup>}
      </CardContent>
    </Card>
  );
}
