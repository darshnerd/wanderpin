import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";
const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSlug(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export default async function handler(
  req: IncomingMessage & { method?: string },
  res: ServerResponse,
) {
  if (req.method !== "POST") return send(res, 405, { error: "POST only" });
  if (!SUPABASE_URL || !SECRET)
    return send(res, 500, { error: "server not configured" });

  const raw = await readBody(req);
  if (raw.length > 100000) return send(res, 413, { error: "trip too large" });

  let trip: unknown;
  try {
    trip = JSON.parse(raw).trip;
  } catch {
    return send(res, 400, { error: "invalid json" });
  }
  if (!Array.isArray(trip) || trip.length === 0) {
    return send(res, 400, { error: "empty trip" });
  }

  const supabase = createClient(SUPABASE_URL, SECRET);
  let slug = "";
  for (let i = 0; i < 5; i++) {
    const candidate = randomSlug(6);
    const { data } = await supabase
      .from("trips")
      .select("slug")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) {
      slug = candidate;
      break;
    }
  }
  if (!slug) slug = randomSlug(8);

  const { error } = await supabase.from("trips").insert({ slug, data: trip });
  if (error) return send(res, 500, { error: "could not save trip" });

  return send(res, 200, { slug });
}
