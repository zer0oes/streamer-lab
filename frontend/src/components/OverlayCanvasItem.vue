<script setup lang="ts">
import { computed, ref } from "vue";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import { overlayItemDefaultLabel } from "../lib/overlayItems";
import { buildWidgetSrcdoc } from "../lib/widgetSrcdoc";
import type { OverlayItem, TextProps } from "../lib/overlayTypes";
import { PLATFORM_STREAM_ELEMENTS } from "../lib/platformEvents";

const props = defineProps<{ item: OverlayItem }>();
const emit = defineEmits<{ (e: "enter-text-edit"): void; (e: "exit-text-edit"): void }>();

const store = useOverlayEditorStore();
const editingText = ref(false);
const textEl = ref<HTMLElement | null>(null);

const label = computed(() => overlayItemDefaultLabel(props.item));

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
  const defaults = Object.fromEntries(Object.entries(b.fields).map(([key, field]) => [key, field.value]));
  const saved = (props.item.props?.fieldData as Record<string, unknown> | undefined) || {};
  const merged: Record<string, unknown> = { ...defaults };
  for (const [key, definition] of Object.entries(b.fields)) {
    if (!Object.hasOwn(saved, key)) continue;
    if (definition.type === "dropdown" && !Object.hasOwn(definition.options || {}, saved[key] as string)) continue;
    if (definition.type === "number" || definition.type === "slider") {
      const numericValue = Number(saved[key]);
      if (!Number.isFinite(numericValue)) continue;
      merged[key] = Math.min(definition.max ?? numericValue, Math.max(definition.min ?? numericValue, numericValue));
      continue;
    }
    merged[key] = saved[key];
  }
  return merged;
});

const widgetSrcdoc = computed(() => {
  if (!bundle.value) return "<!doctype html><body></body>";
  return buildWidgetSrcdoc(bundle.value, widgetFieldData.value, { platform: PLATFORM_STREAM_ELEMENTS, transparent: true });
});

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
          @change="(e) => { store.patchItem(item.id, { props: { ...shapeProps, fill: (e.target as HTMLInputElement).value } }); store.commit(); }"
        />
      </span>
    </div>

    <template v-if="item.type === 'widget' || item.type === 'alert'">
      <iframe class="overlay-item__frame" sandbox="allow-scripts" scrolling="no" :title="item.widgetId" :srcdoc="widgetSrcdoc"></iframe>
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
    <span v-else-if="item.type === 'icon'" class="material-symbols-rounded overlay-item__icon-glyph" aria-hidden="true" :style="iconGlyphStyle">{{ iconProps.name }}</span>
    <div v-else-if="item.type === 'shape'" class="overlay-item__shape" :style="shapeStyle"></div>
    <div v-else-if="item.type === 'group'" class="overlay-item__group-frame"></div>
    <div v-else-if="item.type === 'placeholder'" class="overlay-item__placeholder-frame">
      <span class="material-symbols-rounded" aria-hidden="true">widgets</span>
      <span class="overlay-item__placeholder-hint">{{ label }}</span>
    </div>

    <div v-for="position in ['nw', 'ne', 'sw', 'se']" :key="position" class="overlay-item__handle" :class="`overlay-item__handle--${position}`" :data-handle="position"></div>
  </div>
</template>
