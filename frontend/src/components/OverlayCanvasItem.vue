<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from "vue";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import { overlayItemDefaultLabel, resolveOverlayItemFieldData } from "../lib/overlayItems";
import { buildWidgetSrcdoc } from "../lib/widgetSrcdoc";
import { alertboxFieldStorageKey, loadFieldData, normalizeFieldDefinitions } from "../lib/fieldData";
import type { OverlayItem, TextProps } from "../lib/overlayTypes";
import { PLATFORM_STREAM_ELEMENTS } from "../lib/platformEvents";
import { loadAppState, useAppState } from "../composables/useAppState";
import { buildRecents, DEFAULT_CURRENCY } from "../lib/sessionState";

const props = defineProps<{ item: OverlayItem }>();
const emit = defineEmits<{ (e: "enter-text-edit"): void; (e: "exit-text-edit"): void }>();

const store = useOverlayEditorStore();
const appState = useAppState();
const editingText = ref(false);
const textEl = ref<HTMLElement | null>(null);

onMounted(() => void loadAppState());

const label = computed(() => overlayItemDefaultLabel(props.item, (widgetId) => store.widgetBundles[widgetId]?.name));

const style = computed(() => ({
  left: `${props.item.x}px`,
  top: `${props.item.y}px`,
  width: `${props.item.w}px`,
  height: `${props.item.h}px`,
  zIndex: String(props.item.z)
}));

const textProps = computed<TextProps>(() => (props.item.props as TextProps) || ({} as TextProps));

const textStyle = computed(() => {
  const p = textProps.value;
  const base: Record<string, string> = {
    fontFamily: p.fontFamily || "inherit",
    fontSize: `${p.fontSize ?? 32}px`,
    fontWeight: String(p.fontWeight ?? 600),
    textAlign: p.align || "left",
    letterSpacing: `${p.letterSpacing ?? 0}px`,
    lineHeight: String(p.lineHeight ?? 1.2)
  };
  if (p.colorMode === "gradient") {
    base.color = "transparent";
    base.backgroundImage = `linear-gradient(${p.gradientAngle ?? 90}deg, ${p.gradientFrom}, ${p.gradientTo})`;
    base.backgroundClip = "text";
    base.webkitBackgroundClip = "text";
  } else {
    base.color = p.color || "#ffffff";
    base.backgroundImage = "none";
  }
  base.textShadow = p.shadow ? `${p.shadowOffsetX ?? 0}px ${p.shadowOffsetY ?? 4}px ${Math.max(0, p.shadowBlur ?? 8)}px ${p.shadowColor}` : "none";
  base.webkitTextStroke = p.stroke ? `${p.strokeWidth}px ${p.strokeColor}` : "";
  return base;
});

const imageProps = computed(() => (props.item.props as { src: string; fit: string }) || { src: "", fit: "cover" });
const imageStyle = computed(() => ({ objectFit: imageProps.value.fit } as Record<string, string>));
const videoProps = computed(() => (props.item.props as { src: string; fit: string; loop?: boolean; muted?: boolean }) || { src: "", fit: "cover" });
const videoStyle = computed(() => ({ objectFit: videoProps.value.fit } as Record<string, string>));
const embedProps = computed(() => (props.item.props as { src: string }) || { src: "" });
const iconProps = computed(() => (props.item.props as { name: string; color: string }) || { name: "star", color: "#fff" });
const shapeProps = computed(() => (props.item.props as { shape: string; fill: string; stroke: string; strokeWidth: number; radius: number }));

const shapeStyle = computed(() => {
  const p = shapeProps.value;
  return {
    background: p.fill,
    border: p.strokeWidth > 0 ? `${p.strokeWidth}px solid ${p.stroke}` : "none",
    borderRadius: p.shape === "ellipse" ? "50%" : `${p.radius}px`
  };
});

const iconGlyphStyle = computed(() => ({
  color: iconProps.value.color,
  fontSize: `${Math.min(props.item.w, props.item.h) * 0.7}px`
}));

const bundle = computed(() => (props.item.widgetId ? store.widgetBundles[props.item.widgetId] : null));

