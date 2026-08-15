<script setup lang="ts">
import { useToast } from "../composables/useToast";

const { message, visible } = useToast();
</script>

<template>
  <div class="toast" :class="{ 'is-visible': visible }" role="status" aria-live="polite">{{ message }}</div>
</template>
