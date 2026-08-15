// Point d'entrée unique vers l'API du serveur Node existant (server.mjs),
// inchangée par cette réécriture. Reproduit le comportement de
// `fetchAccountJson` (public/app.js) : parse le JSON, lève une Error
// (avec `.status`) si la réponse n'est pas OK.

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await parseJsonBody(response);
  if (!response.ok) {
    const message = (body as { error?: string })?.error || `Erreur HTTP ${response.status}`;
    throw new ApiError(message, response.status);
  }
  return body as T;
}

export function apiGet<T>(url: string): Promise<T> {
  return apiFetch<T>(url);
}

export function apiPost<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function apiPut<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function apiDelete<T>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: "DELETE" });
}

// Corps brut (pas de JSON.stringify) : sert à l'upload de fichiers, où le
// serveur lit le corps de la requête directement comme octets du fichier
// (cf. POST /api/media dans server.mjs), Content-Type = celui du fichier.
export function apiPostFile<T>(url: string, file: File): Promise<T> {
  return apiFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file
  });
}
