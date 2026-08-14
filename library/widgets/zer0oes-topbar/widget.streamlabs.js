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

const $ = (id) => document.getElementById(id);

/* =========================
   Utils
========================= */
function num(v, fallback = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let h = String(hex).replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function hexToRgba(hex, opacity = 1) {
  const { r, g, b } = hexToRgb(hex);
  const a = clamp(num(opacity, 1), 0, 1);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function hexToRgbStr(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r},${g},${b}`;
}

// Ombre partagée par tous les textes/icônes (date, labels, social) — un seul
// jeu de champs shadow1/shadow2, plus de variante par zone.
function dropShadowFilter(f) {
  const ds1 = `drop-shadow(${num(f.shadow1X, 0)}px ${num(f.shadow1Y, 1)}px ${num(f.shadow1Blur, 0)}px ${hexToRgba(
    f.shadow1Color || "#7A00FF",
    f.shadow1Opacity
  )})`;
  const ds2 = `drop-shadow(${num(f.shadow2X, 0)}px ${num(f.shadow2Y, 2)}px ${num(f.shadow2Blur, 0)}px ${hexToRgba(
    f.shadow2Color || "#78BEFF",
    f.shadow2Opacity
  )})`;
  return `${ds1} ${ds2}`;
}

/* =========================
   Fonts
========================= */
const ALLOWED_FONTS = ["Poppins", "Inter", "Montserrat", "Roboto"];
function safeFont(family) {
  const f = String(family || "").trim();
  return ALLOWED_FONTS.includes(f) ? f : "Poppins";
}
async function loadGoogleFont(family) {
  const link = $("googleFontLink");
  if (!link) return;

  const fam = safeFont(family);
  const famParam = encodeURIComponent(fam).replace(/%20/g, "+");
  link.href = `https://fonts.googleapis.com/css2?family=${famParam}:wght@300;400;500;600;700&display=swap`;

  try {
    if (document.fonts?.load) {
      await document.fonts.load(`500 16px "${fam}"`);
      await document.fonts.ready;
    }
  } catch (_) {}
}

/* =========================
   Mise en page : ordre des zones + position de la barre
========================= */
function applyZonesOrder(zonesOrder) {
  const map = { date: $("zoneDate"), labels: $("zoneLabels"), social: $("zoneSocial") };
  const tokens = [...new Set(
    String(zonesOrder ?? "date,labels,social")
      .toLowerCase()
      .split(",")
      .map((t) => t.trim())
      .filter((t) => map[t])
  )];

  Object.entries(map).forEach(([token, el]) => {
    if (!el) return;
    el.classList.toggle("is-hidden", !tokens.includes(token));
  });
  tokens.forEach((token, i) => { if (map[token]) map[token].style.order = String(i); });
}

function applyBorderPosition(borderPosition) {
  const textRow = $("textRow");
  const borderBar = $("borderBar");
  if (!textRow || !borderBar) return;

  if (String(borderPosition ?? "bottom").toLowerCase() === "top") {
    borderBar.style.order = "0";
    textRow.style.order = "1";
  } else {
    textRow.style.order = "0";
    borderBar.style.order = "1";
  }
}

/* =========================
   Date — format configurable (JJ/MM/AAAA HH:mm:ss)
========================= */
const DEFAULT_DATE_FORMAT = "JJ/MM/AAAA HH:mm";
let dateFormat = DEFAULT_DATE_FORMAT;

function formatDateTime(pattern, date) {
  const pad = (n) => String(n).padStart(2, "0");
  const tokens = {
    AAAA: String(date.getFullYear()),
    JJ: pad(date.getDate()),
    MM: pad(date.getMonth() + 1),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  };
  return pattern.replace(/AAAA|JJ|MM|HH|mm|ss/g, (token) => tokens[token]);
}

function updateDate() {
  const el = $("date");
  if (!el) return;
  el.textContent = formatDateTime(dateFormat, new Date());
}

// Largeur réservée pour la date : certaines polices (ex. Poppins) n'ont pas
// de chiffres à largeur fixe, donc le texte change de quelques pixels de
// large à chaque tick des secondes — ce qui redistribue l'espace du flex
// et fait "trembler" la zone labels centrée. On mesure la largeur maximale
// possible (chaque position numérique remplacée par son chiffre le plus
// large) une fois par changement de police/taille/format, et on la fige
// comme largeur de #date : le texte affiché ne redimensionne plus jamais
// sa boîte, quels que soient les chiffres affichés ensuite.
let dateWidthCanvas = null;
function measureDateReservedWidth(pattern, family, size, weight) {
  if (!dateWidthCanvas) dateWidthCanvas = document.createElement("canvas");
  const ctx = dateWidthCanvas.getContext("2d");
  ctx.font = `${weight} ${size}px "${family}"`;

  const base = formatDateTime(pattern, new Date(2020, 0, 1, 0, 0, 0));
  let maxWidth = 0;
  for (let d = 0; d <= 9; d++) {
    const sample = base.replace(/[0-9]/g, String(d));
    maxWidth = Math.max(maxWidth, ctx.measureText(sample).width);
  }
  return maxWidth;
}

function applyDateReservedWidth(family, size, weight) {
  const el = $("date");
  if (!el) return;
  const reserved = measureDateReservedWidth(dateFormat, family, size, weight);
  el.style.width = `${Math.ceil(reserved) + 1}px`;
}

/* =========================
   Thème de texte partagé — appliqué identiquement à la date, aux labels
   et au social panel (police, taille, graisse, couleur, ombres).
========================= */
function applyTextTheme(f) {
  const family = safeFont(f.fontFamily);
  const size = clamp(num(f.fontSize, 13), 1, 200);
  const weight = String(f.fontWeight || "500");
  const color = f.textColor || "#FFFFFF";
  const filterValue = dropShadowFilter(f);

  // Date
  const dateRow = document.querySelector(".zone-date .date-row");
  const dateEl = $("date");
  const dateIcon = document.querySelector(".zone-date .icon");
  if (dateRow) dateRow.style.setProperty("color", color, "important");
  if (dateEl) {
    dateEl.style.setProperty("font-family", `'${family}', sans-serif`, "important");
    dateEl.style.setProperty("font-size", `${size}px`, "important");
    dateEl.style.setProperty("font-weight", weight, "important");
    dateEl.style.setProperty("color", color, "important");
    dateEl.style.setProperty("filter", filterValue, "important");
  }
  if (dateIcon) {
    dateIcon.style.setProperty("color", color, "important");
    dateIcon.style.setProperty("filter", filterValue, "important");
  }
  applyDateReservedWidth(family, size, weight);

  // Labels
  document.querySelectorAll(".zone-labels .txt").forEach((node) => {
    node.style.setProperty("font-family", `'${family}', sans-serif`, "important");
    node.style.setProperty("font-size", `${size}px`, "important");
    node.style.setProperty("font-weight", weight, "important");
    node.style.setProperty("color", color, "important");
    node.style.setProperty("white-space", "nowrap", "important");
    node.style.setProperty("filter", filterValue, "important");
    node.style.setProperty("transition", "opacity 220ms ease, transform 220ms ease", "important");
    node.style.setProperty("will-change", "opacity, transform", "important");
    if (!node.style.opacity) node.style.opacity = "1";
    if (!node.style.transform) node.style.transform = "translateY(0px)";
  });

  document.querySelectorAll(".zone-labels .icon.material-symbols-sharp").forEach((ico) => {
    ico.style.setProperty("color", color, "important");
    ico.style.setProperty("filter", filterValue, "important");
    ico.style.setProperty("font-size", "24px", "important");
    ico.style.setProperty("line-height", "1", "important");
    ico.style.setProperty("display", "flex", "important");
    ico.style.setProperty("align-items", "center", "important");
    ico.style.setProperty("justify-content", "center", "important");
  });

  // Social : appliqué au conteneur stable #socials (et non aux enfants,
  // recréés à chaque rotation du carrousel par renderSocial) — la couleur
  // et la police sont héritées, et `filter` s'applique visuellement à tout
  // le sous-arbre rendu même si la propriété n'est pas héritée.
  const socialsEl = $("socials");
  if (socialsEl) {
    socialsEl.style.setProperty("color", color, "important");
    socialsEl.style.setProperty("font-family", `'${family}', sans-serif`, "important");
    socialsEl.style.setProperty("font-size", `${size}px`, "important");
    socialsEl.style.setProperty("font-weight", weight, "important");
    socialsEl.style.setProperty("filter", filterValue, "important");
  }

  applyLabelsOrder(f);
}

/* =========================
   Labels (follow / sub / cheer / tip)
========================= */
function applyLabelsOrder(f) {
  const orderStr = String(f.labelsOrderCustom ?? "follow,sub,cheer,tip").toLowerCase().trim();
  const map = {
    follow: $("lblFollow")?.closest(".label"),
    sub: $("lblSub")?.closest(".label"),
    cheer: $("lblCheer")?.closest(".label"),
    tip: $("lblTip")?.closest(".label"),
  };
  const tokens = [...new Set(
    orderStr.split(",").map((t) => t.trim()).filter((t) => map[t])
  )];

  Object.entries(map).forEach(([token, el]) => {
    if (!el) return;
    el.style.display = tokens.includes(token) ? "flex" : "none";
  });
  tokens.forEach((t, i) => { if (map[t]) map[t].style.order = String(i); });
}

function getLabelIconByKey(key) {
  const map = { follow: $("icoFollow"), sub: $("icoSub"), cheer: $("icoCheer"), tip: $("icoTip") };
  return map[key] || null;
}

function hitLabelIcon(key, glowColor) {
  const el = getLabelIconByKey(key);
  if (!el) return;
  el.style.setProperty("--hit-rgb", hexToRgbStr(glowColor));
  el.classList.remove("is-hit");
  void el.offsetWidth;
  el.classList.add("is-hit");
  clearTimeout(el.__hitT);
  el.__hitT = setTimeout(() => el.classList.remove("is-hit"), 750);
}

const animLocks = new Map();
function setTextWithFadeSlide(el, newText, opts = {}) {
  if (!el) return;
  const next = String(newText ?? "").trim();
  if (!next) return;
  const current = String(el.textContent ?? "").trim();
  if (current === next) return;

  const duration = Number(opts.duration ?? 220);
  const distance = Number(opts.distance ?? 10);

  if (animLocks.has(el)) {
    const { t1, t2 } = animLocks.get(el);
    if (t1) clearTimeout(t1);
    if (t2) clearTimeout(t2);
    animLocks.delete(el);
  }

  el.style.opacity = "0";
  el.style.transform = `translateY(${distance}px)`;

  const t1 = setTimeout(() => {
    el.textContent = next;
    el.style.transition = "none";
    el.style.opacity = "0";
    el.style.transform = `translateY(${distance}px)`;
    void el.offsetHeight;
    el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0px)";
    });
    const t2 = setTimeout(() => animLocks.delete(el), duration + 30);
    animLocks.set(el, { t1: null, t2 });
  }, duration);

  animLocks.set(el, { t1, t2: null });
}