const widgetFieldData = computed<Record<string, unknown>>(() => {
  const b = bundle.value;
  if (!b) return {};
  return resolveOverlayItemFieldData(b.fields, props.item.props?.fieldData as Record<string, unknown> | undefined);
});

// widgetSrcdoc reconstruit et recharge l'iframe en entier (voir plus bas) :
// bien plus coûteux qu'une simple mise à jour de style. On lit donc une copie
// débouncée du champ modifié (previewFieldData) plutôt que widgetFieldData
// directement, pour ne pas recharger l'iframe à chaque pixel de slider glissé
// ou frappe dans un champ texte — même principe que
// useWidgetEditorStore.previewFieldData / FIELD_APPLY_DEBOUNCE_MS.
const WIDGET_FIELD_DEBOUNCE_MS = 120;
const previewFieldData = ref<Record<string, unknown>>(widgetFieldData.value);
let fieldDebounceTimer: ReturnType<typeof setTimeout> | undefined;
// :key de l'iframe : la recrée à chaque changement effectif de champ, pour
// qu'elle reçoive un nouvel onWidgetLoad même quand widgetSrcdoc ne change
// pas (widget qui lit ses réglages via fieldData, sans {{placeholders}}).
const frameRevision = ref(0);

watch(widgetFieldData, (next) => {
  clearTimeout(fieldDebounceTimer);
  fieldDebounceTimer = setTimeout(() => {
    if (JSON.stringify(next) === JSON.stringify(previewFieldData.value)) return;
    previewFieldData.value = next;
    frameRevision.value++;
  }, WIDGET_FIELD_DEBOUNCE_MS);
});

onBeforeUnmount(() => clearTimeout(fieldDebounceTimer));

// AlertBox : chaque alerte avec son propre code et les valeurs de ses champs
// réglées dans l'éditeur de l'alerte (pas de surcharge par item : comme sur
// StreamElements, une AlertBox a un seul jeu de réglages par alerte).
function alertboxOption(b: NonNullable<typeof bundle.value>) {
  if (!b.alertbox || !b.alertboxCode || !props.item.widgetId) return undefined;
  const widgetId = props.item.widgetId;
  const codes = Object.fromEntries(
    Object.entries(b.alertboxCode).map(([type, code]) => [
      type,
      { html: code.html, css: code.css, js: code.js, values: loadFieldData(normalizeFieldDefinitions(code.fields), alertboxFieldStorageKey(widgetId, type)) }
    ])
  );
  return { config: b.alertbox, codes };
}

const widgetSrcdoc = computed(() => {
  if (!bundle.value) return "<!doctype html><body></body>";
  return buildWidgetSrcdoc(bundle.value, previewFieldData.value, {
    platform: PLATFORM_STREAM_ELEMENTS,
    transparent: true,
    alertbox: alertboxOption(bundle.value)
  });
});

// Sans cet envoi au chargement de l'iframe, équivalent au frame.onload de
// renderOverlayItemFrame côté vanille, un widget/alerte posé sur le canevas
// ne reçoit jamais onWidgetLoad — son JS (qui s'initialise systématiquement
// sur cet événement) ne s'exécute donc jamais, laissant l'item visuellement
// vide/inerte sur le canevas. Session/chaîne : chargées depuis /api/state
// (cf. useAppState.ts) — sans quoi un widget qui affiche "dernier
// follower/sub/tip" n'a jamais rien à montrer (session envoyée vide).
async function onWidgetFrameLoad(event: Event): Promise<void> {
  await loadAppState();
  const frame = event.target as HTMLIFrameElement;
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
        fieldData: structuredClone(widgetFieldData.value)
      }
    },
    "*"
  );
}

