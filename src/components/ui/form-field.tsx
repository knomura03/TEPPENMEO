import * as React from "react";

import { cn } from "@/lib/cn";

type FormFieldTone = "light" | "dark";

const toneStyles: Record<FormFieldTone, { label: string; hint: string; error: string }> = {
  light: { label: "text-slate-700", hint: "text-slate-500", error: "text-rose-600" },
  dark: { label: "text-slate-200", hint: "text-slate-400", error: "text-rose-300" },
};

type FormFieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

type FormFieldProps = {
  label: string;
  id?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  tone?: FormFieldTone;
  className?: string;
  children: React.ReactElement<FormFieldControlProps>;
};

export function FormField({
  label,
  id,
  required,
  hint,
  error,
  tone = "light",
  className,
  children,
}: FormFieldProps) {
  const reactId = React.useId();
  const fieldId = id ?? reactId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [
    children.props["aria-describedby"],
    hintId,
    errorId,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const ariaInvalid =
    children.props["aria-invalid"] ??
    (error ? true : undefined);

  const control = React.cloneElement(children, {
    id: children.props.id ?? fieldId,
    "aria-describedby": describedBy,
    "aria-invalid": ariaInvalid,
  });

  const toneStyle = toneStyles[tone];

  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={fieldId} className={cn("text-sm font-semibold", toneStyle.label)}>
        {label}
        {required ? <span className="ml-1 text-amber-400">*</span> : null}
      </label>
      {control}
      {hint && (
        <p id={hintId} className={cn("text-sm", toneStyle.hint)}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={cn("text-sm", toneStyle.error)}>
          {error}
        </p>
      )}
    </div>
  );
}
