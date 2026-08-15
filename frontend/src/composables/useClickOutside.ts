import { onBeforeUnmount, onMounted, type Ref } from "vue";

/** Appelle `onOutside` au premier clic hors de `target`. Pour les menus/dropdowns. */
export function useClickOutside(target: Ref<HTMLElement | null | undefined>, onOutside: () => void): void {
  function handleClick(event: MouseEvent): void {
    if (target.value && !target.value.contains(event.target as Node)) onOutside();
  }

  onMounted(() => document.addEventListener("click", handleClick));
  onBeforeUnmount(() => document.removeEventListener("click", handleClick));
}
