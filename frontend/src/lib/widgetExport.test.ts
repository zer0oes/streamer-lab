import { describe, expect, it } from "vitest";
import { buildAlertboxExport, buildPlatformExport, slugifyWidgetName, toStreamElementsFields, toStreamlabsFields } from "./widgetExport";
import { normalizeAlertboxConfig } from "./alertbox";
import { createZip } from "./zip";
import type { FieldDefinitions } from "../api/widgetDetail";

const definitions: FieldDefinitions = {
  title: { type: "text", label: "Titre", value: "Défaut" },
  font: { type: "googleFont", label: "Police", value: "Poppins" },
  speed: { type: "slider", label: "Vitesse", value: 2, step: 1 }
};

describe("toStreamElementsFields / toStreamlabsFields", () => {
  it("convertit automatiquement les Fields pour chaque plateforme", () => {
    const streamlabs = toStreamlabsFields(definitions, { title: "Nova" });
    expect(streamlabs.title.type).toBe("textfield");
    expect(streamlabs.title.value).toBe("Nova");
    expect(streamlabs.font.type).toBe("fontpicker");
    expect(streamlabs.speed.steps).toBe(1);

    const streamElements = toStreamElementsFields(streamlabs, { title: "Nova SE" });
    expect(streamElements.title.type).toBe("text");
    expect(streamElements.title.value).toBe("Nova SE");
    expect(streamElements.font.type).toBe("googleFont");
    expect(streamElements.speed.step).toBe(1);
  });
});

describe("buildPlatformExport", () => {
  it("ajoute un pont lorsqu'un widget StreamElements est exporté vers Streamlabs", () => {
    const result = buildPlatformExport(
      {
        html: "<div></div>",
        css: "body {}",
        js: "window.addEventListener('onWidgetLoad', () => {});",
        fields: definitions
      },
      {},
      "streamlabs"
    );

    expect(result.bridgeInjected).toBe(true);
    expect(result.files["widget.js"]).toMatch(/pont automatique StreamElements → Streamlabs/);
    expect(result.files["widget.js"]).toMatch(/document\.addEventListener\("onLoad"/);
    expect(JSON.parse(result.files["fields.json"]).title.type).toBe("textfield");
    expect(() => new Function(result.files["widget.js"])).not.toThrow();
  });

  it("ajoute le pont inverse pour un widget Streamlabs exporté vers StreamElements", () => {
    const result = buildPlatformExport(
      {
        html: "<div></div>",
        css: "body {}",
        js: "document.addEventListener('onLoad', event => console.log(event.detail.custom_json));",
        fields: toStreamlabsFields(definitions, {})
      },
      {},
      "streamelements"
    );

    expect(result.bridgeInjected).toBe(true);
    expect(result.files["widget.js"]).toMatch(/pont automatique Streamlabs → StreamElements/);
    expect(() => new Function(result.files["widget.js"])).not.toThrow();
  });
});

describe("createZip", () => {
  it("produit une archive ZIP contenant les cinq fichiers d'export", () => {
    const zip = createZip({
      "widget.html": "<div></div>\n",
      "widget.css": "body {}\n",
      "widget.js": "// js\n",
      "fields.json": "{}\n",
      "README.txt": "Export\n"
    });
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    const text = new TextDecoder().decode(zip);

    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    for (const filename of ["widget.html", "widget.css", "widget.js", "fields.json", "README.txt"]) {
      expect(text).toMatch(new RegExp(filename.replace(".", "\\.")));
    }
  });
});

describe("slugifyWidgetName", () => {
  it("normalise les accents et espaces en tirets", () => {
    expect(slugifyWidgetName("Étoile Filante !")).toBe("etoile-filante");
  });

  it("retombe sur un nom par défaut si le résultat est vide", () => {
    expect(slugifyWidgetName("!!!")).toBe("custom-widget");
  });
});

describe("buildAlertboxExport", () => {
  const code = (title: string) => ({
    html: `<div>${title} {{name}}</div>`,
    css: "div{}",
    js: "console.log(1)",
    fields: { alert_title: { type: "textfield", value: "Défaut" } } as FieldDefinitions,
    values: { alert_title: title }
  });
  const codes = { follow: code("Fol_|low"), tip: code("Merci"), resub: code("Re_|Sub"), raid: code("Raid") };
  const config = normalizeAlertboxConfig({
    alerts: { follow: { sound: "/library-media/ding.mp3", volume: 0.3, duration: 6 }, raid: { enabled: false } }
  });

  it("crée un dossier par alerte activée, avec SON code et SES valeurs de champs", () => {
    const { files } = buildAlertboxExport(codes, config);
    expect(files["follow/widget.html"]).toBe("<div>Fol_|low {{name}}</div>\n");
    expect(files["tip/widget.html"]).toBe("<div>Merci {{name}}</div>\n");
    expect(files["raid/widget.html"]).toBeUndefined();
    // Alerte activée mais sans code : pas de dossier
    expect(files["cheer/widget.html"]).toBeUndefined();
    expect(JSON.parse(files["tip/fields.json"]).alert_title).toMatchObject({ type: "text", value: "Merci" });
  });

  it("liste dans le README les réglages natifs et les variations à créer", () => {
    const readme = buildAlertboxExport(codes, config).files["README.txt"];
    expect(readme).toContain("follow/ → Follower alert");
    expect(readme).toContain("resub/ → Resub (variation de la Subscriber alert, condition : 2 mois cumulés ou plus)");
    expect(readme).toContain("Son : ding.mp3 (fichier local du labo : à téléverser dans StreamElements)");
    expect(readme).toContain("Volume : 30 %");
    expect(readme).toContain("Durée : 6 s");
    expect(readme).toContain("Désactivées (à laisser décochées) : Raid alert");
  });
});

describe("buildAlertboxExport · Streamlabs", () => {
  const code = {
    html: "<div>{name}</div>",
    css: "div{}",
    js: "console.log(1)",
    fields: { alert_title: { type: "text", value: "Défaut" }, title_font: { type: "googleFont", value: "Bungee" } } as FieldDefinitions,
    values: { alert_title: "Bi_|ts" }
  };
  const config = normalizeAlertboxConfig({ alerts: { charity: { enabled: false } } }, "streamlabs");

  it("exporte les alertes Streamlabs avec des champs au format Streamlabs", () => {
    const exported = buildAlertboxExport({ bits: code, giftsub: code }, config, "streamlabs");
    expect(exported.platformName).toBe("Alert Box Streamlabs");
    expect(exported.files["bits/widget.html"]).toBe("<div>{name}</div>\n");
    const fields = JSON.parse(exported.files["bits/fields.json"]);
    expect(fields.alert_title).toMatchObject({ type: "textfield", value: "Bi_|ts" });
    expect(fields.title_font.type).toBe("fontpicker");
  });

  it("donne les instructions de l'Alert Box Streamlabs", () => {
    const readme = buildAlertboxExport({ bits: code }, config, "streamlabs").files["README.txt"];
    expect(readme).toContain("Enable Custom HTML/CSS");
    expect(readme).toContain("Custom Fields");
    expect(readme).toContain("bits/ → Bits");
    expect(readme).not.toContain("variation de la Subscriber alert");
    expect(readme).toContain("Désactivées (à laisser décochées) : Charity");
  });
});
