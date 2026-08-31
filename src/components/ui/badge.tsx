import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-sans text-xs font-medium px-2.5 py-0.5 border",
  {
    variants: {
      variant: {
        default:   "bg-[var(--surface)] border-[var(--border)] text-[var(--ink-muted)]",
        primary:   "bg-[var(--primary)] border-[var(--primary)] text-white",
        success:   "bg-[var(--success)]/15 border-[var(--success)]/30 text-[var(--success)]",
        accent:    "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]",
        convencional:       "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
        testemunho_publico: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300",
        ldc:        "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300",
        carta:      "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
