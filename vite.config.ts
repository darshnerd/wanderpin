import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api/geocode": {
        target: "https://nominatim.openstreetmap.org",
        changeOrigin: true,
        headers: {
          "User-Agent": "Wanderpin/1.0 (+https://wanderpin-ecru.vercel.app)",
          Referer: "https://wanderpin-ecru.vercel.app",
        },
        rewrite: (path) => {
          const u = new URL(path, "http://localhost");
          const q = u.searchParams.get("q");
          const lat = u.searchParams.get("lat");
          const lon = u.searchParams.get("lon");
          const up = new URLSearchParams({
            format: "jsonv2",
            addressdetails: "1",
          });
          if (q) {
            up.set("limit", u.searchParams.get("limit") ?? "5");
            up.set("q", q);
            return `/search?${up.toString()}`;
          }
          up.set("lat", lat ?? "");
          up.set("lon", lon ?? "");
          return `/reverse?${up.toString()}`;
        },
      },
    },
  },
});
