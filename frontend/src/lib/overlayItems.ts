import type { OverlayCanvasSize, OverlayItem, OverlayItemType } from "./overlayTypes";
import { generateOverlayItemId } from "./overlayGeometry";

export function nextOverlayZIndex(items: OverlayItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.z), 0) + 1;
}

export function createOverlayPrimitive(
  items: OverlayItem[],
  type: OverlayItemType,
  x: number,
  y: number,
  w: number,
  h: number,
  props: Record<string, unknown>
): OverlayItem {
  return {
    id: generateOverlayItemId(),
    type,
    x: Math.round(x - w / 2),
    y: Math.round(y - h / 2),
    w,
    h,
    z: nextOverlayZIndex(items),
    props
  };
}

export const OVERLAY_PRIMITIVE_DEFAULTS: Record<Exclude<OverlayItemType, "widget" | "alert" | "group" | "placeholder">, { w: number; h: number; props: Record<string, unknown> }> = {
  text: { w: 320, h: 120, props: { content: "Texte", fontFamily: "inherit", fontSize: 32, fontWeight: 600, color: "#ffffff", align: "left" } },
  image: { w: 320, h: 180, props: { src: "", fit: "cover" } },
  video: { w: 320, h: 180, props: { src: "", fit: "cover", loop: true, muted: true } },
  embed: { w: 400, h: 300, props: { src: "" } },
  icon: { w: 96, h: 96, props: { name: "star", color: "#ffffff" } },
  shape: { w: 200, h: 200, props: { shape: "rectangle", fill: "#7c5cff", stroke: "transparent", strokeWidth: 0, radius: 0 } }
};

export function createOverlayWidgetItem(
  items: OverlayItem[],
  widgetId: string,
  isAlert: boolean,
  width: number,
  height: number
): OverlayItem {
  // Décale chaque nouvel item en cascade (comme des fenêtres qui s'empilent
  // en escalier) : sans ça, deux ajouts successifs atterrissent exactement
  // au même x/y et se superposent totalement.
  const cascade = (items.length % 8) * 32;
  return {
    id: generateOverlayItemId(),
    widgetId,
    type: isAlert ? "alert" : "widget",
    x: 40 + cascade,
    y: 220 + cascade,
    w: width,
    h: height,
    z: nextOverlayZIndex(items)
  };
}

export function overlayItemDefaultLabel(item: OverlayItem): string {
  switch (item.type) {
    case "text":
      return "Texte";
    case "image":
      return "Image";
    case "video":
      return "Vidéo";
    case "embed":
      return "Lien";
    case "icon":
      return "Icône";
    case "shape":
      return "Forme";
    case "group":
      return `Groupe (${((item.props?.children as string[] | undefined) || []).length})`;
    case "placeholder":
      return item.name || "Élément StreamElements";
    default:
      return item.widgetId || "Widget";
  }
}

export function overlayItemLabel(item: OverlayItem): string {
  return item.name || overlayItemDefaultLabel(item);
}

const PLACEHOLDER_ICONS: Record<string, string> = { video: "videocam", group: "select_all", "alert-box": "campaign", native: "widgets" };

// Icône Material par type d'item, utilisée pour le panneau Calques et la
// miniature d'aperçu d'un overlay sur le dashboard. `widgetIcon` résout
// l'icône propre à un widget/alerte référencé (repli sur "widgets" si
// introuvable — ex. widget supprimé depuis).
export function overlayLayerIcon(item: OverlayItem, widgetIcon: (widgetId: string) => string | undefined = () => undefined): string {
  switch (item.type) {
    case "alert":
      return "campaign";
    case "text":
      return "title";
    case "image":
      return "image";
    case "video":
      return "videocam";
    case "embed":
      return "link";
    case "icon":
      return "star";
    case "shape":
      return "category";
    case "group":
      return "select_all";
    case "placeholder":
      return PLACEHOLDER_ICONS[(item.props?.sourceType as string | undefined) || "native"] || PLACEHOLDER_ICONS.native;
    default:
      return widgetIcon(item.widgetId || "") || "widgets";
  }
}

