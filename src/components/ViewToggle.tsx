import { Globe2, Map as MapIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

const base =
  "inline-flex items-center gap-1.5 rounded-[7px] px-3 h-8 text-sm font-medium transition-colors cursor-pointer select-none";

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-background/90 p-0.5 shadow-xs backdrop-blur">
      <button
        type="button"
        aria-pressed={value === "globe"}
        onClick={() => onChange("globe")}
        className={cn(
          base,
          value === "globe"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Globe2 className="size-4" />
        <span className="hidden sm:inline">3D</span>
      </button>
      <button
        type="button"
        aria-pressed={value === "map"}
        onClick={() => onChange("map")}
        className={cn(
          base,
          value === "map"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <MapIcon className="size-4" />
        <span className="hidden sm:inline">2D</span>
      </button>
    </div>
  );
}
