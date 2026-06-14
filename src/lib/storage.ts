import type { Spot, Trip, ViewMode } from "@/types";

const TRIP_KEY = "wanderpin.trip";
const VIEW_KEY = "wanderpin.view";
const SAMPLE_KEY = "wanderpin.sample";
const LIBRARY_KEY = "wanderpin.library";
const SCHEMA_VERSION = 1;

interface TripEnvelope {
  v: number;
  trip: Spot[];
}

export interface TripDoc {
  id: string;
  name: string;
  trip: Spot[];
  updatedAt: number;
}

function isValidSpot(s: unknown): s is Spot {
  return (
    !!s &&
    typeof (s as Spot).lat === "number" &&
    typeof (s as Spot).lng === "number" &&
    typeof (s as Spot).name === "string"
  );
}

export function cleanSpot(s: Spot): Spot {
  return {
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    country: s.country,
    countryCode: s.countryCode,
    emoji: s.emoji,
    fact: s.fact,
    vibe: s.vibe,
    note: s.note,
    mode: s.mode,
    status: s.status,
  };
}

export function loadTrip(): Trip | null {
  try {
    const raw = localStorage.getItem(TRIP_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : parsed?.trip;
    if (!Array.isArray(arr)) return null;
    return arr.filter(isValidSpot).map(cleanSpot);
  } catch {
    return null;
  }
}

export function saveTrip(trip: Trip): void {
  try {
    const envelope: TripEnvelope = {
      v: SCHEMA_VERSION,
      trip: trip.map(cleanSpot),
    };
    localStorage.setItem(TRIP_KEY, JSON.stringify(envelope));
  } catch {
    return;
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
    return;
  }
}

export function loadIsSample(): boolean {
  return localStorage.getItem(SAMPLE_KEY) === "true";
}

export function saveIsSample(isSample: boolean): void {
  try {
    localStorage.setItem(SAMPLE_KEY, String(isSample));
  } catch {
    return;
  }
}

export function loadLibrary(): TripDoc[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const docs = Array.isArray(parsed) ? parsed : parsed?.trips;
    if (!Array.isArray(docs)) return [];
    return docs
      .filter(
        (d) =>
          d &&
          typeof d.id === "string" &&
          typeof d.name === "string" &&
          Array.isArray(d.trip),
      )
      .map((d) => ({ ...d, trip: d.trip.filter(isValidSpot).map(cleanSpot) }));
  } catch {
    return [];
  }
}

export function saveLibrary(docs: TripDoc[]): void {
  try {
    const clean = docs.map((d) => ({ ...d, trip: d.trip.map(cleanSpot) }));
    localStorage.setItem(LIBRARY_KEY, JSON.stringify({ v: 1, trips: clean }));
  } catch {
    return;
  }
}
