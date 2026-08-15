import type { OverlayCanvasSize } from "./overlayTypes";

export const GUIDE_SNAP_SCREEN_PX = 6;
export const OVERLAY_CANVAS_BOTTOM_MARGIN = 24;
export const OVERLAY_RULER_SIZE = 20;
export const OVERLAY_ZOOM_MIN = 0.25;
export const OVERLAY_ZOOM_MAX = 4;
export const OVERLAY_ZOOM_STEP = 0.25;

export interface FitScaleViewport {
  wrapClientWidth: number;
  wrapTop: number;
  windowInnerHeight: number;
  showGuides: boolean;
}

// Échelle d'ajustement pure : jamais au-delà de 100%, toujours contrainte par
// l'espace disponible (largeur ET hauteur). Les mesures DOM (clientWidth,
// getBoundingClientRect().top, innerHeight) sont prises par l'appelant et
// passées ici en paramètres pour garder cette fonction testable sans DOM.
export function computeOverlayFitScale(canvas: OverlayCanvasSize, viewport: FitScaleViewport): number {
  const rulerReserve = viewport.showGuides ? OVERLAY_RULER_SIZE * 2 : 0;
  const availableWidth = (viewport.wrapClientWidth || canvas.width) - rulerReserve;
  const availableHeight = Math.max(120, viewport.windowInnerHeight - viewport.wrapTop - OVERLAY_CANVAS_BOTTOM_MARGIN - rulerReserve);
  return Math.min(1, availableWidth / canvas.width, availableHeight / canvas.height);
}

export function stepOverlayZoom(current: number, direction: number): number {
  const stepped =
    direction > 0
      ? Math.floor(current / OVERLAY_ZOOM_STEP) * OVERLAY_ZOOM_STEP + OVERLAY_ZOOM_STEP
      : Math.ceil(current / OVERLAY_ZOOM_STEP) * OVERLAY_ZOOM_STEP - OVERLAY_ZOOM_STEP;
  return Math.min(OVERLAY_ZOOM_MAX, Math.max(OVERLAY_ZOOM_MIN, stepped));
}

export function clampOverlayZoom(value: number): number {
  return Math.min(OVERLAY_ZOOM_MAX, Math.max(OVERLAY_ZOOM_MIN, value));
}

export interface CanvasStageRect {
  offsetWidth: number;
}

export function overlayCanvasScale(canvas: OverlayCanvasSize, stage: CanvasStageRect): number {
  return (stage.offsetWidth || canvas.width) / canvas.width;
}

export interface CanvasElementRect {
  left: number;
  top: number;
}

// getBoundingClientRect() sur le canevas tient déjà compte de son
// transform:scale() (il retourne la boîte visuelle à l'écran) : on peut donc
// en déduire un point en coordonnées "réelles" du canevas (celles stockées
// dans overlay.json) sans dupliquer le calcul d'échelle.
export function canvasPointFromEvent(clientX: number, clientY: number, rect: CanvasElementRect, scale: number): { x: number; y: number } {
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
}

export function generateOverlayItemId(): string {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function overlayGuidesWithCenter(axis: "horizontal" | "vertical", userGuides: number[] | undefined, canvas: OverlayCanvasSize): number[] {
  const center = axis === "vertical" ? canvas.width / 2 : canvas.height / 2;
  return [...(userGuides || []), center];
}

// Accroche un bord/centre à ~GUIDE_SNAP_SCREEN_PX pixels écran d'un repère —
// convertit ce seuil en pixels logiques via l'échelle courante, jamais
// l'inverse (le seuil doit rester visuellement constant quel que soit le zoom).
export function snapEdge(value: number, guides: number[] | undefined, scale: number, guidesVisible: boolean): number {
  if (!guidesVisible || !guides?.length) return value;
  const threshold = GUIDE_SNAP_SCREEN_PX / scale;
  let best = value;
  let bestDist = threshold;
  for (const guide of guides) {
    const dist = Math.abs(guide - value);
    if (dist < bestDist) {
      bestDist = dist;
      best = guide;
    }
  }
  return Math.round(best);
}

// Comme snapEdge, mais teste aussi le bord opposé et le centre (pas juste
// pos) : au drag, n'importe lequel des trois peut être celui qui aligne
// visuellement l'item sur le repère.
export function snapMovePosition(pos: number, size: number, guides: number[] | undefined, scale: number, guidesVisible: boolean): number {
  if (!guidesVisible || !guides?.length) return pos;
  const threshold = GUIDE_SNAP_SCREEN_PX / scale;
  const offsets = [0, size / 2, size];
  let bestPos = pos;
  let bestDist = threshold;
  for (const guide of guides) {
    for (const offset of offsets) {
      const dist = Math.abs(guide - (pos + offset));
      if (dist < bestDist) {
        bestDist = dist;
        bestPos = guide - offset;
      }
    }
  }
  return Math.round(bestPos);
}

export function pickRulerStep(scale: number): number {
  const niceSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  return niceSteps.find((step) => step * scale >= 50) ?? niceSteps[niceSteps.length - 1];
}
