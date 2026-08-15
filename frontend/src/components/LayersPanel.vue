<script setup lang="ts">
import { computed, ref } from "vue";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import { overlayItemLabel } from "../lib/overlayItems";
import type { OverlayItem } from "../lib/overlayTypes";
import ItemInspector from "./ItemInspector.vue";

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
</script>

<template>
  <div class="overlay-layers" :class="{ 'is-collapsed': false }">
    <h3 class="overlay-layers__title">Calques</h3>
    <div class="overlay-layers__list">
      <template v-for="item in topLevelItems" :key="item.id">
        <div v-if="item.type === 'group'" class="overlay-layers__group">
          <div
            class="overlay-layers__item"
            :class="{ 'is-active': store.selectedIds.has(item.id), 'is-hidden': item.hidden, 'is-locked': item.locked }"
            @click="selectItem(item.id, $event)"
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
          <div class="overlay-layers__group-children">
            <div
              v-for="child in childrenOf(item)"
              :key="child.id"
              class="overlay-layers__item"
              :class="{ 'is-active': store.selectedIds.has(child.id), 'is-hidden': child.hidden, 'is-locked': child.locked }"
              @click="selectItem(child.id, $event)"
            >
              <span class="material-symbols-rounded" aria-hidden="true">widgets</span>
              <span class="overlay-layers__label">{{ overlayItemLabel(child) }}</span>
            </div>
          </div>
        </div>
        <div
          v-else
          class="overlay-layers__item"
          :class="{ 'is-active': store.selectedIds.has(item.id), 'is-hidden': item.hidden, 'is-locked': item.locked }"
          @click="selectItem(item.id, $event)"
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
          <button type="button" class="icon-button" title="Monter" @click.stop="store.reorderItem(item.id, 1)">
            <span class="material-symbols-rounded" aria-hidden="true">arrow_upward</span>
          </button>
          <button type="button" class="icon-button" title="Descendre" @click.stop="store.reorderItem(item.id, -1)">
            <span class="material-symbols-rounded" aria-hidden="true">arrow_downward</span>
          </button>
          <button type="button" class="icon-button" :class="{ 'overlay-layers__lock--active': item.hidden }" title="Afficher/masquer" @click.stop="store.toggleItemHidden(item.id)">
            <span class="material-symbols-rounded" aria-hidden="true">{{ item.hidden ? "visibility_off" : "visibility" }}</span>
          </button>
          <button type="button" class="icon-button" :class="{ 'overlay-layers__lock--active': item.locked }" title="Verrouiller/déverrouiller" @click.stop="store.toggleItemLocked(item.id)">
            <span class="material-symbols-rounded" aria-hidden="true">{{ item.locked ? "lock" : "lock_open" }}</span>
          </button>
        </div>
      </template>
      <p v-if="topLevelItems.length === 0" class="hint">Aucun élément. Utilisez « Ajouter » pour composer votre overlay.</p>
    </div>

    <ItemInspector />
  </div>
</template>
