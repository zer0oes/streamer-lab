<script setup lang="ts">
// Modale "Voir le code" ouverte depuis un item widget/alerte sélectionné
// dans l'éditeur d'overlay (cf. ItemInspector.vue) : héberge le même
// CodeEditorPanel que la page d'édition standalone (déplacé dedans, pas
// dupliqué — cf. .widget-code-editor-dialog__editor-slot,
// styles/components/_editor.scss), avec un aperçu compact au lieu de la
// barre d'outils complète (zoom/plateforme/damier), non pertinente ici.
// Éditer ici modifie directement les fichiers RÉELS du widget (partagés par
// tous les overlays qui l'utilisent) : le code n'est jamais propre à un item
// d'overlay, contrairement aux valeurs de champs (cf. OverlayItemFieldsForm).
import { ref, toRaw } from "vue";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import { useDialogBackdropClose } from "../composables/useDialogBackdropClose";
import { PLATFORM_STREAM_ELEMENTS } from "../lib/platformEvents";
import { loadAppState, useAppState } from "../composables/useAppState";
import { buildRecents, DEFAULT_CURRENCY } from "../lib/sessionState";
import CodeEditorPanel from "./CodeEditorPanel.vue";

const store = useWidgetEditorStore();
const appState = useAppState();
const dialogEl = ref<HTMLDialogElement | null>(null);
const title = ref("");

function close(): void {
  dialogEl.value?.close();
}

// Couvre aussi la fermeture par la touche Échap ou le clic sur le backdrop
// (pas seulement le bouton "Fermer") : sans ça, une modification en cours de
// débounce (setEditorContent) risquerait de ne jamais être envoyée au
// serveur si l'utilisateur ferme autrement qu'en cliquant sur la croix.
function onNativeClose(): void {
  void store.flushDirtyFiles();
}

const { onMousedown, onClick } = useDialogBackdropClose(dialogEl, close);

async function open(widgetId: string, widgetName: string): Promise<void> {
  title.value = widgetName;
  dialogEl.value?.showModal();
  void loadAppState();
  await store.open(widgetId, PLATFORM_STREAM_ELEMENTS);
}

defineExpose({ open });

// Dispatch minimal au chargement de l'aperçu (comme OverlayCanvasItem.vue) :
// juste de quoi initialiser le widget visuellement, pas la mécanique
// complète de WidgetPreviewFrame.vue (console/SE_API/redimensionnement),
// hors de propos dans cette modale qui n'a ni panneau de console ni
// simulateur d'événements. Session/chaîne chargées depuis /api/state (cf.
// useAppState.ts), comme les deux autres aperçus.
async function onPreviewFrameLoad(event: Event): Promise<void> {
  await loadAppState();
  const frame = event.target as HTMLIFrameElement;
  // toRaw() : store.fieldData/appState.value.session sont des Proxy réactifs
  // — structuredClone() lève un DataCloneError si on les lui passe
  // directement (cf. le même correctif dans WidgetPreviewFrame.vue).
  const rawSession = toRaw(appState.value?.session) || {};
  const rawChannel = toRaw(appState.value?.channel) || { id: "local-channel", username: "MaChaine" };
  frame.contentWindow?.postMessage(
    {
      source: "se-lab",
      kind: "dispatch",
      eventType: "onWidgetLoad",
      eventTarget: "window",
      detail: {
        session: { data: structuredClone(rawSession) },
        recents: buildRecents(rawSession),
        currency: DEFAULT_CURRENCY,
        channel: rawChannel,
        fieldData: structuredClone(toRaw(store.fieldData))
      }
    },
    "*"
  );
}
</script>

<template>
  <dialog ref="dialogEl" class="widget-code-editor-dialog" aria-labelledby="overlay-item-code-title" @mousedown="onMousedown" @click="onClick" @close="onNativeClose">
    <header class="widget-code-editor-dialog__header">
      <span id="overlay-item-code-title" class="widget-code-editor-dialog__title">{{ title }}</span>
      <button type="button" class="icon-button" aria-label="Fermer" @click="close">
        <span class="material-symbols-sharp" aria-hidden="true">close_small</span>
      </button>
    </header>
    <div class="widget-code-editor-dialog__preview">
      <iframe
        class="widget-code-editor-dialog__frame"
        title="Aperçu du widget"
        sandbox="allow-scripts"
        scrolling="no"
        :srcdoc="store.srcdoc"
        @load="onPreviewFrameLoad"
      ></iframe>
    </div>
    <div class="widget-code-editor-dialog__editor-slot">
      <CodeEditorPanel v-if="!store.loading" />
      <p v-else class="hint">Chargement du code…</p>
    </div>
  </dialog>
</template>
