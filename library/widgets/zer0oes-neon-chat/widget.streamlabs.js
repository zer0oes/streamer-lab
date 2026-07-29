/* Local Widget Lab — pont automatique StreamElements → Streamlabs */
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
})();

const chat = document.querySelector("#chat");

let fields = {};
let ignoredUsers = new Set();

const testMessages = [
  {
    displayName: "Luna",
    badges: [],
    text: "Salut tout le monde !"
  },
  {
    displayName: "NovaMod",
    badges: [{
      type: "moderator",
      version: "1",
      url: "https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/3",
      description: "Modérateur"
    }],
    text: "Le message de test fonctionne parfaitement."
  },
  {
    displayName: "VeryLongViewerName",
    badges: [],
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum cursus dignissim turpis quis efficitur. Phasellus fermentum et libero vitae placerat."
  },
  {
    displayName: "PixelVIP",
    badges: [{
      type: "vip",
      version: "1",
      url: "https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3",
      description: "VIP"
    }],
    text: "Cette bulle est un peu plus longue pour vérifier le retour à la ligne et les espacements."
  },
  {
    displayName: "Arty",
    badges: [{
      type: "artist-badge",
      version: "1",
      url: "https://static-cdn.jtvnw.net/badges/v1/4300a897-03dc-4e83-8c0e-c332fee7057f/3",
      description: "Artiste"
    }],
    text: "On valide cette version ?"
  },
  {
    displayName: "MaChaine",
    badges: [{
      type: "broadcaster",
      version: "1",
      url: "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/3",
      description: "Streamer"
    }],
    text: "Message du Broadcaster, avec la disposition inversée !"
  }
];

let nextTestMessage = 0;

