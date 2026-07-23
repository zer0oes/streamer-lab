import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPlatformExport,
  createZip,
  toStreamElementsFields,
  toStreamlabsFields
} from "../public/widget-export.js";

const definitions = {
  title: { type: "text", label: "Titre", value: "Défaut" },
  font: { type: "googleFont", label: "Police", value: "Poppins" },
  speed: { type: "slider", label: "Vitesse", value: 2, step: 1 }
};

test("convertit automatiquement les Fields pour chaque plateforme", () => {
  const streamlabs = toStreamlabsFields(definitions, { title: "Nova" });
  assert.equal(streamlabs.title.type, "textfield");
  assert.equal(streamlabs.title.value, "Nova");
  assert.equal(streamlabs.font.type, "fontpicker");
  assert.equal(streamlabs.speed.steps, 1);

  const streamElements = toStreamElementsFields(streamlabs, { title: "Nova SE" });
  assert.equal(streamElements.title.type, "text");
  assert.equal(streamElements.title.value, "Nova SE");
  assert.equal(streamElements.font.type, "googleFont");
  assert.equal(streamElements.speed.step, 1);
});

test("ajoute un pont lorsqu’un widget StreamElements est exporté vers Streamlabs", () => {
  const result = buildPlatformExport({
    html: "<div></div>",
    css: "body {}",
    js: "window.addEventListener('onWidgetLoad', () => {});",
    fields: definitions
  }, {}, "streamlabs");

  assert.equal(result.bridgeInjected, true);
  assert.match(result.files["widget.js"], /pont automatique StreamElements → Streamlabs/);
  assert.match(result.files["widget.js"], /document\.addEventListener\("onLoad"/);
  assert.equal(JSON.parse(result.files["fields.json"]).title.type, "textfield");
  assert.doesNotThrow(() => new Function(result.files["widget.js"]));
});

test("ajoute le pont inverse pour un widget Streamlabs exporté vers StreamElements", () => {
  const result = buildPlatformExport({
    html: "<div></div>",
    css: "body {}",
    js: "document.addEventListener('onLoad', event => console.log(event.detail.custom_json));",
    fields: toStreamlabsFields(definitions, {})
  }, {}, "streamelements");

  assert.equal(result.bridgeInjected, true);
  assert.match(result.files["widget.js"], /pont automatique Streamlabs → StreamElements/);
  assert.doesNotThrow(() => new Function(result.files["widget.js"]));
});

test("produit une archive ZIP contenant les cinq fichiers d’export", () => {
  const zip = createZip({
    "widget.html": "<div></div>\n",
    "widget.css": "body {}\n",
    "widget.js": "// js\n",
    "fields.json": "{}\n",
    "README.txt": "Export\n"
  });
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const text = new TextDecoder().decode(zip);

  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(zip.length - 22, true), 0x06054b50);
  for (const filename of ["widget.html", "widget.css", "widget.js", "fields.json", "README.txt"]) {
    assert.match(text, new RegExp(filename.replace(".", "\\.")));
  }
});
