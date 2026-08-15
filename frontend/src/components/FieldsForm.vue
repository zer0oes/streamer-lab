<script setup lang="ts">
import { computed } from "vue";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import FieldRow from "./FieldRow.vue";
import type { FieldDefinition } from "../api/widgetDetail";

const store = useWidgetEditorStore();

interface FieldSlot {
  key: string;
  definition: FieldDefinition;
}
interface Slot {
  group: string | null;
  fields: FieldSlot[];
}

// Un groupe apparaît à la position de son premier champ ; les champs
// suivants du même groupe (même entrecoupés d'autres champs) rejoignent
// cette même boîte plutôt que d'en recréer une — même comportement que
// getContainer() côté vanilla.
const slots = computed<Slot[]>(() => {
  const result: Slot[] = [];
  const groupIndex = new Map<string, number>();
  for (const [key, definition] of Object.entries(store.fields)) {
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
</script>

<template>
  <form id="fields-form" class="fields-form" @submit.prevent>
    <template v-for="(slot, index) in slots" :key="slot.group ?? `field-${index}`">
      <details v-if="slot.group" class="field-group" open>
        <summary class="field-group__summary">{{ slot.group }}</summary>
        <div class="field-group__body">
          <FieldRow v-for="{ key, definition } in slot.fields" :key="key" :field-key="key" :definition="definition" />
        </div>
      </details>
      <FieldRow v-else v-for="{ key, definition } in slot.fields" :key="key" :field-key="key" :definition="definition" />
    </template>
  </form>
</template>
