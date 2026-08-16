<script setup lang="ts">
import { computed, ref } from "vue";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import { overlayItemLabel } from "../lib/overlayItems";
import type { OverlayItem } from "../lib/overlayTypes";
import ItemInspector from "./ItemInspector.vue";

defineProps<{ collapsed?: boolean }>();

const store = useOverlayEditorStore();
const renamingId = ref<string | null>(null);
const renameValue = ref("");

// Ordre d'affichage : z décroissant (le calque du dessus en premier dans la
// liste), comme un panneau de calques classique — mais les enfants d'un
// groupe restent indentés SOUS leur groupe plutôt que mêlés au reste par leur
// propre z.
const topLevelItems = computed(() => {
  const childIds = new Set(store.items.filter((item) => item.type === "group").flatMap((group) => (group.props?.children as string[] | undefined) || []));
  return [...store.items].filter((item) => !childIds.has(item.id)).sort((a, b) => b.z - a.z);
});

function childrenOf(group: OverlayItem): OverlayItem[] {
  const ids = (group.props?.children as string[] | undefined) || [];
  return ids.map((id) => store.items.find((item) => item.id === id)).filter((item): item is OverlayItem => Boolean(item));
}

function selectItem(id: string, event: MouseEvent): void {
  if (event.shiftKey) store.toggleSelect(id);
  else store.selectOnly(id);
}

function startRename(item: OverlayItem): void {
  renamingId.value = item.id;
  renameValue.value = overlayItemLabel(item);
}

function commitRename(id: string): void {
  if (renamingId.value === id) store.renameItem(id, renameValue.value.trim() || overlayItemLabel(store.getItem(id)!));
  renamingId.value = null;
}

// --- Glisser-déposer natif HTML5 (cf. useLibraryDrag.ts pour le même
// principe ailleurs dans l'app) : réordonne la liste top-level, ou la liste
// des enfants d'un groupe, jamais l'inverse — comme côté vanille, où le
// glisser reste toujours cantonné au conteneur DOM d'origine de l'item.
const draggingId = ref<string | null>(null);

