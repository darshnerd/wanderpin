import { useSyncExternalStore } from "react";
import type { Spot } from "@/types";

export type Tour = { spot: Spot; i: number; total: number } | null;

let tour: Tour = null;
const subs = new Set<() => void>();

export function setTour(t: Tour): void {
  tour = t;
  subs.forEach((f) => f());
}

function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function useTour(): Tour {
  return useSyncExternalStore(
    subscribe,
    () => tour,
    () => tour,
  );
}
