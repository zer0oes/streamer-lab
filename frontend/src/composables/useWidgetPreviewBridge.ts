import { ref } from "vue";

// Référence partagée vers l'iframe d'aperçu actuellement affichée : le
// simulateur d'événements et le store ont besoin d'y envoyer des
// postMessage sans lien parent-enfant direct avec WidgetPreviewFrame.
export const widgetFrameEl = ref<HTMLIFrameElement | null>(null);

export function dispatchToWidget(eventType: string, detail: unknown, eventTarget: "window" | "document" = "window"): void {
  const message = { source: "se-lab", kind: "dispatch", eventType, eventTarget, detail };
  widgetFrameEl.value?.contentWindow?.postMessage(message, "*");
}
