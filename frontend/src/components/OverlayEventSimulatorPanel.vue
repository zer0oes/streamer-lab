<script setup lang="ts">
// Variante de EventSimulatorPanel.vue pour l'éditeur d'overlay : même
// panneau/FAB, mais diffuse à TOUS les items widget/alerte du canevas
// (dispatchToOverlayItems) plutôt qu'à une seule iframe d'aperçu, toujours
// au format StreamElements (comme OverlayCanvasItem.vue, qui rend chaque
// item widget/alerte dans ce seul format), et sans panneau de console à
// alimenter (un toast confirme l'envoi à la place). Dupliqué plutôt que
// partagé avec l'éditeur widget/alerte : les deux sources de vérité
// (store.platform, store.addConsoleLine) n'existent pas côté overlay, et le
// panneau reste petit (~130 lignes) — une abstraction commune coûterait plus
// qu'elle ne ferait gagner ici.
import { reactive, ref } from "vue";
import { useToast } from "../composables/useToast";
import { dispatchToOverlayItems } from "../composables/useOverlayPreviewBridge";
import { randomChatBadges, randomChatMessage, randomEventAmount, randomEventName, chatRoleBadges } from "../lib/eventSimulatorData";

const isOpen = defineModel<boolean>("open", { default: false });

const { showToast } = useToast();

interface EventFormState {
  name: string;
  broadcaster: boolean;
  message: string;
  amount: string;
  subType: string;
}

function blankForm(): EventFormState {
  return { name: "", broadcaster: false, message: "", amount: "", subType: "tier1" };
}

const forms = reactive<Record<string, EventFormState>>({
  message: blankForm(),
  "follower-latest": blankForm(),
  "subscriber-latest": blankForm(),
  "tip-latest": blankForm(),
  "cheer-latest": blankForm(),
  "raid-latest": blankForm()
});

const eventTypes: { key: string; icon: string; label: string; hasAmount?: boolean; amountLabel?: string; hasMessage?: boolean; hasSubType?: boolean }[] = [
  { key: "message", icon: "chat", label: "Chat message", hasMessage: true },
  { key: "follower-latest", icon: "favorite", label: "Follower event" },
  { key: "subscriber-latest", icon: "person_add", label: "Subscriber event", hasSubType: true },
  { key: "tip-latest", icon: "credit_card", label: "Tipper event", hasAmount: true, amountLabel: "Montant (€)", hasMessage: true },
  { key: "cheer-latest", icon: "award_star", label: "Cheer event", hasAmount: true, amountLabel: "Montant (bits)", hasMessage: true },
  { key: "raid-latest", icon: "groups", label: "Raid event", hasAmount: true, amountLabel: "Viewers" }
];

const customEvent = ref(`{
  "listener": "follower-latest",
  "event": { "name": "DebugUser", "amount": 1 }
}`);

function dispatchChatMessage(name: string, message: string, badges: unknown[]): void {
  dispatchToOverlayItems("onEventReceived", {
    listener: "message",
    event: {
      data: {
        time: Date.now(),
        nick: name.toLowerCase(),
        userId: crypto.randomUUID(),
        displayName: name,
        displayColor: "#9f75ff",
        badges,
        text: message,
        isAction: false,
        emotes: []
      }
    }
  });
}

function sendPreset(listener: string): void {
  const form = forms[listener];
  const isBroadcaster = listener === "message" && form.broadcaster;
  const name = isBroadcaster ? "MaChaine" : form.name.trim() || randomEventName();

  if (listener === "message") {
    const badges = isBroadcaster ? [chatRoleBadges.broadcaster] : randomChatBadges();
    const message = form.message.trim() || randomChatMessage();
    dispatchChatMessage(name, message, badges);
    showToast(`Événement envoyé : ${listener}`);
    return;
  }

  const event: Record<string, unknown> = { name, gifted: false, id: crypto.randomUUID() };
  const eventType = eventTypes.find((entry) => entry.key === listener);

  if (eventType?.hasAmount) {
    const raw = form.amount.trim();
    const amount = raw === "" ? randomEventAmount(listener) : Math.max(0, Number(raw) || 0);
    form.amount = String(amount);
    event.amount = amount;
    if (listener === "raid-latest") event.viewers = amount;
  }
  if (eventType?.hasMessage) event.message = form.message;
  if (eventType?.hasSubType) {
    const subType = form.subType;
    event.subType = subType;
    event.tier = subType === "prime" ? "prime" : "1000";
    event.gifted = subType === "gift" || subType === "communitygift";
    event.bulkGifted = subType === "communitygift";
  }

  dispatchToOverlayItems("onEventReceived", { listener, event });
  showToast(`Événement envoyé : ${listener}`);
}

