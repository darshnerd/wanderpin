import { Play, Sparkles } from "lucide-react";

import { Button } from "./ui/button";

interface PostcardIntroProps {
  open: boolean;
  count: number;
  onPlay: () => void;
  onSkip: () => void;
}

export function PostcardIntro({ open, count, onPlay, onSkip }: PostcardIntroProps) {
  if (!open) return null;
  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-300">
      <div className="animate-in zoom-in-95 slide-in-from-bottom-4 relative w-[min(94vw,28rem)] overflow-hidden rounded-2xl border border-border bg-card/95 p-6 text-center shadow-2xl backdrop-blur duration-500">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400" />
        <span className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-2xl">
          <Sparkles className="size-6" />
        </span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">
          Someone shared a journey with you
        </h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {count} {count === 1 ? "place" : "places"} await, drawn across the
          globe. Press play and let it take you there.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button type="button" size="lg" onClick={onPlay}>
            <Play className="size-4" />
            Play the journey
          </Button>
          <Button type="button" variant="ghost" onClick={onSkip}>
            Skip to the map
          </Button>
        </div>
      </div>
    </div>
  );
}
