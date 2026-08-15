<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import OverlayCanvasItem from "./OverlayCanvasItem.vue";
import { canvasPointFromEvent, computeOverlayFitScale, overlayGuidesWithCenter, snapEdge, snapMovePosition } from "../lib/overlayGeometry";
import { MIN_OVERLAY_ITEM_SIZE } from "../lib/overlayTypes";
import type { OverlayItem } from "../lib/overlayTypes";

const store = useOverlayEditorStore();

const wrapEl = ref<HTMLElement | null>(null);
const canvasEl = ref<HTMLElement | null>(null);
const fitScale = ref(1);
const itemRefs = new Map<string, InstanceType<typeof OverlayCanvasItem>>();

function setItemRef(id: string, instance: unknown): void {
  if (instance) itemRefs.set(id, instance as InstanceType<typeof OverlayCanvasItem>);
  else itemRefs.delete(id);
}

const scale = computed(() => (store.zoomMode === "fit" ? fitScale.value : (store.zoomMode as number)));

const stageStyle = computed(() => ({
  width: `${store.canvas.width * scale.value}px`,
  height: `${store.canvas.height * scale.value}px`
}));

const canvasStyle = computed(() => ({
  width: `${store.canvas.width}px`,
  height: `${store.canvas.height}px`,
  transform: `scale(${scale.value})`
}));

let resizeObserver: ResizeObserver | undefined;

function recomputeFitScale(): void {
  if (!wrapEl.value) return;
  fitScale.value = computeOverlayFitScale(store.canvas, {
    wrapClientWidth: wrapEl.value.clientWidth,
    wrapTop: wrapEl.value.getBoundingClientRect().top,
    windowInnerHeight: window.innerHeight,
    showGuides: false
  });
}

onMounted(() => {
  recomputeFitScale();
  resizeObserver = new ResizeObserver(recomputeFitScale);
  if (wrapEl.value) resizeObserver.observe(wrapEl.value);
  window.addEventListener("resize", recomputeFitScale);
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("resize", recomputeFitScale);
});

function pointFromEvent(event: PointerEvent): { x: number; y: number } {
  if (!canvasEl.value) return { x: 0, y: 0 };
  const rect = canvasEl.value.getBoundingClientRect();
  return canvasPointFromEvent(event.clientX, event.clientY, rect, scale.value);
}

function itemElAt(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? (target.closest(".overlay-item") as HTMLElement | null) : null;
}

function handleElAt(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? (target.closest("[data-handle]") as HTMLElement | null) : null;
}

async function onCanvasPointerDown(event: PointerEvent): Promise<void> {
  const tool = store.tool;

  if (tool === "text") {
    const textItemEl = target(event.target)?.closest(".overlay-item--text") as HTMLElement | null;
    if (textItemEl) {
      const id = textItemEl.dataset.itemId as string;
      store.selectOnly(id);
      store.setTool("select");
      itemRefs.get(id)?.beginTextEdit(event as unknown as MouseEvent);
      return;
    }
  }

  if (tool !== "select" && !handleElAt(event.target)) {
    const point = pointFromEvent(event);
    if (tool === "text") {
      const created = store.addPrimitive("text", point.x, point.y);
      if (created) {
        await nextTick();
        requestAnimationFrame(() => itemRefs.get(created.id)?.beginTextEdit(event as unknown as MouseEvent));
      }
    } else {
      store.addPrimitive(tool, point.x, point.y);
    }
    return;
  }

  const handle = handleElAt(event.target);
  const itemEl = itemElAt(event.target);

  if (itemEl) {
    const id = itemEl.dataset.itemId as string;
    if (itemEl.classList.contains("is-editing") && event.target instanceof HTMLElement && event.target.isContentEditable) return;
    if (event.shiftKey && !handle) {
      store.toggleSelect(id);
      return;
    }
    if (!store.selectedIds.has(id)) store.selectOnly(id);
    if (handle) {
      const item = store.getItem(id);
      if (item?.type === "group") startGroupResize(event, id, itemEl, handle.dataset.handle as string);
      else startItemResize(event, id, itemEl, handle.dataset.handle as string);
    } else if (!(target(event.target)?.closest(".overlay-item__chrome"))) {
      startItemDrag(event, id, itemEl);
    }
    return;
  }

  const point = pointFromEvent(event);
  const group = hitTestGroup(point);
  if (group) {
    store.selectOnly(group.id);
    const groupEl = canvasEl.value?.querySelector(`[data-item-id="${group.id}"]`) as HTMLElement | null;
    if (groupEl) startItemDrag(event, group.id, groupEl);
    return;
  }

  store.clearSelection();
}

