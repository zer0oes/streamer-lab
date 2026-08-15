<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useAccountStore } from "../stores/account";
import { accountPanelOpen, toggleAccountPanel } from "../composables/useAccountPanel";
import { useToast } from "../composables/useToast";
import IntegrationCard from "./IntegrationCard.vue";

const accountStore = useAccountStore();
const { showToast } = useToast();

function close(): void {
  toggleAccountPanel(false);
}

async function logout(): Promise<void> {
  await accountStore.logout();
  showToast("Déconnecté");
  close();
}

// Ouvre le panneau automatiquement au retour d'une redirection OAuth
// (?account=open, posé par server.mjs après /auth/streamelements/callback).
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("account") === "open") toggleAccountPanel(true);
});

watch(accountPanelOpen, (open) => {
  if (open && accountStore.authenticated) {
    void accountStore.fetchIntegrations();
    void accountStore.fetchEnvDefaults();
  }
});
</script>

<template>
  <div class="account-panel-drawer" :class="{ 'is-open': accountPanelOpen }" :hidden="!accountPanelOpen">
    <header class="account-panel-drawer__header">
      <h2>Mon compte</h2>
      <button type="button" class="icon-button" aria-label="Fermer" @click="close">
        <span class="material-symbols-rounded" aria-hidden="true">close_small</span>
      </button>
    </header>
    <div class="account-panel-drawer__body">
      <div v-if="!accountStore.authenticated" class="account-panel-drawer__state">
        <p class="account-panel-drawer__lead">Connecte-toi avec Twitch pour lier StreamElements et Streamlabs.</p>
        <a class="button button--twitch button--wide" href="/auth/twitch/start">
          <svg class="twitch-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"
            ></path>
          </svg>
          <span>Se connecter avec Twitch</span>
        </a>
      </div>

      <div v-else class="account-panel-drawer__state">
        <div class="account-identity">
          <img
            v-if="accountStore.user?.avatarUrl"
            class="account-identity__avatar"
            :src="accountStore.user.avatarUrl"
            alt=""
          />
          <div class="account-identity__name">
            <span class="eyebrow">Connecté</span>
            <h3>{{ accountStore.user?.displayName }}</h3>
          </div>
        </div>

        <div class="integration-grid">
          <IntegrationCard
            provider="streamelements"
            title="StreamElements"
            help-url="https://streamelements.com/dashboard/account/channels"
            show-oauth-link
            show-token-type
          />
          <IntegrationCard
            provider="streamlabs"
            title="Streamlabs"
            help-url="https://streamlabs.com/dashboard#/settings/api-settings"
          />
        </div>
      </div>
    </div>
    <footer v-if="accountStore.authenticated" class="account-panel-drawer__footer">
      <span class="account-panel-drawer__footer-label">{{ accountStore.user?.twitchLogin }}</span>
      <button type="button" class="button button--quiet" @click="logout">Se déconnecter</button>
    </footer>
  </div>
</template>
