import { Compass, MapPinned, Route, Sparkles, Trash2, X } from "lucide-react";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn, flagEmoji, formatKm } from "@/lib/utils";
import { totalDistance } from "@/lib/distance";
import type { Spot } from "@/types";

interface TripPanelProps {
  trip: Spot[];
  selectedId: string | null;
  isSample: boolean;
  onSelect: (spot: Spot) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function TripPanel({
  trip,
  selectedId,
  isSample,
  onSelect,
  onRemove,
  onClear,
}: TripPanelProps) {
  const distance = totalDistance(trip);
  const countries = new Set(
    trip.map((s) => s.countryCode ?? s.country ?? s.name),
  ).size;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Compass className="text-primary size-5" />
        <h2 className="text-lg font-semibold tracking-tight">My Trip</h2>
        <span className="text-muted-foreground ml-auto text-xs uppercase tracking-wide">
          {trip.length} {trip.length === 1 ? "stop" : "stops"}
        </span>
      </header>

      {isSample && trip.length > 0 && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Sample trip — clear it and make your own, or click the map to add a
            stop.
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {trip.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MapPinned className="text-muted-foreground/60 mb-3 size-10" />
            <p className="text-sm font-medium">Your map's a blank canvas</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Click anywhere on the map or hit 🎲 Surprise me to start a trip.
            </p>
          </div>
        ) : (
          <ol className="space-y-1 py-1">
            {trip.map((spot, i) => (
              <li key={spot.id}>
                <div
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors",
                    selectedId === spot.id
                      ? "bg-accent"
                      : "hover:bg-accent/60",
                  )}
                >
                  <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelect(spot)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
                  >
                    <span className="text-lg leading-none">
                      {spot.emoji ?? flagEmoji(spot.countryCode)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {spot.name}
                      </span>
                      {spot.vibe && (
                        <Badge
                          variant="secondary"
                          className="mt-0.5 px-1.5 py-0 text-[10px]"
                        >
                          {spot.vibe}
                        </Badge>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${spot.name}`}
                    onClick={() => onRemove(spot.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <footer className="border-t border-border p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat icon={<MapPinned className="size-3.5" />} label="Stops" value={String(trip.length)} />
          <Stat icon={<Route className="size-3.5" />} label="Distance" value={formatKm(distance)} />
          <Stat icon={<Compass className="size-3.5" />} label="Countries" value={String(countries)} />
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          disabled={trip.length === 0}
          onClick={onClear}
        >
          <Trash2 className="size-4" />
          Clear all
        </Button>
      </footer>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/50 rounded-lg px-1.5 py-2">
      <div className="text-muted-foreground flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
