import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

// Le backend Node existant (server.mjs, lancé séparément via `npm run dev` à
// la racine) reste la seule source de vérité pour l'API et les fichiers de
// bibliothèque — ce proxy fait juste comme si le frontend Vue et l'API
// vivaient sur la même origine pendant le développement, sans dupliquer ni
// réécrire le serveur.
// IPv4 explicite (pas "localhost") : server.mjs n'écoute que sur 127.0.0.1,
// et "localhost" résout d'abord en ::1 (IPv6) sur cette machine — le proxy
// échouerait en ECONNREFUSED sinon.
const BACKEND_ORIGIN = "http://127.0.0.1:4173";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": BACKEND_ORIGIN,
      "/auth": BACKEND_ORIGIN,
      "/library-media": BACKEND_ORIGIN,
      "/vendor": BACKEND_ORIGIN
    }
  },
  test: {
    environment: "jsdom"
  }
});
