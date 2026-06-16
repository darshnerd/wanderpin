import type { IncomingMessage, ServerResponse } from "node:http";

function header(req: IncomingMessage, name: string): string {
  const v = req.headers[name];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  const cityRaw = header(req, "x-vercel-ip-city");
  const city = cityRaw ? decodeURIComponent(cityRaw) : null;
  const country = header(req, "x-vercel-ip-country") || null;
  const lat = parseFloat(header(req, "x-vercel-ip-latitude"));
  const lng = parseFloat(header(req, "x-vercel-ip-longitude"));
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, max-age=600");
  res.end(
    JSON.stringify({
      city,
      country,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    }),
  );
}
