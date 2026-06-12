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
import { SEED_TRIP } from "./data/destinations";
import { reverseGeocode, type GeocodeResult } from "./lib/geocode";
import {
  loadIsSample,
  loadTrip,
  loadView,
  saveIsSample,
  saveTrip,
  saveView,
} from "./lib/storage";
import { flagEmoji, makeId } from "./lib/utils";
import { buildShareUrl, clearHash, tripFromHash } from "./lib/share";
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
  const handleRef = useRef<MapHandle | null>(null);
  const tourRef = useRef(false);

  useEffect(() => saveTrip(trip), [trip]);
  useEffect(() => saveIsSample(isSample), [isSample]);
  useEffect(() => saveView(view), [view]);
  useEffect(() => clearHash(), []);

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

  const handleAddPin = useCallback(async (lat: number, lng: number) => {
    const tid = toast.loading("Finding this place…");
    const fallbackName = `Pin ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    let spot: Spot;
    try {
      const res = await reverseGeocode(lat, lng);
      spot = {
        id: makeId(),
        name: res?.name ?? fallbackName,
        lat,
        lng,
        country: res?.country,
        countryCode: res?.countryCode,
        emoji: "📍",
      };
    } catch {
      spot = { id: makeId(), name: fallbackName, lat, lng, emoji: "📍" };
    }
    setTrip((prev) => [...prev, spot]);
    setIsSample(false);
    setSelectedId(spot.id);
    toast.success(`Added ${spot.name} ${flagEmoji(spot.countryCode)}`, {
      id: tid,
    });
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
    const url = buildShareUrl(trip);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Trip link copied — paste it anywhere to share");
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

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
