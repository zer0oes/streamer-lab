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
    host: "host-latest",
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

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function num(v){
  const s = String(v ?? "").trim().replace(",", ".");
  const n = Number(s.replace(/[^\d.-]/g,''));
  return Number.isFinite(n) ? n : 0;
}

const iconMap = {
  follow: "favorite",
  sub: "star_shine",
  cheer: "diamond_shine",
  tip: "money_bag",
  raid: "bolt",
  host: "live_tv"
};

let SETTINGS = {};
let queue = [];
let isShowing = false;
let hideTimer = null;
let advanceTimer = null;

// ------------------------------------
// Google Fonts
// ------------------------------------
function setGoogleFont(family){
  const link = document.getElementById("googleFontLink");
  if (!link) return;

  const name = String(family || "Poppins").trim();
  const urlName = name.replace(/\s+/g, "+");
  link.href = `https://fonts.googleapis.com/css2?family=${urlName}:wght@600;700;800;900&display=swap`;
  document.documentElement.style.setProperty("--font", `"${name}"`);
}

// ------------------------------------
// Couleurs
// ------------------------------------
function isHexColor(v){
  const s = String(v ?? "").trim();
  if (!/^#[0-9a-f]+$/i.test(s)) return false;
  const len = s.length - 1;
  return len === 3 || len === 6 || len === 8;
}
function normalizeColorValue(v){
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (isHexColor(s)){
    const hex = s.slice(1);
    if (hex.length === 3) return "#" + hex.split("").map(c => c + c).join("");
    if (hex.length === 8) return "#" + hex.slice(0, 6);
    return "#" + hex;
  }
  if (/^(rgb|hsl)a?\(/i.test(s)) return s;
  return null;
}
function hexOr(v, fallback){
  return normalizeColorValue(v) ?? fallback;
}
function hexToRgb(hexValue){
  const clean = String(hexValue ?? "#ffffff").trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
  const n = parseInt(full, 16);
  if (full.length !== 6 || !Number.isFinite(n)) return { r: 255, g: 255, b: 255 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbTriplet(hexValue){
  const { r, g, b } = hexToRgb(hexValue);
  return `${r}, ${g}, ${b}`;
}

function isYesNo(v, fallback){
  const s = String(v ?? "").toLowerCase();
  return (s === "yes" || s === "no") ? s : fallback;
}

// ------------------------------------
// Normalisation du fieldData
// ------------------------------------
function normalizeFields(raw){
  if (Array.isArray(raw)){
    raw = Object.fromEntries(raw.filter(field => field?.name).map(field => [field.name, field.value]));
  }
  raw = raw || {};

  return {
    font_family: String(raw.font_family ?? "Poppins"),
    font_weight: String(raw.font_weight ?? "900"),
    line1_size: Math.max(12, num(raw.line1_size ?? 34)),
    name_size: Math.max(16, num(raw.name_size ?? 58)),
    text_size: Math.max(8, num(raw.text_size ?? 15)),
    text_color: hexOr(raw.text_color, "#ffffff"),
    max_width: Math.max(0, num(raw.max_width ?? 640)),

    follow_color: hexOr(raw.follow_color, "#ff4d8d"),
    sub_color: hexOr(raw.sub_color, "#2abdff"),
    cheer_color: hexOr(raw.cheer_color, "#ff1bdf"),
    tip_color: hexOr(raw.tip_color, "#5900ff"),
    raid_color: hexOr(raw.raid_color, "#ffb020"),
    host_color: hexOr(raw.host_color, "#00fe9f"),

    follow_line1: String(raw.follow_line1 ?? "Nouveau follow"),
    follow_line2: String(raw.follow_line2 ?? "Bienvenue"),
    sub_line1: String(raw.sub_line1 ?? "Nouvel abonné"),
    sub_line2: String(raw.sub_line2 ?? "Merci"),
    cheer_line1: String(raw.cheer_line1 ?? "Nouveau cheer"),
    cheer_line2: String(raw.cheer_line2 ?? "{amount} bits de"),
    tip_line1: String(raw.tip_line1 ?? "Nouveau don"),
    tip_line2: String(raw.tip_line2 ?? "{amount} € de"),
    raid_line1: String(raw.raid_line1 ?? "Raid"),
    raid_line2: String(raw.raid_line2 ?? "{amount} viewers de"),
    host_line1: String(raw.host_line1 ?? "Host"),
    host_line2: String(raw.host_line2 ?? "Bienvenue à"),

    show_message: isYesNo(raw.show_message, "yes"),
    glitch_enabled: isYesNo(raw.glitch_enabled, "yes"),
    display_duration: Math.max(1000, num(raw.display_duration ?? 6000)),
    animation_duration: clamp(num(raw.animation_duration ?? 600), 0, 2000),

    sound_enabled: isYesNo(raw.sound_enabled, "no"),
    sound_url: String(raw.sound_url ?? ""),
    sound_volume: clamp(num(raw.sound_volume ?? 70) / 100, 0, 1)
  };
}

function refreshSettingsFromFieldData(raw){
  SETTINGS = normalizeFields(raw || {});
  applyStyleSettings();
}

function getSetting(key, fallback){
  return (SETTINGS && SETTINGS[key] != null) ? SETTINGS[key] : fallback;
}

function applyStyleSettings(){
  const root = document.documentElement.style;
  setGoogleFont(getSetting("font_family", "Poppins"));
  root.setProperty("--font-weight", String(getSetting("font_weight", "900")));
  root.setProperty("--line1-size", getSetting("line1_size", 34) + "px");
  root.setProperty("--name-size", getSetting("name_size", 58) + "px");
  root.setProperty("--text-size", getSetting("text_size", 15) + "px");
  root.setProperty("--text-color", getSetting("text_color", "#ffffff"));

  const width = getSetting("max_width", 640);
  root.setProperty("--max-width", width > 0 ? width + "px" : "88vw");
  root.setProperty("--anim", getSetting("animation_duration", 600) + "ms");
}

function accentFor(type){
  const map = {
    follow: getSetting("follow_color", "#ff4d8d"),
    sub: getSetting("sub_color", "#2abdff"),
    cheer: getSetting("cheer_color", "#ff1bdf"),
    tip: getSetting("tip_color", "#5900ff"),
    raid: getSetting("raid_color", "#ffb020"),
    host: getSetting("host_color", "#00fe9f")
  };
  return map[type] || "#ffffff";
}

function line1For(type){
  const map = {
    follow: getSetting("follow_line1", "Nouveau follow"),
    sub: getSetting("sub_line1", "Nouvel abonné"),
    cheer: getSetting("cheer_line1", "Nouveau cheer"),
    tip: getSetting("tip_line1", "Nouveau don"),
    raid: getSetting("raid_line1", "Raid"),
    host: getSetting("host_line1", "Host")
  };
  return map[type] || "";
}

function line2For(type){
  const map = {
    follow: getSetting("follow_line2", "Bienvenue"),
    sub: getSetting("sub_line2", "Merci"),
    cheer: getSetting("cheer_line2", "{amount} bits de"),
    tip: getSetting("tip_line2", "{amount} € de"),
    raid: getSetting("raid_line2", "{amount} viewers de"),
    host: getSetting("host_line2", "Bienvenue à")
  };
  return map[type] || "";
}

function formatAmount(n){
  const value = Number(n) || 0;
  if (Number.isInteger(value)) return value.toLocaleString("fr-FR");
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTemplate(template, amount){
  return String(template ?? "").replaceAll("{amount}", formatAmount(amount));
}

// ------------------------------------
// Détection du type d'évènement
// ------------------------------------
function detectType(listener, ev){
  const type = String(ev?.type ?? "").toLowerCase();
  const key = `${listener} ${type}`;

  if (key.includes("follow")) return "follow";
  if (key.includes("tip") || key.includes("donation")) return "tip";
  if (key.includes("cheer") || key.includes("bits") || key.includes("bit")) return "cheer";
  if (key.includes("raid")) return "raid";
  if (key.includes("host")) return "host";
  if (key.includes("sub")) return "sub";

  return null;
}

function extractPayload(type, ev){
  const data = ev?.data || {};
  const name = ev?.name || ev?.from || data.displayName || data.nick || "Anonyme";
  const message = String(ev?.message ?? data.text ?? data.message ?? "");

  let amount = Number(ev?.amount ?? data.amount ?? 0) || 0;
  if (type === "raid" || type === "host") amount = Number(ev?.viewers ?? amount) || 0;

  return { name, amount, message };
}

// ------------------------------------
// DEDUPE
// ------------------------------------
const SEEN = new Map();
const DEDUPE_MS = 4000;

function cleanupSeen(){
  const now = Date.now();
  for (const [k, t] of SEEN.entries()){
    if (now - t > DEDUPE_MS) SEEN.delete(k);
  }
}
function eventKey(listener, ev){
  const id = ev?.id ?? ev?._id ?? ev?.eventId ?? ev?.data?.id ?? ev?.data?._id;
  if (id != null) return `id:${id}`;

  const name = ev?.name ?? ev?.from ?? ev?.data?.displayName ?? "";
  const amount = ev?.amount ?? ev?.data?.amount ?? "";
  return `sig:${listener}|${name}|${amount}`;
}
function shouldProcess(listener, ev){
  cleanupSeen();
  const key = eventKey(listener, ev);
  if (SEEN.has(key)) return false;
  SEEN.set(key, Date.now());
  return true;
}

// ------------------------------------
// File d'attente / affichage
// ------------------------------------
function playSound(){
  if (getSetting("sound_enabled", "no") !== "yes") return;
  const url = getSetting("sound_url", "");
  if (!url) return;

  const audio = document.getElementById("alertSound");
  if (!audio) return;
  audio.src = url;
  audio.volume = getSetting("sound_volume", 0.7);
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// ------------------------------------
// Effet "bug" (décodage caractère par caractère)
// ------------------------------------
const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#01";
const SCRAMBLE_FONTS = ["'Space Grotesk', sans-serif", "'Press Start 2P', monospace"];
let scrambleGenCounter = 0;

function randomScrambleChar(){
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}
function randomScrambleFont(){
  return SCRAMBLE_FONTS[Math.floor(Math.random() * SCRAMBLE_FONTS.length)];
}

function scrambleInto(el, finalText, duration){
  if (!el) return;
  const gen = ++scrambleGenCounter;
  el._scrambleGen = gen;

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion){
    el.textContent = finalText;
    return;
  }

  const nodes = [];
  const scramblable = [];

  for (const ch of finalText){
    if (ch === " "){
      nodes.push(document.createTextNode(" "));
      continue;
    }
    const span = document.createElement("span");
    span.className = "scramble-char is-scrambling";
    span.textContent = randomScrambleChar();
    span.style.fontFamily = randomScrambleFont();
    nodes.push(span);
    scramblable.push({ span, ch });
  }

  el.replaceChildren(...nodes);

  const total = Math.max(1, scramblable.length);
  const start = performance.now();
  const lockTimes = scramblable.map((_, i) => (i / total) * duration * 0.65 + Math.random() * duration * 0.35);
  const flickerInterval = 70;
  let lastFlicker = -Infinity;

  function tick(now){
    if (el._scrambleGen !== gen) return;
    const elapsed = now - start;
    let allLocked = true;
    const shouldFlicker = now - lastFlicker >= flickerInterval;
    if (shouldFlicker) lastFlicker = now;

    scramblable.forEach(({ span, ch }, i) => {
      if (elapsed >= lockTimes[i]){
        if (!span.dataset.locked){
          span.textContent = ch;
          span.style.fontFamily = "";
          span.classList.remove("is-scrambling");
          span.dataset.locked = "1";
        }
        return;
      }
      allLocked = false;
      if (shouldFlicker){
        span.textContent = randomScrambleChar();
        span.style.fontFamily = randomScrambleFont();
      }
    });

    if (!allLocked) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function setAlertText(el, text, duration){
  if (!el) return;
  if (getSetting("glitch_enabled", "yes") === "yes"){
    scrambleInto(el, text, duration);
  } else {
    el._scrambleGen = ++scrambleGenCounter;
    el.textContent = text;
  }
}

function scrambleOut(el, duration){
  if (!el) return;
  const spans = [...el.querySelectorAll(".scramble-char")];
  if (!spans.length) return;

  const gen = ++scrambleGenCounter;
  el._scrambleGen = gen;

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const start = performance.now();
  const flickerInterval = 70;
  let lastFlicker = -Infinity;

  function tick(now){
    if (el._scrambleGen !== gen) return;
    if (now - start >= duration) return;

    if (now - lastFlicker >= flickerInterval){
      lastFlicker = now;
      for (const span of spans){
        span.textContent = randomScrambleChar();
        span.style.fontFamily = randomScrambleFont();
        span.classList.add("is-scrambling");
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function enqueueAlert(type, payload){
  queue.push({ type, payload });
  if (!isShowing) showNext();
}

function showNext(){
  clearTimeout(hideTimer);
  clearTimeout(advanceTimer);

  const next = queue.shift();
  if (!next){
    isShowing = false;
    return;
  }
  isShowing = true;

  const { type, payload } = next;
  document.documentElement.style.setProperty("--accent-rgb", rgbTriplet(accentFor(type)));

  const line1El = document.getElementById("alertLine1");
  const line2El = document.getElementById("alertLine2");
  const nameEl = document.getElementById("alertName");
  const messageEl = document.getElementById("alertMessage");
  const iconEl = document.getElementById("alertIcon");
  const alertEl = document.getElementById("alert");

  if (iconEl) iconEl.textContent = iconMap[type] || "celebration";

  setAlertText(line1El, line1For(type), 1100);
  setAlertText(line2El, formatTemplate(line2For(type), payload.amount), 1250);
  setAlertText(nameEl, payload.name, 1600);

  const trimmedMessage = payload.message.trim();
  const showMessage = getSetting("show_message", "yes") === "yes" && trimmedMessage;
  if (messageEl) messageEl.textContent = showMessage ? `« ${trimmedMessage} »` : "";

  if (alertEl){
    alertEl.classList.remove("is-visible", "is-leaving");
    void alertEl.offsetWidth;
    alertEl.classList.add("is-visible");
  }

  playSound();

  hideTimer = window.setTimeout(hideCurrent, getSetting("display_duration", 6000));
}

function hideCurrent(){
  const alertEl = document.getElementById("alert");
  const animDuration = getSetting("animation_duration", 600);

  scrambleOut(document.getElementById("alertLine1"), animDuration);
  scrambleOut(document.getElementById("alertLine2"), animDuration);
  scrambleOut(document.getElementById("alertName"), animDuration);

  if (alertEl){
    alertEl.classList.remove("is-visible");
    alertEl.classList.add("is-leaving");
  }
  advanceTimer = window.setTimeout(showNext, animDuration + 60);
}

// ------------------------------------
// Évènements
// ------------------------------------
function handleEvent(obj){
  const listener = String(obj?.detail?.listener || "").toLowerCase();
  const ev = obj?.detail?.event || null;
  if (!ev) return;

  const type = detectType(listener, ev);
  if (!type) return;

  if (!shouldProcess(listener, ev)) return;

  enqueueAlert(type, extractPayload(type, ev));
}

window.addEventListener("onWidgetLoad", (obj) => {
  refreshSettingsFromFieldData(obj?.detail?.fieldData || {});
});

window.addEventListener("onWidgetUpdate", (obj) => {
  refreshSettingsFromFieldData(obj?.detail?.fieldData || {});
});

window.addEventListener("onEventReceived", (obj) => {
  handleEvent(obj);
});
