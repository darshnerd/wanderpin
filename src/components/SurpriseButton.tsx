import { useState } from "react";
import { Dices, Star, X } from "lucide-react";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { pickRandomDestination } from "@/data/destinations";
import { flagEmoji } from "@/lib/utils";
import type { Spot } from "@/types";

interface SurpriseButtonProps {
  onFly: (lat: number, lng: number) => void;
  onSave: (spot: Spot) => void;
}

export function SurpriseButton({ onFly, onSave }: SurpriseButtonProps) {
  const [current, setCurrent] = useState<Spot | null>(null);

  function roll() {
    const next = pickRandomDestination(current ? [current.id] : []);
    setCurrent(next);
    onFly(next.lat, next.lng);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={roll} className="bg-background/90 shadow-sm backdrop-blur">
        <Dices className="size-4" />
        <span className="hidden sm:inline">Surprise me</span>
      </Button>

      {current && (
        <div className="fixed bottom-6 left-1/2 z-40 w-[min(92vw,26rem)] -translate-x-1/2">
          <div className="bg-card text-card-foreground relative rounded-xl border border-border p-4 shadow-2xl">
            <button
              type="button"
              onClick={() => setCurrent(null)}
              aria-label="Dismiss"
              className="text-muted-foreground hover:text-foreground absolute top-3 right-3 cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-start gap-3">
              <span className="text-3xl leading-none">{current.emoji ?? "📍"}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-semibold">
                    {current.name}
                  </h3>
                  <span className="text-lg leading-none">
                    {flagEmoji(current.countryCode)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {current.country}
                  {current.vibe ? (
                    <Badge variant="secondary" className="ml-2 align-middle">
                      {current.vibe}
                    </Badge>
                  ) : null}
                </p>
              </div>
            </div>

            <p className="text-foreground/90 mt-3 text-sm leading-relaxed">
              {current.fact}
            </p>

            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  onSave(current);
                  setCurrent(null);
                }}
              >
                <Star className="size-4" />
                Save to trip
              </Button>
              <Button type="button" variant="outline" onClick={roll}>
                <Dices className="size-4" />
                Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
