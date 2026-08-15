import { ref } from "vue";

export type AppView = "dashboard" | "widget" | "overlay";

// Partagé : pas de vraie route/URL (comme l'app vanille), juste un état de
// vue parmi 3 - Dashboard, éditeur de widget, éditeur d'overlay (Phase 3).
export const activeView = ref<AppView>("dashboard");

export function setActiveView(view: AppView): void {
  activeView.value = view;
}
