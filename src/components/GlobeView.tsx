import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";

import type { Spot, ViewProps } from "@/types";

interface Arc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export default function GlobeView({
  trip,
  selectedId,
  onAddPin,
  onSelectPin,
  handleRef,
}: ViewProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

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
    handleRef.current = {
      flyTo: (lat: number, lng: number) => {
        globeRef.current?.pointOfView({ lat, lng, altitude: 1.6 }, 1200);
      },
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
      });
    }
    return out;
  }, [trip]);

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
        pointColor={(d: object) =>
          (d as Spot).id === selectedId ? "#ffffff" : "#f59e0b"
        }
        pointAltitude={(d: object) =>
          (d as Spot).id === selectedId ? 0.08 : 0.04
        }
        pointRadius={0.42}
        pointLabel={(d: object) => {
          const s = d as Spot;
          return `<div style="font:600 12px sans-serif;color:#fff;background:rgba(15,23,42,.9);padding:4px 8px;border-radius:6px">${s.emoji ?? "📍"} ${s.name}</div>`;
        }}
        onPointClick={(d: object) => onSelectPin((d as Spot).id)}
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={() => ["#38bdf8", "#a78bfa"]}
        arcStroke={0.6}
        arcDashLength={0.5}
        arcDashGap={0.25}
        arcDashAnimateTime={2200}
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
