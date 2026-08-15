import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";
import { getOverlay, saveOverlayGuides, saveOverlayItems } from "../api/overlayDetail";
import { getWidgetDetail, type FieldDefinitions } from "../api/widgetDetail";
import type { OverlayEntry } from "../api/types";
import type { OverlayGuides, OverlayItem, OverlayItemType } from "../lib/overlayTypes";
import { DEFAULT_OVERLAY_CANVAS } from "../lib/overlayTypes";
import { OverlayHistory } from "../lib/overlayHistory";
import {
  OVERLAY_PRIMITIVE_DEFAULTS,
  alignItemsTo,
  createOverlayGroup,
  createOverlayPrimitive,
  createOverlayWidgetItem,
  centerOverlayItem,
  distributeItems,
  type AlignEdge
} from "../lib/overlayItems";
import type { WidgetBundle } from "../lib/widgetSrcdoc";

export interface OverlayWidgetBundle extends WidgetBundle {
  fields: FieldDefinitions;
  name: string;
}

export type OverlayTool = "select" | "text" | "image" | "video" | "embed" | "icon" | "shape";

const GUIDES_VISIBLE_STORAGE_KEY = "se-lab-overlay-guides-visible";
const PERSIST_DEBOUNCE_MS = 650;

export const useOverlayEditorStore = defineStore("overlayEditor", () => {
  const overlay = ref<OverlayEntry | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedIds = ref<Set<string>>(new Set());
  const tool = ref<OverlayTool>("select");
  const zoomMode = ref<"fit" | number>("fit");
  const guidesVisible = ref(localStorage.getItem(GUIDES_VISIBLE_STORAGE_KEY) !== "false");
  const widgetBundles = reactive<Record<string, OverlayWidgetBundle | null>>({});
  const widgetSizes = reactive<Record<string, { width: number; height: number }>>({});

  const history = new OverlayHistory<OverlayItem[]>();
  let persistTimer: ReturnType<typeof setTimeout> | undefined;

  const items = computed<OverlayItem[]>(() => overlay.value?.items || []);
  const canvas = computed(() => overlay.value?.canvas || DEFAULT_OVERLAY_CANVAS);
  const selectedItems = computed(() => items.value.filter((item) => selectedIds.value.has(item.id)));
  const soleSelection = computed(() => (selectedIds.value.size === 1 ? items.value.find((item) => selectedIds.value.has(item.id)) || null : null));
  const canUndo = computed(() => history.canUndo());
  const canRedo = computed(() => history.canRedo());

  // JSON.parse(JSON.stringify(...)) plutôt que structuredClone(toRaw(...)) :
  // toRaw() ne désenveloppe que le tableau lui-même, pas les objets `props`
  // imbriqués (chaque accès à un item d'un tableau réactif Vue renvoie un
  // Proxy réactif propre à cet item) — structuredClone lève un DataCloneError
  // sur ces Proxy imbriqués. Les items restent de simples données JSON
  // (nombres/chaînes/objets), un aller-retour JSON suffit et les désenveloppe
  // tous, à n'importe quelle profondeur, sans avoir à parcourir la structure.
  function cloneItems(source: OverlayItem[]): OverlayItem[] {
    return JSON.parse(JSON.stringify(source));
  }

  async function open(overlayId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    selectedIds.value = new Set();
    tool.value = "select";
    zoomMode.value = "fit";
    try {
      const data = await getOverlay(overlayId);
      overlay.value = data;
      history.reset(cloneItems(data.items));
      await preloadWidgetBundles(data.items);
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  }

  function close(): void {
    overlay.value = null;
    selectedIds.value = new Set();
    clearTimeout(persistTimer);
  }

  async function preloadWidgetBundles(overlayItems: OverlayItem[]): Promise<void> {
    const widgetIds = [...new Set(overlayItems.filter((item) => item.type === "widget" || item.type === "alert").map((item) => item.widgetId!))];
    await Promise.all(widgetIds.map((id) => loadWidgetBundle(id)));
  }

  async function loadWidgetBundle(widgetId: string): Promise<void> {
    if (widgetId in widgetBundles) return;
    widgetBundles[widgetId] = null;
    try {
      const detail = await getWidgetDetail(widgetId, "streamelements");
      widgetBundles[widgetId] = { html: detail.html, css: detail.css, js: detail.js, fields: detail.fields, name: detail.widgetMeta.name };
      widgetSizes[widgetId] = { width: detail.widgetMeta.width, height: detail.widgetMeta.height };
    } catch {
      widgetBundles[widgetId] = null;
    }
  }

  // --- Sélection ---

  function selectOnly(id: string): void {
    selectedIds.value = new Set([id]);
  }

  function toggleSelect(id: string): void {
    const next = new Set(selectedIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds.value = next;
  }

  function selectMany(ids: string[]): void {
    selectedIds.value = new Set(ids);
  }

  function clearSelection(): void {
    selectedIds.value = new Set();
  }

  // --- Mutation des items (sans persistance immédiate) ---

  function setItems(nextItems: OverlayItem[]): void {
    if (!overlay.value) return;
    overlay.value.items = nextItems;
  }

  // Lecture/mutation en place (pas de remplacement de tableau) : utilisées
  // par le glisser/redimensionner de OverlayCanvas.vue à chaque pointermove,
  // où la fréquence d'appel rend un .map() sur tout le tableau superflu —
  // seul le commit() de fin de geste doit rester coûteux (historique + réseau).
  function getItem(id: string): OverlayItem | undefined {
    return overlay.value?.items.find((item) => item.id === id);
  }

  function mutateItem(id: string, patch: Partial<OverlayItem>): void {
    const item = getItem(id);
    if (item) Object.assign(item, patch);
  }

  function patchItem(id: string, patch: Partial<OverlayItem>): void {
    if (!overlay.value) return;
    overlay.value.items = overlay.value.items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  }

  function patchItems(updates: Map<string, Partial<OverlayItem>>): void {
    if (!overlay.value || updates.size === 0) return;
    overlay.value.items = overlay.value.items.map((item) => (updates.has(item.id) ? { ...item, ...updates.get(item.id) } : item));
  }

  // Point d'entrée unique après une mutation "terminée" (relâchement du
  // pointeur en fin de drag/resize, ajout/suppression, alignement...) :
  // empile l'historique et programme la sauvegarde réseau, jamais à chaque
  // frame intermédiaire d'un glissement.
  function commit(): void {
    if (!overlay.value) return;
    history.push(cloneItems(overlay.value.items));
    schedulePersistItems();
  }

  function schedulePersistItems(): void {
    if (!overlay.value) return;
    const overlayId = overlay.value.id;
    const snapshot = cloneItems(overlay.value.items);
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = undefined;
      void saveOverlayItems(overlayId, snapshot);
    }, PERSIST_DEBOUNCE_MS);
  }

  // Ne sauvegarde que s'il y a bien une écriture EN ATTENTE (persistTimer
  // défini) : appelée sans condition à la fermeture de la vue (cf.
  // OverlayEditorView.vue), elle ne doit jamais réécrire overlay.json —
  // et donc jamais retoucher updatedAt — pour une simple consultation sans
  // aucune modification.
  async function flushPersist(): Promise<void> {
    if (!overlay.value || persistTimer === undefined) return;
    clearTimeout(persistTimer);
    persistTimer = undefined;
    await saveOverlayItems(overlay.value.id, cloneItems(overlay.value.items));
  }

  // --- Historique ---

  function undo(): void {
    const snapshot = history.undo();
    if (!snapshot || !overlay.value) return;
    overlay.value.items = cloneItems(snapshot);
    selectedIds.value = new Set([...selectedIds.value].filter((id) => overlay.value!.items.some((item) => item.id === id)));
    schedulePersistItems();
  }

  function redo(): void {
    const snapshot = history.redo();
    if (!snapshot || !overlay.value) return;
    overlay.value.items = cloneItems(snapshot);
    schedulePersistItems();
  }

  // --- Création / suppression ---

  function addPrimitive(type: Exclude<OverlayItemType, "widget" | "alert" | "group" | "placeholder">, x: number, y: number): OverlayItem | null {
    if (!overlay.value) return null;
    const preset = OVERLAY_PRIMITIVE_DEFAULTS[type];
    const item = createOverlayPrimitive(overlay.value.items, type, x, y, preset.w, preset.h, { ...preset.props });
    setItems([...overlay.value.items, item]);
    selectOnly(item.id);
    commit();
    tool.value = "select";
    return item;
  }

  async function addWidgetItem(widgetId: string, isAlert: boolean): Promise<OverlayItem | null> {
    if (!overlay.value) return null;
    await loadWidgetBundle(widgetId);
    const size = widgetSizes[widgetId] || { width: 400, height: 200 };
    const item = createOverlayWidgetItem(overlay.value.items, widgetId, isAlert, size.width, size.height);
    setItems([...overlay.value.items, item]);
    selectOnly(item.id);
    commit();
    return item;
  }

  function deleteSelected(): void {
    if (!overlay.value || selectedIds.value.size === 0) return;
    const ids = selectedIds.value;
    setItems(overlay.value.items.filter((item) => !ids.has(item.id)));
    clearSelection();
    commit();
  }

  function duplicateSelected(): void {
    if (!overlay.value || selectedIds.value.size === 0) return;
    const clones = cloneItems(selectedItems.value).map((item) => ({
      ...item,
      id: `${item.id}-copy-${Math.random().toString(36).slice(2, 7)}`,
      x: item.x + 24,
      y: item.y + 24,
      z: item.z + 1
    }));
    setItems([...overlay.value.items, ...clones]);
    selectMany(clones.map((item) => item.id));
    commit();
  }

  // --- Groupes ---

  function groupSelection(): void {
    if (!overlay.value) return;
    const group = createOverlayGroup(overlay.value.items, [...selectedIds.value]);
    if (!group) return;
    setItems([...overlay.value.items, group]);
    selectOnly(group.id);
    commit();
  }

  function ungroupSelection(): void {
    if (!overlay.value || !soleSelection.value || soleSelection.value.type !== "group") return;
    const childIds = [...((soleSelection.value.props?.children as string[] | undefined) || [])];
    setItems(overlay.value.items.filter((item) => item.id !== soleSelection.value!.id));
    selectMany(childIds);
    commit();
  }

  // --- Alignement / distribution / centrage ---

  function align(edge: AlignEdge): void {
    if (selectedItems.value.length === 0) return;
    patchItems(alignItemsTo(selectedItems.value, edge));
    commit();
  }

  function distribute(axis: "horizontal" | "vertical"): void {
    if (selectedItems.value.length < 3) return;
    patchItems(distributeItems(selectedItems.value, axis));
    commit();
  }

  function centerSelectionInCanvas(): void {
    if (selectedItems.value.length === 0) return;
    const updates = new Map(selectedItems.value.map((item) => [item.id, centerOverlayItem(item, canvas.value)]));
    patchItems(updates);
    commit();
  }

  // --- Calques ---

  function toggleItemHidden(id: string): void {
    const target = items.value.find((item) => item.id === id);
    if (!target) return;
    patchItem(id, { hidden: !target.hidden });
    commit();
  }

  function toggleItemLocked(id: string): void {
    const target = items.value.find((item) => item.id === id);
    if (!target) return;
    patchItem(id, { locked: !target.locked });
    commit();
  }

  function renameItem(id: string, name: string): void {
    patchItem(id, { name });
    commit();
  }

  function reorderItem(id: string, direction: 1 | -1): void {
    if (!overlay.value) return;
    const sorted = [...overlay.value.items].sort((a, b) => a.z - b.z);
    const index = sorted.findIndex((item) => item.id === id);
    const swapWith = index + direction;
    if (index < 0 || swapWith < 0 || swapWith >= sorted.length) return;
    const z = sorted[index].z;
    sorted[index].z = sorted[swapWith].z;
    sorted[swapWith].z = z;
    setItems(overlay.value.items.map((item) => sorted.find((entry) => entry.id === item.id) || item));
    commit();
  }

  // --- Repères ---

  function setGuidesVisible(visible: boolean): void {
    guidesVisible.value = visible;
    localStorage.setItem(GUIDES_VISIBLE_STORAGE_KEY, String(visible));
  }

  function setGuides(next: OverlayGuides): void {
    if (!overlay.value) return;
    overlay.value.guides = next;
    void saveOverlayGuides(overlay.value.id, next);
  }

  // --- Outil / zoom ---

  function setTool(next: OverlayTool): void {
    tool.value = next;
  }

  function setZoomMode(mode: "fit" | number): void {
    zoomMode.value = mode;
  }

  return {
    overlay,
    loading,
    error,
    items,
    canvas,
    selectedIds,
    selectedItems,
    soleSelection,
    tool,
    zoomMode,
    guidesVisible,
    widgetBundles,
    widgetSizes,
    canUndo,
    canRedo,
    open,
    close,
    loadWidgetBundle,
    selectOnly,
    toggleSelect,
    selectMany,
    clearSelection,
    getItem,
    mutateItem,
    patchItem,
    patchItems,
    commit,
    schedulePersistItems,
    flushPersist,
    undo,
    redo,
    addPrimitive,
    addWidgetItem,
    deleteSelected,
    duplicateSelected,
    groupSelection,
    ungroupSelection,
    align,
    distribute,
    centerSelectionInCanvas,
    toggleItemHidden,
    toggleItemLocked,
    renameItem,
    reorderItem,
    setGuidesVisible,
    setGuides,
    setTool,
    setZoomMode
  };
});
