import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Play, Plus } from "lucide-react";

import { Button } from "./ui/button";
import { cn, flagEmoji } from "@/lib/utils";
import {
  groupByDay,
  hasDays,
  moveStopByDelta,
  organizeIntoDays,
} from "@/lib/journey";
import type { Spot } from "@/types";

interface DayTimelineProps {
  trip: Spot[];
  selectedId: string | null;
  onSelect: (spot: Spot) => void;
  onReorder: (next: Spot[]) => void;
  onFitDay: (spots: Spot[]) => void;
  onPlayDay: (spots: Spot[]) => void;
}

export function DayTimeline({
  trip,
  selectedId,
  onSelect,
  onReorder,
  onFitDay,
  onPlayDay,
}: DayTimelineProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  if (trip.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 text-4xl">🗓️</div>
        <p className="text-sm text-muted-foreground">
          Add a few stops, then organize them into days.
        </p>
      </div>
    );
  }

  if (!hasDays(trip)) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <CalendarDays className="mb-3 size-8 text-primary" />
        <p className="text-base font-semibold tracking-tight">
          Planning a longer trip?
        </p>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          Group your stops into days to pace the journey. You can split and
          rearrange them however you like.
        </p>
        <Button
          type="button"
          className="mt-5"
          onClick={() => onReorder(organizeIntoDays(trip))}
        >
          <CalendarDays className="size-4" />
          Organize into days
        </Button>
      </div>
    );
  }

  const groups = groupByDay(trip);

  function toggle(day: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  return (
    <div className="space-y-2 py-1">
      {groups.map((g) => {
        const open = !collapsed.has(g.day);
        return (
          <div
            key={g.day}
            className="overflow-hidden rounded-lg border border-border"
          >
            <div className="flex items-center gap-1 bg-muted/40 px-2 py-1.5">
              <button
                type="button"
                onClick={() => onFitDay(g.stops)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
                aria-label={`Fit globe to day ${g.day}`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {g.day}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    Day {g.day}
                  </span>
                  <span className="text-muted-foreground block truncate text-[11px]">
                    {g.stops.map((s) => s.name).join(" · ")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onPlayDay(g.stops)}
                aria-label={`Play day ${g.day}`}
                title="Play this day"
                disabled={g.stops.length < 2}
                className="text-muted-foreground hover:text-foreground rounded-md p-1 cursor-pointer disabled:opacity-40"
              >
                <Play className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => toggle(g.day)}
                aria-label={open ? "Collapse day" : "Expand day"}
                className="text-muted-foreground hover:text-foreground rounded-md p-1 cursor-pointer"
              >
                {open ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
            </div>

            {open && (
              <ul className="divide-y divide-border/60">
                {g.stops.map((spot) => (
                  <li
                    key={spot.id}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-2",
                      selectedId === spot.id && "bg-accent",
                    )}
                  >
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
                        {(spot.region || spot.country) && (
                          <span className="text-muted-foreground block truncate text-[11px]">
                            {[spot.region, spot.country]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onReorder(moveStopByDelta(trip, spot.id, -1))}
                        disabled={g.day <= 1}
                        aria-label="Move to previous day"
                        title="Move to previous day"
                        className="text-muted-foreground hover:text-foreground rounded-md p-1 cursor-pointer disabled:opacity-30"
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onReorder(moveStopByDelta(trip, spot.id, 1))}
                        aria-label="Move to next day"
                        title="Move to next day"
                        className="text-muted-foreground hover:text-foreground rounded-md p-1 cursor-pointer"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => {
          const last = trip[trip.length - 1];
          if (last) onReorder(moveStopByDelta(trip, last.id, 1));
        }}
        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs cursor-pointer"
      >
        <Plus className="size-3.5" />
        New day from last stop
      </button>
    </div>
  );
}
