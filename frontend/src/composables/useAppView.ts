import { ref } from "vue";

export type AppView = "dashboard" | "widget" | "overlay";

// Partagé : pas de vrai routeur, juste un état de vue parmi 3 - Dashboard,
// éditeur de widget, éditeur d'overlay. L'URL reste synchronisée avec cet
// état par useRouteSync.ts, qui observe ce ref plutôt que l'inverse — cette
// valeur reste la source de vérité, l'URL n'en est qu'un miroir.
export const activeView = ref<AppView>("dashboard");

export function setActiveView(view: AppView): void {
  activeView.value = view;
}
