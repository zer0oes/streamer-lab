import { apiGet, apiPut } from "./client";
import type { Platform } from "../lib/platformEvents";
import type { AlertboxAlertType } from "../lib/alertbox";

export interface FieldDefinition {
  type: string;
  label?: string;
  value?: unknown;
  group?: string;
  options?: Record<string, string>;
  min?: number;
  max?: number;
  step?: number;
  steps?: number;
  [key: string]: unknown;
}

export type FieldDefinitions = Record<string, FieldDefinition>;

export type EditorFileKey = "html" | "css" | "js" | "fields" | "data";

// Code custom CSS d'une alerte d'AlertBox (sous-dossier <type>/ du widget)
export interface AlertboxTypeCode {
  html: string;
  css: string;
  js: string;
  fields: FieldDefinitions;
  fieldsSource: string;
  dataSource: string;
  files: Record<EditorFileKey, string>;
}

export interface WidgetDetail {
  html: string;
  css: string;
  js: string;
  fields: FieldDefinitions;
  fieldsSource: string;
  dataSource: string;
  // Réglages natifs par alerte (alertbox.json), uniquement pour kind "alertbox"
  alertbox: unknown | null;
  // Code de chaque alerte (même ordre que l'AlertBox), kind "alertbox" seulement
  alertboxCode: Record<AlertboxAlertType, AlertboxTypeCode> | null;
  platform: Platform;
  widgetId: string;
  widgetMeta: {
    name: string;
    description: string;
    icon: string;
    // "alertbox" : custom CSS d'AlertBox StreamElements (plateforme imposée)
    kind: "alertbox" | "custom";
    archived: boolean;
    width: number;
    height: number;
    projectId?: string;
  };
  files: Record<EditorFileKey, string>;
}

export function getWidgetDetail(widgetId: string, platform: Platform): Promise<WidgetDetail> {
  return apiGet(`/api/widget?id=${encodeURIComponent(widgetId)}&platform=${platform}`);
}

export function saveWidgetFile(widgetId: string, file: string, content: string): Promise<{ saved: boolean; at: number }> {
  return apiPut("/api/widget/file", { widgetId, file, content });
}
