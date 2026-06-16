import { Fragment, lazy, memo, Suspense, useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock,
  Compass,
  Download,
  GripVertical,
  Heart,
  Leaf,
  Navigation,
  Pencil,
  Plane,
  Route,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./ui/hover-card";
import { cn, flagEmoji, formatKm } from "@/lib/utils";
import { totalDistance } from "@/lib/distance";
import { co2Kg, formatCo2, formatDuration, timezonesCrossed } from "@/lib/stats";
import { MODE_CYCLE, MODE_META, legKm, legMode, tripHours } from "@/lib/transport";
import { isDaylight, localTimeAt } from "@/lib/sun";
import { hasDays } from "@/lib/journey";
import {
  continentsOf,
  currenciesOf,
  languagesOf,
  useCountries,
} from "@/lib/countries";
import { fetchWeatherNow, type WeatherNow } from "@/lib/weather";
import {
  downloadFile,
  googleMapsUrl,
  MAPS_MAX_STOPS,
  toGPX,
  toJSON,
} from "@/lib/share";
import type { Spot, StopStatus } from "@/types";

const DayTimeline = lazy(() =>
  import("./DayTimeline").then((m) => ({ default: m.DayTimeline })),
);

const STATUS_CYCLE: StopStatus[] = ["someday", "booked", "visited"];
const STATUS_META: Record<StopStatus, { label: string; color: string }> = {
  someday: { label: "Someday", color: "#f59e0b" },
  booked: { label: "Booked", color: "#38bdf8" },
  visited: { label: "Visited", color: "#fcd34d" },
};

const ric: (cb: () => void) => number =
  typeof window !== "undefined" && typeof window.requestIdleCallback === "function"
    ? (cb) => window.requestIdleCallback(cb)
    : (cb) => window.setTimeout(cb, 200);
const cic: (id: number) => void =
  typeof window !== "undefined" && typeof window.cancelIdleCallback === "function"
    ? (id) => window.cancelIdleCallback(id)
    : (id) => window.clearTimeout(id);

function useWeather(lat: number, lng: number, enabled: boolean): WeatherNow | null {
  const [w, setW] = useState<WeatherNow | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const id = ric(() => {
      void fetchWeatherNow(lat, lng).then((r) => {
        if (alive) setW(r);
      });
    });
    return () => {
      alive = false;
      cic(id);
    };
  }, [lat, lng, enabled]);
  return w;
}

interface TripPanelProps {
  trip: Spot[];
  selectedId: string | null;
  isSample: boolean;
  onSelect: (spot: Spot) => void;
  onRemove: (id: string) => void;
  onReorder: (next: Spot[]) => void;
  onUpdate: (id: string, patch: Partial<Spot>) => void;
  onClear: () => void;
  onInspire?: () => void;
  onFitDay: (spots: Spot[]) => void;
  onPlayDay: (spots: Spot[]) => void;
}

