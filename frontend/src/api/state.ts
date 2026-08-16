import { apiGet } from "./client";

export interface AppState {
  session: Record<string, unknown>;
  channel: { id: string; username: string };
  live: { streamelements: boolean; streamlabs: boolean };
}

export function getAppState(): Promise<AppState> {
  return apiGet("/api/state");
}