window.addEventListener("onWidgetLoad", ({ detail }) => {
  fields = detail?.fieldData || {};
  ignoredUsers = new Set(
    String(fields.ignoredUsers || "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean)
  );
  chat.classList.toggle("is-top", fields.messagePosition === "top");
  applyGlobalTheme();
  window.requestAnimationFrame(trimToLimit);
});

window.addEventListener("onEventReceived", ({ detail }) => {
  const event = detail?.event || {};
  const listener = detail?.listener || event.listener;
  const isWidgetButton = detail?.listener === "widget-button" || event.listener === "widget-button";

  if (isWidgetButton) {
    const sample = testMessages[nextTestMessage++ % testMessages.length];
    addMessage({
      nick: sample.displayName.toLowerCase(),
      displayName: sample.displayName,
      displayColor: "#8b5cf6",
      userId: `local-preview-${nextTestMessage}`,
      msgId: `preview-${Date.now()}`,
      badges: sample.badges,
      emotes: [],
      text: sample.text
    });
    return;
  }

  if (listener === "delete-message") {
    removeByAttribute("msgid", event.msgId);
    return;
  }

  if (listener === "delete-messages") {
    removeByAttribute("sender", event.userId, true);
    return;
  }

  if (listener !== "message") return;

  const data = event.data || event;
  const nickname = String(data.nick || data.displayName || "").toLowerCase();
  const text = String(data.text || "");

  if (fields.hideCommands === "yes" && text.trimStart().startsWith("!")) return;
  if (ignoredUsers.has(nickname)) return;

  addMessage(data);
});

function addMessage(data) {
  const previousPositions = capturePositions();
  const badges = Array.isArray(data.badges) ? data.badges : [];
  const role = getRole(badges);
  const row = document.createElement("div");
  row.className = `chat-row role-${role}`;
  if (role === "broadcaster") row.classList.add("is-broadcaster");
  row.dataset.msgid = String(data.msgId || data.tags?.id || crypto.randomUUID());
  row.dataset.sender = String(data.userId || data.tags?.["user-id"] || "");

  applyRoleTheme(row, role);

  const identity = document.createElement("div");
  identity.className = "identity";

  const username = document.createElement("span");
  username.className = "username";
  username.textContent = data.displayName || data.nick || "Anonyme";
  identity.append(username);

  if (fields.showBadges !== "no" && badges.length) {
    const badgeContainer = document.createElement("span");
    badgeContainer.className = "badges";
    for (const badge of badges) {
      if (!badge?.url) continue;
      const image = document.createElement("img");
      image.className = "badge";
      image.src = badge.url;
      image.alt = badge.description || badge.type || "Badge Twitch";
      image.title = image.alt;
      badgeContainer.append(image);
    }
    if (badgeContainer.childElementCount) identity.append(badgeContainer);
  }

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  const content = document.createElement("span");
  content.className = "message-content";
  renderMessage(content, data);
  bubble.append(content);

  const tone = getToneAsset(String(data.text || ""));
  if (tone && fields.showTone !== "no") {
    const image = document.createElement("img");
    image.className = "tone";
    image.src = tone.url;
    image.alt = tone.label;
    bubble.append(image);
  }

  row.append(identity, bubble);
  chat.append(row);

  trimToLimit();
  animateStack(previousPositions, row);
  scheduleRemoval(row);
}

function getRole(badges) {
  const types = new Set(badges.map((badge) => badge?.type));
  if (types.has("broadcaster")) return "broadcaster";
  if (types.has("moderator")) return "moderator";
  if (types.has("vip")) return "vip";
  if (types.has("artist-badge")) return "artist";
  return "viewer";
}

function applyRoleTheme(element, role) {
  const fieldsByRole = {
    viewer: ["viewerColor", "viewerColor2"],
    moderator: ["moderatorColor", "moderatorColor2"],
    vip: ["vipColor", "vipColor2"],
    artist: ["artistColor", "artistColor2"],
    broadcaster: ["broadcasterColor", "broadcasterColor2"]
  };
  const defaults = {
    viewer: ["#5900FF", "#FF1BDF"],
    moderator: ["#2ABDFF", "#00FE9F"],
    vip: ["#FF1BDF", "#FF4D9D"],
    artist: ["#2ABDFF", "#78BEFF"],
    broadcaster: ["#E91916", "#FF4D6D"]
  };
  const [startField, endField] = fieldsByRole[role];
  const start = fields[startField] || defaults[role][0];
  const end = fields[endField] || defaults[role][1];
  const identityBgOpacity = clampOpacity(fields.identityBackgroundOpacity, 0.7);
  const identityBorderOpacity = clampOpacity(fields.identityBorderOpacity, 0.76);
  const messageBorderOpacity = clampOpacity(fields.messageBorderOpacity, 0.76);
  const glowOpacity = clampOpacity(fields.glowOpacity, 0.45);

  element.style.setProperty("--role-start", start);
  element.style.setProperty("--role-end", end);
  element.style.setProperty("--role-start-soft", mixWithDark(start, 0.85, identityBgOpacity));
  element.style.setProperty("--role-end-soft", mixWithDark(end, 0.72, identityBgOpacity));
  element.style.setProperty("--identity-border", toRgba(end, identityBorderOpacity));
  element.style.setProperty("--message-border", toRgba(end, messageBorderOpacity));
  element.style.setProperty("--glow-color", toRgba(end, glowOpacity));
}

function applyGlobalTheme() {
  const opacity = clampOpacity(fields.messageBackgroundOpacity, 0.7);
  const root = document.documentElement;
  root.style.setProperty("--bubble-background-alpha", toRgba(fields.bubbleBackground || "#161225", opacity));
  root.style.setProperty("--bubble-background-2-alpha", toRgba(fields.bubbleBackground2 || "#231A3D", opacity));
}

function clampOpacity(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number / 100)) : fallback;
}

