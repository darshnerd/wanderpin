import { haversine } from "./distance";
import type { Spot } from "@/types";

function leg(a: Spot, b: Spot): number {
  return haversine(a.lat, a.lng, b.lat, b.lng);
}

function routeDistance(trip: Spot[]): number {
  let sum = 0;
  for (let i = 1; i < trip.length; i++) sum += leg(trip[i - 1], trip[i]);
  return sum;
}

function nearestNeighbor(trip: Spot[]): Spot[] {
  const remaining = trip.slice(1);
  const out: Spot[] = [trip[0]];
  while (remaining.length > 0) {
    const last = out[out.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = leg(last, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    out.push(remaining.splice(bestIdx, 1)[0]);
  }
  return out;
}

function twoOpt(trip: Spot[]): Spot[] {
  let best = trip.slice();
  let bestDist = routeDistance(best);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = best
          .slice(0, i)
          .concat(best.slice(i, j + 1).reverse(), best.slice(j + 1));
        const dist = routeDistance(candidate);
        if (dist + 1e-9 < bestDist) {
          best = candidate;
          bestDist = dist;
          improved = true;
        }
      }
    }
  }
  return best;
}

export function optimizeOrder(trip: Spot[]): Spot[] {
  if (trip.length < 3) return trip;
  return twoOpt(nearestNeighbor(trip));
}
