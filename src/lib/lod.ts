export const INTENT_ALT = 1.9;
export const COMMIT_ALT = 1.1;
export const RETURN_ZOOM = 2.0;
export const CROSS_MS = 450;

export function altitudeToZoom(alt: number): number {
  const a = Math.max(alt, 0.02);
  const z = 6.5 - Math.log2(a / 0.25) * 1.8;
  return Math.max(1.5, Math.min(16, z));
}

export function zoomToAltitude(z: number): number {
  return 0.25 * Math.pow(2, (6.5 - z) / 1.8);
}
