<script setup lang="ts">
import { useWidgetEditorStore } from "../stores/widgetEditor";

const store = useWidgetEditorStore();
</script>

<template>
  <section class="console-panel">
    <div class="console-panel__heading">
      <span>Console du widget</span>
      <button type="button" class="text-button" @click="store.clearConsole()">Effacer</button>
    </div>
    <div class="console-panel__output" aria-live="polite">
      <p v-if="!store.consoleLines.length" class="console-panel__empty">Aucune sortie pour l’instant.</p>
      <div v-for="(line, index) in store.consoleLines" :key="index" class="console-panel__line" :class="`console-panel__line--${line.level}`">
        <time>{{ line.time }}</time>
        <b>{{ line.level.toUpperCase() }}</b>
        <span>{{ line.message }}</span>
      </div>
    </div>
  </section>
</template>
