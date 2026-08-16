// Devise fixe (pas de config currency exposée par /api/state) : reprise
// telle quelle à chaque endroit qui construit un detail onWidgetLoad.
export const DEFAULT_CURRENCY = { code: "EUR", name: "Euro", symbol: "€" };

export interface RecentEvent {
  type: string;
  [key: string]: unknown;
}

// Reconstruit une liste d'événements récents à partir des clés "-latest" de
// session.data (follower-latest, subscriber-latest...) : c'est la source de
// repli qu'utilisent la plupart des widgets custom StreamElements tant
// qu'ils n'ont pas encore reçu d'événement live — port de buildRecents
// (public/app.js).
export function buildRecents(data: Record<string, unknown>): RecentEvent[] {
  return Object.entries(data)
    .filter(([key]) => key.endsWith("-latest"))
    .map(([type, value]) => ({ type: type.replace("-latest", ""), ...(value as object) }))
    .slice(-25);
}
