import { ref } from "vue";

const STORAGE_KEY = "se-lab-sidebar-collapsed";

// Partagé (topbar/toolbar et sidebar n'ont pas de lien parent-enfant
// direct). Replié par défaut, comme l'app vanilla — mais la préférence de
// l'utilisateurice une fois changée est mémorisée (localStorage), pour
// survivre à un rechargement de page.
export const sidebarCollapsed = ref(localStorage.getItem(STORAGE_KEY) !== "false");

export function setSidebarCollapsed(collapsed: boolean): void {
  sidebarCollapsed.value = collapsed;
  localStorage.setItem(STORAGE_KEY, String(collapsed));
}

export function toggleSidebarCollapsed(): void {
  setSidebarCollapsed(!sidebarCollapsed.value);
}
