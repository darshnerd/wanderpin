import { useCallback, useEffect, useRef, useState } from "react";

import { saveView } from "../lib/storage";
import {
  COMMIT_ALT,
  CROSS_MS,
  INTENT_ALT,
  RETURN_ZOOM,
  altitudeToZoom,
  zoomToAltitude,
} from "../lib/lod";
import type { ViewMode } from "../types";

const PRELOAD_MAX_MS = 2200;

function reduceMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const now = () => (typeof performance !== "undefined" ? performance.now() : 0);

export interface HandoffCamera {
  lat: number;
  lng: number;
  zoom: number;
}

export interface GlobePov {
  lat: number;
  lng: number;
  altitude: number;
}

export function useAutoLod(initial: ViewMode, suppressed: boolean) {
  const [view, setViewState] = useState<ViewMode>(initial);
  const [rendered, setRendered] = useState<ViewMode[]>([initial]);
  const [handoff, setHandoff] = useState<HandoffCamera | null>(null);
  const [pov, setPov] = useState<GlobePov | null>(null);

  const phaseRef = useRef<"idle" | "preloading">("idle");
  const readyRef = useRef(false);
  const manualLockRef = useRef(false);
  const coolUntilRef = useRef(0);
  const cleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGlobeRef = useRef<{ lat: number; lng: number; alt: number }>({
    lat: 25,
    lng: 10,
    alt: 2.3,
  });
  const last3dRef = useRef<{ lat: number; lng: number; zoom: number } | null>(
    null,
  );
  const suppressedRef = useRef(suppressed);
  suppressedRef.current = suppressed;

  useEffect(() => saveView(view), [view]);
  useEffect(
    () => () => {
      if (cleanupRef.current) clearTimeout(cleanupRef.current);
      if (preloadTimerRef.current) clearTimeout(preloadTimerRef.current);
    },
    [],
  );

  const clearPreloadTimer = useCallback(() => {
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
      preloadTimerRef.current = null;
    }
  }, []);

  const settle = useCallback((keep: ViewMode) => {
    if (cleanupRef.current) clearTimeout(cleanupRef.current);
    const ms = reduceMotion() ? 0 : CROSS_MS;
    cleanupRef.current = setTimeout(() => {
      setRendered((r) => r.filter((v) => v === keep));
    }, ms + 40);
  }, []);

  const goTo = useCallback(
    (next: ViewMode, manual: boolean) => {
      clearPreloadTimer();
      setViewState(next);
      setRendered((r) => (r.includes(next) ? r : [...r, next]));
      phaseRef.current = "idle";
      readyRef.current = false;
      manualLockRef.current = manual;
      coolUntilRef.current = now() + 650;
      settle(next);
    },
    [settle, clearPreloadTimer],
  );

  const selectView = useCallback(
    (v: ViewMode) => {
      if (v === "3d") {
        const g = lastGlobeRef.current;
        setHandoff({
          lat: g.lat,
          lng: g.lng,
          zoom: Math.max(altitudeToZoom(g.alt), 5),
        });
      } else if (v === "globe") {
        const c = last3dRef.current;
        setPov(
          c
            ? {
                lat: c.lat,
                lng: c.lng,
                altitude: Math.max(zoomToAltitude(c.zoom), 1.2),
              }
            : null,
        );
      }
      goTo(v, true);
    },
    [goTo],
  );

  const maybeCommit = useCallback(() => {
    if (
      view === "globe" &&
      phaseRef.current === "preloading" &&
      !suppressedRef.current &&
      lastGlobeRef.current.alt < COMMIT_ALT
    ) {
      goTo("3d", false);
    }
  }, [view, goTo]);

  const onGlobeCamera = useCallback(
    (alt: number, lat: number, lng: number) => {
      lastGlobeRef.current = { lat, lng, alt };
      if (suppressedRef.current || view !== "globe") return;
      if (now() < coolUntilRef.current) return;
      if (alt > INTENT_ALT) {
        manualLockRef.current = false;
        if (phaseRef.current === "preloading") {
          phaseRef.current = "idle";
          readyRef.current = false;
          clearPreloadTimer();
          setHandoff(null);
          setRendered((r) => r.filter((v) => v !== "3d"));
        }
        return;
      }
      if (manualLockRef.current) return;
      if (phaseRef.current === "idle") {
        phaseRef.current = "preloading";
        readyRef.current = false;
        setHandoff({ lat, lng, zoom: altitudeToZoom(alt) });
        setRendered((r) => (r.includes("3d") ? r : [...r, "3d"]));
        clearPreloadTimer();
        preloadTimerRef.current = setTimeout(() => {
          readyRef.current = true;
          maybeCommit();
        }, PRELOAD_MAX_MS);
      } else {
        setHandoff({ lat, lng, zoom: altitudeToZoom(alt) });
        if (alt < COMMIT_ALT && readyRef.current) goTo("3d", false);
      }
    },
    [view, goTo, clearPreloadTimer, maybeCommit],
  );

  const on3dReady = useCallback(() => {
    readyRef.current = true;
    maybeCommit();
  }, [maybeCommit]);

  const on3dCamera = useCallback(
    (zoom: number, lat: number, lng: number) => {
      last3dRef.current = { lat, lng, zoom };
      if (suppressedRef.current || view !== "3d") return;
      if (now() < coolUntilRef.current) return;
      if (zoom < RETURN_ZOOM) {
        setPov({
          lat,
          lng,
          altitude: Math.max(zoomToAltitude(zoom), INTENT_ALT + 0.15),
        });
        goTo("globe", false);
      }
    },
    [view, goTo],
  );

  const opacityOf = useCallback((v: ViewMode) => (v === view ? 1 : 0), [view]);

  return {
    view,
    selectView,
    rendered,
    opacityOf,
    handoff,
    pov,
    onGlobeCamera,
    on3dCamera,
    on3dReady,
  };
}