function beginTextEdit(event: MouseEvent): void {
  event.stopPropagation();
  editingText.value = true;
  emit("enter-text-edit");
  requestAnimationFrame(() => {
    const el = textEl.value;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

function commitTextEdit(): void {
  if (!editingText.value) return;
  editingText.value = false;
  emit("exit-text-edit");
  const content = (textEl.value?.textContent || "").slice(0, 500) || "Texte";
  store.patchItem(props.item.id, { props: { ...textProps.value, content } });
  store.commit();
}

defineExpose({ beginTextEdit });
</script>

<template>
  <div
    class="overlay-item"
    :class="[`overlay-item--${item.type}`, { 'overlay-item--hidden': item.hidden, 'overlay-item--locked': item.locked, 'is-editing': editingText }]"
    :data-item-id="item.id"
    :style="style"
  >
    <div class="overlay-item__chrome">
      <span class="overlay-item__label">{{ item.name || label }}</span>
      <span v-if="item.type === 'icon'" class="overlay-item__icon-inspector" @pointerdown.stop>
        <select :value="iconProps.name" @change="(e) => { store.patchItem(item.id, { props: { ...iconProps, name: (e.target as HTMLSelectElement).value } }); store.commit(); }">
          <option v-for="name in ['star', 'favorite', 'bolt', 'celebration', 'diamond', 'local_fire_department', 'music_note', 'pets']" :key="name" :value="name">{{ name }}</option>
        </select>
        <input
          type="color"
          :value="iconProps.color"
          @input="(e) => store.patchItem(item.id, { props: { ...iconProps, color: (e.target as HTMLInputElement).value } })"
          @change="(e) => { store.patchItem(item.id, { props: { ...iconProps, color: (e.target as HTMLInputElement).value } }); store.commit(); }"
        />
      </span>
      <span v-else-if="item.type === 'shape'" class="overlay-item__shape-inspector" @pointerdown.stop>
        <select :value="shapeProps.shape" @change="(e) => { store.patchItem(item.id, { props: { ...shapeProps, shape: (e.target as HTMLSelectElement).value } }); store.commit(); }">
          <option value="rectangle">Rectangle</option>
          <option value="ellipse">Ellipse</option>
        </select>
        <input
          type="color"
          :value="shapeProps.fill"
          @input="(e) => store.patchItem(item.id, { props: { ...shapeProps, fill: (e.target as HTMLInputElement).value } })"
          @change="(e) => { store.patchItem(item.id, { props: { ...shapeProps, fill: (e.target as HTMLInputElement).value } }); store.commit(); }"
        />
      </span>
    </div>

    <template v-if="item.type === 'widget' || item.type === 'alert'">
      <iframe :key="frameRevision" class="overlay-item__frame" sandbox="allow-scripts" allow="autoplay" scrolling="no" :title="item.widgetId" :srcdoc="widgetSrcdoc" @load="onWidgetFrameLoad"></iframe>
    </template>
    <div
      v-else-if="item.type === 'text'"
      ref="textEl"
      class="overlay-item__text"
      :contenteditable="editingText"
      :style="textStyle"
      @dblclick="beginTextEdit"
      @blur="commitTextEdit"
    >
      {{ textProps.content }}
    </div>
    <img v-else-if="item.type === 'image'" class="overlay-item__image" :src="imageProps.src" :style="imageStyle" alt="" />
    <video
      v-else-if="item.type === 'video'"
      class="overlay-item__video"
      :src="videoProps.src"
      :style="videoStyle"
      autoplay
      :loop="videoProps.loop !== false"
      :muted="videoProps.muted !== false"
      playsinline
    ></video>
    <iframe
      v-else-if="item.type === 'embed'"
      class="overlay-item__embed"
      :src="embedProps.src"
      title="Contenu intégré"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
    ></iframe>
    <span v-else-if="item.type === 'icon'" class="material-symbols-sharp overlay-item__icon-glyph" aria-hidden="true" :style="iconGlyphStyle">{{ iconProps.name }}</span>
    <div v-else-if="item.type === 'shape'" class="overlay-item__shape" :style="shapeStyle"></div>
    <div v-else-if="item.type === 'group'" class="overlay-item__group-frame"></div>
    <div v-else-if="item.type === 'placeholder'" class="overlay-item__placeholder-frame">
      <span class="material-symbols-sharp" aria-hidden="true">widgets</span>
      <span class="overlay-item__placeholder-hint">{{ label }}</span>
    </div>

    <div v-for="position in ['nw', 'ne', 'sw', 'se']" :key="position" class="overlay-item__handle" :class="`overlay-item__handle--${position}`" :data-handle="position"></div>
  </div>
</template>
