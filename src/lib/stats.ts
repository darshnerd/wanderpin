import type { Trip } from "@/types";

const CRUISE_KMH = 800;
const OVERHEAD_HOURS = 0.75; // rough taxi / climb / descent padding
const CO2_KG_PER_KM = 0.15; // ballpark per-passenger for a flight

export function flightHours(km: number): number {
  if (km <= 0) return 0;
  return km / CRUISE_KMH + OVERHEAD_HOURS;
}

export function formatDuration(hours: number): string {
  if (hours <= 0) return "0h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// rough count from the longitude spread of the trip (~15° per zone)
export function timezonesCrossed(trip: Trip): number {
  if (trip.length < 2) return 0;
  const lngs = trip.map((s) => s.lng);
  const span = Math.max(...lngs) - Math.min(...lngs);
  return Math.round(span / 15);
}

export function co2Kg(km: number): number {
  return km * CO2_KG_PER_KM;
}

export function formatCo2(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} t`;
  }
  return `${Math.round(kg).toLocaleString("en-US")} kg`;
}
