import { useEffect, useRef, useState } from "react";

export function useCounter(
  target: number,
  opts?: { duration?: number; run?: boolean },
): number {
  const duration = opts?.duration ?? 1400;
  const run = opts?.run ?? true;
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!run) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      fromRef.current = target;
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = fromRef.current;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, run]);

  return value;
}
