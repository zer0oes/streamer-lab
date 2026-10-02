<script setup lang="ts">
import { ref } from "vue";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import WidgetPreviewFrame from "../components/WidgetPreviewFrame.vue";
import CodeEditorPanel from "../components/CodeEditorPanel.vue";
import ConsolePanel from "../components/ConsolePanel.vue";
import FieldsForm from "../components/FieldsForm.vue";
import AlertboxSettingsPanel from "../components/AlertboxSettingsPanel.vue";
import EventSimulatorPanel from "../components/EventSimulatorPanel.vue";
import { widgetFieldsCollapsed } from "../composables/useWidgetFieldsCollapse";
import type { AlertboxAlertType } from "../lib/alertbox";

const store = useWidgetEditorStore();
const simulatorOpen = ref(false);
// AlertBox : réglages natifs par alerte (comme l'AlertBox de la plateforme) ou
// champs du custom CSS, dans le même panneau latéral.
const sideTab = ref<"alerts" | "fields">("alerts");

function onAlertSelect(event: Event): void {
  void store.selectAlertType((event.target as HTMLSelectElement).value as AlertboxAlertType);
}
</script>

<template>
  <div id="widget-editor-view" :class="{ 'is-fields-collapsed': widgetFieldsCollapsed }">
    <WidgetPreviewFrame />

    <CodeEditorPanel />
    <ConsolePanel />

    <aside class="widget-fields" :class="{ 'is-collapsed': widgetFieldsCollapsed }" aria-label="Champs">
      <div v-if="store.isAlertbox" class="widget-fields__tabs" role="tablist" aria-label="Réglages de l’AlertBox">
        <button type="button" role="tab" class="widget-fields__tab" :class="{ 'is-active': sideTab === 'alerts' }" :aria-selected="sideTab === 'alerts'" @click="sideTab = 'alerts'">
          Alertes
        </button>
        <button type="button" role="tab" class="widget-fields__tab" :class="{ 'is-active': sideTab === 'fields' }" :aria-selected="sideTab === 'fields'" @click="sideTab = 'fields'">
          Champs
        </button>
        <span class="hint">{{ sideTab === "alerts" ? (store.platform === "streamlabs" ? "streamlabs/alertbox.json" : "alertbox.json") : store.detail?.files.fields }}</span>
      </div>
      <!-- Alerte dont le code et les champs sont chargés dans l'éditeur -->
      <label v-if="store.isAlertbox" class="widget-fields__alert-select">
        <span class="field__label">Code et champs de l’alerte</span>
        <select :value="store.activeAlertType" @change="onAlertSelect">
          <option v-for="alert in store.alertboxAlertList" :key="alert.type" :value="alert.type">
            {{ alert.label }}{{ alert.hint ? ` · ${alert.hint}` : "" }}
          </option>
        </select>
      </label>
      <div v-else class="widget-fields__header">
        <h3 class="widget-fields__title">Champs</h3>
        <span class="hint">{{ store.detail?.files.fields }}</span>
      </div>
      <div class="widget-fields__list">
        <AlertboxSettingsPanel v-if="store.isAlertbox && sideTab === 'alerts'" />
        <FieldsForm v-else />
      </div>
    </aside>

    <!-- À l'intérieur de #widget-editor-view (pas un frère) : nécessaire
    pour que le sélecteur CSS #widget-editor-view.is-fields-collapsed
    .event-fab (repositionnement quand le panneau Champs est replié,
    cf. components/_event-simulator.scss) trouve réellement un descendant. -->
    <EventSimulatorPanel v-model:open="simulatorOpen" />
  </div>
</template>
