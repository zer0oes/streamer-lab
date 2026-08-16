import { describe, expect, it } from "vitest";
import { buildRecents } from "./sessionState";

describe("buildRecents", () => {
  it("keeps only the -latest keys and strips the suffix from the type", () => {
    const recents = buildRecents({
      "follower-latest": { name: "Camille" },
      "follower-session": { count: 42 },
      "subscriber-latest": { name: "Alex", amount: 1 }
    });
    expect(recents).toEqual([
      { type: "follower", name: "Camille" },
      { type: "subscriber", name: "Alex", amount: 1 }
    ]);
  });

  it("returns an empty array when there are no -latest keys", () => {
    expect(buildRecents({ "follower-session": { count: 1 } })).toEqual([]);
  });

  it("keeps only the last 25 entries", () => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < 30; i += 1) data[`event${i}-latest`] = { name: `n${i}` };
    const recents = buildRecents(data);
    expect(recents).toHaveLength(25);
    expect(recents[0]).toEqual({ type: "event5", name: "n5" });
    expect(recents[24]).toEqual({ type: "event29", name: "n29" });
  });
});
