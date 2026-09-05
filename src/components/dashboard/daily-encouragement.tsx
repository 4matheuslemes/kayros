"use client";

import { useEffect, useState } from "react";
import { getDayOfYear } from "date-fns";
import { DAILY_ENCOURAGEMENT_MESSAGES } from "@/lib/constants";

export function DailyEncouragement() {
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
    <div className="flex flex-col gap-0.5 -mt-4 mb-2">
      <p className="text-caption text-[var(--ink-muted)]">
        {message}
      </p>
    </div>
  );
}
