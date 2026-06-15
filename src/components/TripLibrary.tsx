import { Bookmark, Trash2 } from "lucide-react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Button } from "./ui/button";
import type { TripDoc } from "@/lib/storage";

interface TripLibraryProps {
  docs: TripDoc[];
  onSave: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TripLibrary({
  docs,
  onSave,
  onOpen,
  onDelete,
}: TripLibraryProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          className="bg-background/90 shadow-sm backdrop-blur"
        >
          <Bookmark className="size-4" />
          <span>Trips</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle>My Trips</SheetTitle>
        </SheetHeader>
        <div className="px-3 pb-4">
          <Button className="w-full" onClick={onSave}>
            <Bookmark className="size-4" />
            Save current trip
          </Button>
          <ul className="mt-3 space-y-1">
            {docs.length === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                No saved trips yet. Save one to see it here.
              </p>
            ) : (
              docs.map((d) => (
                <li
                  key={d.id}
                  className="group hover:bg-accent/60 flex items-center gap-2 rounded-lg px-2 py-2 transition-colors"
                >
                  <SheetClose asChild>
                    <button
                      type="button"
                      onClick={() => onOpen(d.id)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <span className="block truncate text-sm font-medium">
                        {d.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {d.trip.length} {d.trip.length === 1 ? "stop" : "stops"}
                      </span>
                    </button>
                  </SheetClose>
                  <button
                    type="button"
                    aria-label={`Delete ${d.name}`}
                    onClick={() => onDelete(d.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
