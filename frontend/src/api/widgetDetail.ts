import { apiGet, apiPut } from "./client";
import type { Platform } from "../lib/platformEvents";

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

export interface WidgetDetail {
  html: string;
  css: string;
  js: string;
  fields: FieldDefinitions;
  fieldsSource: string;
  dataSource: string;
  platform: Platform;
  widgetId: string;
  widgetMeta: {
    name: string;
    description: string;
    icon: string;
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
