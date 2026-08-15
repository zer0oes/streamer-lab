<script setup lang="ts">
import LibrarySidebar from "./LibrarySidebar.vue";
import AccountPanel from "./AccountPanel.vue";
import PlatformSwitch from "./PlatformSwitch.vue";
import ExportMenu from "./ExportMenu.vue";
import { toggleAccountPanel } from "../composables/useAccountPanel";
import { sidebarCollapsed } from "../composables/useSidebarCollapse";
import { activeView } from "../composables/useAppView";
</script>

<template>
  <header class="topbar">
    <a class="brand" href="/" aria-label="Retour à l’accueil">
      <img class="brand__mark" src="/assets/brand/logo_streamers-lab.png" alt="" aria-hidden="true" />
      <div>
        <h1>Streamer <span class="text-accent">Lab</span></h1>
      </div>
    </a>
    <div class="topbar__center" :hidden="activeView !== 'widget'">
      <PlatformSwitch />
      <ExportMenu />
    </div>
    <div class="topbar__actions">
      <button type="button" class="icon-button" aria-label="Mon compte" title="Mon compte" @click="toggleAccountPanel()">
        <span class="material-symbols-rounded" aria-hidden="true">account_circle</span>
      </button>
    </div>
  </header>

  <main class="workspace" :class="{ 'is-dashboard': activeView === 'dashboard', 'is-sidebar-collapsed is-sidebar-rail': sidebarCollapsed }">
    <LibrarySidebar />
    <section class="preview-column">
      <slot />
    </section>
  </main>

  <AccountPanel />
</template>
