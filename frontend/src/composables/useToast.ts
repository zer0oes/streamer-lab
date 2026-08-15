import { ref } from "vue";

const message = ref("");
const visible = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | undefined;

// Un seul toast partagé pour toute l'appli (mêmes refs importées partout),
// même principe que `showToast()` dans l'ancienne app.js.
export function useToast() {
  function showToast(text: string): void {
    message.value = text;
    visible.value = true;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      visible.value = false;
    }, 3500);
  }

  return { message, visible, showToast };
}
