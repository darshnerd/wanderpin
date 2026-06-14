import { useEffect, useState } from "react";
import {
  Clock,
  Globe2,
  Image as ImageIcon,
  MapPin,
  RotateCcw,
  Route,
  Share2,
  Video,
  X,
} from "lucide-react";

import { Button } from "./ui/button";
import { useCounter } from "@/hooks/useCounter";
import { totalDistance } from "@/lib/distance";
import { formatDuration } from "@/lib/stats";
import { tripHours } from "@/lib/transport";
import { classify } from "@/lib/tripScale";
import { isDaylight, localTimeAt } from "@/lib/sun";
import { cn, formatKm } from "@/lib/utils";
import type { Spot } from "@/types";

interface JourneyRevealProps {
  trip: Spot[];
  canShareImage: boolean;
  onClose: () => void;
  onReplay: () => void;
  onSave: () => void;
  onShare: () => void;
  onVideo?: () => void;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function dateStamp(): string {
  const d = new Date();
  const date = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  return `${date} · ${weekday}`;
}

export function JourneyReveal({
  trip,
  canShareImage,
  onClose,
  onReplay,
  onSave,
  onShare,
  onVideo,
}: JourneyRevealProps) {
  const reduce = prefersReducedMotion();
  const [ready, setReady] = useState(reduce);
  const [step, setStep] = useState(reduce ? 99 : 0);

  const info = classify(trip);
  const countries = new Set(trip.map((s) => s.countryCode).filter(Boolean));
  const singleCountry = countries.size <= 1;
  const cities = new Set(trip.map((s) => s.name)).size;

  const stats = [
    {
      key: "distance",
      icon: <Route className="size-4" />,
      label: "Distance",
      target: totalDistance(trip),
      format: (v: number) => formatKm(v),
    },
    {
      key: "stops",
      icon: <MapPin className="size-4" />,
      label: trip.length === 1 ? "Stop" : "Stops",
      target: trip.length,
      format: (v: number) => String(Math.round(v)),
    },
    singleCountry
      ? {
          key: "cities",
          icon: <Globe2 className="size-4" />,
          label: cities === 1 ? "City" : "Cities",
          target: cities,
          format: (v: number) => String(Math.round(v)),
        }
      : {
          key: "countries",
          icon: <Globe2 className="size-4" />,
          label: "Countries",
          target: countries.size,
          format: (v: number) => String(Math.round(v)),
        },
    {
      key: "time",
      icon: <Clock className="size-4" />,
      label: "Time",
      target: tripHours(trip),
      format: (v: number) => formatDuration(v),
    },
  ];

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setReady(true), 320);
    return () => clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    if (!ready || step >= stats.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 180);
    return () => clearTimeout(t);
  }, [ready, step, stats.length]);

  const first = trip[0];
  const last = trip[trip.length - 1];
  const route =
    first && last && first.id !== last.id
      ? `${first.name} → ${last.name}`
      : (first?.name ?? "");
  const arrival = last
    ? `${isDaylight(last.lat, last.lng) ? "☀️" : "🌙"} It's ${localTimeAt(last.lat, last.lng)} in ${last.name} right now`
    : "";

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center md:pr-[21rem]">
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-4 motion-reduce:animate-none pointer-events-auto relative w-[min(94vw,30rem)] rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-center text-white shadow-2xl backdrop-blur-md duration-500 sm:p-6">
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400" />
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 cursor-pointer rounded-md p-1 text-white/60 transition-colors hover:text-white"
        >
          <X className="size-4" />
        </button>

        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
          {dateStamp()}
        </p>
        <h2 className="mt-2 bg-gradient-to-r from-sky-200 via-white to-violet-200 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
          {info.copy}
        </h2>
        {route && <p className="mt-1 truncate text-sm text-white/70">{route}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {stats.map((s, i) => (
            <StatCounter
              key={s.key}
              icon={s.icon}
              label={s.label}
              target={s.target}
              format={s.format}
              run={ready && i <= step}
            />
          ))}
        </div>

        <p className="mt-3 text-sm italic text-white/75">{info.kicker}</p>
        {arrival && <p className="mt-1 text-xs text-white/55">{arrival}</p>}

        <div className="mt-5 flex flex-col gap-2">
          <Button type="button" size="lg" onClick={onSave}>
            <Share2 className="size-4" />
            Share journey
          </Button>
          <div className="flex gap-2">
            {canShareImage && (
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={onShare}
              >
                <ImageIcon className="size-4" />
                Postcard
              </Button>
            )}
            {canShareImage && onVideo && (
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={onVideo}
              >
                <Video className="size-4" />
                Video
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="flex-1 text-white hover:text-white"
              onClick={onReplay}
            >
              <RotateCcw className="size-4" />
              Replay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCounter({
  icon,
  label,
  target,
  format,
  run,
}: {
  icon: React.ReactNode;
  label: string;
  target: number;
  format: (v: number) => string;
  run: boolean;
}) {
  const v = useCounter(target, { run });
  return (
    <div
      className={cn(
        "rounded-xl bg-white/5 px-2 py-2.5 transition-all duration-500",
        "motion-reduce:!translate-y-0 motion-reduce:!opacity-100 motion-reduce:transition-none",
        run ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
      )}
    >
      <div className="flex items-center justify-center text-white/55">
        {icon}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums sm:text-lg">
        {format(v)}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-white/45">
        {label}
      </div>
    </div>
  );
}
