import type { Spot, Trip, ViewMode } from "@/types";

const TRIP_KEY = "wanderpin.trip";
const VIEW_KEY = "wanderpin.view";
const SAMPLE_KEY = "wanderpin.sample";
const SCHEMA_VERSION = 1;

interface TripEnvelope {
  v: number;
  trip: Spot[];
}

function isValidSpot(s: unknown): s is Spot {
  return (
    !!s &&
    typeof (s as Spot).lat === "number" &&
    typeof (s as Spot).lng === "number" &&
    typeof (s as Spot).name === "string"
  );
}

export function loadTrip(): Trip | null {
  try {
    const raw = localStorage.getItem(TRIP_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : parsed?.trip;
    if (!Array.isArray(arr)) return null;
    return arr.filter(isValidSpot);
  } catch {
    return null;
  }
}

export function saveTrip(trip: Trip): void {
  try {
    const envelope: TripEnvelope = { v: SCHEMA_VERSION, trip };
    localStorage.setItem(TRIP_KEY, JSON.stringify(envelope));
  } catch {
  }
}

export function loadView(): ViewMode {
  const v = localStorage.getItem(VIEW_KEY);
  return v === "map" || v === "globe" ? v : "globe";
}

export function saveView(view: ViewMode): void {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
  }
}

export function loadIsSample(): boolean {
  return localStorage.getItem(SAMPLE_KEY) === "true";
}

export function saveIsSample(isSample: boolean): void {
  try {
    localStorage.setItem(SAMPLE_KEY, String(isSample));
  } catch {
    // ignore
  }
}
