import type { Ref } from "vue";

/**
 * Ferme un <dialog> seulement sur un vrai clic sur son propre "backdrop"
 * (event.target === l'élément dialog), jamais sur la fin d'une sélection de
 * texte à la souris qui se termine hors d'un champ — port du correctif
 * appliqué à l'ancienne app (closeDialogOnBackdropClick dans app.js) : sans
 * le suivi du mousedown, un simple `click` fermait le dialog en pleine
 * sélection de texte dans le champ "Nom".
 */
export function useDialogBackdropClose(dialogRef: Ref<HTMLDialogElement | null | undefined>, close: () => void) {
  let pressedOnBackdrop = false;

  function onMousedown(event: MouseEvent): void {
    pressedOnBackdrop = event.target === dialogRef.value;
  }

  function onClick(event: MouseEvent): void {
    if (pressedOnBackdrop && event.target === dialogRef.value) close();
    pressedOnBackdrop = false;
  }

  return { onMousedown, onClick };
}
