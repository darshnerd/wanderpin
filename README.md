# Wanderpin

A travel planner built around a 3D globe. Drop pins on a spinning night-earth (or a flat map if you prefer), and Wanderpin stitches them into a trip — working out the total distance and how many countries you'd cross.

**Live:** https://wanderpin-ecru.vercel.app/

## What it does

- **Globe and map, same trip.** A 3D globe (three.js via react-globe.gl) with glowing pins and animated arcs between stops, and a 2D Leaflet map with a dashed route line. One toggle swaps between them.
- **Add stops your way.** Search a city (geocoded through OpenStreetMap's Nominatim) or just click anywhere on the map to drop a reverse-geocoded pin.
- **Surprise me.** A set of hand-picked destinations, each with a fun fact and a vibe, for when you don't know where to go next.
- **Trip at a glance.** A side panel lists your stops in order with the total distance (haversine) and country count.
- **It remembers.** Your trip and chosen view persist to localStorage, and first-time visitors land on a sample Paris → Rome → Cairo route.

## Tech

- React 19 + TypeScript, built with Vite
- Tailwind CSS v4 with shadcn-style components
- react-globe.gl / three.js for the 3D view, react-leaflet for the 2D map
- OpenStreetMap Nominatim for geocoding (no API key)
- sonner for toasts

## Running locally

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run preview  # preview the production build
```

## Deploying

The app is a static Vite SPA and deploys to Vercel with zero config — Vercel auto-detects the framework, runs `npm run build`, and serves `dist/`. The included `vercel.json` adds an SPA fallback rewrite so deep links resolve once URL-based trip sharing lands.

## License

See [LICENSE](./LICENSE).
