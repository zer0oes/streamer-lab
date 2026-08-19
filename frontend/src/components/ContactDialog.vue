<script setup lang="ts">
import { ref } from "vue";
import { sendContactMessage } from "../api/contact";
import { useDialogBackdropClose } from "../composables/useDialogBackdropClose";

const dialogEl = ref<HTMLDialogElement | null>(null);
const firstName = ref("");
const lastName = ref("");
const nickname = ref("");
const email = ref("");
const subject = ref("");
const message = ref("");
const status = ref("");
const statusState = ref<"" | "error" | "success">("");
const sending = ref(false);

function close(): void {
  dialogEl.value?.close();
}

const { onMousedown, onClick } = useDialogBackdropClose(dialogEl, close);

function open(): void {
  firstName.value = "";
  lastName.value = "";
  nickname.value = "";
  email.value = "";
  subject.value = "";
  message.value = "";
  status.value = "";
  statusState.value = "";
  dialogEl.value?.showModal();
}

defineExpose({ open });

async function submit(): Promise<void> {
  sending.value = true;
  status.value = "Envoi en cours…";
  statusState.value = "";
  try {
    await sendContactMessage({
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      nickname: nickname.value.trim(),
      email: email.value.trim(),
      subject: subject.value.trim(),
      message: message.value.trim()
    });
    status.value = "Message envoyé, merci !";
    statusState.value = "success";
    setTimeout(close, 1200);
  } catch (error) {
    statusState.value = "error";
    status.value = error instanceof Error ? error.message : String(error);
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <dialog ref="dialogEl" class="widget-settings" aria-labelledby="contact-dialog-title" @mousedown="onMousedown" @click="onClick">
    <form class="widget-settings__form" @submit.prevent="submit">
      <header class="widget-settings__header">
        <h2 id="contact-dialog-title">Nous contacter</h2>
        <button type="button" class="icon-button" aria-label="Fermer" @click="close">
          <span class="material-symbols-sharp" aria-hidden="true">close_small</span>
        </button>
      </header>
      <div class="widget-settings__body">
        <div class="field__row">
          <label class="field">
            <span class="field__label">Prénom</span>
            <input v-model="firstName" type="text" maxlength="80" autocomplete="given-name" />
          </label>
          <label class="field">
            <span class="field__label">Nom</span>
            <input v-model="lastName" type="text" maxlength="80" autocomplete="family-name" />
          </label>
        </div>
        <label class="field">
          <span class="field__label">Pseudo<span class="field__required" aria-hidden="true">*</span></span>
          <input v-model="nickname" type="text" maxlength="80" required autocomplete="nickname" />
        </label>
        <label class="field">
          <span class="field__label">Email<span class="field__required" aria-hidden="true">*</span></span>
          <input v-model="email" type="email" maxlength="254" required autocomplete="email" />
        </label>
        <label class="field">
          <span class="field__label">Sujet<span class="field__required" aria-hidden="true">*</span></span>
          <input v-model="subject" type="text" maxlength="150" required autocomplete="off" />
        </label>
        <label class="field">
          <span class="field__label">Message<span class="field__required" aria-hidden="true">*</span></span>
          <textarea v-model="message" rows="5" maxlength="4000" required></textarea>
        </label>
        <p class="widget-settings__hint"><span class="field__required" aria-hidden="true">*</span> Champs obligatoires</p>
        <p class="widget-settings__message" :class="{ [`is-${statusState}`]: statusState }" role="status" aria-live="polite">
          {{ status }}
        </p>
      </div>
      <footer class="widget-settings__footer">
        <button type="button" class="button button--quiet" @click="close">Annuler</button>
        <button type="submit" class="button button--primary" :disabled="sending">Envoyer</button>
      </footer>
    </form>
  </dialog>
</template>
