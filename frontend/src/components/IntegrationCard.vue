<script setup lang="ts">
import { computed, ref } from "vue";
import { useAccountStore } from "../stores/account";
import { useToast } from "../composables/useToast";
import { revealEnvDefault, type Provider } from "../api/account";

const props = defineProps<{
  provider: Provider;
  title: string;
  helpUrl?: string;
  showOAuthLink?: boolean;
  showTokenType?: boolean;
}>();

const accountStore = useAccountStore();
const { showToast } = useToast();

const integration = computed(() => accountStore.integrationFor(props.provider));
const isConnected = computed(() => Boolean(integration.value));

const token = ref("");
const tokenType = ref<"jwt" | "apikey">("jwt");
const channelId = ref("");
const channelName = ref("");
const revealed = ref(false);
const submitting = ref(false);
const formError = ref("");

async function reveal(): Promise<void> {
  try {
    const defaults = await revealEnvDefault(props.provider);
    token.value = defaults.token;
    if (defaults.channelId) channelId.value = defaults.channelId;
    if (defaults.channelName) channelName.value = defaults.channelName;
    if (defaults.tokenType === "jwt" || defaults.tokenType === "apikey") tokenType.value = defaults.tokenType;
    revealed.value = true;
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error));
  }
}

async function submit(): Promise<void> {
  formError.value = "";
  if (!token.value.trim()) {
    formError.value = "Le token est requis.";
    return;
  }
  submitting.value = true;
  try {
    await accountStore.connect(props.provider, {
      token: token.value.trim(),
      tokenType: props.showTokenType ? tokenType.value : undefined,
      channelId: channelId.value.trim() || undefined,
      channelName: channelName.value.trim() || undefined
    });
    token.value = "";
    channelId.value = "";
    channelName.value = "";
    showToast(`${props.title} connecté`);
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error);
  } finally {
    submitting.value = false;
  }
}

async function disconnect(): Promise<void> {
  if (!window.confirm(`Déconnecter ${props.title} ?`)) return;
  try {
    await accountStore.disconnect(props.provider);
    showToast(`${props.title} déconnecté`);
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error));
  }
}
</script>

<template>
  <section class="integration-card">
    <div class="integration-card__header">
      <h3>{{ title }}</h3>
      <span class="integration-card__status" :class="{ 'is-connected': isConnected }">
        {{ isConnected ? "Connecté" : "Non connecté" }}
      </span>
    </div>

    <div v-if="isConnected" class="integration-card__connected">
      <p v-if="integration?.channelName">Chaîne : {{ integration.channelName }}</p>
      <p class="integration-card__meta">Connecté le {{ new Date(integration!.connectedAt).toLocaleString("fr-FR") }}</p>
      <button type="button" class="button button--quiet" @click="disconnect">Déconnecter</button>
    </div>

    <template v-else>
      <a v-if="showOAuthLink" :href="`/auth/${provider}/start`" class="button button--wide" data-role="oauth-connect">
        <span class="material-symbols-rounded" aria-hidden="true">bolt</span>
        <span>Se connecter en OAuth2</span>
      </a>
      <div v-if="showOAuthLink" class="integration-card__divider">ou avec un jeton manuel</div>

      <form class="integration-card__form" @submit.prevent="submit">
        <p v-if="formError" class="integration-form__error">{{ formError }}</p>
        <label class="field">
          <span class="field__label">Token{{ showTokenType ? " (JWT ou clé API)" : "" }}</span>
          <input v-model="token" :type="revealed ? 'text' : 'password'" autocomplete="off" />
        </label>
        <label v-if="showTokenType" class="field">
          <span class="field__label">Type de token</span>
          <select v-model="tokenType">
            <option value="jwt">JWT</option>
            <option value="apikey">Clé API</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Identifiant de chaîne (optionnel)</span>
          <input v-model="channelId" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field__label">Nom de chaîne (optionnel)</span>
          <input v-model="channelName" autocomplete="off" />
        </label>
        <button type="button" class="button button--quiet" @click="reveal">Utiliser le token de .env</button>
        <button type="submit" class="button button--primary" :disabled="submitting">Connecter</button>
      </form>
    </template>

    <a v-if="helpUrl" :href="helpUrl" target="_blank" rel="noopener" class="integration-card__help">
      <span class="material-symbols-rounded" aria-hidden="true">help</span>
      <span>Où trouver mon token ?</span>
    </a>
  </section>
</template>
