import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiDelete, apiGet, apiPost } from "./client";

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body)
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiGet/apiPost/apiDelete", () => {
  it("renvoie le corps JSON parsé quand la réponse est OK", async () => {
    mockFetchOnce(200, { projects: [{ id: "principal" }] });
    const body = await apiGet<{ projects: { id: string }[] }>("/api/projects");
    expect(body.projects).toEqual([{ id: "principal" }]);
  });

  it("lève une ApiError avec le message serveur quand la réponse n'est pas OK", async () => {
    mockFetchOnce(404, { error: "Projet introuvable" });
    await expect(apiGet("/api/project?id=inconnu")).rejects.toMatchObject({
      name: "ApiError",
      message: "Projet introuvable",
      status: 404
    });
  });

  it("retombe sur un message générique si le corps d'erreur n'a pas de champ error", async () => {
    mockFetchOnce(500, {});
    await expect(apiPost("/api/projects", { name: "x" })).rejects.toThrow("Erreur HTTP 500");
  });

  it("ne lève pas si le corps n'est pas un JSON valide mais que la réponse est OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.reject(new Error("no body"))
      })
    );
    await expect(apiDelete("/api/project?id=x")).resolves.toEqual({});
  });

  it("ApiError expose bien .status pour un traitement différencié par code", async () => {
    mockFetchOnce(409, { error: "Conflit" });
    try {
      await apiGet("/api/overlay/source");
      throw new Error("aurait dû lever");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(409);
    }
  });
});
