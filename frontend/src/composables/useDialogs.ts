import { ref } from "vue";
import type { LibraryEntry, OverlayEntry, Project } from "../api/types";

// Les 3 dialogues (projet/widget/overlay) ne vivent qu'une fois, montés au
// niveau d'App.vue ; ce petit registre partagé évite de les faire descendre
// en props sur 3-4 niveaux de composants (sidebar → groupe → sous-groupe →
// ligne) pour un simple "ouvre-toi en mode création/édition".

export interface ProjectDialogHandle {
  openCreate(): void;
  openEdit(project: Project): void;
}

export interface WidgetDialogHandle {
  openCreate(defaultType?: "widget" | "alert", defaultProjectId?: string): void;
  openEdit(entry: LibraryEntry): void;
}

export interface OverlayDialogHandle {
  openCreate(defaultProjectId?: string): void;
  openEdit(entry: OverlayEntry): void;
}

export interface ContactDialogHandle {
  open(): void;
}

export interface MediaPreviewDialogHandle {
  open(item: { type: "image" | "video"; url: string; name: string }): void;
}

export interface StreamElementsOverlayPickerDialogHandle {
  open(): void;
}

export const projectDialog = ref<ProjectDialogHandle | null>(null);
export const widgetDialog = ref<WidgetDialogHandle | null>(null);
export const overlayDialog = ref<OverlayDialogHandle | null>(null);
export const contactDialog = ref<ContactDialogHandle | null>(null);
export const mediaPreviewDialog = ref<MediaPreviewDialogHandle | null>(null);
export const streamElementsOverlayPickerDialog = ref<StreamElementsOverlayPickerDialogHandle | null>(null);

// Port de creatingWidgetForOverlay (app.js) : quand l'éditeur d'overlay
// ouvre widgetDialog en mode création ("Nouveau widget"/"Nouvelle alerte"
// du menu Ajouter), il pose ici un callback à exécuter juste après la
// création réussie — WidgetSettingsDialog.vue le consomme et le réinitialise
// systématiquement (succès OU fermeture sans enregistrer), pour qu'il ne
// fuite jamais vers une création lancée depuis le tableau de bord.
export const pendingOverlayWidgetPlacement = ref<((entry: LibraryEntry) => void) | null>(null);
