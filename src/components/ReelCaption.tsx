import { Badge } from "./ui/badge";
import { flagEmoji } from "@/lib/utils";
import { useTour } from "@/lib/reelStore";

export function ReelCaption() {
  const tour = useTour();
  if (!tour) return null;
  const { spot, i, total } = tour;
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-16 flex flex-col items-center px-6 text-center">
        <div
          key={spot.id}
          className="animate-in fade-in slide-in-from-bottom-3 flex flex-col items-center duration-500"
        >
          <span className="text-5xl drop-shadow-lg">
            {spot.emoji ?? flagEmoji(spot.countryCode)}
          </span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white drop-shadow-lg">
            {spot.name}
          </h2>
          {spot.vibe && (
            <Badge className="mt-2 bg-white/15 text-white backdrop-blur">
              {spot.vibe}
            </Badge>
          )}
        </div>
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: total }).map((_, idx) => (
            <span
              key={idx}
              className={
                idx < i
                  ? "h-1 w-6 rounded-full bg-white"
                  : "h-1 w-6 rounded-full bg-white/30"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
