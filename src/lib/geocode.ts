// wrappers around OpenStreetMap's Nominatim (no key needed)
const ENDPOINT = "https://nominatim.openstreetmap.org";

export interface GeocodeResult {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  country?: string;
  countryCode?: string;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: NominatimAddress;
}

function shortName(place: NominatimPlace): string {
  const a = place.address ?? {};
  return (
    place.name ||
    a.city ||
    a.town ||
    a.village ||
    a.hamlet ||
    a.municipality ||
    a.county ||
    a.state ||
    a.country ||
    place.display_name.split(",")[0]
  );
}

function toResult(place: NominatimPlace): GeocodeResult {
  return {
    name: shortName(place),
    displayName: place.display_name,
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
    country: place.address?.country,
    countryCode: place.address?.country_code,
  };
}

export async function searchPlaces(
  query: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url =
    `${ENDPOINT}/search?format=jsonv2&addressdetails=1&limit=${limit}` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`Nominatim search failed: ${res.status}`);
  const data = (await res.json()) as NominatimPlace[];
  return data.map(toResult);
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const url =
    `${ENDPOINT}/reverse?format=jsonv2&addressdetails=1` +
    `&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimPlace | { error: string };
  if ("error" in data) return null;
  return toResult(data);
}
