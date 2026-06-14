import { makeId } from "@/lib/utils";
import type { Spot } from "@/types";

interface PlaceRecord {
  n: string;
  a: number;
  o: number;
  cc: string;
  v?: string;
  t?: string;
  cat?: string;
  p?: number;
  reg?: string;
  f?: string;
}

const GLYPHS: Record<string, string> = {
  beach: "🏖️",
  heritage: "🏛️",
  castle: "🏰",
  ruins: "🏺",
  sacred: "🛕",
  volcano: "🌋",
  peak: "⛰️",
  mountain: "⛰️",
  park: "🏞️",
  waterfall: "💧",
  cave: "🕳️",
  city: "🏙️",
  town: "🏘️",
  village: "🏡",
  adventure: "🧗",
  island: "🏝️",
  lake: "🌊",
  desert: "🏜️",
  wonder: "✨",
  attraction: "📷",
  landmark: "📍",
  nature: "🌿",
};

export function categoryGlyph(cat?: string): string {
  return (cat ? GLYPHS[cat] : undefined) ?? "📍";
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

interface PlacesCache {
  recs: PlaceRecord[];
  spots: Spot[];
  search: string[];
  cum: number[];
  total: number;
}

let cache: PlacesCache | null = null;
let loading: Promise<Spot[]> | null = null;

function toSpot(r: PlaceRecord): Spot {
  return {
    id: makeId(),
    name: r.n,
    lat: r.a,
    lng: r.o,
    countryCode: r.cc,
    emoji: categoryGlyph(r.cat),
    vibe: r.v,
    fact: r.f,
    category: r.cat,
    region: r.reg,
  };
}

function tierBoost(t?: string): number {
  if (t === "wonder" || t === "unesco") return 2.2;
  if (t === "landmark" || t === "attraction" || t === "destination") return 1.6;
  if (t === "town") return 0.8;
  if (t === "village") return 0.55;
  return 1;
}

export function loadPlaces(): Promise<Spot[]> {
  if (cache) return Promise.resolve(cache.spots);
  if (!loading) {
    loading = fetch("/places.json")
      .then((r) => r.json())
      .then((recs: PlaceRecord[]) => {
        const spots = recs.map(toSpot);
        const search = recs.map((r) => norm(`${r.n} ${r.reg ?? ""}`));
        const cum: number[] = [];
        let total = 0;
        for (const r of recs) {
          total += Math.sqrt((r.p ?? 1000) + 1) * tierBoost(r.t);
          cum.push(total);
        }
        cache = { recs, spots, search, cum, total };
        return spots;
      })
      .catch(() => {
        cache = { recs: [], spots: [], search: [], cum: [], total: 0 };
        return cache.spots;
      });
  }
  return loading;
}

export function warmPlaces(): void {
  void loadPlaces();
}

export function placesReady(): boolean {
  return !!cache && cache.spots.length > 0;
}

function weightedIndex(): number {
  const c = cache!;
  const x = Math.random() * c.total;
  let lo = 0;
  let hi = c.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (c.cum[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function pickRandomPlace(exclude: Set<string> = new Set()): Spot | null {
  if (!cache || !cache.spots.length) return null;
  for (let i = 0; i < 50; i++) {
    const s = cache.spots[weightedIndex()];
    if (!exclude.has(s.name)) return s;
  }
  return cache.spots[Math.floor(Math.random() * cache.spots.length)];
}

export function searchLocal(query: string, limit = 6): Spot[] {
  if (!cache) return [];
  const q = norm(query.trim());
  if (q.length < 2) return [];
  const starts: number[] = [];
  const has: number[] = [];
  for (let i = 0; i < cache.search.length; i++) {
    const s = cache.search[i];
    if (s.startsWith(q)) starts.push(i);
    else if (s.includes(q)) has.push(i);
  }
  const byPop = (a: number, b: number) =>
    (cache!.recs[b].p ?? 0) - (cache!.recs[a].p ?? 0);
  starts.sort(byPop);
  has.sort(byPop);
  return [...starts, ...has].slice(0, limit).map((i) => cache!.spots[i]);
}
