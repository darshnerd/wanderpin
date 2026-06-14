const RAD = Math.PI / 180;

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}

export function subsolarPoint(date: Date): { lat: number; lng: number } {
  const n = dayOfYear(date);
  const decl = -23.44 * Math.cos(RAD * (360 / 365) * (n + 10));
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  const lng = -15 * (utcHours - 12);
  return { lat: decl, lng: ((lng + 540) % 360) - 180 };
}

export function localSolarTime(lng: number, date: Date = new Date()): string {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const local = new Date(utcMs + (lng / 15) * 3600000);
  const h = local.getHours();
  const m = local.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isDaylight(
  lat: number,
  lng: number,
  date: Date = new Date(),
): boolean {
  const s = subsolarPoint(date);
  const c =
    Math.sin(lat * RAD) * Math.sin(s.lat * RAD) +
    Math.cos(lat * RAD) * Math.cos(s.lat * RAD) * Math.cos((lng - s.lng) * RAD);
  return c > 0;
}

export interface NightGeometry {
  type: "Polygon";
  coordinates: number[][][];
}

export function nightHemisphere(date: Date): NightGeometry {
  const s = subsolarPoint(date);
  const antLat = -s.lat;
  const antLng = s.lng > 0 ? s.lng - 180 : s.lng + 180;
  const latR = antLat * RAD;
  const lngR = antLng * RAD;
  const ang = 90 * RAD;
  const ring: number[][] = [];
  for (let az = 360; az >= 0; az -= 3) {
    const azR = az * RAD;
    const lat2 = Math.asin(
      Math.sin(latR) * Math.cos(ang) +
        Math.cos(latR) * Math.sin(ang) * Math.cos(azR),
    );
    const lng2 =
      lngR +
      Math.atan2(
        Math.sin(azR) * Math.sin(ang) * Math.cos(latR),
        Math.cos(ang) - Math.sin(latR) * Math.sin(lat2),
      );
    ring.push([((lng2 / RAD + 540) % 360) - 180, lat2 / RAD]);
  }
  return { type: "Polygon", coordinates: [ring] };
}


export function dayHemisphere(date: Date): NightGeometry {
  const s = subsolarPoint(date);
  const latR = s.lat * RAD;
  const lngR = s.lng * RAD;
  const ang = 90 * RAD;
  const ring: number[][] = [];
  for (let az = 360; az >= 0; az -= 3) {
    const azR = az * RAD;
    const lat2 = Math.asin(
      Math.sin(latR) * Math.cos(ang) +
        Math.cos(latR) * Math.sin(ang) * Math.cos(azR),
    );
    const lng2 =
      lngR +
      Math.atan2(
        Math.sin(azR) * Math.sin(ang) * Math.cos(latR),
        Math.cos(ang) - Math.sin(latR) * Math.sin(lat2),
      );
    ring.push([((lng2 / RAD + 540) % 360) - 180, lat2 / RAD]);
  }
  return { type: "Polygon", coordinates: [ring] };
}
