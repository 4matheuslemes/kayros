import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a hover elevation effect — use only on interactive/tappable cards */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm:   "p-3",
  md:   "p-5",
  lg:   "p-6",
};

export function Card({
  className,
  interactive = false,
  padding = "md",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "card-base",
        paddingMap[padding],
        interactive && [
          "cursor-pointer transition-shadow duration-200",
          "hover:shadow-[var(--tw-shadow,0_4px_12px_rgba(0,0,0,0.08))]",
          "active:scale-[0.99]",
        ],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-start justify-between gap-3 mb-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display font-semibold text-lg text-[var(--ink)]", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-caption text-[var(--ink-muted)]", className)}
      {...props}
    />
  );
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-4 flex items-center gap-3", className)}
      {...props}
    />
  );
}
