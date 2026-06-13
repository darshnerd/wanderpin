import { useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

import { Input } from "./ui/input";
import { searchPlaces, type GeocodeResult } from "@/lib/geocode";

interface SearchBarProps {
  onSelect: (result: GeocodeResult) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function runSearch() {
    const term = query.trim();
    if (term.length < 2) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const found = await searchPlaces(term, 5, ac.signal);
      setResults(found);
      setOpen(true);
    } catch {
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }

  function choose(result: GeocodeResult) {
    onSelect(result);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch();
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative">
        <button
          type="submit"
          aria-label="Search"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2 cursor-pointer"
        >
          <Search className="size-4" />
        </button>
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(false);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search a city, then press Enter"
          aria-label="Search for a city"
          className="bg-background/90 h-9 pr-8 pl-8 shadow-sm backdrop-blur"
        />
        {loading && (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="bg-popover text-popover-foreground absolute z-50 mt-1.5 max-h-72 w-full overflow-auto rounded-md border border-border p-1 shadow-lg">
          {results.map((r, i) => (
            <li key={`${r.lat},${r.lng},${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                className="hover:bg-accent hover:text-accent-foreground flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors cursor-pointer"
              >
                <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block font-medium">{r.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {r.displayName}
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li className="text-muted-foreground border-t border-border px-2 py-1 text-[10px]">
            Search ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              OpenStreetMap
            </a>{" "}
            via Nominatim
          </li>
        </ul>
      )}
    </form>
  );
}
