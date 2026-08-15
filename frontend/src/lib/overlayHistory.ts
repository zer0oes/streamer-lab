export const OVERLAY_HISTORY_LIMIT = 100;

// Pile annuler/rétablir par snapshots complets (pas de diff), indexée par un
// curseur dans un tableau linéaire : les overlays restent de taille modeste
// (quelques dizaines d'items), un clone complet à chaque étape reste
// largement assez rapide et évite toute la complexité d'un diff/patch pour un
// gain de perf qui ne serait pas perceptible ici.
export class OverlayHistory<T> {
  private entries: T[] = [];
  private cursor = -1;

  reset(initial: T): void {
    this.entries = [initial];
    this.cursor = 0;
  }

  // Tronque tout "futur" (rétablissements possibles) au-delà du curseur
  // avant d'empiler : une nouvelle action après une annulation invalide les
  // rétablissements qui suivaient l'état annulé.
  push(snapshot: T): void {
    this.entries = this.entries.slice(0, this.cursor + 1);
    this.entries.push(snapshot);
    if (this.entries.length > OVERLAY_HISTORY_LIMIT) this.entries.shift();
    this.cursor = this.entries.length - 1;
  }

  canUndo(): boolean {
    return this.cursor > 0;
  }

  canRedo(): boolean {
    return this.cursor < this.entries.length - 1;
  }

  undo(): T | null {
    if (!this.canUndo()) return null;
    this.cursor -= 1;
    return this.entries[this.cursor];
  }

  redo(): T | null {
    if (!this.canRedo()) return null;
    this.cursor += 1;
    return this.entries[this.cursor];
  }
}
