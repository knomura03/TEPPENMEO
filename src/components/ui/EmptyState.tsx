import { ActionGroup } from "@/components/ui/ActionGroup";
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
  const descriptionClass =
    tone === "dark" ? "text-slate-300" : "text-[color:var(--text-muted)]";
  return (
    <Card tone={tone} className={className}>
      <CardContent className="space-y-3 text-sm">
        <p className="text-base font-semibold">{title}</p>
        {description && <p className={`text-sm ${descriptionClass}`}>{description}</p>}
        {actions && <ActionGroup>{actions}</ActionGroup>}
      </CardContent>
    </Card>
  );
}
