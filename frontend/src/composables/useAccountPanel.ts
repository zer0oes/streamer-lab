import { ref } from "vue";

// Partagé (comme useToast) : le bouton compte de la topbar et le panneau
// lui-même n'ont pas de lien parent-enfant direct dans l'arbre de composants.
export const accountPanelOpen = ref(false);

export function toggleAccountPanel(open?: boolean): void {
  accountPanelOpen.value = open ?? !accountPanelOpen.value;
}
