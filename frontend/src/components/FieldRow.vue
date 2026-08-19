<script setup lang="ts">
import { useWidgetEditorStore } from "../stores/widgetEditor";
import { dispatchToWidget } from "../composables/useWidgetPreviewBridge";
import { FIELD_INLINE_TYPES, fieldTypeIcon, resolveInputType } from "../lib/fieldTypes";
import type { FieldDefinition } from "../api/widgetDetail";

const props = defineProps<{
  fieldKey: string;
  definition: FieldDefinition;
}>();

const store = useWidgetEditorStore();

function onButtonClick(): void {
  dispatchToWidget("onEventReceived", { listener: "widget-button", event: { field: props.fieldKey, value: props.definition.value } });
}

function onCheckboxChange(event: Event): void {
  store.updateField(props.fieldKey, (event.target as HTMLInputElement).checked);
}

function onInputChange(event: Event): void {
  const raw = (event.target as HTMLInputElement | HTMLSelectElement).value;
  const value = ["number", "slider"].includes(props.definition.type) ? Number(raw) : raw;
  store.updateField(props.fieldKey, value);
}
</script>

<template>
  <button v-if="definition.type === 'button'" type="button" class="button button--quiet button--wide" @click="onButtonClick">
    {{ definition.value || definition.label || fieldKey }}
  </button>

  <label v-else-if="definition.type === 'checkbox'" class="checkbox-field">
    <span class="material-symbols-sharp field__icon" aria-hidden="true">{{ fieldTypeIcon(definition.type) }}</span>
    <span class="checkbox-field__label" :title="definition.label || fieldKey">{{ definition.label || fieldKey }}</span>
    <input type="checkbox" :checked="Boolean(store.fieldData[fieldKey])" @change="onCheckboxChange" />
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
        :value="store.fieldData[fieldKey]"
        @change="onInputChange"
      />
      <output class="field-group__control-output">{{ store.fieldData[fieldKey] }}</output>
    </div>
    <select v-else-if="definition.type === 'dropdown'" :value="store.fieldData[fieldKey]" @change="onInputChange">
      <option v-for="[value, label] in Object.entries(definition.options || {})" :key="value" :value="value">{{ label }}</option>
    </select>
    <input
      v-else
      :type="resolveInputType(definition.type)"
      :min="definition.min"
      :max="definition.max"
      :step="definition.step ?? definition.steps"
      :value="store.fieldData[fieldKey]"
      @change="onInputChange"
    />
  </label>
</template>
