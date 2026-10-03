import type { OverlayEntry } from "../api/types";

export interface MediaRef {
  url: string;
  // Médias StreamElements uniquement : nom de l'overlay StreamElements qui
  // les référence (cf. extractMediaFromOverlay côté serveur).
  overlayName?: string | null;
}

function collectStrings(value: unknown, into: string[]): void {
  if (typeof value === "string") {
    into.push(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, into);
  } else if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectStrings(entry, into);
  }
}

/**
 * Médias "associés" à un ensemble d'overlays (ceux d'un projet sur le
 * dashboard) : tout média dont l'URL apparaît quelque part dans les réglages
 * de leurs items — src d'une image/vidéo, valeur de champ d'un widget, aperçu
 * d'un repère importé, url(...) dans du CSS... —, plus, pour un overlay
 * importé de StreamElements, les médias StreamElements de l'overlay d'origine
 * (même nom). Le code des widgets de la bibliothèque n'est pas chargé sur le
 * dashboard : un média utilisé uniquement en dur dans ce code n'est pas vu.
 */
export function filterMediaUsedByOverlays<T extends MediaRef>(media: T[], overlays: OverlayEntry[]): T[] {
  const strings: string[] = [];
  for (const overlay of overlays) collectStrings(overlay.items.map((item) => item.props), strings);
  const importedNames = new Set(overlays.filter((overlay) => overlay.sourcePlatform === "streamelements").map((overlay) => overlay.name));
  return media.filter(
    (item) => (item.overlayName != null && importedNames.has(item.overlayName)) || strings.some((value) => value.includes(item.url))
  );
}
