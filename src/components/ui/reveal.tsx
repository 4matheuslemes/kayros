"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}

export function Reveal({ children, delayMs = 0, className }: RevealProps) {
  return (
    <div
      className={cn("animate-reveal", className)}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
