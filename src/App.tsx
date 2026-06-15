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
  Menu,
  Play,
  Route,
  Share2,
  Sparkles,
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
  SheetClose,
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
import { JourneyReveal } from "./components/JourneyReveal";
import { PostcardIntro } from "./components/PostcardIntro";
import { ShareDialog } from "./components/ShareDialog";
import { TripLibrary } from "./components/TripLibrary";
import { SEED_TRIP, pickRandomDestination } from "./data/destinations";
import { reverseGeocode } from "./lib/geocode";
import {
  loadIsSample,
  loadLibrary,
  loadTrip,
  loadView,
  saveIsSample,
  saveLibrary,
  saveTrip,
  type TripDoc,
} from "./lib/storage";
import { flagEmoji, formatKm, makeId } from "./lib/utils";
import { totalDistance } from "./lib/distance";
import { formatDuration } from "./lib/stats";
import { legKm, tripHours } from "./lib/transport";
import { classify } from "./lib/tripScale";
import { exportPostcard } from "./lib/postcard";
import { recordCanvas } from "./lib/recorder";
import { buildShareUrl, clearHash, tripFromHash } from "./lib/share";
import { fetchSharedTrip, supabaseEnabled } from "./lib/supabase";
import { loadPlaces, pickRandomPlace, warmPlaces } from "./lib/places";
import { loadCountries } from "./lib/countries";
import { useAutoLod } from "./hooks/useAutoLod";
import type { MapHandle, Spot } from "./types";