function toRgba(color, alpha) {
  const match = String(color).trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) return color;
  const value = Number.parseInt(match[1], 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function mixWithDark(color, amount, alpha = 1) {
  const foreground = String(color).trim().match(/^#([0-9a-f]{6})$/i);
  if (!foreground) return color;
  const value = Number.parseInt(foreground[1], 16);
  const dark = [18, 14, 35];
  const source = [value >> 16, (value >> 8) & 255, value & 255];
  const mixed = source.map((channel, index) => Math.round(dark[index] + (channel - dark[index]) * amount));
  return `rgba(${mixed.join(", ")}, ${alpha})`;
}

function renderMessage(container, data) {
  const text = String(data.text || "");
  const emotes = (Array.isArray(data.emotes) ? data.emotes : [])
    .filter((emote) => Number.isFinite(Number(emote.start)) && Number.isFinite(Number(emote.end)))
    .sort((a, b) => Number(a.start) - Number(b.start));

  if (!emotes.length) {
    appendNamedEmotes(container, text, Array.isArray(data.emotes) ? data.emotes : []);
    return;
  }

  let cursor = 0;
  for (const emote of emotes) {
    const start = Number(emote.start);
    const end = Number(emote.end);
    if (start < cursor || end < start) continue;
    container.append(document.createTextNode(text.slice(cursor, start)));
    container.append(createEmoteImage(emote));
    cursor = end + 1;
  }
  container.append(document.createTextNode(text.slice(cursor)));

  const remainingText = text.replaceAll(/\s/g, "");
  const emoteNames = emotes.map((emote) => emote.name || "").join("");
  if (remainingText === emoteNames) container.classList.add("is-emote-only");
}

function appendNamedEmotes(container, text, emotes) {
  const byName = new Map(emotes.filter((emote) => emote?.name).map((emote) => [emote.name, emote]));
  const parts = text.split(/(\s+)/);
  let hasText = false;
  let hasEmote = false;

  for (const part of parts) {
    const emote = byName.get(part);
    if (emote) {
      container.append(createEmoteImage(emote));
      hasEmote = true;
    } else {
      container.append(document.createTextNode(part));
      if (part.trim()) hasText = true;
    }
  }

  if (hasEmote && !hasText) container.classList.add("is-emote-only");
}

function createEmoteImage(emote) {
  const image = document.createElement("img");
  image.className = "emote";
  image.src = emote.urls?.[2] || emote.urls?.[1] || emote.url || "";
  image.alt = emote.name || "Emote";
  image.title = image.alt;
  return image;
}

function getToneAsset(text) {
  const trimmed = text.trim();
  if (trimmed.endsWith("!?") || trimmed.endsWith("?!")) {
    return { url: fields.mixedMarksImage, label: "Exclamation et interrogation" };
  }
  if (trimmed.endsWith("!")) return { url: fields.exclamationImage, label: "Exclamation" };
  if (trimmed.endsWith("?")) return { url: fields.questionImage, label: "Interrogation" };
  return null;
}

function trimToLimit() {
  const limit = Math.max(1, Number(fields.maxMessages) || 20);
  while (chat.childElementCount > limit) chat.firstElementChild?.remove();

  const gap = Number.parseFloat(getComputedStyle(chat).rowGap) || 0;
  const totalHeight = () => {
    const rows = [...chat.children];
    return rows.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0) +
      Math.max(0, rows.length - 1) * gap;
  };

  while (chat.childElementCount > 1 && totalHeight() > chat.clientHeight) {
    chat.firstElementChild?.remove();
  }
}

function capturePositions() {
  return new Map([...chat.children].map((row) => [row, row.getBoundingClientRect().top]));
}

function animateStack(previousPositions, newRow) {
  window.requestAnimationFrame(() => {
    const duration = Math.max(0, Number(fields.animationDuration) || 520);
    for (const row of chat.children) {
      if (row === newRow || !previousPositions.has(row)) continue;
      const deltaY = previousPositions.get(row) - row.getBoundingClientRect().top;
      if (Math.abs(deltaY) < 0.5) continue;
      row.animate(
        [
          { transform: `translateY(${deltaY}px)` },
          { transform: "translateY(0)" }
        ],
        {
          duration,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)"
        }
      );
    }
  });
}

function scheduleRemoval(row) {
  const seconds = Number(fields.hideAfter);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds === 999) return;
  window.setTimeout(() => removeRow(row), seconds * 1000);
}

function removeByAttribute(attribute, value, all = false) {
  if (value === undefined || value === null) return;
  const matches = [...chat.children].filter((row) => row.dataset[attribute] === String(value));
  for (const row of all ? matches : matches.slice(0, 1)) removeRow(row);
}

function removeRow(row) {
  if (!row?.isConnected || row.classList.contains("is-leaving")) return;
  row.classList.add("is-leaving");
  const duration = Math.max(0, Number(fields.animationDuration) || 520);
  window.setTimeout(() => {
    const previousPositions = capturePositions();
    row.remove();
    animateStack(previousPositions);
  }, duration + 40);
}

window.addEventListener("resize", trimToLimit);
document.fonts?.ready.then(trimToLimit);
