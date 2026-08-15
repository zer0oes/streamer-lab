<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import { highlightSource } from "../lib/syntaxHighlight";
import { useToast } from "../composables/useToast";
import type { EditorFileKey } from "../api/widgetDetail";

const store = useWidgetEditorStore();
const { showToast } = useToast();

const tabs: { key: EditorFileKey; label: string }[] = [
  { key: "html", label: "HTML" },
  { key: "css", label: "CSS" },
  { key: "js", label: "JS" },
  { key: "fields", label: "Fields" },
  { key: "data", label: "Data" }
];

const textareaEl = ref<HTMLTextAreaElement | null>(null);
const highlightEl = ref<HTMLElement | null>(null);

const activeContent = computed(() => store.editorFiles[store.activeFile]);
const highlighted = computed(() => highlightSource(store.activeFile, activeContent.value));
const statusLabel = computed(() => {
  const status = store.fileStatus[store.activeFile];
  return { synced: "Synchronisé", dirty: "Non enregistré", saving: "Enregistrement…", error: "Erreur" }[status];
});
const filename = computed(() => store.detail?.files[store.activeFile] ?? store.activeFile);

function selectTab(file: EditorFileKey): void {
  store.setActiveFile(file);
  void nextTick(syncScroll);
}

function onInput(event: Event): void {
  store.setEditorContent(store.activeFile, (event.target as HTMLTextAreaElement).value);
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === "s") {
    event.preventDefault();
    void store.flushDirtyFiles();
    return;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    const target = event.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const value = target.value;
    target.value = `${value.slice(0, start)}  ${value.slice(end)}`;
    target.selectionStart = target.selectionEnd = start + 2;
    store.setEditorContent(store.activeFile, target.value);
  }
}

function syncScroll(): void {
  if (highlightEl.value && textareaEl.value) {
    highlightEl.value.scrollTop = textareaEl.value.scrollTop;
    highlightEl.value.scrollLeft = textareaEl.value.scrollLeft;
  }
}

async function copyCode(): Promise<void> {
  await navigator.clipboard.writeText(activeContent.value);
  showToast("Code copié");
}

watch(
  () => store.activeFile,
  () => void nextTick(syncScroll)
);
</script>

<template>
  <section class="widget-editor" aria-labelledby="widget-editor-title">
    <header class="widget-editor__header">
      <div>
        <span class="widget-editor__eyebrow">CODE DU WIDGET</span>
        <h2 id="widget-editor-title">Édition en temps réel</h2>
      </div>
      <span class="widget-editor__status" :class="`is-${store.fileStatus[store.activeFile]}`" role="status">
        <i></i>
        <span>{{ statusLabel }}</span>
      </span>
    </header>
    <div class="editor-tabs" role="tablist" aria-label="Fichiers du widget">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="editor-tabs__tab"
        :class="[`editor-tabs__tab--${tab.key}`, { 'is-active': store.activeFile === tab.key }]"
        role="tab"
        :aria-selected="store.activeFile === tab.key"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="widget-editor__body">
      <pre ref="highlightEl" class="widget-editor__code-highlight" aria-hidden="true"><code v-html="highlighted"></code></pre>
      <textarea
        ref="textareaEl"
        class="widget-editor__code-editor"
        :aria-label="`Code ${store.activeFile} du widget`"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        wrap="off"
        :value="activeContent"
        @input="onInput"
        @keydown="onKeydown"
        @scroll="syncScroll"
      ></textarea>
      <button class="widget-editor__copy-button" type="button" title="Copier le code" aria-label="Copier le code" @click="copyCode">
        <span class="material-symbols-rounded" aria-hidden="true">content_copy</span>
      </button>
    </div>
    <footer class="widget-editor__footer">
      <code>{{ filename }}</code>
      <span v-if="store.fileError[store.activeFile]" class="widget-editor__error">{{ store.fileError[store.activeFile] }}</span>
      <span v-else>Ctrl + S pour enregistrer immédiatement</span>
    </footer>
  </section>
</template>
