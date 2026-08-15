<script setup lang="ts">
import { ref } from "vue";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import WidgetPreviewFrame from "../components/WidgetPreviewFrame.vue";
import CodeEditorPanel from "../components/CodeEditorPanel.vue";
import ConsolePanel from "../components/ConsolePanel.vue";
import FieldsForm from "../components/FieldsForm.vue";
import EventSimulatorPanel from "../components/EventSimulatorPanel.vue";

const store = useWidgetEditorStore();
const simulatorOpen = ref(false);
</script>

<template>
  <div id="widget-editor-view">
    <WidgetPreviewFrame />

    <CodeEditorPanel />
    <ConsolePanel />

    <aside class="widget-fields" aria-label="Champs">
      <div class="widget-fields__header">
        <h3 class="widget-fields__title">Champs</h3>
        <span class="hint">{{ store.detail?.files.fields }}</span>
      </div>
      <FieldsForm />
    </aside>
  </div>

  <EventSimulatorPanel v-model:open="simulatorOpen" />
</template>
