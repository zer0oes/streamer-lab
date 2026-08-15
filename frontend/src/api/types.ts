// Formes renvoyées par server.mjs (cf. lib/projects.mjs, lib/widgets.mjs,
// lib/overlays.mjs — non modifiés par cette réécriture). Étendu au fil des
// phases, pas d'un coup : seuls les champs réellement consommés par le
// frontend Vue sont typés pour l'instant.

export interface Project {
  id: string;
  name: string;
  description: string;
  icon: string;
  archived: boolean;
  order: number;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface LibraryEntry {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: "widget" | "alert";
  archived: boolean;
  order: number;
  width: number;
  height: number;
  createdAt: number | null;
  updatedAt: number | null;
  projectId: string;
}

export interface OverlayEntry {
  id: string;
  name: string;
  description: string;
  icon: string;
  archived: boolean;
  order: number;
  canvas: { width: number; height: number };
  sourcePlatform: "streamelements" | "streamlabs" | null;
  sourceOverlayId: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  projectId: string;
}
