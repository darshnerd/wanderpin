import { Camera, Compass, Plane } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { TEMPLATES, type TripTemplate } from "@/data/templates";

interface OnboardingWelcomeProps {
  open: boolean;
  onChoose: (mode: "plan" | "remember") => void;
  onSkip: () => void;
  cityHint?: string | null;
  onPickTemplate: (t: TripTemplate) => void;
}

export function OnboardingWelcome({
  open,
  onChoose,
  onSkip,
  cityHint,
  onPickTemplate,
}: OnboardingWelcomeProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onSkip();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="items-center text-center">
          <div className="text-primary mb-1 flex items-center gap-1.5">
            <Compass className="size-5" />
            <span className="font-semibold tracking-tight">Wanderpin</span>
          </div>
          <DialogTitle className="text-2xl">
            Where does your journey begin?
          </DialogTitle>
          <DialogDescription>
            {cityHint
              ? `Drop pins on a living globe and watch your trip fly. Starting near ${cityHint}?`
              : "Drop pins on a living globe and watch your trip come to life. What are you here to make?"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onChoose("plan")}
            className="hover:border-primary hover:bg-primary/5 flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors"
          >
            <Plane className="text-primary size-6" />
            <span className="text-base font-semibold">Plan a trip</span>
            <span className="text-muted-foreground text-sm">
              Dream up somewhere you want to go.
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChoose("remember")}
            className="hover:border-primary hover:bg-primary/5 flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors"
          >
            <Camera className="text-primary size-6" />
            <span className="text-base font-semibold">Save a journey</span>
            <span className="text-muted-foreground text-sm">
              Map a trip you have already taken.
            </span>
          </button>
        </div>

        <div className="mt-1">
          <p className="text-muted-foreground mb-2 text-center text-xs">
            or start from a journey
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPickTemplate(t)}
                className="hover:border-primary hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors"
              >
                <span>{t.emoji}</span>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground mx-auto mt-1 text-sm cursor-pointer"
        >
          Just exploring →
        </button>
      </DialogContent>
    </Dialog>
  );
}
