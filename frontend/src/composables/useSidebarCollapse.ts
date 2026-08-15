import { ref } from "vue";

// Partagé (topbar/toolbar et sidebar n'ont pas de lien parent-enfant
// direct). Replié par défaut, comme l'app vanilla (cf. la classe
// is-sidebar-collapsed déjà posée dans son index.html au chargement) —
// préférence de session, jamais persistée.
export const sidebarCollapsed = ref(true);

export function setSidebarCollapsed(collapsed: boolean): void {
  sidebarCollapsed.value = collapsed;
}

export function toggleSidebarCollapsed(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}
