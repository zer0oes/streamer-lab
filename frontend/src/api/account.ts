import { apiDelete, apiGet, apiPost } from "./client";

export type Provider = "streamelements" | "streamlabs";

export interface CurrentUser {
  id: string;
  twitchLogin: string;
  displayName: string;
  avatarUrl: string | null;
  lastLoginAt: number;
}

export interface Integration {
  provider: Provider;
  channelId: string | null;
  channelName: string | null;
  tokenType: string | null;
  connectedAt: number;
  lastVerifiedAt: number | null;
}

export interface EnvDefaults {
  streamelements: { channelId: string | null; tokenType: string; hasToken: boolean };
  streamlabs: { hasToken: boolean };
}

export interface EnvDefaultReveal {
  channelId?: string | null;
  channelName?: string | null;
  tokenType?: string;
  token: string;
}

export function getCurrentUser(): Promise<{ authenticated: boolean; user?: CurrentUser }> {
  return apiGet("/api/auth/me");
}

export function logout(): Promise<void> {
  return apiPost("/api/auth/logout", {});
}

export function listIntegrations(): Promise<Integration[]> {
  return apiGet<{ integrations: Integration[] }>("/api/integrations").then((body) => body.integrations);
}

export interface ManualTokenInput {
  token: string;
  tokenType?: "jwt" | "apikey" | "oauth2";
  channelId?: string;
  channelName?: string;
}

export function connectManualToken(provider: Provider, input: ManualTokenInput): Promise<Integration> {
  return apiPost<{ integration: Integration }>(`/api/integrations/${provider}`, input).then((body) => body.integration);
}

export function disconnectIntegration(provider: Provider): Promise<void> {
  return apiDelete(`/api/integration?provider=${provider}`);
}

export function getEnvDefaults(): Promise<EnvDefaults> {
  return apiGet("/api/integrations/env-defaults");
}

export function revealEnvDefault(provider: Provider): Promise<EnvDefaultReveal> {
  return apiGet(`/api/integrations/env-defaults/reveal?provider=${provider}`);
}