function onDragStart(id: string, event: DragEvent): void {
  draggingId.value = id;
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function onDragEnd(): void {
  draggingId.value = null;
}

function onDropOnTopLevel(targetId: string): void {
  const dragged = draggingId.value;
  draggingId.value = null;
  if (!dragged || dragged === targetId) return;
  const order = topLevelItems.value.map((item) => item.id);
  if (!order.includes(dragged)) return;
  const withoutDragged = order.filter((id) => id !== dragged);
  const targetIndex = withoutDragged.indexOf(targetId);
  if (targetIndex === -1) return;
  withoutDragged.splice(targetIndex, 0, dragged);
  store.reorderTopLevel(withoutDragged);
}

function onDropOnGroupChild(group: OverlayItem, targetId: string): void {
  const dragged = draggingId.value;
  draggingId.value = null;
  if (!dragged || dragged === targetId) return;
  const ids = childrenOf(group).map((child) => child.id);
  if (!ids.includes(dragged)) return;
  const withoutDragged = ids.filter((id) => id !== dragged);
  const targetIndex = withoutDragged.indexOf(targetId);
  if (targetIndex === -1) return;
  withoutDragged.splice(targetIndex, 0, dragged);
  store.reorderGroupChildren(group.id, withoutDragged);
}
</script>

<template>
  <div class="overlay-layers" :class="{ 'is-collapsed': collapsed }">
    <h3 class="overlay-layers__title">Calques</h3>
    <div class="overlay-layers__list">
      <template v-for="item in topLevelItems" :key="item.id">
        <div v-if="item.type === 'group'" class="overlay-layers__group" :class="{ 'is-dragging': draggingId === item.id }">
          <div
            class="overlay-layers__item"
            draggable="true"
            :data-item-id="item.id"
            :class="{ 'is-active': store.selectedIds.has(item.id), 'is-hidden': item.hidden, 'is-locked': item.locked }"
            @click="selectItem(item.id, $event)"
            @dragstart="onDragStart(item.id, $event)"
            @dragend="onDragEnd"
            @dragover.prevent
            @drop="onDropOnTopLevel(item.id)"
          >
            <span class="material-symbols-rounded" aria-hidden="true">folder</span>
            <span v-if="renamingId !== item.id" class="overlay-layers__label" @dblclick.stop="startRename(item)">{{ overlayItemLabel(item) }}</span>
            <input
              v-else
              v-model="renameValue"
              class="overlay-layers__rename-input"
              autofocus
              @click.stop
              @keydown.enter="commitRename(item.id)"
              @keydown.esc="renamingId = null"
              @blur="commitRename(item.id)"
            />
            <button type="button" class="icon-button" :class="{ 'overlay-layers__lock--active': item.hidden }" title="Afficher/masquer" @click.stop="store.toggleItemHidden(item.id)">
              <span class="material-symbols-rounded" aria-hidden="true">{{ item.hidden ? "visibility_off" : "visibility" }}</span>
            </button>
            <button type="button" class="icon-button" :class="{ 'overlay-layers__lock--active': item.locked }" title="Verrouiller/déverrouiller" @click.stop="store.toggleItemLocked(item.id)">
              <span class="material-symbols-rounded" aria-hidden="true">{{ item.locked ? "lock" : "lock_open" }}</span>
            </button>
          </div>
          <ItemInspector v-if="store.soleSelection?.id === item.id" />
          <div class="overlay-layers__group-children">
            <template v-for="child in childrenOf(item)" :key="child.id">
              <div
                class="overlay-layers__item"
                draggable="true"
                :data-item-id="child.id"
                :class="{ 'is-active': store.selectedIds.has(child.id), 'is-hidden': child.hidden, 'is-locked': child.locked, 'is-dragging': draggingId === child.id }"
                @click="selectItem(child.id, $event)"
                @dragstart="onDragStart(child.id, $event)"
                @dragend="onDragEnd"
                @dragover.prevent
                @drop="onDropOnGroupChild(item, child.id)"
              >
                <span class="material-symbols-rounded" aria-hidden="true">widgets</span>
                <span class="overlay-layers__label">{{ overlayItemLabel(child) }}</span>
              </div>
              <ItemInspector v-if="store.soleSelection?.id === child.id" />
            </template>
          </div>
        </div>
        <div
          v-else
          class="overlay-layers__item"
          draggable="true"
          :data-item-id="item.id"
          :class="{ 'is-active': store.selectedIds.has(item.id), 'is-hidden': item.hidden, 'is-locked': item.locked, 'is-dragging': draggingId === item.id }"
          @click="selectItem(item.id, $event)"
          @dragstart="onDragStart(item.id, $event)"
          @dragend="onDragEnd"
          @dragover.prevent
          @drop="onDropOnTopLevel(item.id)"
        >
          <span class="material-symbols-rounded" aria-hidden="true">widgets</span>
          <span v-if="renamingId !== item.id" class="overlay-layers__label" @dblclick.stop="startRename(item)">{{ overlayItemLabel(item) }}</span>
          <input
            v-else
            v-model="renameValue"
            class="overlay-layers__rename-input"
            autofocus
            @click.stop
            @keydown.enter="commitRename(item.id)"
            @keydown.esc="renamingId = null"
            @blur="commitRename(item.id)"
          />
          <button type="button" class="icon-button" :class="{ 'overlay-layers__lock--active': item.hidden }" title="Afficher/masquer" @click.stop="store.toggleItemHidden(item.id)">
            <span class="material-symbols-rounded" aria-hidden="true">{{ item.hidden ? "visibility_off" : "visibility" }}</span>
          </button>
          <button type="button" class="icon-button" :class="{ 'overlay-layers__lock--active': item.locked }" title="Verrouiller/déverrouiller" @click.stop="store.toggleItemLocked(item.id)">
            <span class="material-symbols-rounded" aria-hidden="true">{{ item.locked ? "lock" : "lock_open" }}</span>
          </button>
        </div>
        <ItemInspector v-if="item.type !== 'group' && store.soleSelection?.id === item.id" />
      </template>
      <p v-if="topLevelItems.length === 0" class="hint">Aucun élément. Utilisez « Ajouter » pour composer votre overlay.</p>
    </div>
  </div>
</template>
