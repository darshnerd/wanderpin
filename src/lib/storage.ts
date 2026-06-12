import type { Spot, Trip, ViewMode } from "@/types";

const TRIP_KEY = "wanderpin.trip";
const VIEW_KEY = "wanderpin.view";
const SAMPLE_KEY = "wanderpin.sample";

export function loadTrip(): Trip | null {
  try {
    const raw = localStorage.getItem(TRIP_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Spot[];
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (s) =>
        s &&
        typeof s.lat === "number" &&
        typeof s.lng === "number" &&
        typeof s.name === "string",
    );
  } catch {
    return null;
  }
}

export function saveTrip(trip: Trip): void {
  try {
    localStorage.setItem(TRIP_KEY, JSON.stringify(trip));
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
  }
}
