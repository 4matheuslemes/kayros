import * as React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Field wrapper — label + input slot + hint/error
───────────────────────────────────────────────────────────── */
interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export function Field({ label, hint, error, required, className, children, htmlFor }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-label text-[var(--ink)]"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-caption text-red-500" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-caption text-[var(--ink-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Input
───────────────────────────────────────────────────────────── */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full min-w-0 appearance-none h-11 px-4 rounded-md text-base font-sans",
        "bg-[var(--surface)] border border-[var(--border)]",
        "text-[var(--ink)] placeholder:text-[var(--ink-muted)]",
        "transition-colors duration-150",
        "focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        error && "border-red-500 focus:border-red-500 focus:ring-red-500",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

/* ─────────────────────────────────────────────────────────────
   Textarea
───────────────────────────────────────────────────────────── */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-4 py-3 rounded-md text-base font-sans resize-none",
        "bg-[var(--surface)] border border-[var(--border)]",
        "text-[var(--ink)] placeholder:text-[var(--ink-muted)]",
        "transition-colors duration-150 min-h-[100px]",
        "focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]",
        error && "border-red-500 focus:border-red-500 focus:ring-red-500",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

/* ─────────────────────────────────────────────────────────────
   Select
───────────────────────────────────────────────────────────── */
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, placeholder, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full h-11 px-4 rounded-md text-base font-sans appearance-none",
        "bg-[var(--surface)] border border-[var(--border)]",
        "text-[var(--ink)]",
        "transition-colors duration-150 cursor-pointer",
        "focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]",
        error && "border-red-500 focus:border-red-500 focus:ring-red-500",
        className
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
);
Select.displayName = "Select";
