import { defineStore } from "pinia";
import { ref } from "vue";
import { deleteLocalMedia, listLocalMedia, listStreamElementsMedia, uploadLocalMedia, type LocalMediaItem, type RemoteMediaItem } from "../api/media";

export const useMediaStore = defineStore("media", () => {
  const localMedia = ref<LocalMediaItem[]>([]);
  const remoteMedia = ref<RemoteMediaItem[]>([]);
  // null tant que non chargé, false = StreamElements non connecté (pas une erreur).
  const streamElementsConnected = ref<boolean | null>(null);
  const loading = ref(false);

  async function fetchAll(): Promise<void> {
    loading.value = true;
    try {
      const [local, remote] = await Promise.all([listLocalMedia(), listStreamElementsMedia()]);
      localMedia.value = local;
      if (remote === null) {
        streamElementsConnected.value = false;
        remoteMedia.value = [];
      } else {
        streamElementsConnected.value = true;
        remoteMedia.value = remote;
      }
    } finally {
      loading.value = false;
    }
  }

  async function upload(file: File): Promise<LocalMediaItem> {
    const media = await uploadLocalMedia(file);
    localMedia.value = [media, ...localMedia.value];
    return media;
  }

  async function remove(id: string): Promise<void> {
    await deleteLocalMedia(id);
    localMedia.value = localMedia.value.filter((entry) => entry.id !== id);
  }

  return { localMedia, remoteMedia, streamElementsConnected, loading, fetchAll, upload, remove };
});
