import { useState } from "react";
import {
  Check,
  Clock,
  Compass,
  Download,
  GripVertical,
  Leaf,
  MapPinned,
  Pencil,
  Plane,
  Route,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
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
import { cn, flagEmoji, formatKm } from "@/lib/utils";
import { totalDistance } from "@/lib/distance";
import {
  co2Kg,
  flightHours,
  formatCo2,
  formatDuration,
  timezonesCrossed,
} from "@/lib/stats";
import { downloadFile, toGPX, toJSON } from "@/lib/share";
import type { Spot } from "@/types";

interface TripPanelProps {
  trip: Spot[];
  selectedId: string | null;
  isSample: boolean;
  onSelect: (spot: Spot) => void;
  onRemove: (id: string) => void;
  onReorder: (next: Spot[]) => void;
  onUpdate: (id: string, patch: Partial<Spot>) => void;
  onClear: () => void;
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
}: TripPanelProps) {
  const distance = totalDistance(trip);
  const countries = new Set(
    trip.map((s) => s.countryCode ?? s.country ?? s.name),
  ).size;

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
                  <StopItem
                    key={spot.id}
                    spot={spot}
                    index={i}
                    selected={selectedId === spot.id}
                    onSelect={onSelect}
                    onRemove={onRemove}
                    onUpdate={onUpdate}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <footer className="border-t border-border p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat icon={<MapPinned className="size-3.5" />} label="Stops" value={String(trip.length)} />
          <Stat icon={<Route className="size-3.5" />} label="Distance" value={formatKm(distance)} />
          <Stat icon={<Compass className="size-3.5" />} label="Countries" value={String(countries)} />
        </div>
        {trip.length >= 2 && (
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <Stat
              icon={<Plane className="size-3.5" />}
              label="Flight"
              value={formatDuration(flightHours(distance))}
            />
            <Stat
              icon={<Clock className="size-3.5" />}
              label="Zones"
              value={String(timezonesCrossed(trip))}
            />
            <Stat
              icon={<Leaf className="size-3.5" />}
              label="CO₂"
              value={formatCo2(co2Kg(distance))}
            />
          </div>
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
        </div>
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
      </footer>
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

function StopItem({
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

        <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
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
        ) : (
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
              {spot.note && (
                <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                  {spot.note}
                </span>
              )}
            </span>
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
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
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
