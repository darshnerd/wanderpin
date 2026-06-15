import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { createRouteArcLayer, type RouteArcLayer } from "@/lib/arcLayer";
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

function fadeForZoom(z: number): number {
  return Math.max(0, Math.min(1, (12.5 - z) / 3));
}

function statusColor(s: Spot, selectedId: string | null): string {
  if (s.id === selectedId) return "#ffffff";
  if (s.status === "visited") return "#fcd34d";
  if (s.status === "booked") return "#38bdf8";
  return "#f59e0b";
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
  active = false,
}: ViewProps & {
  initialCamera?: Camera;
  onReady?: () => void;
  onCamera?: (zoom: number, lat: number, lng: number) => void;
  active?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const arcRef = useRef<RouteArcLayer | null>(null);
  const loadedRef = useRef(false);
  const readySentRef = useRef(false);
  const lastEmitRef = useRef(0);
  const drawOnRafRef = useRef(0);
  const tripRef = useRef(trip);
  const selectedRef = useRef(selectedId);
  const activeRef = useRef(active);
  const handoffRef = useRef(initialCamera);
  const onCameraRef = useRef(onCamera);
  const onReadyRef = useRef(onReady);
  tripRef.current = trip;
  selectedRef.current = selectedId;
  activeRef.current = active;
  handoffRef.current = initialCamera;
  onCameraRef.current = onCamera;
  onReadyRef.current = onReady;

  function animateDrawOn() {
    const map = mapRef.current;
    const arc = arcRef.current;
    if (!map || !arc) return;
    cancelAnimationFrame(drawOnRafRef.current);
    if (reduceMotion()) {
      arc.setProgress(1);
      map.triggerRepaint();
      return;
    }
    const dur = 1400;
    const start = typeof performance !== "undefined" ? performance.now() : 0;
    const tick = () => {
      const now = typeof performance !== "undefined" ? performance.now() : 0;
      const e = Math.min(1, (now - start) / dur);
      arc.setProgress(1 - Math.pow(1 - e, 3));
      map.triggerRepaint();
      if (e < 1) drawOnRafRef.current = requestAnimationFrame(tick);
    };
    arc.setProgress(0);
    drawOnRafRef.current = requestAnimationFrame(tick);
  }

  function drawArcs() {
    const map = mapRef.current;
    const arc = arcRef.current;
    if (!map || !arc || !loadedRef.current) return;
    arc.setData(tripRef.current);
    arc.setSelected(tripRef.current, selectedRef.current);
    arc.setFade(fadeForZoom(map.getZoom()));
    map.triggerRepaint();
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
    map.fitBounds(b, {
      padding: 90,
      pitch: 35,
      bearing: 0,
      maxZoom: 11,
      duration,
    });
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
      } catch {}
      try {
        map.setSky({
          "sky-color": "#0b1733",
          "horizon-color": "#2a3f6b",
          "sky-horizon-blend": 0.6,
        });
      } catch {}
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
      } catch {}
      loadedRef.current = true;
      const arc = createRouteArcLayer();
      map.addLayer(arc);
      arcRef.current = arc;
      drawArcs();
      drawMarkers();
      if (activeRef.current) animateDrawOn();
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
      const z = map.getZoom();
      arcRef.current?.setFade(fadeForZoom(z));
      const t = typeof performance !== "undefined" ? performance.now() : 0;
      if (t - lastEmitRef.current < 150) return;
      lastEmitRef.current = t;
      const c = map.getCenter();
      onCameraRef.current?.(z, c.lat, c.lng);
    });

    let clickTimer: ReturnType<typeof setTimeout> | undefined;
    map.on("click", (e) => {
      clearTimeout(clickTimer);
      const { lat, lng } = e.lngLat;
      clickTimer = setTimeout(() => onAddPin(lat, lng), 240);
    });
    map.on("dblclick", () => clearTimeout(clickTimer));

    return () => {
      cancelAnimationFrame(drawOnRafRef.current);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      arcRef.current = null;
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !initialCamera) return;
    map.jumpTo({
      center: [initialCamera.lng, initialCamera.lat],
      zoom: initialCamera.zoom,
    });
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
      fitToTrip: (t) => {
        if (t && t.length) {
          tripRef.current = t;
        }
        fit(true);
      },
      snapshot: () => mapRef.current?.getCanvas() ?? null,
    };
    return () => {
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleRef]);

  useEffect(() => {
    drawArcs();
    drawMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, selectedId]);

  useEffect(() => {
    if (active && arcRef.current && loadedRef.current) animateDrawOn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return <div ref={containerRef} className="h-full w-full bg-[#0b1120]" />;
}