const GlobeView = lazy(() => import("./components/GlobeView"));
const MapView = lazy(() => import("./components/MapView"));
const MapView3D = lazy(() => import("./components/MapView3D"));

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sharedCtaOpen, setSharedCtaOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [draftName, setDraftName] = useState("My trip");
  const [library, setLibrary] = useState<TripDoc[]>(() => loadLibrary());
  const [surprise, setSurprise] = useState<Spot | null>(null);
  const [tourSpot, setTourSpot] = useState<{
    spot: Spot;
    i: number;
    total: number;
  } | null>(null);
  const [postcard, setPostcard] = useState<{ count: number } | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [reelPromptOpen, setReelPromptOpen] = useState(false);
  const reel3dPrefRef = useRef<boolean | null>(null);
  const lod = useAutoLod(loadView(), revealOpen || playing);
  const view = lod.view;

  // Each view owns its own camera handle, so a view that unmounts (or is
  // pre-mounted hidden during the LOD crossfade) can only clear its own ref —
  // never the active view's. Camera calls route to whichever view is current.
  const globeHandleRef = useRef<MapHandle | null>(null);
  const map3dHandleRef = useRef<MapHandle | null>(null);
  const mapHandleRef = useRef<MapHandle | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const activeHandle = useCallback((): MapHandle | null => {
    const v = viewRef.current;
    return v === "globe"
      ? globeHandleRef.current
      : v === "3d"
        ? map3dHandleRef.current
        : mapHandleRef.current;
  }, []);

  const tourRef = useRef(false);
  const tripLenRef = useRef(trip.length);
  const publishCacheRef = useRef<{ key: string; link: string } | null>(null);

  useEffect(() => {
    tripLenRef.current = trip.length;
  }, [trip.length]);

  useEffect(() => saveLibrary(library), [library]);

  useEffect(() => saveTrip(trip), [trip]);
  useEffect(() => saveIsSample(isSample), [isSample]);
  useEffect(() => {
    clearHash();
    warmPlaces();
    void loadCountries();
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
      setPostcard({ count: loaded.length });
    })();
  }, []);

  const flyTo = useCallback(
    (lat: number, lng: number, zoom?: number) => {
      activeHandle()?.flyTo(lat, lng, zoom ? { zoom } : undefined);
    },
    [activeHandle],
  );

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
    (place: Spot) => {
      const first = tripLenRef.current === 0;
      const spot: Spot = { ...place, id: makeId() };
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
    void loadPlaces().then(() => {
      const exclude = surprise ? new Set([surprise.name]) : undefined;
      const next =
        pickRandomPlace(exclude) ??
        pickRandomDestination(surprise ? [surprise.id] : []);
      setSurprise(next);
      setSheetOpen(false);
      flyTo(next.lat, next.lng, 5);
    });
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
    setRevealOpen(false);
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

  const publishLink = useCallback(async (): Promise<string> => {
    const key = JSON.stringify(trip.map((s) => [s.name, s.lat, s.lng]));
    if (publishCacheRef.current?.key === key) return publishCacheRef.current.link;
    if (supabaseEnabled && trip.length > 0) {
      try {
        const r = await fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trip }),
        });
        if (r.ok) {
          const { slug } = await r.json();
          const link = `${location.origin}/t/${slug}`;
          publishCacheRef.current = { key, link };
          return link;
        }
      } catch {
        /* empty */
      }
    }
    const url = buildShareUrl(trip);
    publishCacheRef.current = { key, link: url };
    return url;
  }, [trip]);

  const getCanvas = useCallback(
    () => activeHandle()?.snapshot?.() ?? null,
    [activeHandle],
  );

  const openShare = useCallback(() => {
    if (trip.length === 0) return;
    setShareOpen(true);
  }, [trip.length]);

  const stopTour = useCallback(() => {
    tourRef.current = false;
    setPlaying(false);
    setTourSpot(null);
  }, []);

  const playTour = useCallback(
    async (use3dShort = true) => {
      if (trip.length < 2) return;
      setRevealOpen(false);
      tourRef.current = true;
      setPlaying(true);

      // closer zoom for shorter hops, so the 3D arrival frames the place well
      const zoomFor = (km: number) =>
        km < 25 ? 12 : km < 75 ? 10 : km < 150 ? 8.5 : 7;
      const ensureEngine = async (engine: "globe" | "3d") => {
        if (viewRef.current === engine) return;
        lod.selectView(engine);
        await new Promise((r) => setTimeout(r, engine === "3d" ? 1100 : 600));
      };

      for (let i = 0; i < trip.length; i++) {
        if (!tourRef.current) break;
        const spot = trip[i];
        const km = i > 0 ? legKm(trip, i) : Infinity;
        const use3d = use3dShort && i > 0 && km < 200;
        setSelectedId(spot.id);
        setTourSpot({ spot, i: i + 1, total: trip.length });
        await ensureEngine(use3d ? "3d" : "globe");
        if (!tourRef.current) break;
        if (use3d) activeHandle()?.flyTo(spot.lat, spot.lng, { zoom: zoomFor(km) });
        else flyTo(spot.lat, spot.lng, 5);
        await new Promise((r) => setTimeout(r, use3d ? 2400 : 1800));
      }

      const completed = tourRef.current;
      tourRef.current = false;
      setPlaying(false);
      setTourSpot(null);
      if (completed && !isSample && trip.length >= 2) {
        activeHandle()?.fitToTrip(trip);
        setRevealOpen(true);
      }
    },
    [trip, flyTo, isSample, activeHandle, lod],
  );

  const playReel = useCallback(() => {
    if (trip.length < 2) return;
    const hasShortLeg = trip.some((_, i) => i > 0 && legKm(trip, i) < 200);
    if (hasShortLeg && reel3dPrefRef.current === null) {
      setReelPromptOpen(true);
      return;
    }
    void playTour(reel3dPrefRef.current ?? true);
  }, [trip, playTour]);

  const playSharedTour = useCallback(async () => {
    setPostcard(null);
    await playTour();
  }, [playTour]);

  const seeJourney = useCallback(() => {
    if (trip.length < 2) return;
    activeHandle()?.fitToTrip(trip);
    setRevealOpen(true);
  }, [trip, activeHandle]);

  const replayJourney = useCallback(() => {
    setRevealOpen(false);
    void playTour();
  }, [playTour]);

  const sharePostcard = useCallback(() => {
    const canvas = activeHandle()?.snapshot?.();
    if (canvas) {
      const info = classify(trip);
      const first = trip[0];
      const last = trip[trip.length - 1];
      const subtitle =
        first && last && first.id !== last.id
          ? `${first.name} to ${last.name}`
          : (first?.name ?? "");
      const countryCodes = new Set(
        trip.map((s) => s.countryCode).filter(Boolean),
      );
      const single = countryCodes.size <= 1;
      const stats = [
        { label: "Distance", value: formatKm(totalDistance(trip)) },
        { label: "Stops", value: String(trip.length) },
        single
          ? {
              label: "Cities",
              value: String(new Set(trip.map((s) => s.name)).size),
            }
          : { label: "Countries", value: String(countryCodes.size) },
        { label: "Time", value: formatDuration(tripHours(trip)) },
      ];
      const dateStamp = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const ok = exportPostcard(canvas, {
        title: info.copy,
        dateStamp,
        subtitle,
        stats,
      });
      if (ok) {
        toast.success("Postcard saved to your downloads");
        return;
      }
    }
    setShareOpen(true);
  }, [trip, activeHandle]);

  const recordJourney = useCallback(async () => {
    if (view !== "globe") {
      toast("Video capture works in the globe view");
      return;
    }
    const canvas = activeHandle()?.snapshot?.();
    if (!canvas) {
      toast.error("The globe isn't ready yet");
      return;
    }
    setRevealOpen(false);
    const tid = toast.loading("Recording your journey...");
    try {
      const ok = await recordCanvas(canvas, async () => {
        await playTour(false);
      });
      toast.dismiss(tid);
      if (ok) toast.success("Journey video saved to your downloads");
      else toast.error("Video capture isn't supported in this browser");
    } catch {
      toast.dismiss(tid);
      toast.error("Couldn't record the journey");
    }
  }, [view, playTour, activeHandle]);

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
      setRevealOpen(false);
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
  };

  const layerStyle = (v: typeof view) => ({
    opacity: lod.opacityOf(v),
    transition: "opacity 450ms ease",
    pointerEvents: (view === v ? "auto" : "none") as "auto" | "none",
  });

  const tripPanel = (
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
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1120]">
      <div className="absolute inset-0 lg:right-[21.5rem]">
        <Suspense fallback={<ViewFallback />}>
          {lod.rendered.includes("globe") && (
            <div className="absolute inset-0" style={layerStyle("globe")}>
              <GlobeView
                {...viewProps}
                handleRef={globeHandleRef}
                revealing={revealOpen}
                initialPov={lod.pov ?? undefined}
                onCamera={(alt, lat, lng) => {
                  if (typeof window !== "undefined")
                    (window as unknown as { __wpCam?: unknown }).__wpCam = {
                      alt,
                      lat,
                      lng,
                    };
                  lod.onGlobeCamera(alt, lat, lng);
                }}
              />
            </div>
          )}
          {lod.rendered.includes("3d") && (
            <div className="absolute inset-0" style={layerStyle("3d")}>
              <MapView3D
                {...viewProps}
                handleRef={map3dHandleRef}
                initialCamera={lod.handoff ?? undefined}
                onReady={lod.on3dReady}
                onCamera={lod.on3dCamera}
              />
            </div>
          )}
          {lod.rendered.includes("map") && (
            <div className="absolute inset-0" style={layerStyle("map")}>
              <MapView {...viewProps} handleRef={mapHandleRef} />
            </div>
          )}
        </Suspense>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3">
        <TooltipProvider delayDuration={300}>
          <div className="pointer-events-auto flex w-full items-center gap-2 sm:w-auto">
            <div className="bg-background/90 flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 shadow-sm backdrop-blur">
              <Compass className="text-primary size-5" />
              <span className="hidden font-semibold tracking-tight sm:inline">
                Wanderpin
              </span>
            </div>

            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <SearchBar onSelect={handleSearchSelect} />
            </div>

            {/* Desktop: full inline toolbar */}
            <div className="hidden flex-wrap items-center gap-2 lg:flex">
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

              <ViewToggle value={view} onChange={lod.selectView} />

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
                    onClick={openShare}
                    disabled={trip.length === 0}
                    className="bg-background/90 shadow-sm backdrop-blur"
                  >
                    <Share2 className="size-4" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share this journey</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={playing ? stopTour : playReel}
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={seeJourney}
                    aria-label="See your journey"
                    disabled={trip.length < 2}
                    className="bg-background/90 shadow-sm backdrop-blur"
                  >
                    <Sparkles className="size-4" />
                    <span className="hidden sm:inline">Journey</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>See your journey reveal</TooltipContent>
              </Tooltip>
            </div>

            {/* Mobile + tablet: compact — actions in a sheet, trip in a drawer */}
            <div className="ml-auto flex items-center gap-2 lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="secondary"
                    aria-label="More actions"
                    className="bg-background/90 shadow-sm backdrop-blur"
                  >
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="p-4">
                  <SheetHeader>
                    <SheetTitle>Actions</SheetTitle>
                  </SheetHeader>
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex justify-center pb-1">
                      <ViewToggle value={view} onChange={lod.selectView} />
                    </div>
                    <SheetClose asChild>
                      <Button
                        variant="secondary"
                        className="justify-start"
                        onClick={rollSurprise}
                      >
                        <Dices className="size-4" />
                        Take me somewhere
                      </Button>
                    </SheetClose>
                    <div className="[&>button]:w-full [&>button]:justify-start">
                      <TripLibrary
                        docs={library}
                        onSave={saveCurrentTrip}
                        onOpen={openTrip}
                        onDelete={deleteTrip}
                      />
                    </div>
                    <SheetClose asChild>
                      <Button
                        variant="secondary"
                        className="justify-start"
                        onClick={openShare}
                        disabled={trip.length === 0}
                      >
                        <Share2 className="size-4" />
                        Share
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="secondary"
                        className="justify-start"
                        onClick={playing ? stopTour : playReel}
                        disabled={trip.length < 2}
                      >
                        {playing ? (
                          <Square className="size-4" />
                        ) : (
                          <Play className="size-4" />
                        )}
                        {playing ? "Stop" : "Play"}
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="secondary"
                        className="justify-start"
                        onClick={seeJourney}
                        disabled={trip.length < 2}
                      >
                        <Sparkles className="size-4" />
                        Journey
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>

              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="secondary"
                    className="bg-background/90 shadow-sm backdrop-blur"
                  >
                    <Route className="size-4" />
                    {trip.length}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[72vh] p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>My Trip</SheetTitle>
                  </SheetHeader>
                  {tripPanel}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </TooltipProvider>
      </div>

      <aside className="bg-background/95 absolute top-16 right-3 bottom-3 z-20 hidden w-80 flex-col overflow-hidden rounded-xl border border-border shadow-2xl backdrop-blur lg:flex">
        {tripPanel}
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

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        trip={trip}
        getCanvas={getCanvas}
        publishLink={publishLink}
      />

      <Dialog open={reelPromptOpen} onOpenChange={setReelPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Show close stops in 3D?</DialogTitle>
            <DialogDescription>
              Some of your stops are close together. Want those short hops shown
              up close in 3D? Longer legs stay on the globe.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                reel3dPrefRef.current = false;
                setReelPromptOpen(false);
                void playTour(false);
              }}
            >
              Keep it on the globe
            </Button>
            <Button
              onClick={() => {
                reel3dPrefRef.current = true;
                setReelPromptOpen(false);
                void playTour(true);
              }}
            >
              Yes, use 3D
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReelCaption tour={tourSpot} />

      {revealOpen && (
        <JourneyReveal
          trip={trip}
          canShareImage={view !== "map"}
          onClose={() => setRevealOpen(false)}
          onReplay={replayJourney}
          onSave={openShare}
          onShare={sharePostcard}
          onVideo={recordJourney}
        />
      )}

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
          setRevealOpen(false);
          history.replaceState(null, "", "/");
          toast("Blank canvas ready. Drop a pin or hit Take me somewhere.");
        }}
        onDismiss={() => setSharedCtaOpen(false)}
      />

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
