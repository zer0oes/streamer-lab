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

export const projectDialog = ref<ProjectDialogHandle | null>(null);
export const widgetDialog = ref<WidgetDialogHandle | null>(null);
export const overlayDialog = ref<OverlayDialogHandle | null>(null);
export const contactDialog = ref<ContactDialogHandle | null>(null);
export const mediaPreviewDialog = ref<MediaPreviewDialogHandle | null>(null);
