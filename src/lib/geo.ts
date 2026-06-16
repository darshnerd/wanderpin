export interface GeoHint {
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
}

let cache: Promise<GeoHint | null> | null = null;

export function loadGeoHint(): Promise<GeoHint | null> {
  if (cache) return cache;
  cache = fetch("/api/geo")
    .then((r) => (r.ok ? (r.json() as Promise<GeoHint>) : null))
    .catch(() => null);
  return cache;
}
