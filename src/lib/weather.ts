export interface WeatherNow {
  tempC: number;
  code: number;
  glyph: string;
}

const TTL_MS = 1000 * 60 * 30;
const cache = new Map<string, { at: number; data: WeatherNow | null }>();

function glyphFor(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

export async function fetchWeatherNow(
  lat: number,
  lng: number,
): Promise<WeatherNow | null> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`,
    );
    if (!r.ok) throw new Error("weather");
    const j = await r.json();
    const code: number = j.current?.weather_code ?? 0;
    const data: WeatherNow = {
      tempC: Math.round(j.current?.temperature_2m ?? 0),
      code,
      glyph: glyphFor(code),
    };
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    cache.set(key, { at: Date.now(), data: null });
    return null;
  }
}
