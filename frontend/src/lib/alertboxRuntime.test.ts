import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadAlertboxRuntime, type AlertboxAlertSettings } from "./alertbox";

const runtime = loadAlertboxRuntime();
const settings: AlertboxAlertSettings = { enabled: true, sound: "/library-media/ding.mp3", volume: 0.4, duration: 6 };

describe("normalizeConfig", () => {
  it("complète tous les types avec les valeurs par défaut", () => {
    const config = runtime.normalizeConfig({});
    expect(Object.keys(config.alerts)).toEqual(["follow", "sub", "resub", "gift", "community", "cheer", "tip", "raid", "purchase", "charity"]);
    expect(config.alerts.tip).toEqual({ enabled: true, sound: "", volume: 0.5, duration: 8 });
  });

  it("borne volume et durée, et garde un volume à 0", () => {
    const config = runtime.normalizeConfig({ alerts: { raid: { enabled: false, volume: 3, duration: 500 }, tip: { volume: 0, duration: -2 } } });
    expect(config.alerts.raid).toEqual({ enabled: false, sound: "", volume: 1, duration: 90 });
    expect(config.alerts.tip.volume).toBe(0);
    expect(config.alerts.tip.duration).toBe(8);
  });
});

describe("detectAlertType", () => {
  it("reconnaît les listeners StreamElements", () => {
    expect(runtime.detectAlertType("follower-latest", { name: "a" })).toBe("follow");
    expect(runtime.detectAlertType("tip-latest", { name: "a" })).toBe("tip");
    expect(runtime.detectAlertType("cheer-latest", { name: "a" })).toBe("cheer");
    expect(runtime.detectAlertType("raid-latest", { name: "a" })).toBe("raid");
    expect(runtime.detectAlertType("message", { data: {} })).toBeNull();
  });

  it("reconnaît les achats et les dons caritatifs (avant les tips)", () => {
    expect(runtime.detectAlertType("purchase-latest", { name: "a", amount: 25 })).toBe("purchase");
    expect(runtime.detectAlertType("merch-latest", { name: "a", amount: 25 })).toBe("purchase");
    expect(runtime.detectAlertType("charityCampaignDonation-latest", { name: "a", amount: 10 })).toBe("charity");
  });

  it("distingue sub, resub, sub offert et community gift, sans les destinataires d'un community gift", () => {
    expect(runtime.detectAlertType("subscriber-latest", { name: "a", amount: 1 })).toBe("sub");
    expect(runtime.detectAlertType("subscriber-latest", { name: "a", amount: 3 })).toBe("resub");
    expect(runtime.detectAlertType("subscriber-latest", { name: "a", gifted: true, sender: "b" })).toBe("gift");
    expect(runtime.detectAlertType("subscriber-latest", { name: "b", gifted: true, bulkGifted: true, amount: 5 })).toBe("community");
    expect(runtime.detectAlertType("subscriber-latest", { name: "c", gifted: true, isCommunityGift: true })).toBeNull();
  });
});

describe("buildAlertVariables", () => {
  it("expose les variables AlertBox, échappées", () => {
    const vars = runtime.buildAlertVariables("tip", { name: "<b>Nova</b>", amount: 12.5, message: "Merci & bravo" }, settings, { symbol: "€" });
    expect(vars.name).toBe("&lt;b&gt;Nova&lt;/b&gt;");
    expect(vars.amount).toBe("12.5");
    expect(vars.message).toBe("Merci &amp; bravo");
    expect(vars.currency).toBe("€");
    expect(vars.widgetDuration).toBe("6");
    expect(vars.audio).toBe("/library-media/ding.mp3");
    expect(vars.audioVolume).toBe("0.4");
  });

  it("adapte name/sender/amount selon le type", () => {
    expect(runtime.buildAlertVariables("raid", { name: "r", viewers: 42 }, settings).amount).toBe("42");
    const gift = runtime.buildAlertVariables("gift", { name: "Destinataire", sender: "Gifteur", amount: 7 }, settings);
    expect([gift.name, gift.sender, gift.amount]).toEqual(["Destinataire", "Gifteur", "1"]);
    const community = runtime.buildAlertVariables("community", { name: "Gifteur", sender: "Gifteur", amount: 10 }, settings);
    expect([community.name, community.amount]).toEqual(["Gifteur", "10"]);
    const purchase = runtime.buildAlertVariables(
      "purchase",
      { name: "p", amount: 40, items: [{ name: "Mug", quantity: 2 }, { name: "T-shirt <XL>", quantity: 1 }] },
      settings
    );
    expect(purchase.items).toBe("2× Mug, T-shirt &lt;XL&gt;");
  });
});