const labelsState = { follow: null, sub: null, cheer: null, cheerAmt: 0, tip: null, tipAmt: 0 };

function renderLabelsInitial() {
  if ($("lblFollow") && labelsState.follow) $("lblFollow").textContent = labelsState.follow;
  if ($("lblSub") && labelsState.sub) $("lblSub").textContent = labelsState.sub;
  if ($("lblCheer") && labelsState.cheer) $("lblCheer").textContent = `${labelsState.cheer} (${labelsState.cheerAmt})`;
  if ($("lblTip") && labelsState.tip) $("lblTip").textContent = `${labelsState.tip} (${labelsState.tipAmt}€)`;
}

function initLabelsFromRecents(recents) {
  if (!Array.isArray(recents) || recents.length === 0) return;

  for (let i = 0; i < recents.length; i++) {
    const r = recents[i];
    const t = String(r?.type || r?.listener || "").toLowerCase();

    if (!labelsState.follow && (t.includes("follow") || t === "follower")) {
      labelsState.follow = r?.name || r?.username || r?.displayName || null;
      continue;
    }
    if (!labelsState.sub && (t.includes("sub") || t === "subscriber")) {
      labelsState.sub = r?.name || r?.username || r?.displayName || null;
      continue;
    }
    if (!labelsState.cheer && (t.includes("cheer") || t.includes("bits"))) {
      labelsState.cheer = r?.name || r?.username || r?.displayName || null;
      labelsState.cheerAmt = r?.amount || r?.bits || 0;
      continue;
    }
    if (!labelsState.tip && (t.includes("tip") || t.includes("donation"))) {
      labelsState.tip = r?.name || r?.username || r?.displayName || null;
      labelsState.tipAmt = r?.amount || 0;
      continue;
    }
    if (labelsState.follow && labelsState.sub && labelsState.cheer && labelsState.tip) break;
  }
}

