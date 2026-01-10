import { Card, CardContent } from "@/components/ui/card";

type EmptyStateTone = "light" | "dark" | "amber";

type EmptyStateProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tone?: EmptyStateTone;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actions,
  tone = "dark",
  className,
}: EmptyStateProps) {
  return (
    <Card tone={tone} className={className}>
      <CardContent className="space-y-3 text-sm">
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="text-sm text-slate-300">{description}</p>}
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}
