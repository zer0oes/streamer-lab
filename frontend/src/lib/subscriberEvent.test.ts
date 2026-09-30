import { describe, expect, it } from "vitest";
import { applySubscriberFields, subscriberAmountLabel, subscriberNameLabel } from "./subscriberEvent";

function form(subType: string, amount = "", sender = "") {
  return { subType, amount, sender };
}

describe("applySubscriberFields", () => {
  it("sends cumulated months for a regular sub, 1 when empty", () => {
    const event: Record<string, unknown> = {};
    applySubscriberFields(event, "runbann", form("tier1", "47"));
    expect(event).toMatchObject({ amount: 47, gifted: false, bulkGifted: false, tier: "1000" });

    const empty: Record<string, unknown> = {};
    applySubscriberFields(empty, "runbann", form("prime"));
    expect(empty).toMatchObject({ amount: 1, tier: "prime" });
  });

  it("adds a sender distinct from the recipient for a Sub-Gift", () => {
    const event: Record<string, unknown> = {};
    applySubscriberFields(event, "Destinataire", form("gift", "", "GenerousGuy"));
    expect(event).toMatchObject({ sender: "GenerousGuy", amount: 1, gifted: true, bulkGifted: false });

    const random: Record<string, unknown> = {};
    applySubscriberFields(random, "Destinataire", form("gift"));
    expect(random.sender).toBeTruthy();
    expect(random.sender).not.toBe("Destinataire");
  });

  it("uses the gifter as sender and the typed count for a Community Gift", () => {
    const event: Record<string, unknown> = {};
    applySubscriberFields(event, "GenerousGuy", form("communitygift", "5"));
    expect(event).toMatchObject({ sender: "GenerousGuy", amount: 5, gifted: true, bulkGifted: true });
  });

  it("fills a random count (>1) back into the form when empty", () => {
    const f = form("communitygift");
    const event: Record<string, unknown> = {};
    applySubscriberFields(event, "GenerousGuy", f);
    expect(event.amount).toBeGreaterThan(1);
    expect(f.amount).toBe(String(event.amount));
  });
});

describe("subscriber labels", () => {
  it("names the person field and the count field by sub type", () => {
    expect(subscriberNameLabel("gift")).toBe("Destinataire");
    expect(subscriberNameLabel("communitygift")).toBe("Gifteur");
    expect(subscriberNameLabel("tier1")).toBe("Pseudo");
    expect(subscriberAmountLabel("gift")).toBeNull();
    expect(subscriberAmountLabel("communitygift")).toBe("Nombre de subs offerts");
    expect(subscriberAmountLabel("prime")).toBe("Mois cumulés");
  });
});

describe("numeric form values", () => {
  it("accepts the number that v-model gives for <input type=number>", () => {
    const event: Record<string, unknown> = {};
    applySubscriberFields(event, "GenerousGuy", { subType: "communitygift", amount: 5, sender: "" });
    expect(event.amount).toBe(5);
  });
});
