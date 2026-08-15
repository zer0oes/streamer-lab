// Port verbatim de buildPlatformExport / toStreamElementsFields /
// toStreamlabsFields (public/widget-export.js, retiré à la bascule Phase 4) :
// convertit les Fields d'une plateforme à l'autre et construit les 5 fichiers
// exportés en ZIP (widget.html/css/js, fields.json, README.txt), avec un pont
// de compatibilité JS injecté automatiquement si le code n'utilise que les
// événements de l'autre plateforme.

import { PLATFORM_STREAM_ELEMENTS, PLATFORM_STREAMLABS, type Platform } from "./platformEvents";
import type { FieldDefinition, FieldDefinitions } from "../api/widgetDetail";

export interface ExportableWidget {
  html: string;
  css: string;
  js: string;
  fields: FieldDefinitions;
}

export interface PlatformExportResult {
  files: Record<string, string>;
  platform: Platform;
  platformName: string;
  bridgeInjected: boolean;
}

export const PLATFORM_DASHBOARD_URLS: Record<Platform, string> = {
  [PLATFORM_STREAM_ELEMENTS]: "https://streamelements.com/dashboard/overlays",
  [PLATFORM_STREAMLABS]: "https://streamlabs.com/dashboard#/widgets/customwidget"
};

export function slugifyWidgetName(name: string): string {
  return (
    String(name)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "custom-widget"
  );
}

export function buildPlatformExport(widget: ExportableWidget, values: Record<string, unknown>, platform: string): PlatformExportResult {
  const target = platform === PLATFORM_STREAMLABS ? PLATFORM_STREAMLABS : PLATFORM_STREAM_ELEMENTS;
  const fields = target === PLATFORM_STREAMLABS ? toStreamlabsFields(widget.fields, values) : toStreamElementsFields(widget.fields, values);
  const bridgeFields = target === PLATFORM_STREAM_ELEMENTS ? toStreamlabsFields(widget.fields, values) : fields;
  const compatibility = buildCompatibilityBridge(widget.js, target, bridgeFields);
  const platformName = target === PLATFORM_STREAMLABS ? "Streamlabs" : "StreamElements";

  return {
    files: {
      "widget.html": ensureTrailingNewline(widget.html),
      "widget.css": ensureTrailingNewline(widget.css),
      "widget.js": ensureTrailingNewline(`${compatibility.code}${widget.js}`),
      "fields.json": `${JSON.stringify(fields, null, 2)}\n`,
      "README.txt":
        [
          `Export automatique pour ${platformName}`,
          "",
          "Copiez le contenu de widget.html, widget.css, widget.js et fields.json",
          "dans les quatre onglets correspondants du Custom Widget.",
          "",
          compatibility.injected
            ? `Un pont de compatibilité ${compatibility.label} a été ajouté au début de widget.js.`
            : "Aucun pont n'a été nécessaire : le code utilise déjà les événements de cette plateforme.",
          "",
          "Les valeurs configurées dans Streamer Lab sont incluses dans fields.json."
        ].join("\n") + "\n"
    },
    platform: target,
    platformName,
    bridgeInjected: compatibility.injected
  };
}

export function toStreamElementsFields(definitions: FieldDefinitions = {}, values: Record<string, unknown> = {}): FieldDefinitions {
  return Object.fromEntries(
    Object.entries(definitions).map(([name, rawDefinition]) => {
      const definition: FieldDefinition = { ...rawDefinition };
      delete (definition as Record<string, unknown>).name;
      definition.type =
        (
          {
            textfield: "text",
            fontpicker: "googleFont",
            imagepicker: "image-input",
            soundpicker: "sound-input",
            videopicker: "video-input",
            description: "hidden"
          } as Record<string, string>
        )[definition.type] || definition.type;
      if (definition.steps !== undefined && definition.step === undefined) definition.step = definition.steps;
      delete definition.steps;
      definition.value = values[name] ?? definition.value;
      return [name, definition];
    })
  );
}

export function toStreamlabsFields(definitions: FieldDefinitions = {}, values: Record<string, unknown> = {}): FieldDefinitions {
  return Object.fromEntries(
    Object.entries(definitions).map(([name, rawDefinition]) => {
      const definition: FieldDefinition = { ...rawDefinition };
      delete (definition as Record<string, unknown>).name;
      definition.type =
        (
          {
            text: "textfield",
            googleFont: "fontpicker",
            "image-input": "imagepicker",
            "sound-input": "soundpicker",
            "video-input": "videopicker"
          } as Record<string, string>
        )[definition.type] || definition.type;
      if (definition.step !== undefined && definition.steps === undefined) definition.steps = definition.step;
      definition.value = values[name] ?? definition.value;
      return [name, definition];
    })
  );
}

interface CompatibilityBridge {
  code: string;
  injected: boolean;
  label: string;
}

