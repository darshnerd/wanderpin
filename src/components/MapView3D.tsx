import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { MODE_META, legMode } from "@/lib/transport";
import type { Spot, ViewProps } from "@/types";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";

interface Camera {
  lat: number;
  lng: number;
  zoom: number;
}

function reduceMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function statusColor(s: Spot, selectedId: string | null): string {
  if (s.id === selectedId) return "#ffffff";
  if (s.status === "visited") return "#fcd34d";
  if (s.status === "booked") return "#38bdf8";
  return "#f59e0b";
}

// Points along the great circle between a and b, so the line curves over the globe.
function greatCircle(
  a: [number, number],
  b: [number, number],
  n = 64,
): [number, number][] {
  const R = Math.PI / 180;
  const D = 180 / Math.PI;
  const lat1 = a[1] * R;
  const lon1 = a[0] * R;
  const lat2 = b[1] * R;
  const lon2 = b[0] * R;
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
      ),
    );
  if (d < 1e-9) return [a, b];
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    out.push([
      Math.atan2(y, x) * D,
      Math.atan2(z, Math.sqrt(x * x + y * y)) * D,
    ]);
  }
  return out;
}

export default function MapView3D({
  trip,
  selectedId,
  onAddPin,
  onSelectPin,
  handleRef,
  initialCamera,
  onReady,
  onCamera,
}: ViewProps & {
  initialCamera?: Camera;
  onReady?: () => void;
  onCamera?: (zoom: number, lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const loadedRef = useRef(false);
  const readySentRef = useRef(false);
  const lastEmitRef = useRef(0);
  const tripRef = useRef(trip);
  const selectedRef = useRef(selectedId);
  const handoffRef = useRef(initialCamera);
  const onCameraRef = useRef(onCamera);
  const onReadyRef = useRef(onReady);
  tripRef.current = trip;
  selectedRef.current = selectedId;
  handoffRef.current = initialCamera;
  onCameraRef.current = onCamera;
  onReadyRef.current = onReady;

  function drawRoute() {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const t = tripRef.current;
    const features = [];
    for (let i = 1; i < t.length; i++) {
      features.push({
        type: "Feature",
        properties: { color: MODE_META[legMode(t, i)].color },
        geometry: {
          type: "LineString",
          coordinates: greatCircle(
            [t[i - 1].lng, t[i - 1].lat],
            [t[i].lng, t[i].lat],
          ),
        },
      });
    }
    const data = { type: "FeatureCollection", features } as never;
    const src = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(data);
      return;
    }
    map.addSource("route", { type: "geojson", data });
    map.addLayer({
      id: "route-casing",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#0b1120", "line-width": 7, "line-opacity": 0.45 },
    });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 4,
        "line-opacity": 1,
      },
    });
  }

  function drawMarkers() {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    for (const s of tripRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:15px;height:15px;border-radius:50%;border:2px solid #fff;cursor:pointer;box-shadow:0 0 0 2px rgba(0,0,0,.35)";
      el.style.background = statusColor(s, selectedRef.current);
      el.title = s.name;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectPin(s.id);
      });
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([s.lng, s.lat])
        .addTo(map);
      markersRef.current.push(m);
    }
  }

  function fit(animate: boolean) {
    const map = mapRef.current;
    if (!map) return;
    const t = tripRef.current;
    const duration = animate && !reduceMotion() ? 1600 : 0;
    if (t.length === 0) return;
    if (t.length === 1) {
      map.flyTo({
        center: [t[0].lng, t[0].lat],
        zoom: 9,
        pitch: 45,
        duration,
        essential: true,
      });
      return;
    }
    const b = new maplibregl.LngLatBounds();
    t.forEach((s) => b.extend([s.lng, s.lat]));
    map.fitBounds(b, { padding: 90, pitch: 35, bearing: 0, maxZoom: 11, duration });
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const cam = handoffRef.current;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: cam
        ? [cam.lng, cam.lat]
        : trip.length
          ? [trip[0].lng, trip[0].lat]
          : [10, 25],
      zoom: cam ? cam.zoom : trip.length ? 2.4 : 1.6,
      attributionControl: { compact: true },
      // preserveDrawingBuffer lets us read the canvas back for postcard/video
      ...({ preserveDrawingBuffer: true } as object),
    });
    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "bottom-left",
    );

    map.on("style.load", () => {
      try {
        map.setProjection({ type: "globe" });
      } catch {
        /* projection unsupported */
      }
      try {
        map.setSky({
          "sky-color": "#0b1733",
          "horizon-color": "#2a3f6b",
          "sky-horizon-blend": 0.6,
        });
      } catch {
        /* sky unsupported */
      }
      if (!map.getSource("dem")) {
        map.addSource("dem", {
          type: "raster-dem",
          tiles: [
            "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
          ],
          encoding: "terrarium",
          tileSize: 256,
          maxzoom: 13,
        });
      }
      try {
        map.setTerrain({ source: "dem", exaggeration: 1.2 });
      } catch {
        /* terrain unsupported */
      }
      // The OpenFreeMap style already ships a "building-3d" fill-extrusion layer.
      loadedRef.current = true;
      drawRoute();
      drawMarkers();
      // When handed off from the globe, hold the handoff camera and just ease
      // into the 3D tilt; otherwise frame the whole trip.
      if (handoffRef.current) {
        map.easeTo({ pitch: 55, duration: reduceMotion() ? 0 : 900 });
      } else {
        fit(true);
      }
    });

    map.once("idle", () => {
      if (readySentRef.current) return;
      readySentRef.current = true;
      onReadyRef.current?.();
    });

    map.on("zoom", () => {
      const t = typeof performance !== "undefined" ? performance.now() : 0;
      if (t - lastEmitRef.current < 150) return;
      lastEmitRef.current = t;
      const c = map.getCenter();
      onCameraRef.current?.(map.getZoom(), c.lat, c.lng);
    });

    let clickTimer: ReturnType<typeof setTimeout> | undefined;
    map.on("click", (e) => {
      clearTimeout(clickTimer);
      const { lat, lng } = e.lngLat;
      clickTimer = setTimeout(() => onAddPin(lat, lng), 240);
    });
    map.on("dblclick", () => clearTimeout(clickTimer));

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While preloading (hidden) the handoff target can move as the user keeps
  // zooming the globe; track it without animation so tiles are warm on commit.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !initialCamera) return;
    map.jumpTo({ center: [initialCamera.lng, initialCamera.lat], zoom: initialCamera.zoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCamera?.lat, initialCamera?.lng, initialCamera?.zoom]);

  useEffect(() => {
    handleRef.current = {
      flyTo: (lat, lng, opts) => {
        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: opts?.zoom ?? 14,
          pitch: 55,
          duration: reduceMotion() ? 0 : 1600,
          essential: true,
        });
      },
      fitToTrip: () => fit(true),
      snapshot: () => mapRef.current?.getCanvas() ?? null,
    };
    return () => {
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleRef]);

  useEffect(() => {
    drawRoute();
    drawMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, selectedId]);

  return <div ref={containerRef} className="h-full w-full bg-[#0b1120]" />;
}
