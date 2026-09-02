import { useEffect, useRef, useState } from "react";

export function useAnimatedNumber(target: number, durationMs = 600) {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    const start = prevTarget.current;
    const change = target - start;
    if (change === 0) return;

    // Respect prefers-reduced-motion
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setValue(target);
      prevTarget.current = target;
      return;
    }

    const startTime = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startTime) / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + change * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else prevTarget.current = target;
    }

    requestAnimationFrame(tick);
  }, [target, durationMs]);

  return value;
}
