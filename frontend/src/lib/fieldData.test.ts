import { beforeEach, describe, expect, it } from "vitest";
import { fieldStorageKey, loadFieldData, normalizeFieldDefinitions } from "./fieldData";
import type { FieldDefinitions } from "../api/widgetDetail";

beforeEach(() => {
  localStorage.clear();
});

describe("normalizeFieldDefinitions", () => {
  it("laisse un objet déjà normalisé intact", () => {
    const defs = { title: { type: "text", value: "x" } } as FieldDefinitions;
    expect(normalizeFieldDefinitions(defs)).toBe(defs);
  });

  it("convertit un tableau (ancien format) en objet clé=name", () => {
    const defs = [{ name: "title", type: "text", value: "x" }];
    expect(normalizeFieldDefinitions(defs)).toEqual({ title: { name: "title", type: "text", value: "x" } });
  });
});

describe("fieldStorageKey", () => {
  it("est scopée par widget et plateforme", () => {
    expect(fieldStorageKey("goal-bar", "streamelements")).toBe("se-lab-fields-goal-bar-streamelements");
  });
});

describe("loadFieldData", () => {
  const definitions: FieldDefinitions = {
    title: { type: "text", value: "Défaut" },
    goal: { type: "number", value: 100, min: 0, max: 1000 },
    theme: { type: "dropdown", value: "dark", options: { dark: "Sombre", light: "Clair" } }
  };

  it("retombe sur les valeurs par défaut si rien n'est persisté", () => {
    expect(loadFieldData(definitions, "key")).toEqual({ title: "Défaut", goal: 100, theme: "dark" });
  });

  it("fusionne les valeurs persistées valides par-dessus les défauts", () => {
    localStorage.setItem("key", JSON.stringify({ title: "Perso", goal: 250 }));
    expect(loadFieldData(definitions, "key")).toEqual({ title: "Perso", goal: 250, theme: "dark" });
  });

  it("ignore une clé persistée qui n'existe plus dans le schéma", () => {
    localStorage.setItem("key", JSON.stringify({ removed: "x", title: "Perso" }));
    expect(loadFieldData(definitions, "key")).toEqual({ title: "Perso", goal: 100, theme: "dark" });
  });

  it("écarte une option dropdown persistée qui n'existe plus", () => {
    localStorage.setItem("key", JSON.stringify({ theme: "neon" }));
    expect(loadFieldData(definitions, "key").theme).toBe("dark");
  });

  it("clampe une valeur numérique persistée hors bornes", () => {
    localStorage.setItem("key", JSON.stringify({ goal: 99999 }));
    expect(loadFieldData(definitions, "key").goal).toBe(1000);
  });

  it("écarte une valeur numérique persistée non numérique", () => {
    localStorage.setItem("key", JSON.stringify({ goal: "pas-un-nombre" }));
    expect(loadFieldData(definitions, "key").goal).toBe(100);
  });

  it("retombe sur les défauts si le JSON persisté est invalide", () => {
    localStorage.setItem("key", "{invalide");
    expect(loadFieldData(definitions, "key")).toEqual({ title: "Défaut", goal: 100, theme: "dark" });
  });
});
