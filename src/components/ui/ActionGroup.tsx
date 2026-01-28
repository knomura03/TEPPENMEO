import { cn } from "@/lib/cn";

type ActionGroupProps = {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end" | "between";
};

export function ActionGroup({ children, className, align = "start" }: ActionGroupProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        align === "end" && "justify-end",
        align === "between" && "justify-between",
        className
      )}
    >
      {children}
    </div>
  );
}
