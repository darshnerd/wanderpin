import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

import { makeId } from "./utils";
import type { Trip } from "@/types";

const HASH_PREFIX = "#t=";

function pack(trip: Trip) {
  return trip.map((s) => ({
    n: s.name,
    a: s.lat,
    o: s.lng,
    c: s.country,
    cc: s.countryCode,
    e: s.emoji,
    v: s.vibe,
    f: s.fact,
    t: s.note,
    k: s.category,
    r: s.region,
    d: s.day,
  }));
}

export function encodeTrip(trip: Trip): string {
  return compressToEncodedURIComponent(JSON.stringify(pack(trip)));
}

export function decodeTrip(payload: string): Trip | null {
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    const packed = JSON.parse(json);
    if (!Array.isArray(packed)) return null;
    return packed
      .filter(
        (p) =>
          p &&
          typeof p.a === "number" &&
          typeof p.o === "number" &&
          typeof p.n === "string",
      )
      .map((p) => ({
        id: makeId(),
        name: p.n,
        lat: p.a,
        lng: p.o,
        country: p.c,
        countryCode: p.cc,
        emoji: p.e,
        vibe: p.v,
        fact: p.f,
        note: p.t,
        category: p.k,
        region: p.r,
        day: typeof p.d === "number" ? p.d : undefined,
      }));
  } catch {
    return null;
  }
}

export function buildShareUrl(trip: Trip): string {
  return `${location.origin}${location.pathname}${HASH_PREFIX}${encodeTrip(trip)}`;
}

export function tripFromHash(): Trip | null {
  if (!location.hash.startsWith(HASH_PREFIX)) return null;
  const payload = location.hash.slice(HASH_PREFIX.length);
  return payload ? decodeTrip(payload) : null;
}

export function clearHash(): void {
  if (location.hash.startsWith(HASH_PREFIX)) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<"
      ? "&lt;"
      : c === ">"
        ? "&gt;"
        : c === "&"
          ? "&amp;"
          : c === "'"
            ? "&apos;"
            : "&quot;",
  );
}

export function toJSON(trip: Trip): string {
  return JSON.stringify(trip, null, 2);
}

export function toGPX(trip: Trip): string {
  const wpts = trip
    .map(
      (s) =>
        `  <wpt lat="${s.lat}" lon="${s.lng}">\n    <name>${escapeXml(s.name)}</name>${
          s.note ? `\n    <desc>${escapeXml(s.note)}</desc>` : ""
        }\n  </wpt>`,
    )
    .join("\n");
  const rtepts = trip
    .map(
      (s) =>
        `    <rtept lat="${s.lat}" lon="${s.lng}"><name>${escapeXml(s.name)}</name></rtept>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Wanderpin" xmlns="http://www.topografix.com/GPX/1/1">
${wpts}
  <rte>
    <name>Wanderpin trip</name>
${rtepts}
  </rte>
</gpx>`;
}

export const MAPS_MAX_STOPS = 11;

export function googleMapsUrl(trip: Trip): string {
  const coord = (s: { lat: number; lng: number }) => `${s.lat},${s.lng}`;
  if (trip.length === 0) return "https://www.google.com/maps";
  if (trip.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      coord(trip[0]),
    )}`;
  }
  const params = new URLSearchParams({
    api: "1",
    origin: coord(trip[0]),
    destination: coord(trip[trip.length - 1]),
  });
  const middle = trip.slice(1, -1).slice(0, 9);
  if (middle.length > 0) params.set("waypoints", middle.map(coord).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function downloadFile(
  filename: string,
  content: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
