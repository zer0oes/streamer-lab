// Port de normalizeFieldDefinitions / loadFieldData (public/app.js) — la
// bascule de migration d'une ancienne clé localStorage globale pré-existante
// n'est pas reprise ici : elle ne concernait que l'app vanilla d'avant la
// clé par widget, pas pertinente pour une réécriture neuve.

import type { FieldDefinition, FieldDefinitions } from "../api/widgetDetail";

export function normalizeFieldDefinitions(definitions: FieldDefinitions | (FieldDefinition & { name?: string })[]): FieldDefinitions {
  if (!Array.isArray(definitions)) return definitions;
  return Object.fromEntries(definitions.map((definition, index) => [definition.name || String(index), definition]));
}

export function fieldStorageKey(widgetId: string, platform: string): string {
  return `se-lab-fields-${widgetId}-${platform}`;
}

export function loadFieldData(definitions: FieldDefinitions, storageKey: string): Record<string, unknown> {
  const defaults = Object.fromEntries(Object.entries(definitions).map(([key, field]) => [key, field.value]));
  try {
    const persisted = JSON.parse(localStorage.getItem(storageKey) || "{}");
    const saved: Record<string, unknown> = Object.fromEntries(
      Object.entries(persisted).filter(([key]) => Object.hasOwn(definitions, key))
    );
    for (const [key, definition] of Object.entries(definitions)) {
      if (definition.type === "dropdown" && saved[key] !== undefined && !Object.hasOwn(definition.options || {}, saved[key] as string)) {
        delete saved[key];
      }
      if (["number", "slider"].includes(definition.type) && saved[key] !== undefined) {
        const numericValue = Number(saved[key]);
        if (!Number.isFinite(numericValue)) {
          delete saved[key];
        } else {
          const min = definition.min ?? numericValue;
          const max = definition.max ?? numericValue;
          saved[key] = Math.min(max, Math.max(min, numericValue));
        }
      }
    }
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}
