import { describe, expect, it } from "vitest";
import { PLATFORM_STREAMLABS, buildStreamlabsLoadDetail, normalizePlatform, toStreamlabsEvent } from "./platformEvents";

describe("normalizePlatform", () => {
  it("normalise la plateforme du sandbox", () => {
    expect(normalizePlatform("streamlabs")).toBe(PLATFORM_STREAMLABS);
    expect(normalizePlatform("inconnue")).toBe("streamelements");
  });
});

describe("buildStreamlabsLoadDetail", () => {
  it("construit custom_json pour onLoad Streamlabs", () => {
    const detail = buildStreamlabsLoadDetail(
      { title: { type: "text", label: "Titre", value: "Défaut" } },
      { title: "Personnalisé" },
      { total: 12 }
    );

    expect((detail.custom_json.title as { name: string }).name).toBe("title");
    expect((detail.custom_json.title as { value: unknown }).value).toBe("Personnalisé");
    expect(detail.fieldData.title).toBe("Personnalisé");
    expect(detail.session).toEqual({ total: 12 });
  });
});

describe("toStreamlabsEvent", () => {
  it("convertit un follow", () => {
    const follow = toStreamlabsEvent({ listener: "follower-latest", event: { name: "NovaViewer" } });
    expect(follow.type).toBe("follow");
    expect(follow.name).toBe("NovaViewer");
    expect(follow.platform).toBe("twitch_account");
  });

  it("convertit un tip en donation avec montant formaté", () => {
    const tip = toStreamlabsEvent({ listener: "tip-latest", event: { name: "NovaViewer", amount: 5, message: "Bravo" } });
    expect(tip.type).toBe("donation");
    expect(tip.formattedAmount).toBe("5.00 €");
    expect(tip.message).toBe("Bravo");
  });

  it("convertit un message de chat", () => {
    const chat = toStreamlabsEvent({ listener: "message", event: { data: { displayName: "NovaViewer", text: "Bonjour", badges: [] } } });
    expect(chat.type).toBe("message");
    expect(chat.name).toBe("NovaViewer");
    expect(chat.message).toBe("Bonjour");
    expect(chat.badges).toEqual([]);
  });
});