function target(value: EventTarget | null): Element | null {
  return value instanceof Element ? value : null;
}

function hitTestGroup(point: { x: number; y: number }): OverlayItem | null {
  const groups = store.items.filter((item) => item.type === "group").sort((a, b) => b.z - a.z);
  return groups.find((group) => point.x >= group.x && point.x <= group.x + group.w && point.y >= group.y && point.y <= group.y + group.h) || null;
}

function startItemDrag(event: PointerEvent, itemId: string, el: HTMLElement): void {
  const item = store.getItem(itemId);
  if (!item || item.locked) return;
  el.setPointerCapture(event.pointerId);
  canvasEl.value?.classList.add("is-dragging");
  const startX = event.clientX;
  const startY = event.clientY;
  const movingIds = item.type === "group" ? [item.id, ...((item.props?.children as string[]) || [])] : [item.id];
  const origins = new Map(movingIds.map((id) => [id, { ...store.getItem(id) }]));

  const onMove = (moveEvent: PointerEvent) => {
    const dx = (moveEvent.clientX - startX) / scale.value;
    const dy = (moveEvent.clientY - startY) / scale.value;
    for (const id of movingIds) {
      const target = store.getItem(id);
      const origin = origins.get(id);
      if (!target || !origin) continue;
      let nextX = Math.round((origin.x || 0) + dx);
      let nextY = Math.round((origin.y || 0) + dy);
      if (movingIds.length === 1) {
        nextX = snapMovePosition(nextX, target.w, overlayGuidesWithCenter("vertical", store.overlay?.guides.vertical, store.canvas), scale.value, store.guidesVisible);
        nextY = snapMovePosition(nextY, target.h, overlayGuidesWithCenter("horizontal", store.overlay?.guides.horizontal, store.canvas), scale.value, store.guidesVisible);
      }
      store.mutateItem(id, { x: nextX, y: nextY });
    }
  };
  const onUp = () => {
    el.releasePointerCapture(event.pointerId);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    canvasEl.value?.classList.remove("is-dragging");
    store.commit();
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
}

function startItemResize(event: PointerEvent, itemId: string, el: HTMLElement, handlePosition: string): void {
  event.stopPropagation();
  const item = store.getItem(itemId);
  if (!item || item.locked) return;
  el.setPointerCapture(event.pointerId);
  canvasEl.value?.classList.add("is-dragging");
  const startX = event.clientX;
  const startY = event.clientY;
  const origin = { x: item.x, y: item.y, w: item.w, h: item.h };

  const onMove = (moveEvent: PointerEvent) => {
    const dx = (moveEvent.clientX - startX) / scale.value;
    const dy = (moveEvent.clientY - startY) / scale.value;
    const vGuides = overlayGuidesWithCenter("vertical", store.overlay?.guides.vertical, store.canvas);
    const hGuides = overlayGuidesWithCenter("horizontal", store.overlay?.guides.horizontal, store.canvas);
    const patch: Partial<OverlayItem> = {};

    if (handlePosition.includes("e")) {
      const rightEdge = snapEdge(origin.x + origin.w + dx, vGuides, scale.value, store.guidesVisible);
      patch.w = Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(rightEdge - origin.x));
    }
    if (handlePosition.includes("s")) {
      const bottomEdge = snapEdge(origin.y + origin.h + dy, hGuides, scale.value, store.guidesVisible);
      patch.h = Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(bottomEdge - origin.y));
    }
    if (handlePosition.includes("w")) {
      const leftEdge = snapEdge(origin.x + dx, vGuides, scale.value, store.guidesVisible);
      const w = Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(origin.x + origin.w - leftEdge));
      patch.w = w;
      patch.x = Math.round(origin.x + origin.w - w);
    }
    if (handlePosition.includes("n")) {
      const topEdge = snapEdge(origin.y + dy, hGuides, scale.value, store.guidesVisible);
      const h = Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(origin.y + origin.h - topEdge));
      patch.h = h;
      patch.y = Math.round(origin.y + origin.h - h);
    }
    store.mutateItem(itemId, patch);
  };
  const onUp = () => {
    el.releasePointerCapture(event.pointerId);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    canvasEl.value?.classList.remove("is-dragging");
    store.commit();
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
}

