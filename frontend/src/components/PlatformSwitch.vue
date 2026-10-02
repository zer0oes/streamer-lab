<script setup lang="ts">
import { useWidgetEditorStore } from "../stores/widgetEditor";
import { PLATFORM_STREAM_ELEMENTS, PLATFORM_STREAMLABS } from "../lib/platformEvents";

const store = useWidgetEditorStore();
</script>

<template>
  <div class="platform-switch" role="group" aria-label="Plateforme simulée">
    <button
      type="button"
      class="platform-switch__button"
      :class="{ 'is-active': store.platform === PLATFORM_STREAM_ELEMENTS }"
      :aria-pressed="store.platform === PLATFORM_STREAM_ELEMENTS"
      aria-label="StreamElements"
      title="StreamElements"
      @click="store.switchPlatform(PLATFORM_STREAM_ELEMENTS)"
    >
      <img class="platform-logo platform-logo--streamelements" src="/assets/platforms/streamelements.svg" alt="" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="platform-switch__button"
      :class="{ 'is-active': store.platform === PLATFORM_STREAMLABS }"
      :aria-pressed="store.platform === PLATFORM_STREAMLABS"
      aria-label="Streamlabs"
      title="Streamlabs"
      @click="store.switchPlatform(PLATFORM_STREAMLABS)"
    >
      <img class="platform-logo platform-logo--streamlabs" src="/assets/platforms/streamlabs.svg" alt="" aria-hidden="true" />
    </button>
  </div>
</template>
