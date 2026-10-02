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

// Réglages faits dans l'éditeur du widget (localStorage), réduits aux seules
// valeurs qui diffèrent des valeurs par défaut de fields.json : à l'ajout du
// widget sur un overlay, ils deviennent les surcharges propres à cet item,
// tandis que les champs jamais touchés continuent de suivre fields.json.
// Le premier storageKey réellement présent gagne (ordre de préférence).
export function configuredFieldOverrides(definitions: FieldDefinitions, storageKeys: string[]): Record<string, unknown> {
  const storageKey = storageKeys.find((key) => localStorage.getItem(key) !== null);
  if (!storageKey) return {};
  const configured = loadFieldData(definitions, storageKey);
  return Object.fromEntries(
    Object.entries(configured).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(definitions[key]?.value))
  );
}

// AlertBox : chaque alerte a ses propres champs, donc ses propres valeurs
export function alertboxFieldStorageKey(widgetId: string, alertType: string): string {
  return fieldStorageKey(`${widgetId}--${alertType}`, "streamelements");
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