let lastLabelsFields = {};
function handleLabelsEvent(detail) {
  const e = detail?.event || detail;
  const typeRaw = (e?.type || detail?.listener || "").toString().toLowerCase();

  if (typeRaw.includes("follow")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;
    labelsState.follow = name;
    setTextWithFadeSlide($("lblFollow"), name);
    hitLabelIcon("follow", lastLabelsFields?.hitFollowColor || "#FF4D9D");
    return;
  }
  if (typeRaw.includes("sub")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;
    labelsState.sub = name;
    setTextWithFadeSlide($("lblSub"), name);
    hitLabelIcon("sub", lastLabelsFields?.hitSubColor || "#2ABDFF");
    return;
  }
  if (typeRaw.includes("cheer") || typeRaw.includes("bits")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;
    const amt = e?.amount || e?.bits || e?.message?.amount || 0;
    labelsState.cheer = name;
    labelsState.cheerAmt = amt;
    setTextWithFadeSlide($("lblCheer"), `${name} (${amt})`);
    hitLabelIcon("cheer", lastLabelsFields?.hitCheerColor || "#FF1BDF");
    return;
  }
  if (typeRaw.includes("tip") || typeRaw.includes("donation")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;
    const amt = e?.amount || e?.message?.amount || 0;
    labelsState.tip = name;
    labelsState.tipAmt = amt;
    setTextWithFadeSlide($("lblTip"), `${name} (${amt}€)`);
    hitLabelIcon("tip", lastLabelsFields?.hitTipColor || "#5900FF");
    return;
  }
}

