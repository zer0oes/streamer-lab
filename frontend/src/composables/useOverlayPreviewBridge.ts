// Diffuse un événement à TOUS les items widget/alerte posés sur le canevas
// d'overlay actuellement affiché (pas un seul, comme useWidgetPreviewBridge
// côté éditeur widget/alerte) : contrairement à l'éditeur standalone, un
// overlay peut porter plusieurs widgets qui doivent tous réagir au même
// événement de stream simulé, exactement comme en direct. Recherche DOM
// plutôt qu'un registre de refs : le déclenchement est une action manuelle
// rare, pas un chemin chaud, et les iframes des items sont toujours montées
// (le canevas ne les démonte jamais selon la sélection).
export function dispatchToOverlayItems(eventType: string, detail: unknown, eventTarget: "window" | "document" = "window"): void {
  const message = { source: "se-lab", kind: "dispatch", eventType, eventTarget, detail };
  const frames = document.querySelectorAll<HTMLIFrameElement>(".overlay-canvas-stage .overlay-item__frame");
  frames.forEach((frame) => frame.contentWindow?.postMessage(message, "*"));
}
