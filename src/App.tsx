import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Toaster, toast } from "sonner";
import {
  Compass,
  Dices,
  Loader2,
  Play,
  Route,
  Share2,
  Square,
} from "lucide-react";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import { SearchBar } from "./components/SearchBar";
import { SurpriseCard } from "./components/SurpriseButton";
import { TripPanel } from "./components/TripPanel";
import { ViewToggle } from "./components/ViewToggle";
import { SharedCta } from "./components/SharedCta";
import { ReelCaption } from "./components/ReelCaption";
import { PostcardIntro } from "./components/PostcardIntro";
import { TripLibrary } from "./components/TripLibrary";
import { SEED_TRIP, pickRandomDestination } from "./data/destinations";
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
  const [clearOpen, setClearOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [draftName, setDraftName] = useState("My trip");
  const [library, setLibrary] = useState<TripDoc[]>(() => loadLibrary());
  const [surprise, setSurprise] = useState<Spot | null>(null);
  const [tourSpot, setTourSpot] = useState<{
    spot: Spot;
    i: number;
    total: number;
  } | null>(null);
  const [postcard, setPostcard] = useState<{ count: number } | null>(null);
  const handleRef = useRef<MapHandle | null>(null);
  const tourRef = useRef(false);
  const tripLenRef = useRef(trip.length);

  useEffect(() => {
    tripLenRef.current = trip.length;
  }, [trip.length]);

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
      setPostcard({ count: loaded.length });
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
    const first = tripLenRef.current === 0;
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
      toast.success(
        first
          ? `Your journey begins in ${res.name} ✨`
          : `Added ${res.name} ${flagEmoji(res.countryCode)}`,
        { id: tid },
      );
    } catch {
      setTrip((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: fallbackName } : s)),
      );
      toast.dismiss(tid);
    }
  }, []);

  const handleSearchSelect = useCallback(
    (r: GeocodeResult) => {
      const first = tripLenRef.current === 0;
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
      toast.success(
        first
          ? `Your journey begins in ${spot.name} ✨`
          : `Flew to ${spot.name} ${flagEmoji(spot.countryCode)} — added ⭐`,
      );
    },
    [addSpot],
  );

  const rollSurprise = useCallback(() => {
    const next = pickRandomDestination(surprise ? [surprise.id] : []);
    setSurprise(next);
    setSheetOpen(false);
    flyTo(next.lat, next.lng, 5);
  }, [surprise, flyTo]);

  const handleSurpriseSave = useCallback(
    (d: Spot) => {
      const first = tripLenRef.current === 0;
      const spot: Spot = { ...d, id: makeId() };
      addSpot(spot, { fly: true });
      setSurprise(null);
      toast.success(
        first
          ? `Your journey begins in ${spot.name} ✨`
          : `Saved ${spot.name} ${flagEmoji(spot.countryCode)} ⭐`,
      );
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
    setClearOpen(true);
  }, [trip.length]);

  const confirmClear = useCallback(() => {
    const snapshot = trip;
    setTrip([]);
    setIsSample(false);
    setSelectedId(null);
    setClearOpen(false);
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
    setTourSpot(null);
  }, []);

  const playTour = useCallback(async () => {
    if (trip.length < 2) return;
    tourRef.current = true;
    setPlaying(true);
    for (let i = 0; i < trip.length; i++) {
      if (!tourRef.current) break;
      const spot = trip[i];
      setSelectedId(spot.id);
      setTourSpot({ spot, i: i + 1, total: trip.length });
      flyTo(spot.lat, spot.lng, 5);
      await new Promise((r) => setTimeout(r, 1800));
    }
    tourRef.current = false;
    setPlaying(false);
    setTourSpot(null);
  }, [trip, flyTo]);

  const playSharedTour = useCallback(async () => {
    setPostcard(null);
    await playTour();
    setSharedCtaOpen(true);
  }, [playTour]);

  const saveCurrentTrip = useCallback(() => {
    setDraftName("My trip");
    setSaveOpen(true);
  }, []);

  const confirmSave = useCallback(() => {
    const name = draftName.trim();
    if (!name) return;
    setLibrary((prev) => [
      { id: makeId(), name, trip, updatedAt: Date.now() },
      ...prev,
    ]);
    setSaveOpen(false);
    toast.success(`Saved "${name}" to your trips`);
  }, [draftName, trip]);

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
        <TooltipProvider delayDuration={300}>
          <div className="pointer-events-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <div className="bg-background/90 flex h-9 items-center gap-1.5 rounded-md px-2.5 shadow-sm backdrop-blur">
                <Compass className="text-primary size-5" />
                <span className="hidden font-semibold tracking-tight sm:inline">
                  Wanderpin
                </span>
              </div>

              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <SearchBar onSelect={handleSearchSelect} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={rollSurprise}
                    className="bg-background/90 shadow-sm backdrop-blur"
                  >
                    <Dices className="size-4" />
                    <span className="hidden sm:inline">Take me somewhere</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Surprise me with a place</TooltipContent>
              </Tooltip>

              <ViewToggle value={view} onChange={setView} />

              <TripLibrary
                docs={library}
                onSave={saveCurrentTrip}
                onOpen={openTrip}
                onDelete={deleteTrip}
              />

              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent>Copy a link to this journey</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
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
                    <span className="hidden sm:inline">
                      {playing ? "Stop" : "Play"}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {playing ? "Stop the reel" : "Play your journey"}
                </TooltipContent>
              </Tooltip>

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
                    onInspire={rollSurprise}
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </TooltipProvider>
      </div>

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
          onInspire={rollSurprise}
        />
      </aside>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear this trip?</DialogTitle>
            <DialogDescription>
              This removes all {trip.length} stops from your current trip. You
              can undo right after.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClear}>
              Clear all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this trip</DialogTitle>
            <DialogDescription>
              Give it a name so you can find it later in My Trips.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmSave();
            }}
            placeholder="Trip name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSave}>Save trip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReelCaption tour={tourSpot} />

      <SurpriseCard
        spot={surprise}
        onSave={handleSurpriseSave}
        onAgain={rollSurprise}
        onDismiss={() => setSurprise(null)}
      />

      <PostcardIntro
        open={!!postcard}
        count={postcard?.count ?? 0}
        onPlay={playSharedTour}
        onSkip={() => {
          setPostcard(null);
          setSharedCtaOpen(true);
        }}
      />

      <SharedCta
        open={sharedCtaOpen}
        onCreate={() => {
          setTrip([]);
          setIsSample(false);
          setSelectedId(null);
          setSharedCtaOpen(false);
          toast("Blank canvas ready. Drop a pin or hit Take me somewhere.");
        }}
        onDismiss={() => setSharedCtaOpen(false)}
      />

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
