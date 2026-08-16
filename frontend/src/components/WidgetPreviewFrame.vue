<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, toRaw, watch } from "vue";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import { widgetFrameEl, dispatchToWidget } from "../composables/useWidgetPreviewBridge";
import { PLATFORM_STREAMLABS, buildStreamlabsLoadDetail } from "../lib/platformEvents";
import { widgetFieldsCollapsed, toggleWidgetFieldsCollapsed } from "../composables/useWidgetFieldsCollapse";
import { loadAppState, useAppState } from "../composables/useAppState";
import { buildRecents, DEFAULT_CURRENCY } from "../lib/sessionState";

const store = useWidgetEditorStore();
const frameEl = ref<HTMLIFrameElement | null>(null);
const shellWrapperEl = ref<HTMLElement | null>(null);

// .preview-shell__canvas garde toujours la taille RÉELLE du widget
// (transform:scale ensuite) : sans ça .preview-shell (position:relative,
// aucune hauteur en dur) resterait à 0px de haut, son unique enfant étant en
// position:absolute (ne contribue pas à la hauteur du parent) — c'est ce qui
// rendait l'aperçu invisible. Le fit-to-width ci-dessous reproduit
// updatePreviewScale() côté vanilla, en version simplifiée (pas de zoom
// manuel ni de redimensionnement à la souris dans cette passe).
const availableWidth = ref(0);
let resizeObserver: ResizeObserver | undefined;

const widgetWidth = computed(() => store.detail?.widgetMeta.width || 1920);
const widgetHeight = computed(() => store.detail?.widgetMeta.height || 1080);
const fitScale = computed(() => (availableWidth.value > 0 ? Math.min(1, availableWidth.value / widgetWidth.value) : 1));
const shellStyle = computed(() => ({
  "--preview-width": `${widgetWidth.value}px`,
  height: `${Math.round(widgetHeight.value * fitScale.value)}px`
}));
const canvasStyle = computed(() => ({
  width: `${widgetWidth.value}px`,
  height: `${widgetHeight.value}px`,
  transform: `scale(${fitScale.value})`
}));

// Session/chaîne : chargées depuis /api/state (mocks/session.json côté
// serveur), avec un repli local le temps du tout premier fetch — sans quoi
// un widget qui affiche "dernier follower/sub/tip" n'a jamais rien à
// montrer (cf. useAppState.ts).
const appState = useAppState();
const FALLBACK_CHANNEL = { id: "local-channel", username: "MaChaine" };
const session = computed<Record<string, unknown>>(() => appState.value?.session || {});
const channelInfo = computed(() => appState.value?.channel || FALLBACK_CHANNEL);

function isChatWidget(): boolean {
  return store.editorFiles.html.includes('id="chatlist_item"') || store.editorFiles.js.includes("attachEmotes");
}

function dispatchChatMessage(name: string, message: string, color = "#9f75ff"): void {
  const isStreamlabs = store.platform === PLATFORM_STREAMLABS;
  const detail = {
    listener: "message",
    event: {
      data: {
        time: Date.now(),
        nick: name.toLowerCase(),
        userId: crypto.randomUUID(),
        displayName: name,
        displayColor: color,
        badges: [],
        text: message,
        isAction: false,
        emotes: []
      }
    }
  };
  dispatchToWidget("onEventReceived", isStreamlabs ? toStreamlabsChatEvent(detail) : detail, isStreamlabs ? "document" : "window");
}

// Petite conversion locale (le simulateur porte la version complète côté
// EventSimulatorPanel) : seulement pour le message de démo au chargement.
function toStreamlabsChatEvent(detail: { listener: string; event: { data: Record<string, unknown> } }) {
  return { ...detail.event.data, type: "message", tag: "message", isTest: true };
}

// async + attend loadAppState() : la fixture de session n'est pas
// forcément déjà chargée quand l'iframe termine son propre chargement (deux
// requêtes concurrentes) — sans cette attente, le widget recevait souvent
// onWidgetLoad avec une session vide et n'affichait jamais rien, la plupart
// des widgets custom ne se réinitialisant pas sur un second onWidgetLoad.
async function onFrameLoad(): Promise<void> {
  await loadAppState();
  // toRaw() : store.fieldData/session.value/channelInfo.value sont des Proxy
  // réactifs (Pinia, ou un ref Vue enveloppant l'objet JSON reçu) —
  // structuredClone() lève un DataCloneError si on les lui passe
  // directement, il leur faut l'objet brut sous-jacent.
  const rawFieldData = toRaw(store.fieldData);
  const rawSession = toRaw(session.value);
  const rawChannel = toRaw(channelInfo.value);
  if (store.platform === PLATFORM_STREAMLABS) {
    dispatchToWidget("onLoad", buildStreamlabsLoadDetail(store.fields, rawFieldData, structuredClone(rawSession)), "document");
    store.addConsoleLine("event", "onLoad · Streamlabs");
  } else {
    dispatchToWidget("onWidgetLoad", {
      session: { data: structuredClone(rawSession) },
      recents: buildRecents(rawSession),
      currency: DEFAULT_CURRENCY,
      channel: { ...rawChannel, apiToken: "" },
      fieldData: structuredClone(rawFieldData)
    });
    store.addConsoleLine("event", "onWidgetLoad · StreamElements");
  }
  if (isChatWidget()) {
    setTimeout(
      () =>
        dispatchChatMessage(
          "NovaViewer",
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum cursus dignissim turpis quis efficitur."
        ),
      350
    );
  }
}

