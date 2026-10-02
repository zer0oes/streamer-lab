<script setup lang="ts">
// Variante de FieldRow.vue pour un champ d'item widget/alerte posé sur un
// overlay : même rendu, mais store-agnostique (valeur + callback reçus en
// props/emit) au lieu de lire/écrire useWidgetEditorStore — ce champ modifie
// la surcharge propre à CET item (item.props.fieldData), pas les valeurs par
// défaut globales du widget.
import { dispatchToOverlayItems } from "../composables/useOverlayPreviewBridge";
import { FIELD_INLINE_TYPES, fieldTypeIcon, resolveInputType } from "../lib/fieldTypes";
import { fieldInputType } from "../lib/secretFields";
import type { FieldDefinition } from "../api/widgetDetail";

const props = defineProps<{
  fieldKey: string;
  definition: FieldDefinition;
  value: unknown;
}>();

// commit=false (déclenché par "input", à chaque frappe/pixel de slider/glisser
// dans le sélecteur de couleur) : aperçu live seulement, pas d'historique ni
// de sauvegarde. commit=true ("change", relâchement/fermeture) : valeur
// définitive, empilée dans l'historique et programmée pour la sauvegarde.
const emit = defineEmits<{ (e: "update", key: string, value: unknown, commit: boolean): void }>();

function onButtonClick(): void {
  dispatchToOverlayItems("onEventReceived", { listener: "widget-button", event: { field: props.fieldKey, value: props.definition.value } });
}

function onCheckboxChange(event: Event): void {
  emit("update", props.fieldKey, (event.target as HTMLInputElement).checked, true);
}

function onInputChange(event: Event, commit: boolean): void {
  const raw = (event.target as HTMLInputElement | HTMLSelectElement).value;
  const value = ["number", "slider"].includes(props.definition.type) ? Number(raw) : raw;
  emit("update", props.fieldKey, value, commit);
}
</script>

<template>
  <button v-if="definition.type === 'button'" type="button" class="button button--quiet button--wide" @click="onButtonClick">
    {{ definition.value || definition.label || fieldKey }}
  </button>

  <label v-else-if="definition.type === 'checkbox'" class="checkbox-field">
    <span class="material-symbols-sharp field__icon" aria-hidden="true">{{ fieldTypeIcon(definition.type) }}</span>
    <span class="checkbox-field__label" :title="definition.label || fieldKey">{{ definition.label || fieldKey }}</span>
    <input type="checkbox" :checked="Boolean(value)" @change="onCheckboxChange" />
  </label>

  <label v-else class="field" :class="{ 'field--inline': FIELD_INLINE_TYPES.has(definition.type) }">
    <span class="material-symbols-sharp field__icon" aria-hidden="true">{{ fieldTypeIcon(definition.type) }}</span>
    <span class="field__label" :title="definition.label || fieldKey">{{ definition.label || fieldKey }}</span>
    <div v-if="definition.type === 'slider'" class="field-group__control-row">
      <input
        type="range"
        :min="definition.min"
        :max="definition.max"
        :step="definition.step ?? definition.steps"
        :value="value"
        @input="onInputChange($event, false)"
        @change="onInputChange($event, true)"
      />
      <output class="field-group__control-output">{{ value }}</output>
    </div>
    <select v-else-if="definition.type === 'dropdown'" :value="value" @change="onInputChange($event, true)">
      <option v-for="[optValue, label] in Object.entries(definition.options || {})" :key="optValue" :value="optValue">{{ label }}</option>
    </select>
    <input
      v-else
      :type="fieldInputType(fieldKey, resolveInputType(definition.type))"
      :min="definition.min"
      :max="definition.max"
      :step="definition.step ?? definition.steps"
      :value="value"
      @input="onInputChange($event, false)"
      @change="onInputChange($event, true)"
    />
  </label>
</template>
