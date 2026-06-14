import { Building2, Globe2, Map as MapIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

const base =
  "inline-flex items-center gap-1.5 rounded-[7px] px-2.5 h-8 text-sm font-medium transition-colors cursor-pointer select-none";

const OPTIONS: { value: ViewMode; icon: typeof Globe2; label: string }[] = [
  { value: "globe", icon: Globe2, label: "Globe" },
  { value: "3d", icon: Building2, label: "3D" },
  { value: "map", icon: MapIcon, label: "2D" },
];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-background/90 p-0.5 shadow-xs backdrop-blur">
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              base,
              value === o.value
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
