<script setup lang="ts">
// Réglages natifs de l'AlertBox (StreamElements ou Streamlabs), alerte par alerte (cf.
// « Settings » d'une AlertBox : case à cocher + roue dentée → son, volume,
// durée). Enregistrés dans alertbox.json ; le code du widget n'en connaît
// que {{widgetDuration}}, {{audio}} et {{audioVolume}}.
import { computed, onMounted, ref } from "vue";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import { useMediaStore } from "../stores/media";
import { useToast } from "../composables/useToast";
import { alertboxPlatformLabel, type AlertboxAlertType } from "../lib/alertbox";

const store = useWidgetEditorStore();
const mediaStore = useMediaStore();
const { showToast } = useToast();
const uploadInput = ref<HTMLInputElement | null>(null);
const uploadTarget = ref<AlertboxAlertType | null>(null);
let previewAudio: HTMLAudioElement | null = null;

const sounds = computed(() => mediaStore.localMedia.filter((media) => media.type === "audio"));

onMounted(() => {
  if (!mediaStore.localMedia.length) void mediaStore.fetchAll().catch(() => {});
});

function settingsOf(type: AlertboxAlertType) {
  return store.alertbox!.alerts[type];
}

// Son hors médiathèque (URL saisie à la main) : on le garde visible dans la liste
function isCustomSound(url: string): boolean {
  return Boolean(url) && !sounds.value.some((media) => media.url === url);
}

function soundName(url: string): string {
  return decodeURIComponent(url.split("/").pop() || url);
}

function onSoundSelect(type: AlertboxAlertType, event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (value === "__url__") {
    const url = window.prompt("URL du son (mp3, ogg, wav)", settingsOf(type).sound)?.trim();
    (event.target as HTMLSelectElement).value = settingsOf(type).sound;
    if (url !== undefined) store.updateAlertbox(type, { sound: url });
    return;
  }
  store.updateAlertbox(type, { sound: value });
}

function chooseUpload(type: AlertboxAlertType): void {
  uploadTarget.value = type;
  uploadInput.value?.click();
}

async function onUploadChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !uploadTarget.value) return;
  try {
    const media = await mediaStore.upload(file);
    store.updateAlertbox(uploadTarget.value, { sound: media.url });
  } catch (error) {
    showToast(`Téléversement impossible : ${error instanceof Error ? error.message : String(error)}`);
  }
}

function previewSound(type: AlertboxAlertType): void {
  const { sound, volume } = settingsOf(type);
  previewAudio?.pause();
  if (!sound) return;
  previewAudio = new Audio(sound);
  previewAudio.volume = volume;
  void previewAudio.play().catch(() => showToast("Lecture du son impossible"));
}

function onNumber(type: AlertboxAlertType, key: "volume" | "duration", event: Event, scale = 1): void {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isFinite(value)) store.updateAlertbox(type, { [key]: value / scale });
}
</script>

<template>
  <form v-if="store.alertbox" class="alertbox-form" @submit.prevent>
    <p class="alertbox-form__intro">
      Réglages natifs de l’{{ alertboxPlatformLabel(store.platform) }}, à reporter dans chaque alerte. Chaque alerte a son propre code et ses propres champs :
      <span class="material-symbols-sharp alertbox-form__inline-icon" aria-hidden="true">code</span> pour les éditer.
    </p>

    <details v-for="alert in store.alertboxAlertList" :key="alert.type" class="field-group alertbox-form__alert" :class="{ 'is-disabled': !settingsOf(alert.type).enabled, 'is-editing': store.activeAlertType === alert.type }">
      <summary class="field-group__summary alertbox-form__summary">
        <input
          type="checkbox"
          :checked="settingsOf(alert.type).enabled"
          :aria-label="`Activer ${alert.label}`"
          @click.stop
          @change="store.updateAlertbox(alert.type, { enabled: ($event.target as HTMLInputElement).checked })"
        />
        <span class="material-symbols-sharp" aria-hidden="true">{{ alert.icon }}</span>
        <span class="alertbox-form__label">
          {{ alert.label }}
          <small v-if="alert.hint">{{ alert.hint }}</small>
        </span>
        <button
          type="button"
          class="icon-button alertbox-form__code"
          :class="{ 'is-active': store.activeAlertType === alert.type }"
          :aria-pressed="store.activeAlertType === alert.type"
          :title="store.activeAlertType === alert.type ? 'Code et champs en cours d’édition' : 'Éditer le code et les champs de cette alerte'"
          :aria-label="`Éditer le code et les champs de ${alert.label}`"
          @click.prevent.stop="store.selectAlertType(alert.type)"
        >
          <span class="material-symbols-sharp" aria-hidden="true">code</span>
        </button>
        <span class="material-symbols-sharp alertbox-form__gear" aria-hidden="true">settings</span>
      </summary>

      <div class="field-group__body alertbox-form__body">
        <label class="field">
          <span class="field__label">Son</span>
          <div class="alertbox-form__row">
            <select :value="settingsOf(alert.type).sound" @change="onSoundSelect(alert.type, $event)">
              <option value="">Aucun son</option>
              <option v-if="isCustomSound(settingsOf(alert.type).sound)" :value="settingsOf(alert.type).sound">
                {{ soundName(settingsOf(alert.type).sound) }}
              </option>
              <option v-for="media in sounds" :key="media.id" :value="media.url">{{ media.name }}</option>
              <option value="__url__">URL…</option>
            </select>
            <button
              type="button"
              class="icon-button"
              title="Écouter"
              aria-label="Écouter le son"
              :disabled="!settingsOf(alert.type).sound"
              @click="previewSound(alert.type)"
            >
              <span class="material-symbols-sharp" aria-hidden="true">play_arrow</span>
            </button>
            <button type="button" class="icon-button" title="Téléverser un son" aria-label="Téléverser un son" @click="chooseUpload(alert.type)">
              <span class="material-symbols-sharp" aria-hidden="true">upload</span>
            </button>
          </div>
        </label>

        <label class="field">
          <span class="field__label">Volume · {{ Math.round(settingsOf(alert.type).volume * 100) }} %</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            :value="Math.round(settingsOf(alert.type).volume * 100)"
            @change="onNumber(alert.type, 'volume', $event, 100)"
          />
        </label>

        <label class="field">
          <span class="field__label">Durée de l’alerte (s, max 90)</span>
          <input type="number" min="1" max="90" step="1" :value="settingsOf(alert.type).duration" @change="onNumber(alert.type, 'duration', $event)" />
        </label>
      </div>
    </details>

    <input ref="uploadInput" type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/mp4" hidden @change="onUploadChange" />
  </form>
</template>