/* =========================
   Social panel
========================= */
const SOCIALS_CONFIG = [
  { key: "youtube", icon: "fa-brands fa-youtube", label: "YouTube" },
  { key: "twitch", icon: "fa-brands fa-twitch", label: "Twitch" },
  { key: "instagram", icon: "fa-brands fa-instagram", label: "Instagram" },
  { key: "tiktok", icon: "fa-brands fa-tiktok", label: "TikTok" },
  { key: "x", icon: "fa-brands fa-x-twitter", label: "X" },
  { key: "facebook", icon: "fa-brands fa-facebook", label: "Facebook" },
];

let socialTimer = null;

function buildSocialList(f) {
  const list = [];
  SOCIALS_CONFIG.forEach(({ key, icon, label }) => {
    const enabled = !!f[`${key}Enabled`];
    const name = String(f[`${key}Name`] || "").trim();
    if (!enabled || !name) return;
    list.push({ icon, label, name });
  });
  return list;
}

function renderSocial(item, itemMs) {
  const socialsEl = $("socials");
  if (!socialsEl) return;

  socialsEl.innerHTML = `
    <div class="row">
      <i class="icon anim ${item.icon}" aria-hidden="true"></i>
      <span class="name anim">${item.name}</span>
    </div>
  `;

  const iconEl = socialsEl.querySelector(".icon.anim");
  const nameEl = socialsEl.querySelector(".name.anim");
  const dur = `${itemMs}ms, ${itemMs}ms`;
  if (iconEl) iconEl.style.animationDuration = dur;
  if (nameEl) nameEl.style.animationDuration = dur;
}

function startSocialLoop(list, itemMs) {
  clearInterval(socialTimer);
  const socialsEl = $("socials");
  if (!socialsEl) return;

  if (!list.length) {
    socialsEl.innerHTML = "";
    return;
  }

  let index = 0;
  renderSocial(list[index], itemMs);
  socialTimer = setInterval(() => {
    index = (index + 1) % list.length;
    renderSocial(list[index], itemMs);
  }, itemMs);
}

function initSocial(f) {
  const list = buildSocialList(f);
  const itemMs = clamp(num(f.animItemMs, 2000), 300, 600000);
  startSocialLoop(list, itemMs);
}

