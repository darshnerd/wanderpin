import type { IncomingMessage, ServerResponse } from "node:http";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const PUBLISHABLE = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

interface Stop {
  name: string;
  lat: number;
  lng: number;
  countryCode?: string;
}

const R = 6371;

function totalKm(trip: Stop[]): number {
  const r = Math.PI / 180;
  let sum = 0;
  for (let i = 1; i < trip.length; i++) {
    const a = trip[i - 1];
    const b = trip[i];
    const dLat = (b.lat - a.lat) * r;
    const dLng = (b.lng - a.lng) * r;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    sum += 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

function inject(html: string, fields: Record<string, string>): string {
  let out = html;
  const setMeta = (attr: "property" | "name", key: string, value: string) => {
    const re = new RegExp(
      `(<meta ${attr}="${key}" content=")[^"]*(")`,
      "i",
    );
    out = out.replace(re, `$1${esc(value)}$2`);
  };
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${esc(fields.title)}</title>`);
  out = out.replace(
    /(<meta name="description" content=")[^"]*(")/i,
    `$1${esc(fields.description)}$2`,
  );
  setMeta("property", "og:title", fields.title);
  setMeta("property", "og:description", fields.description);
  setMeta("property", "og:url", fields.url);
  setMeta("property", "og:image", fields.image);
  setMeta("property", "og:image:alt", fields.title);
  setMeta("name", "twitter:title", fields.title);
  setMeta("name", "twitter:description", fields.description);
  setMeta("name", "twitter:image", fields.image);
  return out;
}

export default async function handler(
  req: IncomingMessage & { method?: string },
  res: ServerResponse,
): Promise<void> {
  const host = (req.headers.host as string) ?? "";
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const origin = `${proto}://${host}`;
  const reqUrl = new URL(req.url ?? "/", origin);
  const slug = reqUrl.searchParams.get("slug") ?? "";

  let shell = "";
  try {
    const r = await fetch(`${origin}/index.html`);
    shell = await r.text();
  } catch {
    res.statusCode = 302;
    res.setHeader("Location", "/");
    res.end();
    return;
  }

  const trip = await fetchTrip(slug);
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!trip) {
    res.statusCode = 200;
    res.end(shell);
    return;
  }

  const first = trip[0];
  const last = trip[trip.length - 1];
  const subtitle =
    first && last && first.name !== last.name
      ? `${first.name} to ${last.name}`
      : (first?.name ?? "A Wanderpin journey");
  const copy = copyFor(totalKm(trip));

  const html = inject(shell, {
    title: `${copy}: ${subtitle} - Wanderpin`,
    description: `${subtitle} - ${trip.length} stops mapped on a living globe. Open to fly the route.`,
    url: `${origin}/t/${slug}`,
    image: `${origin}/api/og?slug=${slug}`,
  });

  res.statusCode = 200;
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800",
  );
  res.end(html);
}
