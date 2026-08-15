# Streamer Lab — frontend

Frontend Vue 3 + TypeScript (Composition API, `<script setup>`) + Vite, avec Pinia pour l'état partagé et Vitest pour les tests de la logique pure. Pas de routeur : la bascule entre le dashboard et les éditeurs (widget/alerte, overlay) est un simple état, pas une vraie navigation d'URL.

Documentation complète (démarrage, architecture, tests) : voir le [README de la racine du dépôt](../README.md).

## Scripts

- `npm run dev` — serveur de dev Vite (rechargement à chaud), proxie `/api`/`/auth`/`/library-media`/`/vendor` vers le serveur Node (`node ../server.mjs`, à lancer séparément sur le port 4173).
- `npm run build` — vérifie les types (`vue-tsc -b`) puis build de production dans `dist/`.
- `npm run build:watch` — build de production en continu (sans vérification de types), utilisé par `npm run dev` à la racine.
- `npm run test` — Vitest.
- `npm run typecheck` — `vue-tsc -b --noEmit` seul.
