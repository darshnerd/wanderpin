import { useEffect, useState } from "react";
import type { Trip } from "@/types";

export interface CountryIntel {
  name: string;
  continent?: string;
  capital?: string;
  currency?: string;
  currencyName?: string;
  languages?: string;
  bbox?: [number, number, number, number];
}

type CountryMap = Record<string, CountryIntel>;

let cache: CountryMap | null = null;
let loading: Promise<CountryMap> | null = null;

export function loadCountries(): Promise<CountryMap> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = fetch("/countries.json")
      .then((r) => r.json())
      .then((d: CountryMap) => {
        cache = d;
        return d;
      })
      .catch(() => {
        cache = {};
        return cache;
      });
  }
  return loading;
}

export function useCountries(): CountryMap {
  const [map, setMap] = useState<CountryMap>(cache ?? {});
  useEffect(() => {
    let alive = true;
    void loadCountries().then((m) => {
      if (alive) setMap(m);
    });
    return () => {
      alive = false;
    };
  }, []);
  return map;
}

const langName = (() => {
  let dn: Intl.DisplayNames | null = null;
  try {
    dn = new Intl.DisplayNames(undefined, { type: "language" });
  } catch {
    dn = null;
  }
  return (code: string): string => {
    try {
      return dn?.of(code) ?? code;
    } catch {
      return code;
    }
  };
})();

function uniq(xs: (string | undefined | false)[]): string[] {
  return [...new Set(xs.filter(Boolean) as string[])];
}

function intel(c: CountryMap, cc?: string): CountryIntel | undefined {
  return cc ? c[cc.toUpperCase()] : undefined;
}

export function continentsOf(trip: Trip, c: CountryMap): string[] {
  return uniq(trip.map((s) => intel(c, s.countryCode)?.continent));
}

export function currenciesOf(trip: Trip, c: CountryMap): string[] {
  return uniq(trip.map((s) => intel(c, s.countryCode)?.currency));
}

export function languagesOf(trip: Trip, c: CountryMap): string[] {
  const codes = uniq(
    trip.map((s) => {
      const l = intel(c, s.countryCode)?.languages;
      return l ? l.split(",")[0].split("-")[0] : undefined;
    }),
  );
  return codes.map(langName);
}
