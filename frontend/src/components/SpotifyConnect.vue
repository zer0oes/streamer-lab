<script setup lang="ts">
// Bouton « Connecter Spotify » affiché sous le champ « Refresh token » des
// widgets musique : remplace `npm run spotify:token`. Le serveur du labo fait
// l'aller-retour OAuth avec Spotify, puis le token est rempli dans le champ.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { getSpotifyAuthResult, getSpotifyRedirectUri, startSpotifyAuthorization } from "../api/spotify";

const props = defineProps<{ clientId: string; clientSecret: string; connected: boolean }>();
const emit = defineEmits<{ token: [value: string] }>();

const POLL_MS = 1500;
const TIMEOUT_MS = 10 * 60 * 1000;

const redirectUri = ref("");
const status = ref<"idle" | "waiting" | "done" | "error">("idle");
const message = ref("");
const copied = ref(false);
let pollTimer: ReturnType<typeof setTimeout> | undefined;

onMounted(async () => {
  try {
    redirectUri.value = await getSpotifyRedirectUri();
  } catch {
    redirectUri.value = "";
  }
});
onBeforeUnmount(() => clearTimeout(pollTimer));

async function copyRedirectUri(): Promise<void> {
  try {
    await navigator.clipboard.writeText(redirectUri.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    copied.value = false;
  }
}

async function connect(): Promise<void> {
  clearTimeout(pollTimer);
  if (!props.clientId.trim() || !props.clientSecret.trim()) {
    status.value = "error";
    message.value = "Colle d'abord le Client ID et le Client Secret de ton app Spotify (étape 2).";
    return;
  }
  // Onglet ouvert tout de suite (sinon bloqué comme pop-up), adresse ensuite
  const popup = window.open("about:blank", "_blank");
  try {
    const { state, url } = await startSpotifyAuthorization(props.clientId, props.clientSecret);
    if (popup) popup.location.href = url;
    else window.open(url, "_blank");
    status.value = "waiting";
    message.value = "Autorise l'accès dans l'onglet Spotify qui vient de s'ouvrir…";
    poll(state, Date.now());
  } catch (error) {
    popup?.close();
    status.value = "error";
    message.value = (error as Error).message;
  }
}

function poll(state: string, startedAt: number): void {
  pollTimer = setTimeout(async () => {
    try {
      const result = await getSpotifyAuthResult(state);
      if (result.status === "done") {
        emit("token", result.refreshToken);
        status.value = "done";
        message.value = "Spotify est connecté : le refresh token a été rempli.";
        return;
      }
      if (result.status === "error") {
        status.value = "error";
        message.value = result.error;
        return;
      }
      if (result.status === "unknown" || Date.now() - startedAt > TIMEOUT_MS) {
        status.value = "error";
        message.value = "Connexion expirée, réessaie.";
        return;
      }
    } catch {
      // Serveur momentanément injoignable : on réessaie
    }
    poll(state, startedAt);
  }, POLL_MS);
}
</script>

<template>
  <div class="spotify-connect">
    <button type="button" class="button button--wide" :disabled="status === 'waiting'" @click="connect">
      <span class="material-symbols-sharp" aria-hidden="true">{{ status === "waiting" ? "hourglass_top" : "link" }}</span>
      {{ connected ? "Reconnecter Spotify" : "Connecter Spotify" }}
    </button>
    <p v-if="message" class="hint" :class="{ 'spotify-connect__error': status === 'error' }" role="status">{{ message }}</p>
    <details class="spotify-connect__help" :open="!connected">
      <summary>Comment faire ? (une seule fois)</summary>
      <ol>
        <li>
          Sur <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a>,
          connecte-toi puis « Create app » : un nom au choix, coche « Web API », et ajoute cette Redirect URI :
          <span class="spotify-connect__uri">
            <code>{{ redirectUri || "…" }}</code>
            <button type="button" class="button button--quiet" :disabled="!redirectUri" @click="copyRedirectUri">{{ copied ? "Copié" : "Copier" }}</button>
          </span>
        </li>
        <li>Dans les « Settings » de l'app, copie le Client ID et le Client Secret dans les champs au-dessus.</li>
        <li>Clique sur « Connecter Spotify » et accepte : le refresh token se remplit tout seul.</li>
      </ol>
    </details>
  </div>
</template>

<style scoped>
.spotify-connect{display:flex;flex-direction:column;gap:8px;margin-top:4px}
.spotify-connect .button .material-symbols-sharp{font-size:18px;vertical-align:-4px;margin-right:4px}
.spotify-connect__error{color:#ff7a8a}
.spotify-connect__help{font-size:12px;line-height:1.45;opacity:.9}
.spotify-connect__help summary{cursor:pointer}
.spotify-connect__help ol{margin:6px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:6px}
.spotify-connect__help a{color:inherit}
.spotify-connect__uri{display:flex;align-items:center;gap:6px;margin-top:4px}
.spotify-connect__uri code{flex:1;min-width:0;overflow-wrap:anywhere;font-size:11px;padding:3px 5px;border-radius:4px;background:rgba(127,127,127,.15)}
</style>
