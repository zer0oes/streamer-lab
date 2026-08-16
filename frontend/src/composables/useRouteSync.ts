// Synchronise l'URL avec activeView + l'id du widget/alerte/overlay ouvert,
// sans routeur dédié (cf. la décision "pas de Vue Router" du plan initial) —
// seulement 3 formes d'URL possibles, un simple mapping suffit :
//   /                 -> dashboard
//   /widget/<id>      -> éditeur widget (LibraryEntry.type !== "alert")
//   /alerte/<id>      -> éditeur widget (LibraryEntry.type === "alert")
//   /overlay/<id>     -> éditeur overlay
// L'app.js vanille n'avait pas ce besoin (rechargement complet de toute
// façon, cf. showDashboard/openOverlayEditor) ; ceci est un ajout pour la
// réécriture Vue, où un F5 perdait jusqu'ici la vue active (retour forcé au
// dashboard, tout l'état en mémoire étant réinitialisé).
import { watch } from "vue";
import { activeView, setActiveView, type AppView } from "./useAppView";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import { useLibraryStore } from "../stores/library";

function buildPath(view: AppView, widgetId: string | null, overlayId: string | null): string {
  if (view === "widget" && widgetId) {
    const libraryStore = useLibraryStore();
    const isAlert = libraryStore.widgets.find((entry) => entry.id === widgetId)?.type === "alert";
    return `/${isAlert ? "alerte" : "widget"}/${encodeURIComponent(widgetId)}`;
  }
  if (view === "overlay" && overlayId) return `/overlay/${encodeURIComponent(overlayId)}`;
  return "/";
}

async function applyPathToState(pathname: string): Promise<void> {
  const libraryStore = useLibraryStore();
  const match = /^\/(widget|alerte|overlay)\/([^/]+)\/?$/.exec(pathname);
  if (!match) {
    setActiveView("dashboard");
    return;
  }
  const [, kind, rawId] = match;
  const id = decodeURIComponent(rawId);

  if (kind === "overlay") {
    if (!libraryStore.overlays.some((entry) => entry.id === id)) {
      history.replaceState(null, "", "/");
      setActiveView("dashboard");
      return;
    }
    await useOverlayEditorStore().open(id);
    setActiveView("overlay");
    return;
  }

  const entry = libraryStore.widgets.find((widget) => widget.id === id);
  // /alerte/<id> et /widget/<id> ouvrent le même éditeur : seule l'URL
  // affichée distingue les deux (cf. buildPath) — un widget ouvert via
  // /alerte/ (ou l'inverse) est corrigé silencieusement plutôt que refusé.
  if (!entry) {
    history.replaceState(null, "", "/");
    setActiveView("dashboard");
    return;
  }
  await useWidgetEditorStore().open(id);
  setActiveView("widget");
  const expectedKind = entry.type === "alert" ? "alerte" : "widget";
  if (kind !== expectedKind) history.replaceState(null, "", `/${expectedKind}/${rawId}`);
}

/** À appeler une fois, après le premier chargement de la bibliothèque, pour ouvrir la vue demandée par l'URL initiale. */
export async function resolveInitialRoute(): Promise<void> {
  await applyPathToState(window.location.pathname);
}

/** À appeler une fois au montage de l'app : garde l'URL synchronisée avec activeView pour la suite. */
export function startRouteSync(): void {
  const widgetEditorStore = useWidgetEditorStore();
  const overlayEditorStore = useOverlayEditorStore();

  // replaceState (jamais pushState) : l'aperçu widget/overlay recharge son
  // iframe par srcdoc à chaque édition (cf. WidgetPreviewFrame.vue), ce que
  // Chrome comptabilise dans l'historique de navigation "joint" de l'onglet
  // au même titre qu'un vrai changement de page — un pushState ici finit
  // mélangé à ces entrées fantômes, et le bouton "précédent" du navigateur
  // ne revient plus jamais correctement à la vue précédente. replaceState
  // n'ajoute aucune entrée : l'objectif réel (l'URL reflète toujours la vue
  // active, un rechargement de page y retombe) reste rempli sans dépendre
  // de cet historique fantôme.
  watch(
    [activeView, () => widgetEditorStore.widgetId, () => overlayEditorStore.overlay?.id],
    ([view, widgetId, overlayId]) => {
      const path = buildPath(view, widgetId, overlayId ?? null);
      if (window.location.pathname !== path) history.replaceState(null, "", path);
    }
  );

  window.addEventListener("popstate", () => {
    void applyPathToState(window.location.pathname);
  });
}
