import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Toaster, toast } from "sonner";
import { Compass, Loader2, Play, Route, Share2, Square } from "lucide-react";

import { Button } from "./components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";
import { SearchBar } from "./components/SearchBar";
import { SurpriseButton } from "./components/SurpriseButton";
import { TripPanel } from "./components/TripPanel";
import { ViewToggle } from "./components/ViewToggle";
import { SharedCta } from "./components/SharedCta";
import { TripLibrary } from "./components/TripLibrary";
import { SEED_TRIP } from "./data/destinations";
import { reverseGeocode, type GeocodeResult } from "./lib/geocode";
import {
  loadIsSample,
  loadLibrary,
  loadTrip,
  loadView,
  saveIsSample,
  saveLibrary,
  saveTrip,
  saveView,
  type TripDoc,
} from "./lib/storage";
import { flagEmoji, makeId } from "./lib/utils";
import { buildShareUrl, clearHash, tripFromHash } from "./lib/share";
import { fetchSharedTrip, supabaseEnabled } from "./lib/supabase";
import type { MapHandle, Spot, ViewMode } from "./types";

const GlobeView = lazy(() => import("./components/GlobeView"));
const MapView = lazy(() => import("./components/MapView"));

function ViewFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0b1120] text-slate-300">
      <Loader2 className="size-6 animate-spin" />
      <span className="ml-2 text-sm">Loading the world…</span>
    </div>
  );
}