describe("substituteAlertVariables", () => {
  it("remplace {{variable}} et {variable}, et laisse les inconnues", () => {
    const out = runtime.substituteAlertVariables("{{ name }} / {amount} / {{inconnue}} / {autre}", { name: "Nova", amount: "3" });
    expect(out).toBe("Nova / 3 / {{inconnue}} / {autre}");
  });

  it("ne réinterprète pas les $ d'une valeur", () => {
    expect(runtime.substituteAlertVariables("{{name}}", { name: "$& $1" })).toBe("$& $1");
  });
});

describe("createHost", () => {
  let stage: HTMLElement;
  const played: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    played.length = 0;
    stage = document.createElement("div");
    document.body.append(stage);
  });

  afterEach(() => {
    vi.useRealTimers();
    stage.remove();
  });

  function startHost(config: unknown) {
    // Fenêtre isolée : chaque test a ses propres écouteurs onWidgetLoad/onEventReceived
    const target = new EventTarget();
    const fakeWindow = Object.assign(target, {
      document,
      parent: null,
      setTimeout: (fn: () => void, ms: number) => window.setTimeout(fn, ms)
    }) as unknown as Window;
    const host = runtime.createHost({
      codes: {
        follow: { html: '<p id="who">{{name}}</p>', css: "p{color:red}", js: "console.log('{{widgetDuration}}')", fieldData: { title: "Fol_|low" } },
        tip: { html: "<p>{{amount}} {{currency}}</p>", css: "", js: "", fieldData: { title: "Merci" } },
        raid: { html: "<p>raid</p>", css: "", js: "", fieldData: {} }
      },
      config,
      stage,
      window: fakeWindow,
      log: () => {},
      playSound: (alertSettings, type) => played.push(`${type}:${alertSettings.sound}:${alertSettings.volume}`)
    });
    target.dispatchEvent(new CustomEvent("onWidgetLoad", { detail: { fieldData: { ignore: true }, currency: { symbol: "€" } } }));
    return host;
  }

  it("affiche chaque alerte avec SON code et SES champs, joue son son, puis passe à la suivante", () => {
    const host = startHost({ alerts: { follow: { sound: "/s/follow.mp3", volume: 0.3, duration: 2 }, tip: { duration: 3 } } });
    host.handleEvent({ listener: "follower-latest", event: { name: "Nova", id: "1" } });
    host.handleEvent({ listener: "tip-latest", event: { name: "Lune", amount: 5, id: "2" } });

    const frames = stage.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    expect(frames[0].dataset.alertType).toBe("follow");
    expect(frames[0].srcdoc).toContain('<p id="who">Nova</p>');
    expect(frames[0].srcdoc).toContain("console.log('2')");
    expect(frames[0].srcdoc).toContain('"title":"Fol_|low"');
    expect(frames[0].srcdoc).not.toContain('"ignore"');
    expect(played).toEqual(["follow:/s/follow.mp3:0.3"]);

    vi.advanceTimersByTime(2000);
    expect(stage.querySelectorAll("iframe")).toHaveLength(0);
    vi.advanceTimersByTime(500);
    expect(stage.querySelector("iframe")?.dataset.alertType).toBe("tip");
    expect(stage.querySelector("iframe")?.srcdoc).toContain("<p>5 €</p>");
    expect(stage.querySelector("iframe")?.srcdoc).toContain('"title":"Merci"');
    expect(played).toHaveLength(2);
  });

  it("ignore les alertes désactivées et les doublons", () => {
    const host = startHost({ alerts: { raid: { enabled: false } } });
    host.handleEvent({ listener: "raid-latest", event: { name: "r", amount: 10 } });
    expect(stage.querySelector("iframe")).toBeNull();

    host.handleEvent({ listener: "follower-latest", event: { name: "a", id: "same" } });
    host.handleEvent({ listener: "follower-latest", event: { name: "a", id: "same" } });
    vi.advanceTimersByTime(8000 + 500);
    expect(stage.querySelector("iframe")).toBeNull();
    expect(played).toHaveLength(1);
  });

  it("passe à l'alerte suivante quand une alerte n'a pas de code", () => {
    const host = startHost({ alerts: { cheer: { duration: 2 } } });
    host.handleEvent({ listener: "cheer-latest", event: { name: "c", amount: 100, id: "c1" } });
    host.handleEvent({ listener: "raid-latest", event: { name: "r", amount: 10, id: "r1" } });
    vi.advanceTimersByTime(1);
    expect(stage.querySelector("iframe")?.dataset.alertType).toBe("raid");
  });
});