function sendCustomEvent(): void {
  try {
    const parsed = JSON.parse(customEvent.value);
    dispatchToOverlayItems("onEventReceived", parsed);
    showToast(`Événement JSON envoyé : ${parsed.listener || "?"}`);
  } catch (error) {
    showToast(`JSON invalide : ${error instanceof Error ? error.message : String(error)}`);
  }
}

function close(): void {
  isOpen.value = false;
}
</script>

<template>
  <section class="event-simulator" :class="{ 'is-open': isOpen }" aria-labelledby="overlay-event-simulator-title" :hidden="!isOpen">
    <header class="event-simulator__header">
      <div>
        <span class="eyebrow">SIMULATION LOCALE</span>
        <h2 id="overlay-event-simulator-title">Déclencher un événement</h2>
      </div>
      <button type="button" class="icon-button" aria-label="Fermer" @click="close">
        <span class="material-symbols-rounded" aria-hidden="true">close_small</span>
      </button>
    </header>

    <div class="event-simulator__body">
      <div class="field">
        <span class="field__label">Événement</span>
        <div class="event-type-accordion">
          <details
            v-for="eventType in eventTypes"
            :key="eventType.key"
            class="event-type-item"
            :data-event-type="eventType.key"
            :open="eventType.key === 'message'"
          >
            <summary class="event-type-item__summary">
              <span class="material-symbols-rounded" aria-hidden="true">{{ eventType.icon }}</span>
              <span>{{ eventType.label }}</span>
              <span class="material-symbols-rounded event-type-item__chevron" aria-hidden="true">expand_more</span>
            </summary>
            <div class="event-type-item__body">
              <label class="field">
                <span class="field__label">Pseudo</span>
                <input v-model="forms[eventType.key].name" placeholder="Aléatoire si vide" autocomplete="off" />
              </label>
              <label v-if="eventType.key === 'message'" class="field checkbox-field">
                <span class="checkbox-field__label">Diffuseur (pseudo de la chaîne)</span>
                <input v-model="forms[eventType.key].broadcaster" type="checkbox" />
              </label>
              <label v-if="eventType.hasSubType" class="field">
                <span class="field__label">Type d’abonnement</span>
                <select v-model="forms[eventType.key].subType">
                  <option value="tier1">Sub classique</option>
                  <option value="prime">Sub Prime</option>
                  <option value="gift">Sub-Gift</option>
                  <option value="communitygift">Community Gift</option>
                </select>
              </label>
              <label v-if="eventType.hasAmount" class="field">
                <span class="field__label">{{ eventType.amountLabel }}</span>
                <input v-model="forms[eventType.key].amount" type="number" min="0" step="1" placeholder="Aléatoire si vide" />
              </label>
              <label v-if="eventType.hasMessage" class="field">
                <span class="field__label">Message</span>
                <input v-model="forms[eventType.key].message" placeholder="Aléatoire si vide" autocomplete="off" />
              </label>
              <button type="button" class="button button--primary button--wide" @click="sendPreset(eventType.key)">Déclencher l’événement</button>
            </div>
          </details>
        </div>
      </div>
    </div>

    <details class="advanced">
      <summary class="advanced__summary">Événement JSON personnalisé</summary>
      <label class="field">
        <span class="field__label">Detail de onEventReceived</span>
        <textarea v-model="customEvent" rows="8" spellcheck="false"></textarea>
      </label>
      <button type="button" class="button button--quiet button--wide" @click="sendCustomEvent">Envoyer le JSON</button>
    </details>
  </section>

  <button
    class="event-fab"
    type="button"
    aria-label="Simuler un événement"
    :aria-expanded="isOpen"
    title="Simuler un événement"
    @click="isOpen = !isOpen"
  >
    <span class="material-symbols-rounded" aria-hidden="true">alarm_on</span>
  </button>
</template>