export default function App() {
  const [trip, setTrip] = useState<Spot[]>(
    () => tripFromHash() ?? loadTrip() ?? SEED_TRIP,
  );
  const [isSample, setIsSample] = useState<boolean>(() =>
    tripFromHash() ? false : loadTrip() === null ? true : loadIsSample(),
  );
  const [view, setView] = useState<ViewMode>(() => loadView());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sharedCtaOpen, setSharedCtaOpen] = useState(false);
  const [library, setLibrary] = useState<TripDoc[]>(() => loadLibrary());
  const handleRef = useRef<MapHandle | null>(null);
  const tourRef = useRef(false);

  useEffect(() => saveLibrary(library), [library]);

  useEffect(() => saveTrip(trip), [trip]);
  useEffect(() => saveIsSample(isSample), [isSample]);
  useEffect(() => saveView(view), [view]);
  useEffect(() => {
    clearHash();
    if (!supabaseEnabled) return;
    const m = location.pathname.match(/^\/t\/([A-Za-z0-9]+)$/);
    if (!m) return;
    const slug = m[1];
    void (async () => {
      const shared = await fetchSharedTrip(slug);
      if (!shared || shared.length === 0) {
        toast.error("That trip link wasn't found");
        return;
      }
      const loaded = shared.map((s) => ({ ...s, id: makeId() }));
      setTrip(loaded);
      setIsSample(false);
      setSelectedId(null);
      history.replaceState(null, "", "/");
      toast.success("Loaded a shared trip");
      await new Promise((r) => setTimeout(r, 1000));
      for (const s of loaded) {
        flyTo(s.lat, s.lng, 5);
        setSelectedId(s.id);
        await new Promise((r) => setTimeout(r, 1800));
      }
      setSharedCtaOpen(true);
    })();
  }, []);

  const flyTo = useCallback((lat: number, lng: number, zoom?: number) => {
    handleRef.current?.flyTo(lat, lng, zoom ? { zoom } : undefined);
  }, []);

  const addSpot = useCallback(
    (spot: Spot, opts?: { fly?: boolean }) => {
      setTrip((prev) => [...prev, spot]);
      setIsSample(false);
      setSelectedId(spot.id);
      if (opts?.fly) flyTo(spot.lat, spot.lng, 6);
    },
    [flyTo],
  );

  const handleAddPin = useCallback(async (rawLat: number, rawLng: number) => {
    const lat = rawLat;
    const lng = ((rawLng + 540) % 360) - 180;
    const id = makeId();
    const fallbackName = `Pin ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    setTrip((prev) => [
      ...prev,
      { id, name: "Locating…", lat, lng, emoji: "📍" },
    ]);
    setIsSample(false);
    setSelectedId(id);
    const tid = toast.loading("Finding this place…");
    try {
      const res = await reverseGeocode(lat, lng);
      if (!res) {
        setTrip((prev) => prev.filter((s) => s.id !== id));
        setSelectedId((cur) => (cur === id ? null : cur));
        toast.dismiss(tid);
        toast("🌊 No place there — open water?", {
          action: {
            label: "Add anyway",
            onClick: () => {
              setTrip((prev) => [
                ...prev,
                { id: makeId(), name: fallbackName, lat, lng, emoji: "📍" },
              ]);
              setIsSample(false);
            },
          },
        });
        return;
      }
      setTrip((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                name: res.name,
                country: res.country,
                countryCode: res.countryCode,
              }
            : s,
        ),
      );
      toast.success(`Added ${res.name} ${flagEmoji(res.countryCode)}`, {
        id: tid,
      });
    } catch {
      setTrip((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: fallbackName } : s)),
      );
      toast.dismiss(tid);
    }
  }, []);

  const handleSearchSelect = useCallback(
    (r: GeocodeResult) => {
      const spot: Spot = {
        id: makeId(),
        name: r.name,
        lat: r.lat,
        lng: r.lng,
        country: r.country,
        countryCode: r.countryCode,
        emoji: "📍",
      };
      addSpot(spot, { fly: true });
      toast.success(`Flew to ${spot.name} ${flagEmoji(spot.countryCode)} — added ⭐`);
    },
    [addSpot],
  );

  const handleSurpriseSave = useCallback(
    (d: Spot) => {
      const spot: Spot = { ...d, id: makeId() };
      addSpot(spot, { fly: true });
      toast.success(`Saved ${spot.name} ${flagEmoji(spot.countryCode)} ⭐`);
    },
    [addSpot],
  );

  const handleRemove = useCallback(
    (id: string) => {
      const snapshot = trip;
      const removed = trip.find((s) => s.id === id);
      setTrip((prev) => prev.filter((s) => s.id !== id));
      setIsSample(false);
      setSelectedId((cur) => (cur === id ? null : cur));
      toast(`Removed ${removed?.name ?? "stop"}`, {
        action: { label: "Undo", onClick: () => setTrip(snapshot) },
      });
    },
    [trip],
  );

  const handleClear = useCallback(() => {
    if (trip.length === 0) return;
    if (!window.confirm("Clear all stops from your trip?")) return;
    const snapshot = trip;
    setTrip([]);
    setIsSample(false);
    setSelectedId(null);
    toast("Trip cleared", {
      action: { label: "Undo", onClick: () => setTrip(snapshot) },
    });
  }, [trip]);

  const handleReorder = useCallback((next: Spot[]) => {
    setTrip(next);
    setIsSample(false);
  }, []);

  const handleUpdateSpot = useCallback((id: string, patch: Partial<Spot>) => {
    setTrip((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setIsSample(false);
  }, []);

  const handleSelect = useCallback(
    (spot: Spot) => {
      setSelectedId(spot.id);
      flyTo(spot.lat, spot.lng, 6);
      setSheetOpen(false);
    },
    [flyTo],
  );

  const handleShare = useCallback(async () => {
    if (supabaseEnabled) {
      const tid = toast.loading("Publishing…");
      try {
        const r = await fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trip }),
        });
        if (!r.ok) throw new Error("publish failed");
        const { slug } = await r.json();
        const link = `${location.origin}/t/${slug}`;
        await navigator.clipboard.writeText(link);
        toast.success("Public link copied to clipboard", { id: tid });
        return;
      } catch {
        toast.dismiss(tid);
      }
    }
    const url = buildShareUrl(trip);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Trip link copied to clipboard");
    } catch {
      toast("Copy this link to share", { description: url });
    }
  }, [trip]);

  const stopTour = useCallback(() => {
    tourRef.current = false;
    setPlaying(false);
  }, []);

  const playTour = useCallback(async () => {
    if (trip.length < 2) return;
    tourRef.current = true;
    setPlaying(true);
    for (const spot of trip) {
      if (!tourRef.current) break;
      setSelectedId(spot.id);
      flyTo(spot.lat, spot.lng, 5);
      await new Promise((r) => setTimeout(r, 1800));
    }
    tourRef.current = false;
    setPlaying(false);
  }, [trip, flyTo]);

  const saveCurrentTrip = useCallback(() => {
    const name = window.prompt("Name this trip", "My trip")?.trim();
    if (!name) return;
    setLibrary((prev) => [
      { id: makeId(), name, trip, updatedAt: Date.now() },
      ...prev,
    ]);
    toast.success(`Saved "${name}" to your trips`);
  }, [trip]);

  const openTrip = useCallback(
    (id: string) => {
      const doc = library.find((d) => d.id === id);
      if (!doc) return;
      setTrip(doc.trip.map((s) => ({ ...s, id: makeId() })));
      setIsSample(false);
      setSelectedId(null);
      toast(`Opened "${doc.name}"`);
    },
    [library],
  );

  const deleteTrip = useCallback((id: string) => {
    setLibrary((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const viewProps = {
    trip,
    selectedId,
    onAddPin: handleAddPin,
    onSelectPin: setSelectedId,
    handleRef,
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1120]">
      <div className="absolute inset-0">
        <Suspense fallback={<ViewFallback />}>
          {view === "globe" ? (
            <GlobeView {...viewProps} />
          ) : (
            <MapView {...viewProps} />
          )}
        </Suspense>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="bg-background/90 flex h-9 items-center gap-1.5 rounded-md px-2.5 shadow-sm backdrop-blur">
            <Compass className="text-primary size-5" />
            <span className="hidden font-semibold tracking-tight sm:inline">
              Wanderpin
            </span>
          </div>

          <div className="relative min-w-[8rem] flex-1 sm:max-w-xs">
            <SearchBar onSelect={handleSearchSelect} />
          </div>

          <SurpriseButton
            onFly={(lat, lng) => flyTo(lat, lng, 5)}
            onSave={handleSurpriseSave}
          />
          <ViewToggle value={view} onChange={setView} />

          <TripLibrary
            docs={library}
            onSave={saveCurrentTrip}
            onOpen={openTrip}
            onDelete={deleteTrip}
          />

          <Button
            type="button"
            variant="secondary"
            onClick={handleShare}
            disabled={trip.length === 0}
            className="bg-background/90 shadow-sm backdrop-blur"
          >
            <Share2 className="size-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={playing ? stopTour : playTour}
            disabled={trip.length < 2}
            className="bg-background/90 shadow-sm backdrop-blur"
          >
            {playing ? (
              <Square className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            <span className="hidden sm:inline">{playing ? "Stop" : "Play"}</span>
          </Button>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                className="bg-background/90 shadow-sm backdrop-blur md:hidden"
              >
                <Route className="size-4" />
                {trip.length}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[72vh] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>My Trip</SheetTitle>
              </SheetHeader>
              <TripPanel
                trip={trip}
                selectedId={selectedId}
                isSample={isSample}
                onSelect={handleSelect}
                onRemove={handleRemove}
                onReorder={handleReorder}
                onUpdate={handleUpdateSpot}
                onClear={handleClear}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop side panel */}
      <aside className="bg-background/95 absolute top-16 right-3 bottom-3 z-20 hidden w-80 flex-col overflow-hidden rounded-xl border border-border shadow-2xl backdrop-blur md:flex">
        <TripPanel
          trip={trip}
          selectedId={selectedId}
          isSample={isSample}
          onSelect={handleSelect}
          onRemove={handleRemove}
          onReorder={handleReorder}
          onUpdate={handleUpdateSpot}
          onClear={handleClear}
        />
      </aside>

      <SharedCta
        open={sharedCtaOpen}
        onCreate={() => {
          setTrip([]);
          setIsSample(false);
          setSelectedId(null);
          setSharedCtaOpen(false);
          toast("Blank canvas ready. Drop a pin or hit Surprise me.");
        }}
        onDismiss={() => setSharedCtaOpen(false)}
      />

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
