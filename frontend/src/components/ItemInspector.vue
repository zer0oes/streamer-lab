<script setup lang="ts">
import { computed, ref } from "vue";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import { overlayItemLabel } from "../lib/overlayItems";
import OverlayItemFieldsForm from "./OverlayItemFieldsForm.vue";
import OverlayItemCodeDialog from "./OverlayItemCodeDialog.vue";
import type { TextProps } from "../lib/overlayTypes";

const store = useOverlayEditorStore();

const item = computed(() => store.soleSelection);
const textItemProps = computed(() => (item.value?.props as TextProps) || ({} as TextProps));
const mediaItemProps = computed(() => (item.value?.props as { src?: string; fit?: string }) || {});

const codeDialogRef = ref<InstanceType<typeof OverlayItemCodeDialog> | null>(null);

function openCode(): void {
  const current = item.value;
  if (!current?.widgetId) return;
  const name = store.widgetBundles[current.widgetId]?.name || overlayItemLabel(current);
  codeDialogRef.value?.open(current.widgetId, name);
}

function updatePosition(key: "x" | "y" | "w" | "h", event: Event): void {
  if (!item.value) return;
  const value = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(value)) return;
  store.patchItem(item.value.id, { [key]: Math.round(value) });
  store.commit();
}

function updateTextProp<K extends keyof TextProps>(key: K, value: TextProps[K]): void {
  if (!item.value) return;
  store.patchItem(item.value.id, { props: { ...(item.value.props as TextProps), [key]: value } });
  store.commit();
}

function updateProp(key: string, value: unknown): void {
  if (!item.value) return;
  store.patchItem(item.value.id, { props: { ...item.value.props, [key]: value } });
  store.commit();
}
</script>

<template>
  <div v-if="item" class="overlay-item-settings">
    <div class="overlay-item-settings__header">
      <span class="overlay-item-settings__title">{{ overlayItemLabel(item) }}</span>
    </div>
    <div class="overlay-item-settings__fields">
      <div class="overlay-item-position">
        <label class="field"><span class="field__label">X</span><input type="number" :value="item.x" @change="updatePosition('x', $event)" /></label>
        <label class="field"><span class="field__label">Y</span><input type="number" :value="item.y" @change="updatePosition('y', $event)" /></label>
        <label class="field"><span class="field__label">Largeur</span><input type="number" min="8" :value="item.w" @change="updatePosition('w', $event)" /></label>
        <label class="field"><span class="field__label">Hauteur</span><input type="number" min="8" :value="item.h" @change="updatePosition('h', $event)" /></label>
      </div>

      <template v-if="item.type === 'text'">
        <label class="field">
          <span class="field__label">Contenu</span>
          <textarea rows="3" :value="textItemProps.content" @change="updateTextProp('content', ($event.target as HTMLTextAreaElement).value)"></textarea>
        </label>
        <label class="field">
          <span class="field__label">Taille (px)</span>
          <input type="number" min="6" max="400" :value="textItemProps.fontSize" @change="updateTextProp('fontSize', Number(($event.target as HTMLInputElement).value))" />
        </label>
        <label class="field">
          <span class="field__label">Couleur</span>
          <input type="color" :value="textItemProps.color" @change="updateTextProp('color', ($event.target as HTMLInputElement).value)" />
        </label>
        <label class="field">
          <span class="field__label">Alignement</span>
          <select :value="textItemProps.align" @change="updateTextProp('align', ($event.target as HTMLSelectElement).value)">
            <option value="left">Gauche</option>
            <option value="center">Centre</option>
            <option value="right">Droite</option>
          </select>
        </label>
      </template>

      <template v-else-if="item.type === 'image' || item.type === 'video' || item.type === 'embed'">
        <label class="field">
          <span class="field__label">URL</span>
          <input type="url" :value="mediaItemProps.src" @change="updateProp('src', ($event.target as HTMLInputElement).value)" />
        </label>
        <label v-if="item.type !== 'embed'" class="field">
          <span class="field__label">Ajustement</span>
          <select :value="mediaItemProps.fit" @change="updateProp('fit', ($event.target as HTMLSelectElement).value)">
            <option value="cover">Couvrir</option>
            <option value="contain">Contenir</option>
            <option value="fill">Étirer</option>
          </select>
        </label>
      </template>

      <template v-else-if="item.type === 'widget' || item.type === 'alert'">
        <button type="button" class="button button--quiet button--wide" @click="openCode">
          <span class="material-symbols-rounded" aria-hidden="true">code</span>
          Voir le code
        </button>
        <OverlayItemFieldsForm :item="item" />
      </template>
    </div>
  </div>
  <p v-else class="hint">Sélectionnez un élément pour modifier ses réglages.</p>

  <OverlayItemCodeDialog ref="codeDialogRef" />
</template>
