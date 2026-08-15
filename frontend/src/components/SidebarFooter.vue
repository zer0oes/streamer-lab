<script setup lang="ts">
import { contactDialog } from "../composables/useDialogs";

const year = new Date().getFullYear();
</script>

<template>
  <div class="controls__footer">
    <button type="button" class="sidebar-nav-item controls__footer-contact" @click="contactDialog?.open()">
      <span class="material-symbols-rounded" aria-hidden="true">mail</span>
      <span>Nous contacter</span>
    </button>
    <div class="controls__footer-links">
      <a class="controls__footer-copyright" href="https://www.aurore-salavert.fr/" target="_blank" rel="noopener">© {{ year }} Stream Widget Studio</a>
      <a class="controls__footer-icon" href="https://github.com/zer0oes/stream-widget-studio" target="_blank" rel="noopener" aria-label="Dépôt GitHub" title="GitHub">
        <svg class="github-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
        </svg>
      </a>
      <a class="controls__footer-icon" href="https://discord.gg/zUXhtd295u" target="_blank" rel="noopener" aria-label="Support Discord" title="Support Discord">
        <svg class="discord-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.07.07 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.618-1.25.07.07 0 0 0-.078-.037A19.74 19.74 0 0 0 3.677 4.37a.06.06 0 0 0-.03.028C.533 9.046-.32 13.58.099 18.058a.08.08 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.08.08 0 0 0 .084-.028 14.2 14.2 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.893.077.077 0 0 1-.008-.128q.19-.142.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .079.01q.183.149.372.291a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.548-13.66a.06.06 0 0 0-.031-.028M8.02 15.33c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.419-2.157 2.419m7.975 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.419-2.157 2.419"></path>
        </svg>
      </a>
    </div>
  </div>
</template>