function handleWidgetMessage(message: MessageEvent): void {
  const data = message.data;
  if (!data || data.source !== "se-widget") return;
  if (data.kind === "console") store.addConsoleLine(data.level, (data.args as string[]).join(" "));
  if (data.kind === "set-field") store.updateField(data.key, data.value);
  if (data.kind === "queue-resume") store.addConsoleLine("info", "SE_API.resumeQueue()");
  if (data.kind === "se-api-request") handleApiRequest(data);
}

function handleApiRequest(request: { id: string; method: string; args: unknown[] }): void {
  let value: unknown;
  let error: string | undefined;
  try {
    const localStore = JSON.parse(localStorage.getItem("se-lab-store") || "{}");
    if (request.method === "store.get") value = localStore[request.args[0] as string] ?? null;
    else if (request.method === "store.set") {
      const [key, nextValue] = request.args;
      localStore[key as string] = nextValue;
      localStorage.setItem("se-lab-store", JSON.stringify(localStore));
      value = nextValue;
      dispatchToWidget("onEventReceived", {
        listener: "kvstore:update",
        event: { data: { key: `customWidget.${key}`, value: nextValue } }
      });
    } else if (request.method === "counters.get") value = 0;
    else throw new Error(`Méthode SE_API non prise en charge : ${request.method}`);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }
  frameEl.value?.contentWindow?.postMessage({ source: "se-lab", kind: "se-api-response", id: request.id, value, error }, "*");
}

onMounted(() => {
  void loadAppState();
  widgetFrameEl.value = frameEl.value;
  window.addEventListener("message", handleWidgetMessage);
  if (shellWrapperEl.value) {
    resizeObserver = new ResizeObserver((entries) => {
      availableWidth.value = entries[0].contentRect.width;
    });
    resizeObserver.observe(shellWrapperEl.value);
  }
});
onUnmounted(() => {
  window.removeEventListener("message", handleWidgetMessage);
  if (widgetFrameEl.value === frameEl.value) widgetFrameEl.value = null;
  resizeObserver?.disconnect();
});
watch(frameEl, (el) => {
  widgetFrameEl.value = el;
});
</script>

<template>
  <div class="preview-toolbar">
    <div class="preview-toolbar__heading">
      <span class="preview-toolbar__title">{{ store.detail?.widgetMeta.name || "Aperçu du widget" }}</span>
      <span class="preview-toolbar__meta">{{ store.detail?.widgetMeta.width }} × {{ store.detail?.widgetMeta.height }}</span>
    </div>
    <div class="preview-toolbar__actions">
      <button
        type="button"
        class="checker-button"
        :class="{ 'is-active': store.isChecker }"
        :aria-pressed="store.isChecker"
        :aria-label="store.isChecker ? 'Désactiver le damier' : 'Activer le damier'"
        :title="store.isChecker ? 'Désactiver le damier' : 'Activer le damier'"
        @click="store.toggleChecker"
      >
        <span class="material-symbols-rounded" aria-hidden="true">grid_on</span>
      </button>
      <!-- Dans le flux normal (flex row), pas en position:fixed avec une
      position calculée indépendamment de .checker-button : les deux boutons
      se chevauchaient selon la largeur de fenêtre, chaque formule ignorant
      la position réelle de l'autre. Un simple gap de rangée flex élimine le
      problème structurellement, plutôt que de l'ajuster au pixel près. -->
      <button
        type="button"
        id="widget-fields-toggle"
        class="icon-button"
        :aria-expanded="!widgetFieldsCollapsed"
        :aria-label="widgetFieldsCollapsed ? 'Déplier le panneau Champs' : 'Replier le panneau Champs'"
        :title="widgetFieldsCollapsed ? 'Déplier le panneau Champs' : 'Replier le panneau Champs'"
        @click="toggleWidgetFieldsCollapsed"
      >
        <span class="material-symbols-rounded" aria-hidden="true">{{ widgetFieldsCollapsed ? "right_panel_open" : "right_panel_close" }}</span>
      </button>
    </div>
  </div>
  <div ref="shellWrapperEl" class="preview-shell" :class="{ 'is-checker': store.isChecker }" :style="shellStyle">
    <div class="preview-shell__canvas" :style="canvasStyle">
      <iframe
        ref="frameEl"
        class="preview-shell__frame"
        title="Aperçu du Custom Widget"
        sandbox="allow-scripts"
        scrolling="no"
        :srcdoc="store.srcdoc"
        @load="onFrameLoad"
      ></iframe>
    </div>
  </div>
</template>
