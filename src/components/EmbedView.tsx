import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { fetchSharedTrip } from "@/lib/supabase";
import { makeId } from "@/lib/utils";
import type { MapHandle, Spot } from "@/types";

const GlobeView = lazy(() => import("./GlobeView"));

function reduceMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function EmbedView({ slug }: { slug: string }) {
  const [trip, setTrip] = useState<Spot[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const handleRef = useRef<MapHandle | null>(null);

  const autoplay =
    typeof window !== "undefined" &&
    new URLSearchParams(location.search).get("autoplay") === "1";

  useEffect(() => {
    let alive = true;
    void fetchSharedTrip(slug).then((shared) => {
      if (!alive) return;
      if (!shared || shared.length === 0) {
        setStatus("missing");
        return;
      }
      setTrip(shared.map((s) => ({ ...s, id: makeId() })));
      setStatus("ready");
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!trip || !autoplay || reduceMotion()) return;
    let alive = true;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    void (async () => {
      await wait(1500);
      for (let i = 0; i < trip.length; i++) {
        if (!alive) return;
        const s = trip[i];
        setSelectedId(s.id);
        handleRef.current?.flyTo(s.lat, s.lng);
        await wait(1900);
      }
      if (alive) {
        setSelectedId(null);
        handleRef.current?.fitToTrip(trip);
      }
    })();
    return () => {
      alive = false;
    };
  }, [trip, autoplay]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1120]">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Loader2 className="size-6 animate-spin" />
          </div>
        }
      >
        {trip && (
          <GlobeView
            trip={trip}
            selectedId={selectedId}
            onAddPin={() => {}}
            onSelectPin={setSelectedId}
            handleRef={handleRef}
          />
        )}
      </Suspense>

      {status === "missing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-slate-300">
          <div className="text-4xl">🌍</div>
          <p className="text-sm">This journey could not be found.</p>
        </div>
      )}

      <a
        href={slug ? `/t/${slug}` : "/"}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-[#0b1120]/80 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-sm backdrop-blur transition-colors hover:text-white"
      >
        <span className="text-sky-300">✦</span>
        Made with Wanderpin
      </a>
    </div>
  );
}
