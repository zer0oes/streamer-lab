<script setup lang="ts">
import { ref } from "vue";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import WidgetPreviewFrame from "../components/WidgetPreviewFrame.vue";
import CodeEditorPanel from "../components/CodeEditorPanel.vue";
import ConsolePanel from "../components/ConsolePanel.vue";
import FieldsForm from "../components/FieldsForm.vue";
import EventSimulatorPanel from "../components/EventSimulatorPanel.vue";
import { widgetFieldsCollapsed } from "../composables/useWidgetFieldsCollapse";

const store = useWidgetEditorStore();
const simulatorOpen = ref(false);
</script>

<template>
  <div id="widget-editor-view" :class="{ 'is-fields-collapsed': widgetFieldsCollapsed }">
    <WidgetPreviewFrame />

    <CodeEditorPanel />
    <ConsolePanel />

    <aside class="widget-fields" :class="{ 'is-collapsed': widgetFieldsCollapsed }" aria-label="Champs">
      <div class="widget-fields__header">
        <h3 class="widget-fields__title">Champs</h3>
        <span class="hint">{{ store.detail?.files.fields }}</span>
      </div>
      <div class="widget-fields__list">
        <FieldsForm />
      </div>
    </aside>

    <!-- À l'intérieur de #widget-editor-view (pas un frère) : nécessaire
    pour que le sélecteur CSS #widget-editor-view.is-fields-collapsed
    .event-fab (repositionnement quand le panneau Champs est replié,
    cf. components/_event-simulator.scss) trouve réellement un descendant. -->
    <EventSimulatorPanel v-model:open="simulatorOpen" />
  </div>
</template>
