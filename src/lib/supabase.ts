import type { Spot } from "@/types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseEnabled = Boolean(url && key);

export async function fetchSharedTrip(slug: string): Promise<Spot[] | null> {
  if (!url || !key) return null;
  const r = await fetch(
    `${url}/rest/v1/trips?slug=eq.${encodeURIComponent(slug)}&select=data`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!r.ok) return null;
  const rows = (await r.json()) as { data?: Spot[] }[];
  const data = rows?.[0]?.data;
  return Array.isArray(data) ? data : null;
}