/* =========================
   Barre : cycle visible → sortie → cachée → entrée → (répète)
========================= */
const BORDER_ANIMATIONS = ["fade", "wipe", "slide", "pulse", "flicker", "sweep", "none"];
let borderCycleTimer = null;

// "flicker" et "sweep" jouent un effet supplémentaire (keyframes sur une
// classe temporaire) en plus du cycle visible/caché piloté par is-hidden.
function playBorderExtraEffect(line, anim, durationMs) {
  if (anim === "flicker") {
    const cls = line.classList.contains("is-hidden") ? "is-flicker-out" : "is-flicker-in";
    line.classList.remove("is-flicker-in", "is-flicker-out");
    void line.offsetWidth;
    line.style.setProperty("--border-anim-ms", `${durationMs}ms`);
    line.classList.add(cls);
    setTimeout(() => line.classList.remove(cls), durationMs);
    return;
  }
  if (anim === "sweep") {
    line.classList.remove("is-sweeping");
    void line.offsetWidth;
    line.style.setProperty("--border-anim-ms", `${durationMs}ms`);
    line.classList.add("is-sweeping");
    setTimeout(() => line.classList.remove("is-sweeping"), durationMs);
  }
}

function initBorder(f) {
  const line = $("borderBar");
  if (!line) return;

  const requested = String(f.borderAnimation || "").toLowerCase().trim();
  const anim = BORDER_ANIMATIONS.includes(requested) ? requested : "fade";
  line.dataset.anim = anim;

  // Durée de l'animation d'entrée/sortie (ms) : remplace la durée fixe
  // déclarée dans le CSS pour chaque style.
  const inOutMs = clamp(num(f.borderAnimDurationMs, 400), 50, 5000);
  line.style.transitionDuration = `${inOutMs}ms`;

  clearTimeout(borderCycleTimer);
  line.classList.remove("is-hidden", "is-flicker-in", "is-flicker-out", "is-sweeping");
  if (anim === "none") return;

  const visibleMs = clamp(num(f.borderVisibleDurationSec, 900), 1, 86400) * 1000;
  const hiddenMs = clamp(num(f.borderHiddenDurationSec, 60), 1, 86400) * 1000;

  // Chaîne de setTimeout (plutôt qu'un setInterval unique) car les 4 phases
  // (entrée, affichée, sortie, cachée) ont des durées indépendantes : chaque
  // phase programme elle-même la suivante.
  const goHidden = () => {
    line.classList.add("is-hidden"); // démarre la transition de sortie (inOutMs)
    playBorderExtraEffect(line, anim, inOutMs);
    borderCycleTimer = setTimeout(goVisible, inOutMs + hiddenMs);
  };
  const goVisible = () => {
    line.classList.remove("is-hidden"); // démarre la transition d'entrée (inOutMs)
    playBorderExtraEffect(line, anim, inOutMs);
    borderCycleTimer = setTimeout(goHidden, visibleMs);
  };

  borderCycleTimer = setTimeout(goHidden, visibleMs);
}

/* =========================
   Init global
========================= */
async function applyAll(rawFieldData) {
  const f = rawFieldData || {};
  lastLabelsFields = f;
  dateFormat = String(f.dateFormat || "").trim() || DEFAULT_DATE_FORMAT;

  await loadGoogleFont(f.fontFamily);

  applyTextTheme(f);
  initSocial(f);
  applyZonesOrder(f.zonesOrder);
  applyBorderPosition(f.borderPosition);
  initBorder(f);
}

window.addEventListener("onWidgetLoad", async (obj) => {
  const f = obj?.detail?.fieldData || {};
  await applyAll(f);
  initLabelsFromRecents(obj?.detail?.recents || []);
  renderLabelsInitial();
  updateDate();
});

window.addEventListener("onWidgetUpdate", async (obj) => {
  await applyAll(obj?.detail?.fieldData || {});
  updateDate();
});

window.addEventListener("onEventReceived", (obj) => {
  handleLabelsEvent(obj?.detail);
});

document.addEventListener("DOMContentLoaded", () => {
  updateDate();
});

setInterval(updateDate, 1000);
