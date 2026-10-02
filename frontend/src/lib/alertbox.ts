// AlertBox StreamElements (« custom CSS ») : réglages natifs par alerte
// (alertbox.json) et accès typé à la simulation alertboxRuntime.js — injectée
// telle quelle dans l'aperçu, cf. widgetSrcdoc.ts.
import runtimeSource from "./alertboxRuntime.js?raw";

export type AlertboxAlertType = "follow" | "sub" | "resub" | "gift" | "community" | "cheer" | "tip" | "raid" | "purchase" | "charity";

export interface AlertboxAlertSettings {
  enabled: boolean;
  sound: string;
  // 0 à 1, comme {{audioVolume}}
  volume: number;
  // secondes, comme {{widgetDuration}}
  duration: number;
}

export interface AlertboxConfig {
  alerts: Record<AlertboxAlertType, AlertboxAlertSettings>;
}

// Libellés repris de l'AlertBox StreamElements (Follower alert, Subscriber
// alert…) ; resub, gift et community y sont des variations de la Subscriber
// alert, chacune avec son propre code.
export const ALERTBOX_ALERTS: { type: AlertboxAlertType; label: string; icon: string; hint?: string }[] = [
  { type: "follow", label: "Follower alert", icon: "favorite" },
  { type: "sub", label: "Subscriber alert", icon: "star_shine" },
  { type: "resub", label: "Resub", icon: "star_shine", hint: "Variation de la Subscriber alert" },
  { type: "gift", label: "Sub offert", icon: "redeem", hint: "Variation de la Subscriber alert" },
  { type: "community", label: "Community gift", icon: "featured_seasonal_and_gifts", hint: "Variation de la Subscriber alert" },
  { type: "cheer", label: "Cheer alert", icon: "diamond_shine" },
  { type: "tip", label: "Tip alert", icon: "money_bag" },
  { type: "raid", label: "Raid alert", icon: "bolt" },
  { type: "purchase", label: "Purchase alert", icon: "shopping_bag" },
  { type: "charity", label: "Charity campaign donation alert", icon: "volunteer_activism" }
];

// Code d'une alerte tel que l'hôte le reçoit : champs déjà remplacés, et
// valeurs envoyées dans onWidgetLoad.
export interface AlertboxHostCode {
  html: string;
  css: string;
  js: string;
  fieldData: Record<string, unknown>;
}

export interface AlertboxRuntime {
  ALERT_TYPES: AlertboxAlertType[];
  normalizeConfig(raw: unknown): AlertboxConfig;
  escapeHtml(value: unknown): string;
  detectAlertType(listener: string, event: Record<string, unknown> | null): AlertboxAlertType | null;
  buildAlertVariables(
    type: AlertboxAlertType,
    event: Record<string, unknown>,
    settings: AlertboxAlertSettings,
    currency?: { symbol?: string }
  ): Record<string, string>;
  substituteAlertVariables(source: string, vars: Record<string, string>): string;
  buildAlertDocument(code: { html: string; css: string; js: string }, vars: Record<string, string>, loadDetail: Record<string, unknown>): string;
  createHost(options: {
    codes: Partial<Record<AlertboxAlertType, AlertboxHostCode>>;
    config: unknown;
    stage: HTMLElement;
    window?: Window;
    log?: (level: "info" | "warn", message: string) => void;
    playSound?: (settings: AlertboxAlertSettings, type: AlertboxAlertType) => void;
  }): { handleEvent(detail: unknown): void; config: AlertboxConfig };
}

// Source à injecter dans un <script> : on neutralise par sécurité toute
// fermeture de balise (le fichier n'en contient pas, cf. son en-tête).
export const ALERTBOX_RUNTIME_SOURCE: string = runtimeSource.replace(/<\/script/gi, "<\\/script");

let runtime: AlertboxRuntime | null = null;

// Même code que celui exécuté dans l'aperçu, évalué ici pour le panneau de
// réglages et les tests.
export function loadAlertboxRuntime(): AlertboxRuntime {
  if (!runtime) runtime = new Function(`${runtimeSource}\nreturn AlertboxRuntime;`)() as AlertboxRuntime;
  return runtime;
}

export function normalizeAlertboxConfig(raw: unknown): AlertboxConfig {
  return loadAlertboxRuntime().normalizeConfig(raw);
}
