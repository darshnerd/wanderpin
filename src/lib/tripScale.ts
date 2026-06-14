import { haversine, totalDistance } from "@/lib/distance";
import type { Trip } from "@/types";

export type Scale = "stroll" | "weekend" | "regional" | "continental" | "epic";

export interface ScaleInfo {
  scale: Scale;
  altitude: number;
  copy: string;
  kicker: string;
}

export function tripCenter(trip: Trip): { lat: number; lng: number } {
  if (trip.length === 0) return { lat: 20, lng: 0 };
  let x = 0;
  let y = 0;
  let z = 0;
  for (const s of trip) {
    const lat = (s.lat * Math.PI) / 180;
    const lng = (s.lng * Math.PI) / 180;
    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }
  const n = trip.length;
  x /= n;
  y /= n;
  z /= n;
  const lng = Math.atan2(y, x);
  const hyp = Math.sqrt(x * x + y * y);
  const lat = Math.atan2(z, hyp);
  return { lat: (lat * 180) / Math.PI, lng: (lng * 180) / Math.PI };
}

function maxHop(trip: Trip): number {
  let m = 0;
  for (let i = 1; i < trip.length; i++) {
    m = Math.max(
      m,
      haversine(trip[i - 1].lat, trip[i - 1].lng, trip[i].lat, trip[i].lng),
    );
  }
  return m;
}

export function classify(trip: Trip): ScaleInfo {
  const d = Math.max(totalDistance(trip), maxHop(trip));
  if (d < 100)
    return { scale: "stroll", altitude: 0.2, copy: "A day out", kicker: "Done before lunch." };
  if (d < 1000)
    return { scale: "weekend", altitude: 0.45, copy: "A weekend journey", kicker: "Out Friday, back Sunday." };
  if (d < 5000)
    return { scale: "regional", altitude: 0.9, copy: "A regional adventure", kicker: "Countries before bedtime." };
  if (d < 15000)
    return { scale: "continental", altitude: 1.7, copy: "An adventure", kicker: "A continent in one trip." };
  return { scale: "epic", altitude: 2.5, copy: "An expedition", kicker: "Nearly around the planet." };
}
