import { describe, expect, it } from "vitest";
import { buildPlatformExport, slugifyWidgetName, toStreamElementsFields, toStreamlabsFields } from "./widgetExport";
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
