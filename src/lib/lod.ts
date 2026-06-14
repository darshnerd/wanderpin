export const INTENT_ALT = 0.6;
export const COMMIT_ALT = 0.25;
export const RETURN_ZOOM = 3.2;
export const CROSS_MS = 450;

export function altitudeToZoom(alt: number): number {
  const a = Math.max(alt, 0.02);
  const z = 5.5 - Math.log2(a / 0.25) * 1.8;
  return Math.max(1.5, Math.min(16, z));
}

export function zoomToAltitude(z: number): number {
  return 0.25 * Math.pow(2, (5.5 - z) / 1.8);
}