function startGroupResize(event: PointerEvent, groupId: string, el: HTMLElement, handlePosition: string): void {
  event.stopPropagation();
  const group = store.getItem(groupId);
  if (!group || group.locked) return;
  el.setPointerCapture(event.pointerId);
  canvasEl.value?.classList.add("is-dragging");
  const startX = event.clientX;
  const startY = event.clientY;
  const groupOrigin = { ...group };
  const childIds = (group.props?.children as string[]) || [];
  const childOrigins = new Map(childIds.map((id) => [id, { ...store.getItem(id) }]));

  const onMove = (moveEvent: PointerEvent) => {
    const dx = (moveEvent.clientX - startX) / scale.value;
    const dy = (moveEvent.clientY - startY) / scale.value;
    let { x, y, w, h } = groupOrigin;
    if (handlePosition.includes("e")) w = Math.max(MIN_OVERLAY_ITEM_SIZE, groupOrigin.w + dx);
    if (handlePosition.includes("s")) h = Math.max(MIN_OVERLAY_ITEM_SIZE, groupOrigin.h + dy);
    if (handlePosition.includes("w")) {
      w = Math.max(MIN_OVERLAY_ITEM_SIZE, groupOrigin.w - dx);
      x = groupOrigin.x + groupOrigin.w - w;
    }
    if (handlePosition.includes("n")) {
      h = Math.max(MIN_OVERLAY_ITEM_SIZE, groupOrigin.h - dy);
      y = groupOrigin.y + groupOrigin.h - h;
    }
    const scaleX = w / groupOrigin.w;
    const scaleY = h / groupOrigin.h;

    store.mutateItem(groupId, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });

    for (const [id, childOrigin] of childOrigins) {
      if (!childOrigin) continue;
      store.mutateItem(id, {
        x: Math.round(x + (childOrigin.x! - groupOrigin.x) * scaleX),
        y: Math.round(y + (childOrigin.y! - groupOrigin.y) * scaleY),
        w: Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(childOrigin.w! * scaleX)),
        h: Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(childOrigin.h! * scaleY))
      });
    }
  };
  const onUp = () => {
    el.releasePointerCapture(event.pointerId);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    canvasEl.value?.classList.remove("is-dragging");
    store.commit();
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
}
</script>

<template>
  <div ref="wrapEl" class="overlay-canvas-wrap">
    <div class="overlay-canvas-rulers">
      <div class="overlay-canvas-stage" :style="stageStyle">
        <div
          ref="canvasEl"
          class="overlay-canvas"
          :class="{ 'is-placing': store.tool !== 'select' }"
          :style="canvasStyle"
          @pointerdown="onCanvasPointerDown"
        >
          <OverlayCanvasItem
            v-for="item in store.items"
            :key="item.id"
            :ref="(instance) => setItemRef(item.id, instance)"
            :item="item"
          />
        </div>
      </div>
    </div>
    <slot name="toolbar" />
  </div>
</template>
