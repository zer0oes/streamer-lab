import { describe, expect, it } from "vitest";
import { filterBySearch, paginate, sortEntries } from "./libraryFilter";

describe("filterBySearch", () => {
  const entries = [
    { name: "Goal Bar", description: "Barre d'objectif" },
    { name: "Neon Chat", description: "Widget de chat" },
    { name: "Alerts", description: "Follow / Sub / Cheer" }
  ];

  it("renvoie tout si le terme est vide", () => {
    expect(filterBySearch(entries, "")).toHaveLength(3);
    expect(filterBySearch(entries, "   ")).toHaveLength(3);
  });

  it("filtre sur le nom, insensible à la casse", () => {
    expect(filterBySearch(entries, "goal").map((e) => e.name)).toEqual(["Goal Bar"]);
    expect(filterBySearch(entries, "GOAL").map((e) => e.name)).toEqual(["Goal Bar"]);
  });

  it("filtre aussi sur la description", () => {
    expect(filterBySearch(entries, "chat").map((e) => e.name)).toEqual(["Neon Chat"]);
    expect(filterBySearch(entries, "follow").map((e) => e.name)).toEqual(["Alerts"]);
  });

  it("ne casse pas sur une description absente", () => {
    expect(filterBySearch([{ name: "Sans description" }], "sans")).toHaveLength(1);
  });
});

describe("sortEntries", () => {
  const entries = [
    { name: "Bravo", updatedAt: 200, createdAt: 20 },
    { name: "alpha", updatedAt: 100, createdAt: 30 },
    { name: "Charlie", updatedAt: 300, createdAt: 10 }
  ];

  it("trie par nom (A→Z), insensible à la casse via localeCompare fr", () => {
    expect(sortEntries(entries, "name-asc").map((e) => e.name)).toEqual(["alpha", "Bravo", "Charlie"]);
  });

  it("trie par nom (Z→A)", () => {
    expect(sortEntries(entries, "name-desc").map((e) => e.name)).toEqual(["Charlie", "Bravo", "alpha"]);
  });

  it("trie par date de modification récente d'abord", () => {
    expect(sortEntries(entries, "updated-desc").map((e) => e.name)).toEqual(["Charlie", "Bravo", "alpha"]);
  });

  it("trie par date de création ancienne d'abord", () => {
    expect(sortEntries(entries, "created-asc").map((e) => e.name)).toEqual(["Charlie", "Bravo", "alpha"]);
  });

  it("traite les dates nulles comme 0 (les plus anciennes)", () => {
    const withNulls = [
      { name: "A", updatedAt: null, createdAt: null },
      { name: "B", updatedAt: 50, createdAt: 50 }
    ];
    expect(sortEntries(withNulls, "updated-desc").map((e) => e.name)).toEqual(["B", "A"]);
  });

  it("ne mute pas le tableau d'origine", () => {
    const original = [...entries];
    sortEntries(entries, "name-asc");
    expect(entries).toEqual(original);
  });
});

describe("paginate", () => {
  const entries = Array.from({ length: 7 }, (_, i) => i);

  it("découpe selon la taille de page demandée", () => {
    expect(paginate(entries, 0, 3)).toEqual({ pageEntries: [0, 1, 2], pageCount: 3, page: 0 });
    expect(paginate(entries, 1, 3)).toEqual({ pageEntries: [3, 4, 5], pageCount: 3, page: 1 });
    expect(paginate(entries, 2, 3)).toEqual({ pageEntries: [6], pageCount: 3, page: 2 });
  });

  it("recale une page hors bornes (trop grande) sur la dernière page valide", () => {
    expect(paginate(entries, 99, 3)).toEqual({ pageEntries: [6], pageCount: 3, page: 2 });
  });

  it("recale une page négative sur 0", () => {
    expect(paginate(entries, -5, 3)).toEqual({ pageEntries: [0, 1, 2], pageCount: 3, page: 0 });
  });

  it("pageCount vaut toujours au moins 1, même pour une liste vide", () => {
    expect(paginate([], 0, 5)).toEqual({ pageEntries: [], pageCount: 1, page: 0 });
  });
});
