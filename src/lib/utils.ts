import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `spot_${Math.abs(hashString(String(performance.now())))}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

export function flagEmoji(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2) return "📍";
  const code = countryCode.toUpperCase();
  const A = 0x1f1e6;
  const first = code.charCodeAt(0) - 65;
  const second = code.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return "📍";
  return String.fromCodePoint(A + first, A + second);
}

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString("en-US")} km`;
}