// Comme overlayLayerIcon, mais préfère l'icône réellement choisie pour un
// item "icon" (son vrai glyph, pas un simple repère générique) — utilisé par
// la miniature d'aperçu d'un overlay sur le dashboard, où chaque icône
// affichée doit refléter fidèlement la composition.
export function overlayPreviewItemIcon(item: OverlayItem, widgetIcon: (widgetId: string) => string | undefined = () => undefined): string {
  if (item.type === "icon" && item.props?.name) return item.props.name as string;
  return overlayLayerIcon(item, widgetIcon);
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function boundingBoxOf(items: OverlayItem[]): BoundingBox {
  const x = Math.min(...items.map((item) => item.x));
  const y = Math.min(...items.map((item) => item.y));
  const right = Math.max(...items.map((item) => item.x + item.w));
  const bottom = Math.max(...items.map((item) => item.y + item.h));
  return { x, y, w: right - x, h: bottom - y };
}

export function createOverlayGroup(items: OverlayItem[], memberIds: string[]): OverlayItem | null {
  const members = memberIds.map((id) => items.find((item) => item.id === id)).filter((item): item is OverlayItem => Boolean(item));
  if (members.length < 2) return null;
  const box = boundingBoxOf(members);
  const z = Math.min(...members.map((member) => member.z)) - 1;
  return { id: generateOverlayItemId(), type: "group", ...box, z, props: { children: memberIds } };
}

export function centerOverlayItem(item: OverlayItem, canvas: OverlayCanvasSize): { x: number; y: number } {
  return { x: Math.round((canvas.width - item.w) / 2), y: Math.round((canvas.height - item.h) / 2) };
}

export type AlignEdge = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

export function alignItemsTo(items: OverlayItem[], edge: AlignEdge): Map<string, { x?: number; y?: number }> {
  const box = boundingBoxOf(items);
  const updates = new Map<string, { x?: number; y?: number }>();
  for (const item of items) {
    if (edge === "left") updates.set(item.id, { x: box.x });
    else if (edge === "hcenter") updates.set(item.id, { x: Math.round(box.x + box.w / 2 - item.w / 2) });
    else if (edge === "right") updates.set(item.id, { x: box.x + box.w - item.w });
    else if (edge === "top") updates.set(item.id, { y: box.y });
    else if (edge === "vcenter") updates.set(item.id, { y: Math.round(box.y + box.h / 2 - item.h / 2) });
    else if (edge === "bottom") updates.set(item.id, { y: box.y + box.h - item.h });
  }
  return updates;
}

// Distribue un espacement égal entre les items (par leur centre), sur l'axe
// donné — n'a de sens qu'à partir de 3 items (avec 2, "distribuer" ne changerait rien).
export function distributeItems(items: OverlayItem[], axis: "horizontal" | "vertical"): Map<string, { x?: number; y?: number }> {
  const updates = new Map<string, { x?: number; y?: number }>();
  if (items.length < 3) return updates;
  const sorted = [...items].sort((a, b) => (axis === "horizontal" ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstCenter = axis === "horizontal" ? first.x + first.w / 2 : first.y + first.h / 2;
  const lastCenter = axis === "horizontal" ? last.x + last.w / 2 : last.y + last.h / 2;
  const span = lastCenter - firstCenter;
  const step = span / (sorted.length - 1);
  sorted.forEach((item, index) => {
    if (index === 0 || index === sorted.length - 1) return;
    const center = firstCenter + step * index;
    if (axis === "horizontal") updates.set(item.id, { x: Math.round(center - item.w / 2) });
    else updates.set(item.id, { y: Math.round(center - item.h / 2) });
  });
  return updates;
}