function buildCompatibilityBridge(js: string, platform: Platform, fields: FieldDefinitions): CompatibilityBridge {
  const usesStreamElements = /onWidgetLoad|onSessionUpdate|SE_API|detail\s*\?*\.\s*listener/.test(js);
  const usesStreamlabs = /["']onLoad["']|custom_json|customFields/.test(js);

  if (platform === PLATFORM_STREAMLABS && usesStreamElements && !usesStreamlabs) {
    return { code: `${streamlabsTargetBridge()}\n\n`, injected: true, label: "StreamElements → Streamlabs" };
  }
  if (platform === PLATFORM_STREAM_ELEMENTS && usesStreamlabs && !usesStreamElements) {
    return { code: `${streamElementsTargetBridge(fields)}\n\n`, injected: true, label: "Streamlabs → StreamElements" };
  }
  return { code: "", injected: false, label: "" };
}

function streamlabsTargetBridge(): string {
  return `/* Streamer Lab — pont automatique StreamElements → Streamlabs */
(function () {
  if (window.__localWidgetLabStreamlabsBridge) return;
  window.__localWidgetLabStreamlabsBridge = true;

  const valuesFrom = (customJson) => Object.fromEntries(
    Object.entries(customJson || {}).map(([key, field]) => [
      key,
      field && typeof field === "object" && "value" in field ? field.value : field
    ])
  );
  const listenerByType = {
    follow: "follower-latest",
    subscription: "subscriber-latest",
    subscriber: "subscriber-latest",
    sub: "subscriber-latest",
    donation: "tip-latest",
    tip: "tip-latest",
    bits: "cheer-latest",
    cheer: "cheer-latest",
    raid: "raid-latest",
    message: "message"
  };

  if (!window.SE_API) {
    window.SE_API = {
      store: {
        get: async (key) => JSON.parse(localStorage.getItem("widgetLab." + key) || "null"),
        set: async (key, value) => localStorage.setItem("widgetLab." + key, JSON.stringify(value))
      },
      counters: { get: async () => ({ count: 0 }) },
      sanitize: async (message) => message,
      cheerFilter: async (message) => message,
      getOverlayStatus: async () => ({ isEditorMode: false, muted: false }),
      setField: () => {},
      resumeQueue: () => {}
    };
  }

  document.addEventListener("onLoad", function (obj) {
    const detail = obj.detail || {};
    const fieldData = valuesFrom(detail.custom_json || detail.customFields || detail.fieldData);
    window.dispatchEvent(new CustomEvent("onWidgetLoad", { detail: {
      fieldData,
      session: { data: detail.session || {} },
      recents: [],
      currency: { code: "EUR", name: "Euro", symbol: "€" },
      channel: {}
    }}));
  });

  document.addEventListener("onEventReceived", function (obj) {
    const source = obj.detail || {};
    const type = String(source.type || source.tag || "event").toLowerCase();
    const listener = listenerByType[type] || type;
    const event = type === "message"
      ? { data: { ...source, text: source.text || source.message || "", displayName: source.displayName || source.name || source.from || "Viewer" } }
      : { ...source, name: source.name || source.from || "Viewer", amount: source.amount || source.viewers || 0 };
    window.dispatchEvent(new CustomEvent("onEventReceived", { detail: { listener, event } }));
  });
})();`;
}

function streamElementsTargetBridge(fields: FieldDefinitions): string {
  const serializedFields = JSON.stringify(fields).replaceAll("<", "\\u003c");
  return `/* Streamer Lab — pont automatique Streamlabs → StreamElements */
(function () {
  if (window.__localWidgetLabStreamElementsBridge) return;
  window.__localWidgetLabStreamElementsBridge = true;
  const definitions = ${serializedFields};
  const typeByListener = {
    "follower-latest": "follow",
    "subscriber-latest": "subscription",
    "tip-latest": "donation",
    "cheer-latest": "bits",
    "raid-latest": "raid",
    message: "message"
  };

  window.addEventListener("onWidgetLoad", function (obj) {
    const detail = obj.detail || {};
    const values = detail.fieldData || {};
    const custom_json = Object.fromEntries(Object.entries(definitions).map(([key, field]) => [key, {
      ...field,
      value: values[key] !== undefined ? values[key] : field.value
    }]));
    document.dispatchEvent(new CustomEvent("onLoad", { detail: {
      custom_json,
      customFields: custom_json,
      fieldData: values,
      session: detail.session && detail.session.data ? detail.session.data : {}
    }}));
  });

  window.addEventListener("onEventReceived", function (obj) {
    const detail = obj.detail || {};
    const source = detail.event || {};
    const data = source.data || {};
    const type = typeByListener[detail.listener] || source.type || detail.listener || "event";
    const name = source.name || source.from || data.displayName || data.nick || "Viewer";
    document.dispatchEvent(new CustomEvent("onEventReceived", { detail: {
      ...source,
      ...data,
      type,
      tag: type,
      name,
      from: source.from || name,
      amount: Number(source.amount || data.amount || 0),
      message: source.message || data.text || "",
      platform: source.platform || "twitch_account"
    }}));
  });
})();`;
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
