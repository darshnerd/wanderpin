import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const PUBLISHABLE = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

interface Stop {
  name: string;
  lat: number;
  lng: number;
  countryCode?: string;
}

const R = 6371;

function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function totalKm(trip: Stop[]): number {
  let sum = 0;
  for (let i = 1; i < trip.length; i++) {
    sum += haversine(trip[i - 1].lat, trip[i - 1].lng, trip[i].lat, trip[i].lng);
  }
  return sum;
}

function copyFor(km: number): string {
  if (km < 100) return "A day out";
  if (km < 1000) return "A weekend journey";
  if (km < 5000) return "A regional adventure";
  if (km < 15000) return "An adventure";
  return "An expedition";
}

function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(0)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

async function fetchTrip(slug: string): Promise<Stop[] | null> {
  if (!SUPABASE_URL || !PUBLISHABLE || !/^[A-Za-z0-9]+$/.test(slug)) return null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/trips?slug=eq.${slug}&select=data`,
      { headers: { apikey: PUBLISHABLE, Authorization: `Bearer ${PUBLISHABLE}` } },
    );
    if (!r.ok) return null;
    const rows = (await r.json()) as { data?: Stop[] }[];
    const data = rows?.[0]?.data;
    return Array.isArray(data) && data.length ? data : null;
  } catch {
    return null;
  }
}

function routeImage(trip: Stop[]): string {
  const w = 1200;
  const h = 630;
  const pts = trip.map((s) => {
    const lng = ((s.lng + 540) % 360) - 180;
    return {
      x: ((lng + 180) / 360) * w,
      y: ((90 - s.lat) / 180) * h,
    };
  });
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const dots = pts
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="7" fill="#fcd34d" stroke="#0b1120" stroke-width="3"/>`,
    )
    .join("");
  const grid = Array.from({ length: 11 }, (_, i) => {
    const y = (i / 10) * h;
    const x = (i / 10) * w;
    return `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#1e293b" stroke-width="1"/><line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#1e293b" stroke-width="1"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${grid}<polyline points="${line}" fill="none" stroke="#7dd3fc" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>${dots}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const trip = await fetchTrip(slug);

  const first = trip?.[0];
  const last = trip?.[trip.length - 1];
  const title = trip ? copyFor(totalKm(trip)) : "Plan trips on a living globe";
  const subtitle =
    first && last && first.name !== last.name
      ? `${first.name} to ${last.name}`
      : (first?.name ?? "Drop pins. Build a route. Watch it fly.");
  const countries = trip
    ? new Set(trip.map((s) => s.countryCode).filter(Boolean)).size
    : 0;
  const stats = trip
    ? [
        { label: "Stops", value: String(trip.length) },
        countries > 1
          ? { label: "Countries", value: String(countries) }
          : { label: "Places", value: String(new Set(trip.map((s) => s.name)).size) },
        { label: "Distance", value: formatKm(totalKm(trip)) },
      ]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0b1120 0%, #131c33 60%, #0b1120 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {trip && (
          <img
            src={routeImage(trip)}
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, opacity: 0.45 }}
          />
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "48px 56px 0",
            fontSize: "30px",
            fontWeight: 600,
            color: "#94a3b8",
          }}
        >
          <span style={{ color: "#7dd3fc" }}>✦</span>
          <span>wanderpin</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            padding: "0 56px 52px",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", fontSize: "76px", fontWeight: 800, lineHeight: 1.05 }}>
            {title}
          </div>
          <div style={{ display: "flex", marginTop: "14px", fontSize: "34px", color: "#cbd5e1" }}>
            {subtitle}
          </div>
          {stats.length > 0 && (
            <div style={{ display: "flex", gap: "48px", marginTop: "34px" }}>
              {stats.map((s) => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "46px", fontWeight: 800 }}>{s.value}</span>
                  <span
                    style={{
                      fontSize: "22px",
                      letterSpacing: "2px",
                      color: "#94a3b8",
                      textTransform: "uppercase",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
