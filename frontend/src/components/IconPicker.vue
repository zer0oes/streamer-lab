<script setup lang="ts">
const model = defineModel<string>({ required: true });

defineProps<{
  choices: [string, string][];
}>();
</script>

<template>
  <div class="widget-icon-choices">
    <button
      v-for="[iconName, label] in choices"
      :key="iconName"
      type="button"
      class="widget-icon-choices__choice"
      :class="{ 'is-selected': model === iconName }"
      :title="label"
      :aria-label="label"
      :aria-pressed="model === iconName"
      @click="model = iconName"
    >
      <span class="material-symbols-rounded" aria-hidden="true">{{ iconName }}</span>
    </button>
  </div>
</template>
