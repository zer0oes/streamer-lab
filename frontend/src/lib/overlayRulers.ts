// Port verbatim de drawOverlayRuler (public/app.js) : les rubans gradués
// affichés sous le bouton "Repères" de la barre d'outils overlay.
// OVERLAY_RULER_SIZE doit rester synchro avec $ruler-size
// (styles/layouts/_overlay-canvas.scss). pickRulerStep vit dans
// overlayGeometry.ts (déjà présente et testée là avant ce port — pas de
// second exemplaire ici).
import { pickRulerStep } from "./overlayGeometry";

export const OVERLAY_RULER_SIZE = 20;

export function drawOverlayRuler(canvasEl: HTMLCanvasElement | null, logicalLength: number, scale: number, step: number, isHorizontal: boolean): void {
  if (!canvasEl) return;
  const dpr = window.devicePixelRatio || 1;
  const displayLength = Math.max(1, Math.round(logicalLength * scale));
  const thickness = OVERLAY_RULER_SIZE;
  canvasEl.style.width = isHorizontal ? `${displayLength}px` : `${thickness}px`;
  canvasEl.style.height = isHorizontal ? `${thickness}px` : `${displayLength}px`;
  canvasEl.width = Math.round((isHorizontal ? displayLength : thickness) * dpr);
  canvasEl.height = Math.round((isHorizontal ? thickness : displayLength) * dpr);

  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, displayLength, thickness);

  const rootStyle = getComputedStyle(document.documentElement);
  ctx.strokeStyle = rootStyle.getPropertyValue("--line-soft").trim() || "#373d4a";
  ctx.fillStyle = rootStyle.getPropertyValue("--muted").trim() || "#858b98";
  ctx.font = "9px system-ui, sans-serif";
  ctx.lineWidth = 1;
  ctx.textBaseline = "alphabetic";

  const minorDivisions = 5;
  const minorStep = step / minorDivisions;
  const totalTicks = Math.ceil(logicalLength / minorStep);
  for (let i = 0; i <= totalTicks; i++) {
    const value = i * minorStep;
    if (value > logicalLength + minorStep) break;
    const isMajor = i % minorDivisions === 0;
    // +0.5 pour un trait net d'1px physique (évite l'anti-aliasing d'une
    // ligne posée pile sur une frontière de pixel).
    const pos = Math.round(value * scale) + 0.5;
    const tickLength = isMajor ? thickness * 0.55 : thickness * 0.3;
    ctx.beginPath();
    if (isHorizontal) {
      ctx.moveTo(pos, thickness - tickLength);
      ctx.lineTo(pos, thickness);
    } else {
      ctx.moveTo(thickness - tickLength, pos);
      ctx.lineTo(thickness, pos);
    }
    ctx.stroke();
    if (isMajor && value > 0) {
      const label = String(Math.round(value));
      if (isHorizontal) {
        ctx.fillText(label, pos + 2, 9);
      } else {
        ctx.save();
        ctx.translate(9, pos - 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
  }
}

export function drawOverlayRulers(
  topEl: HTMLCanvasElement | null,
  leftEl: HTMLCanvasElement | null,
  canvasSize: { width: number; height: number },
  scale: number
): void {
  const step = pickRulerStep(scale);
  drawOverlayRuler(topEl, canvasSize.width, scale, step, true);
  drawOverlayRuler(leftEl, canvasSize.height, scale, step, false);
}
