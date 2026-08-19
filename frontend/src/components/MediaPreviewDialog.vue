<script setup lang="ts">
import { ref } from "vue";
import { useDialogBackdropClose } from "../composables/useDialogBackdropClose";

interface PreviewItem {
  type: "image" | "video";
  url: string;
  name: string;
}

const dialogEl = ref<HTMLDialogElement | null>(null);
const item = ref<PreviewItem | null>(null);

function close(): void {
  dialogEl.value?.close();
}

const { onMousedown, onClick } = useDialogBackdropClose(dialogEl, close);

function open(preview: PreviewItem): void {
  item.value = preview;
  dialogEl.value?.showModal();
}

defineExpose({ open });
</script>

<template>
  <dialog ref="dialogEl" class="media-preview-dialog" aria-label="Aperçu du média" @mousedown="onMousedown" @click="onClick">
    <button type="button" class="icon-button media-preview-dialog__close" aria-label="Fermer" @click="close">
      <span class="material-symbols-sharp" aria-hidden="true">close_small</span>
    </button>
    <div class="media-preview-dialog__body">
      <video v-if="item?.type === 'video'" :src="item.url" controls autoplay playsinline></video>
      <img v-else-if="item" :src="item.url" alt="" />
    </div>
    <p class="media-preview-dialog__caption">{{ item?.name }}</p>
  </dialog>
</template>
