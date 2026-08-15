import { useLibraryStore } from "../stores/library";
import { useProjectsStore } from "../stores/projects";
import { useToast } from "./useToast";

// Format transporté par le glisser-déposer d'une ligne (overlay ou widget/
// alerte) vers un groupe-projet ou une carte de projet — port du mécanisme
// de l'ancienne app (LIBRARY_ITEM_DRAG_TYPE / startLibraryItemDrag /
// handleLibraryItemDrop dans app.js).
const LIBRARY_ITEM_DRAG_TYPE = "application/x-streamerlab-item";

interface DragPayload {
  kind: "widget" | "overlay";
  id: string;
}

export function useLibraryDrag() {
  const libraryStore = useLibraryStore();
  const projectsStore = useProjectsStore();
  const { showToast } = useToast();

  function startDrag(event: DragEvent, kind: "widget" | "overlay", id: string): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(LIBRARY_ITEM_DRAG_TYPE, JSON.stringify({ kind, id } satisfies DragPayload));
  }

  async function handleDrop(event: DragEvent, projectId: string): Promise<void> {
    event.preventDefault();
    const raw = event.dataTransfer?.getData(LIBRARY_ITEM_DRAG_TYPE);
    if (!raw) return;
    let payload: DragPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    const catalog = payload.kind === "overlay" ? libraryStore.overlays : libraryStore.widgets;
    const current = catalog.find((entry) => entry.id === payload.id);
    if (!current || current.projectId === projectId) return;

    try {
      if (payload.kind === "overlay") await libraryStore.moveOverlay(payload.id, projectId);
      else await libraryStore.moveWidget(payload.id, projectId);
      showToast(`« ${current.name} » déplacé vers « ${projectsStore.nameFor(projectId)} »`);
    } catch (error) {
      showToast(`Déplacement impossible : ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { startDrag, handleDrop };
}
