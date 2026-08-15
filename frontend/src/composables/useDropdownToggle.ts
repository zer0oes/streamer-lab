import { ref } from "vue";
import { useClickOutside } from "./useClickOutside";

/** Mécanique partagée par tous les menus déroulants custom (filtre projet, tri par colonne). */
export function useDropdownToggle() {
  const open = ref(false);
  const containerEl = ref<HTMLElement | null>(null);
  useClickOutside(containerEl, () => {
    open.value = false;
  });

  function toggle(): void {
    open.value = !open.value;
  }

  function close(): void {
    open.value = false;
  }

  return { open, containerEl, toggle, close };
}
