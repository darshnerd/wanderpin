import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";

import { MODE_META, legMode } from "@/lib/transport";
import { classify, tripCenter } from "@/lib/tripScale";
import { dayHemisphere, type NightGeometry } from "@/lib/sun";
import type { Spot, TransportMode, ViewProps } from "@/types";

interface Arc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  mode: TransportMode;
}

function pointColor(s: Spot, selectedId: string | null): string {
  if (s.id === selectedId) return "#ffffff";
  if (s.status === "visited") return "#fcd34d";
  if (s.status === "booked") return "#38bdf8";
  return "#f59e0b";
}

export default function GlobeView({
  trip,
  selectedId,
  onAddPin,
  onSelectPin,
  handleRef,
  revealing = false,
}: ViewProps & { revealing?: boolean }) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    handleRef.current = {
      flyTo: (lat: number, lng: number) => {
        globeRef.current?.pointOfView({ lat, lng, altitude: 1.6 }, 1200);
      },
      fitToTrip: (t, opts) => {
        const g = globeRef.current;
        if (!g || t.length === 0) return;
        const c = tripCenter(t);
        const altitude = opts?.altitude ?? classify(t).altitude;
        g.controls().autoRotate = false;
        g.pointOfView({ lat: c.lat, lng: c.lng, altitude }, opts?.ms ?? 1200);
      },
      snapshot: () => globeRef.current?.renderer().domElement ?? null,
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef]);

  const points = useMemo(() => trip.map((s) => ({ ...s })), [trip]);

  const arcs = useMemo<Arc[]>(() => {
    const out: Arc[] = [];
    for (let i = 1; i < trip.length; i++) {
      out.push({
        startLat: trip[i - 1].lat,
        startLng: trip[i - 1].lng,
        endLat: trip[i].lat,
        endLng: trip[i].lng,
        mode: legMode(trip, i),
      });
    }
    return out;
  }, [trip]);

  const daylight = useMemo(() => [{ geometry: dayHemisphere(now) }], [now]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-[#0b1120]"
      onPointerDown={(e) => {
        pointerDownRef.current = { x: e.clientX, y: e.clientY };
        draggedRef.current = false;
      }}
      onPointerUp={(e) => {
        const d = pointerDownRef.current;
        if (d) {
          draggedRef.current = Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6;
        }
      }}
    >
      <Globe
        ref={globeRef}
        rendererConfig={{ preserveDrawingBuffer: true }}
        width={size.width}
        height={size.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#5b9bff"
        atmosphereAltitude={0.2}
        onGlobeReady={() => {
          const g = globeRef.current;
          if (!g) return;
          g.pointOfView({ lat: 25, lng: 10, altitude: 2.3 });
          const controls = g.controls();
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.55;
        }}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d: object) => pointColor(d as Spot, selectedId)}
        pointAltitude={(d: object) =>
          revealing ? 0.1 : (d as Spot).id === selectedId ? 0.08 : 0.04
        }
        pointRadius={revealing ? 0.55 : 0.42}
        pointLabel={(d: object) => {
          const s = d as Spot;
          return `<div style="font:600 12px sans-serif;color:#fff;background:rgba(15,23,42,.9);padding:4px 8px;border-radius:6px">${s.emoji ?? "📍"} ${s.name}</div>`;
        }}
        onPointClick={(d: object) => onSelectPin((d as Spot).id)}
        polygonsData={daylight}
        polygonGeoJsonGeometry={(d: object) =>
          (d as { geometry: NightGeometry }).geometry as never
        }
        polygonCapColor={() => "rgba(255,224,150,0.10)"}
        polygonSideColor={() => "rgba(0,0,0,0)"}
        polygonStrokeColor={() => "rgba(255,221,150,0.16)"}
        polygonAltitude={0.006}
        polygonsTransitionDuration={0}
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={(d: object) => {
          if (revealing) return ["#7dd3fc", "#a5b4fc", "#c4b5fd"];
          const m = MODE_META[(d as Arc).mode];
          return m.surface ? [m.color, m.color] : ["#38bdf8", "#a78bfa"];
        }}
        arcStroke={revealing ? 1.1 : 0.6}
        arcDashLength={revealing ? 0.95 : 0.5}
        arcDashGap={revealing ? 0.08 : 0.25}
        arcDashAnimateTime={revealing ? 1500 : 2200}
        arcAltitude={(d: object) =>
          MODE_META[(d as Arc).mode].surface ? 0.004 : null
        }
        arcAltitudeAutoScale={0.4}
        labelsData={points}
        labelLat="lat"
        labelLng="lng"
        labelText="name"
        labelSize={1.1}
        labelDotRadius={0.3}
        labelColor={() => "rgba(226,232,240,0.9)"}
        labelResolution={2}
        labelAltitude={0.01}
        onGlobeClick={({ lat, lng }: { lat: number; lng: number }) => {
          if (draggedRef.current) return;
          onAddPin(lat, lng);
        }}
      />
      <div className="absolute bottom-1 left-2 z-10 text-[10px] text-slate-400/80">
        Places ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          OpenStreetMap
        </a>
      </div>
    </div>
  );
}
