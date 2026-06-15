import tzlookup from "tz-lookup";

const RAD = Math.PI / 180;

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}

export function subsolarPoint(date: Date): { lat: number; lng: number } {
  const n = dayOfYear(date);
  const decl = -23.44 * Math.cos(RAD * (360 / 365) * (n + 10));
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  const lng = -15 * (utcHours - 12);
  return { lat: decl, lng: ((lng + 540) % 360) - 180 };
}

export function localTimeAt(
  lat: number,
  lng: number,
  date: Date = new Date(),
): string {
  try {
    const tz = tzlookup(lat, lng);
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
    const local = new Date(utcMs + (lng / 15) * 3600000);
    const h = String(local.getHours()).padStart(2, "0");
    const m = String(local.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}

export function isDaylight(
  lat: number,
  lng: number,
  date: Date = new Date(),
): boolean {
  const s = subsolarPoint(date);
  const c =
    Math.sin(lat * RAD) * Math.sin(s.lat * RAD) +
    Math.cos(lat * RAD) * Math.cos(s.lat * RAD) * Math.cos((lng - s.lng) * RAD);
  return c > 0;
}
