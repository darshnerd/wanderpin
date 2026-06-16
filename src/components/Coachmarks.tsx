import { useEffect, useState } from "react";

import { Button } from "./ui/button";

export interface CoachStep {
  selector: string;
  title: string;
  body: string;
}

interface CoachmarksProps {
  steps: CoachStep[];
  index: number;
  onNext: () => void;
  onSkip: () => void;
}

export function Coachmarks({ steps, index, onNext, onSkip }: CoachmarksProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [suppressed, setSuppressed] = useState(false);
  const step = steps[index];

  useEffect(() => {
    if (!step) return;
    const measure = () => {
      const el = document.querySelector(step.selector);
      setRect(el ? el.getBoundingClientRect() : null);
      setSuppressed(
        !!(el && document.activeElement && el.contains(document.activeElement)),
      );
    };
    measure();
    let n = 0;
    const iv = setInterval(() => {
      measure();
      if (++n > 8) clearInterval(iv);
    }, 90);
    window.addEventListener("resize", measure);
    document.addEventListener("focusin", measure);
    document.addEventListener("focusout", measure);
    return () => {
      clearInterval(iv);
      window.removeEventListener("resize", measure);
      document.removeEventListener("focusin", measure);
      document.removeEventListener("focusout", measure);
    };
  }, [step]);

  if (!step || suppressed) return null;

  const placeAbove = !!rect && rect.top > window.innerHeight / 2;
  const top = rect
    ? placeAbove
      ? Math.max(rect.top - 150, 12)
      : Math.min(rect.bottom + 12, window.innerHeight - 168)
    : window.innerHeight - 200;
  const left = rect
    ? Math.min(Math.max(rect.left, 12), window.innerWidth - 300)
    : window.innerWidth / 2 - 144;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {rect && (
        <div
          className="ring-primary ring-offset-background absolute rounded-lg ring-2 ring-offset-2 transition-all duration-300"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}
      <div
        className="bg-background pointer-events-auto absolute w-72 rounded-xl border border-border p-3 shadow-2xl"
        style={{ top, left }}
      >
        <p className="text-sm font-semibold">{step.title}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {step.body}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
          >
            Skip tour
          </button>
          <Button type="button" size="sm" onClick={onNext}>
            {index < steps.length - 1 ? "Next" : "Got it"}
          </Button>
        </div>
        <div className="mt-2 flex gap-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className={
                i <= index
                  ? "bg-primary h-1 w-4 rounded-full"
                  : "bg-muted h-1 w-4 rounded-full"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
