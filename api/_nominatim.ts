const ENDPOINT =
  process.env.NOMINATIM_ENDPOINT ?? "https://nominatim.openstreetmap.org";
const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ??
  "Wanderpin/1.0 (+https://wanderpin-ecru.vercel.app)";
const REFERER =
  process.env.NOMINATIM_REFERER ?? "https://wanderpin-ecru.vercel.app";

const TTL_MS = 1000 * 60 * 60 * 24;
const cache = new Map<string, { at: number; body: string }>();
let lastUpstreamCall = 0;

export interface UpstreamResult {
  status: number;
  body: string;
  cached: boolean;
}

export async function nominatim(
  params: URLSearchParams,
): Promise<UpstreamResult> {
  const q = params.get("q");
  const lat = params.get("lat");
  const lon = params.get("lon");

  const up = new URLSearchParams({ format: "jsonv2", addressdetails: "1" });
  let path: string;
  if (q && q.trim().length >= 2) {
    const limit = Number(params.get("limit") ?? "5");
    up.set("limit", String(Math.min(Math.max(limit || 5, 1), 10)));
    up.set("q", q.trim());
    path = "/search";
  } else if (lat && lon) {
    up.set("lat", lat);
    up.set("lon", lon);
    path = "/reverse";
  } else {
    return {
      status: 400,
      body: JSON.stringify({ error: "missing q or lat/lon" }),
      cached: false,
    };
  }

  const key = `${path}?${up.toString()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return { status: 200, body: hit.body, cached: true };
  }

  const wait = 1000 - (Date.now() - lastUpstreamCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastUpstreamCall = Date.now();

  try {
    const res = await fetch(`${ENDPOINT}${path}?${up.toString()}`, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: REFERER,
        Accept: "application/json",
      },
    });
    const body = await res.text();
    if (res.ok) cache.set(key, { at: Date.now(), body });
    return { status: res.status, body, cached: false };
  } catch {
    return {
      status: 502,
      body: JSON.stringify({ error: "geocoding upstream unreachable" }),
      cached: false,
    };
  }
}
