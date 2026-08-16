import { ref } from "vue";

// Préférence de session (pas persistée), comme useSidebarCollapse.ts — le
// panneau Calques démarre toujours déplié à l'ouverture d'un overlay.
export const overlayLayersCollapsed = ref(false);

export function toggleOverlayLayersCollapsed(): void {
  overlayLayersCollapsed.value = !overlayLayersCollapsed.value;
}
