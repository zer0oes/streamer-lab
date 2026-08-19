<script setup lang="ts">
import { computed } from "vue";
import { useAccountStore } from "../stores/account";
import { toggleAccountPanel } from "../composables/useAccountPanel";

const accountStore = useAccountStore();

const twitchConnected = computed(() => accountStore.authenticated);
const streamelementsConnected = computed(() => Boolean(accountStore.integrationFor("streamelements")));
const streamlabsConnected = computed(() => Boolean(accountStore.integrationFor("streamlabs")));
</script>

<template>
  <ul class="dashboard-view__connections-list">
    <li class="dashboard-view__connections-item" :class="{ 'is-connected': twitchConnected }">
      <span class="dashboard-view__connections-logo">
        <svg class="twitch-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"
          ></path>
        </svg>
      </span>
      <span class="dashboard-view__connections-copy">
        <strong>Compte Twitch</strong>
        <span>{{ twitchConnected ? `Connecté en tant que ${accountStore.user?.displayName}` : "Connectez-vous" }}</span>
      </span>
      <span class="dashboard-view__connections-dot" :class="{ 'is-connected': twitchConnected }" aria-hidden="true"></span>
      <button type="button" class="icon-button dashboard-view__connections-disconnect" aria-label="Gérer mon compte" @click="toggleAccountPanel(true)">
        <span class="material-symbols-sharp" aria-hidden="true">{{ twitchConnected ? "link_off" : "link" }}</span>
      </button>
    </li>

    <li class="dashboard-view__connections-item" :class="{ 'is-connected': streamelementsConnected }">
      <span class="dashboard-view__connections-logo dashboard-view__connections-logo--streamelements">
        <img class="dashboard-view__connections-platform-icon" src="/assets/platforms/streamelements.svg" alt="" />
      </span>
      <span class="dashboard-view__connections-copy">
        <strong>StreamElements</strong>
        <span>{{ streamelementsConnected ? "Connecté" : "Connectez-vous" }}</span>
      </span>
      <span class="dashboard-view__connections-dot" :class="{ 'is-connected': streamelementsConnected }" aria-hidden="true"></span>
      <button type="button" class="icon-button dashboard-view__connections-disconnect" aria-label="Gérer StreamElements" @click="toggleAccountPanel(true)">
        <span class="material-symbols-sharp" aria-hidden="true">{{ streamelementsConnected ? "link_off" : "link" }}</span>
      </button>
    </li>

    <li class="dashboard-view__connections-item" :class="{ 'is-connected': streamlabsConnected }">
      <span class="dashboard-view__connections-logo dashboard-view__connections-logo--streamlabs">
        <img class="dashboard-view__connections-platform-icon dashboard-view__connections-platform-icon--streamlabs" src="/assets/platforms/streamlabs.svg" alt="" />
      </span>
      <span class="dashboard-view__connections-copy">
        <strong>Streamlabs</strong>
        <span>{{ streamlabsConnected ? "Connecté" : "Connectez-vous" }}</span>
      </span>
      <span class="dashboard-view__connections-dot" :class="{ 'is-connected': streamlabsConnected }" aria-hidden="true"></span>
      <button type="button" class="icon-button dashboard-view__connections-disconnect" aria-label="Gérer Streamlabs" @click="toggleAccountPanel(true)">
        <span class="material-symbols-sharp" aria-hidden="true">{{ streamlabsConnected ? "link_off" : "link" }}</span>
      </button>
    </li>
  </ul>
</template>
