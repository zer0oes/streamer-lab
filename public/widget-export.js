import {
  PLATFORM_STREAM_ELEMENTS,
  PLATFORM_STREAMLABS
} from "./platform-adapters.js";

const encoder = new TextEncoder();

export function buildPlatformExport(widget, values, platform) {
  const target = platform === PLATFORM_STREAMLABS ? PLATFORM_STREAMLABS : PLATFORM_STREAM_ELEMENTS;
  const fields = target === PLATFORM_STREAMLABS
    ? toStreamlabsFields(widget.fields, values)
    : toStreamElementsFields(widget.fields, values);
  const bridgeFields = target === PLATFORM_STREAM_ELEMENTS
    ? toStreamlabsFields(widget.fields, values)
    : fields;
  const compatibility = buildCompatibilityBridge(widget.js, target, bridgeFields);
  const platformName = target === PLATFORM_STREAMLABS ? "Streamlabs" : "StreamElements";

  return {
    files: {
      "widget.html": ensureTrailingNewline(widget.html),
      "widget.css": ensureTrailingNewline(widget.css),
      "widget.js": ensureTrailingNewline(`${compatibility.code}${widget.js}`),
      "fields.json": `${JSON.stringify(fields, null, 2)}\n`,
      "README.txt": [
        `Export automatique pour ${platformName}`,
        "",
        "Copiez le contenu de widget.html, widget.css, widget.js et fields.json",
        "dans les quatre onglets correspondants du Custom Widget.",
        "",
        compatibility.injected
          ? `Un pont de compatibilité ${compatibility.label} a été ajouté au début de widget.js.`
          : "Aucun pont n’a été nécessaire : le code utilise déjà les événements de cette plateforme.",
        "",
        "Les valeurs configurées dans Streamer Lab sont incluses dans fields.json."
      ].join("\n") + "\n"
    },
    platform: target,
    platformName,
    bridgeInjected: compatibility.injected
  };
}

export function toStreamElementsFields(definitions = {}, values = {}) {
  return Object.fromEntries(Object.entries(definitions).map(([name, rawDefinition]) => {
    const definition = { ...rawDefinition };
    delete definition.name;
    definition.type = ({
      textfield: "text",
      fontpicker: "googleFont",
      imagepicker: "image-input",
      soundpicker: "sound-input",
      videopicker: "video-input",
      description: "hidden"
    })[definition.type] || definition.type;
    if (definition.steps !== undefined && definition.step === undefined) definition.step = definition.steps;
    delete definition.steps;
    definition.value = values[name] ?? definition.value;
    return [name, definition];
  }));
}

export function toStreamlabsFields(definitions = {}, values = {}) {
  return Object.fromEntries(Object.entries(definitions).map(([name, rawDefinition]) => {
    const definition = { ...rawDefinition };
    delete definition.name;
    definition.type = ({
      text: "textfield",
      googleFont: "fontpicker",
      "image-input": "imagepicker",
      "sound-input": "soundpicker",
      "video-input": "videopicker"
    })[definition.type] || definition.type;
    if (definition.step !== undefined && definition.steps === undefined) definition.steps = definition.step;
    definition.value = values[name] ?? definition.value;
    return [name, definition];
  }));
}

export function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  const { time, date } = dosDateTime(new Date());

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const contentBytes = encoder.encode(content);
    const checksum = crc32(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeLocalHeader(localView, { time, date, checksum, size: contentBytes.length, nameLength: nameBytes.length });
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeCentralHeader(centralView, {
      time,
      date,
      checksum,
      size: contentBytes.length,
      nameLength: nameBytes.length,
      localOffset
    });
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + contentBytes.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, centralParts.length, true);
  endView.setUint16(10, centralParts.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);

  return concatBytes([...localParts, ...centralParts, end]);
}

function buildCompatibilityBridge(js, platform, fields) {
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

function streamlabsTargetBridge() {
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

function streamElementsTargetBridge(fields) {
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

function writeLocalHeader(view, values) {
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, values.time, true);
  view.setUint16(12, values.date, true);
  view.setUint32(14, values.checksum, true);
  view.setUint32(18, values.size, true);
  view.setUint32(22, values.size, true);
  view.setUint16(26, values.nameLength, true);
}

function writeCentralHeader(view, values) {
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, values.time, true);
  view.setUint16(14, values.date, true);
  view.setUint32(16, values.checksum, true);
  view.setUint32(20, values.size, true);
  view.setUint32(24, values.size, true);
  view.setUint16(28, values.nameLength, true);
  view.setUint32(42, values.localOffset, true);
}

function dosDateTime(value) {
  const year = Math.max(1980, value.getFullYear());
  return {
    time: (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate()
  };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function ensureTrailingNewline(value) {
  return value.endsWith("\n") ? value : `${value}\n`;
}
