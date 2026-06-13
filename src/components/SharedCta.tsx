import { Sparkles, X } from "lucide-react";

import { Button } from "./ui/button";

interface SharedCtaProps {
  open: boolean;
  onCreate: () => void;
  onDismiss: () => void;
}

export function SharedCta({ open, onCreate, onDismiss }: SharedCtaProps) {
  if (!open) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-4 relative w-[min(94vw,30rem)] overflow-hidden rounded-2xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur duration-500">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400" />
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground absolute top-3 right-3 cursor-pointer"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight">
              Make this journey yours
            </h3>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Loved where this went? Start from a blank globe, add the places
              you're dreaming of, and send your own journey to someone else.
            </p>
            <div className="mt-4 flex gap-2">
              <Button type="button" className="flex-1" onClick={onCreate}>
                <Sparkles className="size-4" />
                Start my own journey
              </Button>
              <Button type="button" variant="outline" onClick={onDismiss}>
                Keep exploring
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
