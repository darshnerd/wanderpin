import { haversine } from "@/lib/distance";
import type { TransportMode, Trip } from "@/types";

interface ModeMeta {
  icon: string;
  label: string;
  kmh: number;
  overheadH: number;
  color: string;
  surface: boolean;
}

export const MODE_META: Record<TransportMode, ModeMeta> = {
  walk: { icon: "🚶", label: "Walk", kmh: 5, overheadH: 0, color: "#34d399", surface: true },
  car: { icon: "🚗", label: "Drive", kmh: 80, overheadH: 0.2, color: "#fbbf24", surface: true },
  train: { icon: "🚄", label: "Train", kmh: 120, overheadH: 0.3, color: "#f472b6", surface: true },
  flight: { icon: "✈️", label: "Flight", kmh: 800, overheadH: 0.75, color: "#38bdf8", surface: false },
  boat: { icon: "🚢", label: "Boat", kmh: 40, overheadH: 0.5, color: "#22d3ee", surface: true },
};

export const MODE_CYCLE: TransportMode[] = ["walk", "car", "train", "flight", "boat"];

export function defaultMode(km: number): TransportMode {
  if (km < 5) return "walk";
  if (km < 300) return "car";
  if (km < 1500) return "train";
  return "flight";
}

export function legKm(trip: Trip, i: number): number {
  if (i <= 0 || i >= trip.length) return 0;
  return haversine(trip[i - 1].lat, trip[i - 1].lng, trip[i].lat, trip[i].lng);
}

export function legMode(trip: Trip, i: number): TransportMode {
  if (i <= 0) return "flight";
  return trip[i].mode ?? defaultMode(legKm(trip, i));
}

export function legHours(km: number, mode: TransportMode): number {
  if (km <= 0) return 0;
  const m = MODE_META[mode];
  return km / m.kmh + m.overheadH;
}

export function tripHours(trip: Trip): number {
  let sum = 0;
  for (let i = 1; i < trip.length; i++) {
    sum += legHours(legKm(trip, i), legMode(trip, i));
  }
  return sum;
}
