import { useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { Input } from "./ui/input";
import { searchPlaces } from "@/lib/geocode";
import { categoryGlyph, searchLocal, warmPlaces } from "@/lib/places";
import { flagEmoji, makeId } from "@/lib/utils";
import type { Spot } from "@/types";

interface SearchBarProps {
  onSelect: (spot: Spot) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Spot[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function choose(spot: Spot) {
    onSelect(spot);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onChange(v: string) {
    setQuery(v);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      const hits = searchLocal(v, 6);
      setResults(hits);
      setOpen(hits.length > 0);
    }, 120);
  }

  async function remoteFallback() {
    const term = query.trim();
    if (term.length < 2) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const found = await searchPlaces(term, 1, ac.signal);
      const r = found[0];
      if (r) {
        choose({
          id: makeId(),
          name: r.name,
          lat: r.lat,
          lng: r.lng,
          country: r.country,
          countryCode: r.countryCode,
          emoji: "📍",
        });
      }
    } catch {
      /* ignore */
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (results[0]) choose(results[0]);
    else void remoteFallback();
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
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            warmPlaces();
            if (results.length > 0) setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search a city or place"
          aria-label="Search for a place"
          className="bg-background/90 h-9 pr-8 pl-8 shadow-sm backdrop-blur"
        />
        {loading && (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="bg-popover text-popover-foreground absolute z-50 mt-1.5 max-h-72 w-full overflow-auto rounded-md border border-border p-1 shadow-lg">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                className="hover:bg-accent hover:text-accent-foreground flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors cursor-pointer"
              >
                <span className="mt-0.5 text-base leading-none">
                  {r.emoji ?? categoryGlyph(r.category)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {[
                      r.region,
                      r.countryCode ? flagEmoji(r.countryCode) : null,
                      r.vibe,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li className="text-muted-foreground border-t border-border px-2 py-1 text-[10px]">
            Places © GeoNames · search via OpenStreetMap
          </li>
        </ul>
      )}
    </form>
  );
}
