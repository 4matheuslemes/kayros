"use client";

import { useEffect, useState } from "react";
import { getDayOfYear } from "date-fns";
import { DAILY_ENCOURAGEMENT_MESSAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DailyEncouragementProps {
  className?: string;
}

export function DailyEncouragement({ className }: DailyEncouragementProps = {}) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Get today's pool of 5 messages deterministically
    const dayOfYear = getDayOfYear(new Date());
    const size = 5;
    const total = DAILY_ENCOURAGEMENT_MESSAGES.length;
    
    const todaysPool = Array.from({ length: size }, (_, i) =>
      DAILY_ENCOURAGEMENT_MESSAGES[(dayOfYear * size + i) % total]
    );
    
    // 2. Pick one random message from this pool on mount
    const randomMessage = todaysPool[Math.floor(Math.random() * todaysPool.length)];
    
    setMessage(randomMessage);
  }, []);

  // Avoid hydration mismatch by only rendering after mount
  if (!message) {
    return null;
  }

  return (
    <p
      className={cn(
        "text-base lg:text-lg text-[var(--ink-muted)] leading-relaxed font-sans",
        className
      )}
    >
      {message}
    </p>
  );
}
