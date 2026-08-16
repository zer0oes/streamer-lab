import { ref } from "vue";

const STORAGE_KEY = "se-lab-overlay-layers-collapsed";

// Préférence mémorisée (localStorage) — une fois replié, le panneau Calques
// le reste au prochain overlay ouvert ou au prochain rechargement de page.
export const overlayLayersCollapsed = ref(localStorage.getItem(STORAGE_KEY) === "true");

export function toggleOverlayLayersCollapsed(): void {
  overlayLayersCollapsed.value = !overlayLayersCollapsed.value;
  localStorage.setItem(STORAGE_KEY, String(overlayLayersCollapsed.value));
}
