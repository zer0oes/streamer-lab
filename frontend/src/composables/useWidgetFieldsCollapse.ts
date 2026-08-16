import { ref } from "vue";

const STORAGE_KEY = "se-lab-widget-fields-collapsed";

// Préférence mémorisée (localStorage), même principe que
// useOverlayLayersCollapse.ts pour le panneau Calques de l'éditeur overlay —
// une fois replié, le panneau Champs le reste au prochain widget ouvert ou
// au prochain rechargement de page.
export const widgetFieldsCollapsed = ref(localStorage.getItem(STORAGE_KEY) === "true");

export function toggleWidgetFieldsCollapsed(): void {
  widgetFieldsCollapsed.value = !widgetFieldsCollapsed.value;
  localStorage.setItem(STORAGE_KEY, String(widgetFieldsCollapsed.value));
}