export function TripPanel({
  trip,
  selectedId,
  isSample,
  onSelect,
  onRemove,
  onReorder,
  onUpdate,
  onClear,
  onInspire,
  onFitDay,
  onPlayDay,
}: TripPanelProps) {
  const [mode, setMode] = useState<"stops" | "days">(() =>
    hasDays(trip) ? "days" : "stops",
  );
  const countryMap = useCountries();
  const continents = useMemo(
    () => continentsOf(trip, countryMap),
    [trip, countryMap],
  );
  const currencies = useMemo(
    () => currenciesOf(trip, countryMap),
    [trip, countryMap],
  );
  const languages = useMemo(
    () => languagesOf(trip, countryMap),
    [trip, countryMap],
  );
  const countries = useMemo(
    () => new Set(trip.map((s) => s.countryCode ?? s.country ?? s.name)).size,
    [trip],
  );
  const visited = useMemo(
    () => trip.filter((s) => s.status === "visited").length,
    [trip],
  );
  const stats = useMemo(() => {
    const distance = totalDistance(trip);
    return {
      distance: formatKm(distance),
      time: formatDuration(tripHours(trip)),
      zones: String(timezonesCrossed(trip)),
      co2: formatCo2(co2Kg(distance)),
    };
  }, [trip]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = trip.findIndex((s) => s.id === active.id);
    const to = trip.findIndex((s) => s.id === over.id);
    if (from === -1 || to === -1) return;
    onReorder(arrayMove(trip, from, to));
  }

  function cycleMode(i: number) {
    const cur = legMode(trip, i);
    const next = MODE_CYCLE[(MODE_CYCLE.indexOf(cur) + 1) % MODE_CYCLE.length];
    onUpdate(trip[i].id, { mode: next });
  }

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

      {trip.length > 0 && (
        <div className="px-4 pb-2">
          <div className="inline-flex w-full rounded-md border border-border bg-background p-0.5">
            {(["stops", "days"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  "flex-1 rounded-[5px] px-2 py-1 text-xs font-medium capitalize transition-colors cursor-pointer",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {mode === "days" ? (
          <Suspense
            fallback={
              <div className="p-6 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            }
          >
            <DayTimeline
              trip={trip}
              selectedId={selectedId}
              onSelect={onSelect}
              onReorder={onReorder}
              onFitDay={onFitDay}
              onPlayDay={onPlayDay}
            />
          </Suspense>
        ) : trip.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 text-5xl">🌍</div>
            <p className="text-base font-semibold tracking-tight">
              Where are you dreaming of?
            </p>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              Drop a pin anywhere on the globe — or let us surprise you with
              somewhere worth the trip.
            </p>
            {onInspire && (
              <Button type="button" className="mt-5" onClick={onInspire}>
                <Sparkles className="size-4" />
                Take me somewhere
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={trip.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="space-y-1 py-1">
                {trip.map((spot, i) => (
                  <Fragment key={spot.id}>
                    {i > 0 && (
                      <LegConnector trip={trip} i={i} onCycle={cycleMode} />
                    )}
                    <StopItem
                      spot={spot}
                      index={i}
                      selected={selectedId === spot.id}
                      onSelect={onSelect}
                      onRemove={onRemove}
                      onUpdate={onUpdate}
                    />
                  </Fragment>
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {trip.length > 0 && (
        <footer className="border-t border-border p-4">
          <div className="bg-primary/5 rounded-xl px-3 py-3 text-center">
            <p className="text-sm font-semibold tracking-tight">
              {trip.length} {trip.length === 1 ? "stop" : "stops"}
              {countries > 1 ? ` · ${countries} countries` : ""}
              {visited > 0 ? ` · ${visited} visited` : ""}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {trip.length === 1
                ? "Every journey starts with a single pin."
                : trip.length === 2
                  ? "A line drawn across the world."
                  : "An adventure taking shape — where to next?"}
            </p>
          </div>

          {trip.length >= 2 && (
            <Accordion type="single" collapsible className="mt-1">
              <AccordionItem value="details">
                <AccordionTrigger>Trip details</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <Stat
                      icon={<Route className="size-3.5" />}
                      label="Distance"
                      value={stats.distance}
                    />
                    <Stat
                      icon={<Plane className="size-3.5" />}
                      label="Time"
                      value={stats.time}
                    />
                    <Stat
                      icon={<Clock className="size-3.5" />}
                      label="Zones"
                      value={stats.zones}
                    />
                    <Stat
                      icon={<Leaf className="size-3.5" />}
                      label="CO₂"
                      value={stats.co2}
                    />
                    {continents.length > 0 && (
                      <Stat
                        icon={<span className="text-[13px] leading-none">🌍</span>}
                        label="Continents"
                        value={String(continents.length)}
                      />
                    )}
                    {currencies.length > 0 && (
                      <Stat
                        icon={<span className="text-[13px] leading-none">💱</span>}
                        label="Currencies"
                        value={String(currencies.length)}
                      />
                    )}
                    {languages.length > 0 && (
                      <Stat
                        icon={<span className="text-[13px] leading-none">🗣️</span>}
                        label="Languages"
                        value={String(languages.length)}
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={trip.length === 0}
              onClick={() =>
                downloadFile(
                  "wanderpin-trip.json",
                  toJSON(trip),
                  "application/json",
                )
              }
            >
              <Download className="size-4" />
              JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={trip.length === 0}
              onClick={() =>
                downloadFile(
                  "wanderpin-trip.gpx",
                  toGPX(trip),
                  "application/gpx+xml",
                )
              }
            >
              <Download className="size-4" />
              GPX
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={trip.length === 0}
              onClick={() => {
                if (trip.length > MAPS_MAX_STOPS) {
                  toast(`Maps shows the first ${MAPS_MAX_STOPS} stops`);
                }
                window.open(
                  googleMapsUrl(trip),
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <Navigation className="size-4" />
              Maps
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full"
            disabled={trip.length < 3}
            onClick={async () => {
              const before = totalDistance(trip);
              const { optimizeOrder } = await import("@/lib/optimize");
              const next = optimizeOrder(trip);
              onReorder(next);
              const saved = before - totalDistance(next);
              toast(
                saved > 1
                  ? `Optimized: saved ${formatKm(saved)}`
                  : "Already optimal",
              );
            }}
          >
            <Sparkles className="size-4" />
            Optimize route
          </Button>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full"
            disabled={trip.length === 0}
            onClick={onClear}
          >
            <Trash2 className="size-4" />
            Clear all
          </Button>
          <p className="text-muted-foreground/70 mt-4 flex items-center justify-center gap-1 text-[11px]">
            Made with{" "}
            <Heart className="size-3 fill-rose-500 text-rose-500" /> in Stardance
            by Darsh
          </p>
        </footer>
      )}
    </div>
  );
}

function LegConnector({
  trip,
  i,
  onCycle,
}: {
  trip: Spot[];
  i: number;
  onCycle: (i: number) => void;
}) {
  const meta = MODE_META[legMode(trip, i)];
  const km = legKm(trip, i);
  return (
    <div className="flex items-center gap-2 pb-1 pl-9 pr-2">
      <button
        type="button"
        onClick={() => onCycle(i)}
        aria-label={`Arrive in ${trip[i].name} by ${meta.label}. Tap to change.`}
        title="Tap to change transport"
        className="flex cursor-pointer items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-muted"
      >
        <span className="leading-none">{meta.icon}</span>
        <span>{meta.label}</span>
      </button>
      <span className="text-muted-foreground text-[11px]">{formatKm(km)}</span>
    </div>
  );
}

interface StopItemProps {
  spot: Spot;
  index: number;
  selected: boolean;
  onSelect: (spot: Spot) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Spot>) => void;
}

const StopItem = memo(function StopItem({
  spot,
  index,
  selected,
  onSelect,
  onRemove,
  onUpdate,
}: StopItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: spot.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(spot.name);
  const [emoji, setEmoji] = useState(spot.emoji ?? "");
  const [note, setNote] = useState(spot.note ?? "");
  const weather = useWeather(spot.lat, spot.lng, selected);
  const day = useMemo(() => isDaylight(spot.lat, spot.lng), [spot.lat, spot.lng]);
  const localTime = useMemo(
    () => localTimeAt(spot.lat, spot.lng),
    [spot.lat, spot.lng],
  );
  const status: StopStatus = spot.status ?? "someday";
  const statusMeta = STATUS_META[status];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function startEdit() {
    setName(spot.name);
    setEmoji(spot.emoji ?? "");
    setNote(spot.note ?? "");
    setEditing(true);
  }

  function save() {
    onUpdate(spot.id, {
      name: name.trim() || spot.name,
      emoji: emoji.trim() || undefined,
      note: note.trim() || undefined,
    });
    setEditing(false);
  }

  function cycleStatus() {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length];
    onUpdate(spot.id, { status: next });
  }

  const label = (
    <>
      <span className="text-lg leading-none">
        {spot.emoji ?? flagEmoji(spot.countryCode)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{spot.name}</span>
        {(spot.region || spot.country) && (
          <span className="text-muted-foreground block truncate text-[11px]">
            {[spot.region, spot.country].filter(Boolean).join(", ")}
          </span>
        )}
        {spot.vibe && (
          <Badge
            variant="secondary"
            className="mt-0.5 px-1.5 py-0 text-[10px]"
          >
            {spot.vibe}
          </Badge>
        )}
        {spot.note && (
          <span className="text-muted-foreground mt-0.5 block truncate text-xs">
            {spot.note}
          </span>
        )}
        <span className="text-muted-foreground/80 mt-0.5 flex items-center gap-1 text-[11px]">
          {!day && !weather && <span>🌙</span>}
          <span className="tabular-nums">{localTime}</span>
          {weather && (
            <span>
              · {!day && weather.code <= 1 ? "🌙" : weather.glyph} {weather.tempC}°
            </span>
          )}
        </span>
      </span>
    </>
  );

  const selectButton = (
    <button
      type="button"
      onClick={() => onSelect(spot)}
      className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
    >
      {label}
    </button>
  );

  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && "relative z-10")}>
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-lg px-1.5 py-2 transition-colors",
          selected ? "bg-accent" : "hover:bg-accent/60",
        )}
      >
        <button
          type="button"
          aria-label="Drag to reorder"
          className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 cursor-grab touch-none active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{
            backgroundColor: `${statusMeta.color}22`,
            color: statusMeta.color,
          }}
        >
          {index + 1}
        </span>

        {editing ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex gap-1.5">
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="h-8 w-12 px-0 text-center"
                placeholder="📍"
                aria-label="Emoji"
              />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="h-8 flex-1"
                placeholder="Name"
                aria-label="Stop name"
                autoFocus
              />
            </div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-8 text-xs"
              placeholder="Add a note…"
              aria-label="Note"
            />
          </div>
        ) : spot.fact ? (
          <HoverCard>
            <HoverCardTrigger asChild>{selectButton}</HoverCardTrigger>
            <HoverCardContent align="start" className="w-72">
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Why go
              </p>
              <p className="mt-1 text-sm leading-relaxed">{spot.fact}</p>
            </HoverCardContent>
          </HoverCard>
        ) : (
          selectButton
        )}

        {!editing && (
          <button
            type="button"
            onClick={cycleStatus}
            aria-label={`Status: ${statusMeta.label}. Tap to change.`}
            title="Someday / Booked / Visited"
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium"
            style={{ color: statusMeta.color }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: statusMeta.color }}
            />
            {statusMeta.label}
          </button>
        )}

        {editing ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              aria-label="Save"
              onClick={save}
              className="text-muted-foreground hover:text-primary rounded-md p-1 cursor-pointer"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => setEditing(false)}
              className="text-muted-foreground hover:text-foreground rounded-md p-1 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
            <button
              type="button"
              aria-label={`Edit ${spot.name}`}
              onClick={startEdit}
              className="text-muted-foreground hover:text-foreground rounded-md p-1 cursor-pointer"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Remove ${spot.name}`}
              onClick={() => onRemove(spot.id)}
              className="text-muted-foreground hover:text-destructive rounded-md p-1 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
});

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
