<script setup lang="ts">
// Variante de FieldsForm.vue pour un item widget/alerte sélectionné dans
// l'éditeur d'overlay : mêmes groupes/lignes, mais lit ses champs depuis le
// bundle du widget préchargé par le store overlay (store.widgetBundles) et
// écrit dans la surcharge propre à cet item (item.props.fieldData), pas dans
// les valeurs par défaut globales du widget (cf. useWidgetEditorStore,
// utilisé par la page d'édition standalone).
import { computed } from "vue";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import { resolveOverlayItemFieldData } from "../lib/overlayItems";
import OverlayItemFieldRow from "./OverlayItemFieldRow.vue";
import type { OverlayItem } from "../lib/overlayTypes";
import type { FieldDefinition } from "../api/widgetDetail";

const props = defineProps<{ item: OverlayItem }>();

const store = useOverlayEditorStore();

interface FieldSlot {
  key: string;
  definition: FieldDefinition;
}
interface Slot {
  group: string | null;
  fields: FieldSlot[];
}

const bundle = computed(() => (props.item.widgetId ? store.widgetBundles[props.item.widgetId] : null));

const fieldData = computed<Record<string, unknown>>(() =>
  bundle.value ? resolveOverlayItemFieldData(bundle.value.fields, props.item.props?.fieldData as Record<string, unknown> | undefined) : {}
);

// Même regroupement que FieldsForm.vue (cf. commentaire là-bas) : un groupe
// apparaît à la position de son premier champ, les suivants du même groupe
// rejoignent cette même boîte.
const slots = computed<Slot[]>(() => {
  const result: Slot[] = [];
  const groupIndex = new Map<string, number>();
  for (const [key, definition] of Object.entries(bundle.value?.fields || {})) {
    if (definition.type === "hidden") continue;
    const groupName = definition.group as string | undefined;
    if (!groupName) {
      result.push({ group: null, fields: [{ key, definition }] });
      continue;
    }
    if (groupIndex.has(groupName)) {
      result[groupIndex.get(groupName)!].fields.push({ key, definition });
    } else {
      groupIndex.set(groupName, result.length);
      result.push({ group: groupName, fields: [{ key, definition }] });
    }
  }
  return result;
});

function updateField(key: string, value: unknown): void {
  const current = (props.item.props?.fieldData as Record<string, unknown> | undefined) || {};
  store.patchItem(props.item.id, { props: { ...props.item.props, fieldData: { ...current, [key]: value } } });
  store.commit();
}
</script>

<template>
  <form v-if="bundle" id="fields-form" class="fields-form" @submit.prevent>
    <template v-for="(slot, index) in slots" :key="slot.group ?? `field-${index}`">
      <details v-if="slot.group" class="field-group" open>
        <summary class="field-group__summary">{{ slot.group }}</summary>
        <div class="field-group__body">
          <OverlayItemFieldRow v-for="{ key, definition } in slot.fields" :key="key" :field-key="key" :definition="definition" :value="fieldData[key]" @update="updateField" />
        </div>
      </details>
      <OverlayItemFieldRow v-else v-for="{ key, definition } in slot.fields" :key="key" :field-key="key" :definition="definition" :value="fieldData[key]" @update="updateField" />
    </template>
    <p v-if="slots.length === 0" class="hint">Ce widget n’a aucun champ personnalisable.</p>
  </form>
  <p v-else class="hint">Chargement des champs…</p>
</template>
