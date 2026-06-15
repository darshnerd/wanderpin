import type { Spot, Trip } from "@/types";

export interface DayGroup {
  day: number;
  stops: Spot[];
}

export function hasDays(trip: Trip): boolean {
  return trip.some((s) => typeof s.day === "number");
}

export function normalizeDays(trip: Trip): Trip {
  if (!hasDays(trip)) return trip;
  let prev = 1;
  const filled = trip.map((s) => {
    let d = typeof s.day === "number" ? s.day : prev;
    if (d < prev) d = prev;
    prev = d;
    return d;
  });
  let cur = 0;
  let lastRaw = -Infinity;
  const dense = filled.map((d) => {
    if (d > lastRaw) {
      cur += 1;
      lastRaw = d;
    }
    return cur;
  });
  return trip.map((s, i) => (s.day === dense[i] ? s : { ...s, day: dense[i] }));
}

export function dayCount(trip: Trip): number {
  return normalizeDays(trip).reduce((m, s) => Math.max(m, s.day ?? 0), 0);
}

export function groupByDay(trip: Trip): DayGroup[] {
  const norm = normalizeDays(trip);
  const groups: DayGroup[] = [];
  for (const s of norm) {
    const d = s.day ?? 1;
    const last = groups[groups.length - 1];
    if (!last || last.day !== d) {
      groups.push({ day: d, stops: [s] });
    } else {
      last.stops.push(s);
    }
  }
  return groups;
}

export function organizeIntoDays(trip: Trip): Trip {
  return trip.map((s) => ({ ...s, day: 1 }));
}

export function clearDays(trip: Trip): Trip {
  if (!hasDays(trip)) return trip;
  return trip.map((s) => {
    if (s.day === undefined) return s;
    const copy = { ...s };
    delete copy.day;
    return copy;
  });
}

export function moveStopToDay(trip: Trip, id: string, targetDay: number): Trip {
  const norm = normalizeDays(trip);
  const from = norm.findIndex((s) => s.id === id);
  if (from < 0) return norm;
  const stop = norm[from];
  const curDay = stop.day ?? 1;
  const target = Math.max(1, Math.min(targetDay, dayCount(norm) + 1));
  if (target === curDay) return norm;
  const rest = norm.filter((_, i) => i !== from);
  let insertAt: number;
  if (target > curDay) {
    const firstIdx = rest.findIndex((s) => (s.day ?? 1) === target);
    insertAt = firstIdx >= 0 ? firstIdx : rest.length;
  } else {
    let lastIdx = -1;
    rest.forEach((s, i) => {
      if ((s.day ?? 1) === target) lastIdx = i;
    });
    insertAt = lastIdx >= 0 ? lastIdx + 1 : 0;
  }
  rest.splice(insertAt, 0, { ...stop, day: target });
  return normalizeDays(rest);
}

export function moveStopByDelta(trip: Trip, id: string, delta: number): Trip {
  const norm = normalizeDays(trip);
  const stop = norm.find((s) => s.id === id);
  if (!stop) return norm;
  return moveStopToDay(norm, id, (stop.day ?? 1) + delta);
}
