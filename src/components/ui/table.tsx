import * as React from "react";

import { cn } from "@/lib/cn";

type TableTone = "light" | "dark";

const toneStyles: Record<TableTone, string> = {
  light:
    "text-[color:var(--text-default)] [--table-border:var(--border-muted)] [--table-head:var(--text-muted)] [--table-hover:var(--surface-contrast)]",
  dark:
    "text-slate-200 [--table-border:theme(colors.slate.800)] [--table-head:theme(colors.slate.400)] [--table-hover:theme(colors.slate.900)]",
};

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { tone?: TableTone }
>(({ className, tone = "light", ...props }, ref) => (
  <div className="w-full overflow-x-auto">
    <table
      ref={ref}
      className={cn("w-full text-sm", toneStyles[tone], className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "border-b border-[color:var(--table-border)] text-[color:var(--table-head)]",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("text-[color:inherit]", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-[color:var(--table-border)] transition-colors hover:bg-[color:var(--table-hover)]",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={cn("px-4 py-3 text-left text-xs font-semibold", className)}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("px-4 py-3 align-top", className)} {...props} />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-2 text-sm text-[color:var(--text-muted)]", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
