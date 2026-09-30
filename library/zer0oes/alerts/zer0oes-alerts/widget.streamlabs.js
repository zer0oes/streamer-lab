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
  gift: "redeem",
  community: "featured_seasonal_and_gifts",
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
let countFrame = null;

// ------------------------------------
// Google Fonts (police du bloc titre + police des chiffres)
// ------------------------------------
function setGoogleFonts(titleFamily, numberFamily){
  const link = document.getElementById("googleFontLink");
  if (!link) return;

  const title = String(titleFamily || "Bungee").trim();
  const number = String(numberFamily || "Anton").trim();
  const families = [...new Set([title, number])]
    .map(name => "family=" + name.replace(/\s+/g, "+"))
    .join("&");
  const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  if (link.getAttribute("href") !== href) link.href = href;

  document.documentElement.style.setProperty("--title-font", `"${title}"`);
  document.documentElement.style.setProperty("--number-font", `"${number}"`);
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

const DIRECTIONS = ["up", "down", "right", "left"];
function directionOr(v, fallback){
  const s = String(v ?? "").toLowerCase();
  return DIRECTIONS.includes(s) ? s : fallback;
}

const OPPOSITE_DIRECTION = { up: "down", down: "up", right: "left", left: "right" };
// "same" = continue dans le sens de l'entrée, "back" = repart d'où elle vient
function exitDirectionOr(v, fallback){
  const s = String(v ?? "").toLowerCase();
  return (s === "same" || s === "back" || DIRECTIONS.includes(s)) ? s : fallback;
}
function resolveExitDirection(enter, exit){
  if (exit === "same") return enter;
  if (exit === "back") return OPPOSITE_DIRECTION[enter] || enter;
  return exit;
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
    title_font: String(raw.title_font ?? "Bungee"),
    number_font: String(raw.number_font ?? "Anton"),
    card_width: clamp(num(raw.card_width ?? 260), 140, 800),
    text_size: Math.max(8, num(raw.text_size ?? 13)),

    card_bg: hexOr(raw.card_bg, "#ffffff"),
    card_border: hexOr(raw.card_border, "#e3dff0"),
    panel_bg: hexOr(raw.panel_bg, "#161225"),
    text_color: hexOr(raw.text_color, "#161225"),
    second_color: hexOr(raw.second_color, "#8b5cf6"),

    follow_color: hexOr(raw.follow_color, "#ff4d8d"),
    sub_color: hexOr(raw.sub_color, "#ff1bdf"),
    gift_color: hexOr(raw.gift_color, "#78beff"),
    community_color: hexOr(raw.community_color, "#2abdff"),
    cheer_color: hexOr(raw.cheer_color, "#2abdff"),
    tip_color: hexOr(raw.tip_color, "#00fe9f"),
    raid_color: hexOr(raw.raid_color, "#ffb020"),
    host_color: hexOr(raw.host_color, "#2abdff"),

    follow_title: String(raw.follow_title ?? "Fol_|low"),
    follow_unit: String(raw.follow_unit ?? "Bienvenue"),
    sub_title: String(raw.sub_title ?? "New_|Sub"),
    resub_title: String(raw.resub_title ?? "Re_|Sub"),
    sub_unit: String(raw.sub_unit ?? "Mois"),
    gift_title: String(raw.gift_title ?? "Gi_|ft"),
    gift_unit_one: String(raw.gift_unit_one ?? "Sub offert"),
    gift_unit: String(raw.gift_unit ?? "Subs offerts"),
    gift_name: String(raw.gift_name ?? "{gifter} → {recipient}"),
    community_title: String(raw.community_title ?? "Comm_|Gift"),
    community_unit_one: String(raw.community_unit_one ?? "Sub offert"),
    community_unit: String(raw.community_unit ?? "Subs offerts"),
    cheer_title: String(raw.cheer_title ?? "Che_|er"),
    cheer_unit: String(raw.cheer_unit ?? "Bits"),
    tip_title: String(raw.tip_title ?? "Mer_|ci"),
    tip_unit: String(raw.tip_unit ?? "€"),
    raid_title: String(raw.raid_title ?? "Ra_|id"),
    raid_unit: String(raw.raid_unit ?? "Viewers"),
    host_title: String(raw.host_title ?? "Ho_|st"),
    host_unit: String(raw.host_unit ?? "Viewers"),

    show_message: isYesNo(raw.show_message, "yes"),
    glitch_enabled: isYesNo(raw.glitch_enabled, "yes"),
    title_idle: isYesNo(raw.title_idle, "yes"),
    display_duration: Math.max(1000, num(raw.display_duration ?? 6000)),
    animation_duration: clamp(num(raw.animation_duration ?? 600), 0, 2000),
    anim_direction: directionOr(raw.anim_direction, "up"),
    exit_direction: exitDirectionOr(raw.exit_direction, "same"),

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
  setGoogleFonts(getSetting("title_font", "Bungee"), getSetting("number_font", "Anton"));
  root.setProperty("--w", getSetting("card_width", 260) + "px");
  root.setProperty("--text-size", getSetting("text_size", 13) + "px");
  root.setProperty("--card-bg", getSetting("card_bg", "#ffffff"));
  root.setProperty("--card-border", getSetting("card_border", "#e3dff0"));
  root.setProperty("--panel-bg", getSetting("panel_bg", "#161225"));
  root.setProperty("--text-color", getSetting("text_color", "#161225"));
  root.setProperty("--second-rgb", rgbTriplet(getSetting("second_color", "#8b5cf6")));
  root.setProperty("--anim", getSetting("animation_duration", 600) + "ms");

  const alertEl = document.getElementById("alert");
  if (alertEl){
    const enter = getSetting("anim_direction", "up");
    alertEl.dataset.dir = enter;
    alertEl.dataset.out = resolveExitDirection(enter, getSetting("exit_direction", "same"));
  }

  if (isShowing) fitCard();
}

function accentFor(type){
  const map = {
    follow: getSetting("follow_color", "#ff4d8d"),
    sub: getSetting("sub_color", "#ff1bdf"),
    gift: getSetting("gift_color", "#78beff"),
    community: getSetting("community_color", "#2abdff"),
    cheer: getSetting("cheer_color", "#2abdff"),
    tip: getSetting("tip_color", "#00fe9f"),
    raid: getSetting("raid_color", "#ffb020"),
    host: getSetting("host_color", "#2abdff")
  };
  return map[type] || "#ffffff";
}

function titleFor(type, amount){
  if (type === "sub") return amount > 1 ? getSetting("resub_title", "Re_|Sub") : getSetting("sub_title", "New_|Sub");
  return getSetting(type + "_title", "");
}

function unitFor(type, amount){
  if (type === "gift") return amount > 1 ? getSetting("gift_unit", "Subs offerts") : getSetting("gift_unit_one", "Sub offert");
  if (type === "community") return amount > 1 ? getSetting("community_unit", "Subs offerts") : getSetting("community_unit_one", "Sub offert");
  return getSetting(type + "_unit", "");
}

function formatAmount(n){
  const value = Number(n) || 0;
  if (Number.isInteger(value)) return value.toLocaleString("fr-FR");
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  if (key.includes("sub")){
    if (!isGiftEvent(ev)) return "sub";
    return isBulkGift(ev) ? "community" : "gift";
  }

  return null;
}

// Sub offert : StreamElements (gifted / bulkGifted) ou Streamlabs
// (gifter, sub_type "subgift" / "communitygift"…).
function isGiftEvent(ev){
  const data = ev?.data || {};
  const subType = String(ev?.sub_type ?? ev?.subType ?? data.sub_type ?? "").toLowerCase();
  return Boolean(ev?.gifted || ev?.bulkGifted || data.gifted || data.bulkGifted || ev?.gifter || data.gifter || subType.includes("gift"));
}

function isBulkGift(ev){
  const data = ev?.data || {};
  const subType = String(ev?.sub_type ?? ev?.subType ?? data.sub_type ?? "").toLowerCase();
  return Boolean(ev?.bulkGifted || data.bulkGifted || subType.includes("community"));
}

// Lors d'un gift communautaire, StreamElements envoie l'évènement groupé
// (bulkGifted) PUIS un évènement par destinataire (isCommunityGift) : on
// n'affiche que le groupé.
function isCommunityGiftRecipient(ev){
  return Boolean(ev?.isCommunityGift || ev?.data?.isCommunityGift);
}

function extractPayload(type, ev){
  const data = ev?.data || {};
  const name = ev?.name || ev?.from || data.displayName || data.nick || "Anonyme";
  const message = String(ev?.message ?? data.text ?? data.message ?? "");

  let amount = Number(ev?.amount ?? data.amount ?? 0) || 0;
  if (type === "raid" || type === "host") amount = Number(ev?.viewers ?? amount) || 0;
  // Pour un sub, amount = nombre de mois cumulés (1 pour un nouveau sub)
  if (type === "sub") amount = Math.max(1, Math.round(amount));

  if (type === "gift" || type === "community"){
    // name = destinataire (gift) ou gifteur (community), sender/gifter = la
    // personne qui offre
    const gifter = ev?.sender || data.sender || ev?.gifter || data.gifter || "";
    const community = type === "community";
    return {
      name: gifter || name,
      gifter: gifter || name,
      amount: community ? Math.max(1, Math.round(amount)) : 1,
      message: "",
      recipient: !community && gifter && gifter !== name ? name : ""
    };
  }

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
// Son
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
// Rendu de la carte
// ------------------------------------
function setTitle(text){
  const lines = String(text || "").split("|").map(s => s.trim()).filter(Boolean);
  for (const layer of document.querySelectorAll("#alertTitle .title-layer")){
    layer.replaceChildren(...lines.map(line => {
      const div = document.createElement("div");
      div.textContent = line;
      return div;
    }));
  }
}

// Ajuste la taille du titre au bloc noir, puis l'épaisseur du trait et le
// décalage du calque arrière proportionnellement à cette taille.
function fitTitle(){
  const title = document.getElementById("alertTitle");
  const panel = title?.parentElement;
  const front = title?.querySelector(".title-layer--front");
  if (!title || !panel || !front) return;

  const cs = getComputedStyle(panel);
  const availW = panel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const availH = panel.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (availW <= 0 || availH <= 0) return;

  const probe = 100;
  title.style.fontSize = probe + "px";
  const w = front.scrollWidth || 1;
  const h = front.scrollHeight || 1;
  // Marge pour le trait et le décalage du calque arrière
  const size = Math.max(8, Math.min((availW * 0.9) / w, (availH * 0.9) / h) * probe);

  title.style.fontSize = size + "px";
  title.style.setProperty("--stroke", Math.max(1.2, size * 0.045).toFixed(2) + "px");
  title.style.setProperty("--off", Math.max(2, size * 0.055).toFixed(2) + "px");
}

// "MOIS" est condensé via scaleX : on retire l'espace laissé vide à droite.
function fitUnit(){
  const unit = document.getElementById("alertUnit");
  if (!unit) return;
  unit.style.marginRight = "0px";
  const width = unit.offsetWidth;
  unit.style.marginRight = (-(1 - 0.62) * width).toFixed(2) + "px";
}

function fitCard(){
  fitTitle();
  fitUnit();
}

// Remplit el avec template, les {variables} devenant des pseudos en gras et
// le texte autour (ex. " → ") en graisse normale. textContent partout : les
// pseudos viennent du chat, jamais d'innerHTML.
function renderTemplate(el, template, vars){
  const parts = String(template || "").split(/(\{\w+\})/);
  el.replaceChildren(...parts.filter(Boolean).map(part => {
    const match = part.match(/^\{(\w+)\}$/);
    if (match && match[1] in vars){
      const strong = document.createElement("strong");
      strong.textContent = vars[match[1]];
      return strong;
    }
    return document.createTextNode(part);
  }));
}

function countUp(el, target, duration, delay){
  cancelAnimationFrame(countFrame);
  if (!el) return;

  const isInt = Number.isInteger(target);
  const format = (v) => isInt
    ? Math.round(v).toLocaleString("fr-FR")
    : v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || target <= 0){
    el.textContent = formatAmount(target);
    return;
  }

  el.textContent = format(0);
  const start = performance.now() + delay;

  function tick(now){
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format(target * eased);
    if (t < 1) countFrame = requestAnimationFrame(tick);
  }
  countFrame = requestAnimationFrame(tick);
}

// ------------------------------------
// File d'attente / affichage
// ------------------------------------
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

  const alertEl = document.getElementById("alert");
  const iconEl = document.getElementById("alertIcon");
  const numberEl = document.getElementById("alertNumber");
  const unitEl = document.getElementById("alertUnit");
  const nameEl = document.getElementById("alertName");
  const messageEl = document.getElementById("alertMessage");

  setTitle(titleFor(type, payload.amount));
  if (iconEl) iconEl.textContent = iconMap[type] || "celebration";
  if (unitEl) unitEl.textContent = unitFor(type, payload.amount);
  if (nameEl){
    if (type === "gift" && payload.recipient){
      renderTemplate(nameEl, getSetting("gift_name", "{gifter} → {recipient}"), { gifter: payload.gifter, recipient: payload.recipient });
    } else {
      renderTemplate(nameEl, "{name}", { name: payload.name });
    }
  }

  const hasNumber = type !== "follow";
  if (numberEl){
    if (hasNumber) countUp(numberEl, payload.amount, 900, 450);
    else {
      cancelAnimationFrame(countFrame);
      numberEl.textContent = "";
    }
  }

  const trimmedMessage = payload.message.trim();
  const showMessage = getSetting("show_message", "yes") === "yes" && trimmedMessage;
  if (messageEl){
    if (type === "gift" || type === "community") messageEl.textContent = "";
    else messageEl.textContent = showMessage ? `« ${trimmedMessage} »` : "";
  }

  if (alertEl){
    alertEl.classList.toggle("no-glitch", getSetting("glitch_enabled", "yes") !== "yes");
    alertEl.classList.toggle("no-idle", getSetting("title_idle", "yes") !== "yes");
    alertEl.classList.remove("is-visible", "is-leaving");
    void alertEl.offsetWidth;
    fitCard();
    alertEl.classList.add("is-visible");
  }

  // Les polices Google peuvent arriver après le premier rendu : on réajuste.
  if (document.fonts?.ready) document.fonts.ready.then(() => { if (isShowing) fitCard(); });

  playSound();

  hideTimer = window.setTimeout(hideCurrent, getSetting("display_duration", 6000));
}

function hideCurrent(){
  const alertEl = document.getElementById("alert");
  const animDuration = getSetting("animation_duration", 600);

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

  if ((type === "gift" || type === "community") && isCommunityGiftRecipient(ev)) return;
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