describe("Alert Box Streamlabs", () => {
  it("a ses propres types d'alerte", () => {
    expect(Object.keys(runtime.normalizeConfig({}, "streamlabs").alerts)).toEqual(["follow", "sub", "resub", "giftsub", "bits", "raid", "tip", "merch", "charity"]);
  });

  it("convertit les évènements vers les alertes Streamlabs", () => {
    expect(runtime.detectAlertType("cheer-latest", { name: "a", amount: 100 }, "streamlabs")).toBe("bits");
    expect(runtime.detectAlertType("", { type: "bits", name: "a", amount: 100 }, "streamlabs")).toBe("bits");
    expect(runtime.detectAlertType("", { type: "donation", name: "a", amount: 5 }, "streamlabs")).toBe("tip");
    expect(runtime.detectAlertType("", { type: "subscription", name: "a", amount: 6 }, "streamlabs")).toBe("resub");
    expect(runtime.detectAlertType("", { type: "subscription", name: "b", gifted: true, sender: "c", amount: 1 }, "streamlabs")).toBe("giftsub");
    expect(runtime.detectAlertType("", { type: "subscription", name: "c", gifted: true, bulkGifted: true, amount: 5 }, "streamlabs")).toBe("giftsub");
    expect(runtime.detectAlertType("", { type: "purchase", name: "a", amount: 20 }, "streamlabs")).toBe("merch");
    expect(runtime.detectAlertType("", { type: "charitycampaigndonation", name: "a", amount: 20 }, "streamlabs")).toBe("charity");
  });

  it("expose les variables Streamlabs", () => {
    const giftsub = runtime.buildAlertVariables("giftsub", { name: "Gifteur", sender: "Gifteur", bulkGifted: true, amount: 10 }, settings, undefined, "streamlabs");
    expect([giftsub.name, giftsub.count]).toEqual(["Gifteur", "10"]);
    const single = runtime.buildAlertVariables("giftsub", { name: "Destinataire", sender: "Gifteur", gifted: true, amount: 1 }, settings, undefined, "streamlabs");
    expect([single.name, single.count]).toEqual(["Gifteur", "1"]);
    expect(runtime.buildAlertVariables("raid", { name: "r", viewers: 42 }, settings, undefined, "streamlabs").count).toBe("42");
    expect(runtime.buildAlertVariables("tip", { name: "t", amount: 5, formattedAmount: "5.00 €" }, settings, undefined, "streamlabs").amount).toBe("5.00 €");
    expect(runtime.buildAlertVariables("tip", { name: "t", amount: 7.5 }, settings, { symbol: "€" }, "streamlabs").amount).toBe("7.50 €");
    const merch = runtime.buildAlertVariables("merch", { name: "m", items: [{ name: "Mug", quantity: 2 }] }, settings, undefined, "streamlabs");
    expect(merch.product).toBe("2× Mug");
    expect(merch.widgetDuration).toBeUndefined();
  });

  it("charge jQuery et n'envoie pas onWidgetLoad dans le document d'alerte", () => {
    const doc = runtime.buildAlertDocument({ html: "<p>{name}</p>", css: "", js: "" }, { name: "Nova" }, { fieldData: {} }, "streamlabs");
    expect(doc).toContain('<script src="/vendor/jquery.min.js">');
    expect(doc).toContain("<p>Nova</p>");
    expect(doc).not.toContain("onWidgetLoad");
    expect(runtime.buildAlertDocument({ html: "", css: "", js: "" }, {}, { fieldData: {} })).toContain("onWidgetLoad");
  });

  it("l'hôte reçoit les évènements Streamlabs à plat sur document", () => {
    vi.useFakeTimers();
    const stage = document.createElement("div");
    document.body.append(stage);
    const played: string[] = [];
    const target = new EventTarget();
    const docTarget = new EventTarget();
    const fakeWindow = Object.assign(target, {
      document: Object.assign(docTarget, { createElement: (tag: string) => document.createElement(tag) }),
      parent: null,
      setTimeout: (fn: () => void, ms: number) => window.setTimeout(fn, ms)
    }) as unknown as Window;
    runtime.createHost({
      codes: { bits: { html: "<b>{name} {amount}</b>", css: "", js: "", fieldData: {} } },
      config: { alerts: { bits: { sound: "/s/bits.mp3", duration: 3 } } },
      platform: "streamlabs",
      stage,
      window: fakeWindow,
      log: () => {},
      playSound: (alertSettings, type) => played.push(`${type}:${alertSettings.sound}`)
    });
    docTarget.dispatchEvent(new CustomEvent("onEventReceived", { detail: { type: "bits", name: "Nova", amount: 500, message: "" } }));
    const frame = stage.querySelector("iframe");
    expect(frame?.dataset.alertType).toBe("bits");
    expect(frame?.srcdoc).toContain("<b>Nova 500</b>");
    expect(played).toEqual(["bits:/s/bits.mp3"]);
    stage.remove();
    vi.useRealTimers();
  });
});
