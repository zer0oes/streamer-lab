import { apiDelete, apiGet, apiPost, apiPut } from "./client";
import type { LibraryEntry } from "./types";

export interface WidgetMetadataInput {
  name: string;
  description: string;
  icon: string;
  type: "widget" | "alert";
  width: number;
  height: number;
}

export function listWidgets(): Promise<LibraryEntry[]> {
  return apiGet<{ widgets: LibraryEntry[]; defaultWidgetId: string }>("/api/widgets").then((body) => body.widgets);
}

export function createWidget(input: WidgetMetadataInput, projectId: string): Promise<LibraryEntry> {
  return apiPost<{ widget: LibraryEntry }>("/api/widgets", { ...input, projectId }).then((body) => body.widget);
}

export function updateWidgetMetadata(widgetId: string, input: WidgetMetadataInput): Promise<LibraryEntry> {
  return apiPut<{ widget: LibraryEntry }>("/api/widget/metadata", { widgetId, ...input }).then((body) => body.widget);
}

export function deleteWidget(widgetId: string): Promise<void> {
  return apiDelete(`/api/widget?id=${encodeURIComponent(widgetId)}`);
}

export function moveWidgetToProject(widgetId: string, projectId: string): Promise<LibraryEntry> {
  return apiPut<{ widget: LibraryEntry }>("/api/widget/project", { widgetId, projectId }).then((body) => body.widget);
}
