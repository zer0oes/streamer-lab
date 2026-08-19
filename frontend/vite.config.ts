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
  // emptyOutDir: false — `npm run dev` (racine) lance un build complet PUIS
  // démarre `vite build --watch` et `node server.mjs --open` EN PARALLÈLE
  // (concurrently). Le passage initial de --watch reconstruit tout depuis
  // zéro et, par défaut, commence par VIDER dist/ avant de le remplir — sur
  // une fenêtre de quelques centaines de ms, dist/index.html n'existe plus
  // du tout pendant que --open ouvre déjà le navigateur, qui reçoit alors le
  // 404 JSON de secours de server.mjs (serveStatic) au lieu de la page.
  // Sans le vidage préalable, --watch réécrit les fichiers en place —
  // fenêtre d'absence bien plus courte (un seul fichier réécrit, pas un
  // dossier entier supprimé). Contrepartie acceptée : d'anciens chunks
  // hashés peuvent s'accumuler dans dist/ entre deux sessions de dev — sans
  // conséquence pour un outil local (rm/`npm run clean` au besoin), et sans
  // effet sur un build de prod isolé (`npm run build` réel, pas de --watch).
  build: {
    emptyOutDir: false
  },
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
