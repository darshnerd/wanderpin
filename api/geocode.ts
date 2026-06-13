import type { IncomingMessage, ServerResponse } from "node:http";

import { nominatim } from "./_nominatim";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const url = new URL(req.url ?? "", "http://localhost");
  const { status, body, cached } = await nominatim(url.searchParams);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800",
  );
  res.setHeader("X-Cache", cached ? "HIT" : "MISS");
  res.statusCode = status;
  res.end(body);
}
