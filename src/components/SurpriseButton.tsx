import { Dices, Plus, X } from "lucide-react";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { flagEmoji } from "@/lib/utils";
import type { Spot } from "@/types";

interface SurpriseCardProps {
  spot: Spot | null;
  onSave: (spot: Spot) => void;
  onAgain: () => void;
  onDismiss: () => void;
}

export function SurpriseCard({ spot, onSave, onAgain, onDismiss }: SurpriseCardProps) {
  if (!spot) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-4 bg-card text-card-foreground relative w-[min(92vw,28rem)] overflow-hidden rounded-2xl border border-border p-5 shadow-2xl duration-500">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400" />
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground absolute top-3 right-3 cursor-pointer"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3">
          <span className="text-4xl leading-none">{spot.emoji ?? "📍"}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold tracking-tight">
                {spot.name}
              </h3>
              <span className="text-lg leading-none">
                {flagEmoji(spot.countryCode)}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {spot.country}
              {spot.vibe ? (
                <Badge variant="secondary" className="ml-2 align-middle">
                  {spot.vibe}
                </Badge>
              ) : null}
            </p>
          </div>
        </div>

        {spot.fact && (
          <p className="text-foreground/90 mt-3 text-sm leading-relaxed">
            {spot.fact}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" className="flex-1" onClick={() => onSave(spot)}>
            <Plus className="size-4" />
            Add to my trip
          </Button>
          <Button type="button" variant="outline" onClick={onAgain}>
            <Dices className="size-4" />
            Show me another
          </Button>
        </div>
      </div>
    </div>
  );
}
