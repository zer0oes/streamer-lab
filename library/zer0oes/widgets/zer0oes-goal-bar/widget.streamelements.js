function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function num(v){
  const s = String(v ?? "").trim().replace(",", ".");
  const n = Number(s.replace(/[^\d.-]/g,''));
  return Number.isFinite(n) ? n : 0;
}

const iconMap = {
  follows: "favorite",
  subs: "star_shine",
  cheers: "diamond_shine",
  tips: "money_bag"
};

let SETTINGS = {};
let SESSION = null;
let lastCurrent = null;
let lastComplete = null;

// Bases (auto StreamElements) + incréments live
let subsBase = 0, subsAdded = 0;
let followsBase = 0, followsAdded = 0;
let cheersBase = 0, cheersAdded = 0;
let tipsBase = 0, tipsAdded = 0;

// ------------------------------------
// Google Fonts
// ------------------------------------
function setGoogleFont(family){
  const link = document.getElementById("googleFontLink");
  if (!link) return;

  const name = String(family || "Inter").trim();
  const urlName = name.replace(/\s+/g, "+");
  link.href = `https://fonts.googleapis.com/css2?family=${urlName}:wght@300;400;500;600;700;800&display=swap`;
  document.documentElement.style.setProperty("--font", `"${name}"`);
}

// ------------------------------------
// Couleurs (uni / dégradé)
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
function toRgba(hexValue, alpha){
  const { r, g, b } = hexToRgb(hexValue);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}
function buildPaint(type, color1, color2, angle, alpha){
  const c1 = alpha === undefined ? color1 : toRgba(color1, alpha);
  const c2 = alpha === undefined ? color2 : toRgba(color2, alpha);
  return type === "gradient" ? `linear-gradient(${angle}deg, ${c1}, ${c2})` : c1;
}

// ------------------------------------
// Forme du croissant (tracé exact fourni par le design, mis à l'échelle)
// ------------------------------------
function buildCrescentPath(totalWidthPx, totalHeightPx){
  const s = totalHeightPx / 24;
  const n = (v) => +(v * s).toFixed(3);
  const capW = n(21);
  const rightStart = +(totalWidthPx - capW).toFixed(3);

  return (
    `M${rightStart},${n(18)}` +
    `H${capW}` +
    `C${n(10.47)},${n(18)} ${n(1.71)},${n(10.14)} ${n(0.24)},0` +
    `c${n(-0.14)},${n(0.98)} ${n(-0.24)},${n(1.98)} ${n(-0.24)},${n(3)}` +
    `c0,${n(11.55)} ${n(9.45)},${n(21)} ${n(21)},${n(21)}` +
    `H${rightStart}` +
    `c${n(11.55)},0 ${n(21)},${n(-9.45)} ${n(21)},${n(-21)}` +
    `c0,${n(-1.02)} ${n(-0.1)},${n(-2.02)} ${n(-0.24)},${n(-3)}` +
    `c${n(-1.47)},${n(10.14)} ${n(-10.23)},${n(18)} ${n(-20.76)},${n(18)}` +
    `Z`
  );
}

// ------------------------------------
// Normalize helpers
// ------------------------------------
function isGoalType(v){
  const s = String(v ?? "").toLowerCase();
  return s === "follows" || s === "subs" || s === "tips" || s === "cheers";
}
function isColorType(v){
  const s = String(v ?? "").toLowerCase();
  return s === "solid" || s === "gradient";
}

// ------------------------------------
// Normalisation du fieldData nommé fourni par StreamElements
// ------------------------------------
function normalizeFields(raw){
  if (Array.isArray(raw)){
    raw = Object.fromEntries(raw.filter(field => field?.name).map(field => [field.name, field.value]));
  }
  raw = raw || {};

  return {
    font_family: String(raw.font_family ?? "Poppins"),
    font_weight: String(raw.font_weight ?? "500"),
    text_size: num(raw.text_size ?? 14),
    width: num(raw.width ?? 400),
    height: num(raw.height ?? 46),

    border_color: hexOr(raw.border_color, "#ffffff"),
    border_width: Math.max(0, num(raw.border_width ?? 1)),
    border_opacity: clamp(num(raw.border_opacity ?? 1), 0, 1),
    background_type: isColorType(raw.background_type) ? String(raw.background_type) : "gradient",
    background_color1: hexOr(raw.background_color1, "#161225"),
    background_color2: hexOr(raw.background_color2, "#231a3d"),
    background_opacity: clamp(num(raw.background_opacity ?? 1), 0, 1),

    follows_color_type: isColorType(raw.follows_color_type) ? String(raw.follows_color_type) : "solid",
    follows_color1: hexOr(raw.follows_color1, "#ff4d8d"),
    follows_color2: hexOr(raw.follows_color2, "#ff4d8d"),

    subs_color_type: isColorType(raw.subs_color_type) ? String(raw.subs_color_type) : "solid",
    subs_color1: hexOr(raw.subs_color1, "#2abdff"),
    subs_color2: hexOr(raw.subs_color2, "#2abdff"),

    cheers_color_type: isColorType(raw.cheers_color_type) ? String(raw.cheers_color_type) : "solid",
    cheers_color1: hexOr(raw.cheers_color1, "#ff1bdf"),
    cheers_color2: hexOr(raw.cheers_color2, "#ff1bdf"),

    tips_color_type: isColorType(raw.tips_color_type) ? String(raw.tips_color_type) : "solid",
    tips_color1: hexOr(raw.tips_color1, "#571bc3"),
    tips_color2: hexOr(raw.tips_color2, "#571bc3"),

    goal_type: isGoalType(raw.goal_type) ? String(raw.goal_type) : "tips",
    title: String(raw.title ?? "Donation goal"),
    goal_total: Math.max(1, num(raw.goal_total ?? 500))
  };
}

function refreshSettingsFromFieldData(raw){
  SETTINGS = normalizeFields(raw || {}) || {};
}

function getSetting(key, fallback){
  return (SETTINGS && SETTINGS[key] != null) ? SETTINGS[key] : fallback;
}

// ------------------------------------
// Totaux session (AUTO StreamElements)
// ------------------------------------
function pickFirstNumber(...vals){
  for (const v of vals){
    if (v !== undefined && v !== null && v !== "") return num(v);
  }
  return null;
}

function readTotalsFromSession(session){
  const s = session || {};
  const d = s?.data || s || {};
  const follows = pickFirstNumber(
    d?.["follower-total"]?.count,
    d?.["followers-total"]?.count,
    d?.["follower-count"]?.count
  );

  const subs = pickFirstNumber(
    d?.["subscriber-total"]?.count,
    d?.["subscriber-count"]?.count,
    d?.["subscribers-count"]?.count,
    d?.["subscriber-points"]?.amount,
    d?.["subscriber-points"]?.count
  );

  const cheers = pickFirstNumber(
    d?.["cheer-total"]?.amount,
    d?.["cheer-total"]?.count
  );

  const tips = pickFirstNumber(
    d?.["tip-total"]?.amount,
    d?.["tips-total"]?.amount
  );

  return { follows, subs, cheers, tips };
}

// ------------------------------------
// Values
// ------------------------------------
function getCurrentValue(type){
  if (type === "follows") return followsBase + followsAdded;
  if (type === "subs")    return subsBase + subsAdded;
  if (type === "tips")    return tipsBase + tipsAdded;
  if (type === "cheers")  return cheersBase + cheersAdded;
  return 0;
}

// ------------------------------------
// Fill
// ------------------------------------
let fillObserverStarted = false;

function bump(el){
  if (!el) return;
  el.classList.remove("is-bump");
  void el.offsetWidth;
  el.classList.add("is-bump");
}

function spawnConfetti(container){
  if (!container) return;

  const count = 16;
  for (let i = 0; i < count; i += 1){
    const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.6 - 0.3);
    const distance = 34 + Math.random() * 46;

    const piece = document.createElement("span");
    piece.className = "goal-confetti";
    piece.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--ty", `${Math.sin(angle) * distance - 16}px`);
    piece.style.setProperty("--rot", `${Math.round(Math.random() * 360)}deg`);
    piece.style.animationDelay = `${Math.random() * 90}ms`;
    piece.style.width = piece.style.height = `${4 + Math.random() * 4}px`;
    if (Math.random() > 0.5) piece.style.borderRadius = "50%";

    container.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

function celebrate(el){
  if (!el) return;
  el.classList.remove("is-complete");
  void el.offsetWidth;
  el.classList.add("is-complete");
  spawnConfetti(el);
}

function animateValueRoll(el, mask, previousText){
  if (!el || !mask) return;

  const ghost = document.createElement("span");
  ghost.className = "goal-value-ghost";
  ghost.textContent = previousText;
  mask.insertBefore(ghost, el);
  ghost.addEventListener("animationend", () => ghost.remove());

  el.classList.remove("is-entering");
  void el.offsetWidth;
  el.classList.add("is-entering");
}

function applyFillWidth(safePct){
  const progressWindow = document.getElementById("progressWindow");
  const fillEl = document.getElementById("fill");
  const goalEl = document.getElementById("goal");
  if (!progressWindow || !fillEl || !goalEl) return;

  progressWindow.style.width = safePct + "%";

  const setShapeIfPossible = () => {
    const fullWidthPx = goalEl.clientWidth;
    if (fullWidthPx && fullWidthPx >= 10){
      fillEl.style.width = fullWidthPx + "px";
      fillEl.style.clipPath = `path("${buildCrescentPath(fullWidthPx, 24)}")`;
      return true;
    }
    return false;
  };

  if (!setShapeIfPossible()){
    requestAnimationFrame(setShapeIfPossible);
  }

  if (!fillObserverStarted && typeof ResizeObserver !== "undefined"){
    fillObserverStarted = true;
    const ro = new ResizeObserver(() => setShapeIfPossible());
    ro.observe(goalEl);
  }
}

// ------------------------------------
// Render
// ------------------------------------
function update(){
  if (!SETTINGS) SETTINGS = {};

  const type      = String(getSetting("goal_type", "tips"));
  const target    = num(getSetting("goal_total", 500));
  const title     = String(getSetting("title", "Donation goal"));

  const w         = num(getSetting("width", 400));
  const h         = num(getSetting("height", 46));
  const ff        = String(getSetting("font_family", "Poppins"));
  const fw        = String(getSetting("font_weight", "500"));
  const textSize  = num(getSetting("text_size", 14));

  setGoogleFont(ff);
  document.documentElement.style.setProperty("--textWeight", fw);

  document.documentElement.style.setProperty("--w", w > 0 ? w + "px" : "100%");
  if (h > 0) document.documentElement.style.setProperty("--h", h + "px");
  if (textSize > 0) document.documentElement.style.setProperty("--textSize", textSize + "px");

  const borderColor = String(getSetting("border_color", "#ffffff"));
  const borderWidth = Math.max(0, num(getSetting("border_width", 1)));
  const borderOpacity = clamp(num(getSetting("border_opacity", 1)), 0, 1);
  document.documentElement.style.setProperty("--border-color", toRgba(borderColor, borderOpacity));
  document.documentElement.style.setProperty("--border-width", borderWidth + "px");

  const bgType = String(getSetting("background_type", "gradient"));
  const bgColor1 = String(getSetting("background_color1", "#161225"));
  const bgColor2 = String(getSetting("background_color2", "#231a3d"));
  const bgOpacity = clamp(num(getSetting("background_opacity", 1)), 0, 1);
  document.documentElement.style.setProperty("--bg", buildPaint(bgType, bgColor1, bgColor2, 135, bgOpacity));

  const progressType = String(getSetting(`${type}_color_type`, "solid"));
  const progressColor1 = String(getSetting(`${type}_color1`, "#571bc3"));
  const progressColor2 = String(getSetting(`${type}_color2`, progressColor1));
  const progressPaint = progressType === "gradient"
    ? buildPaint(progressType, progressColor2, progressColor1, 90)
    : buildPaint(progressType, progressColor1, progressColor2, 90);
  document.documentElement.style.setProperty("--progress-bg", progressPaint);
  document.documentElement.style.setProperty("--progress-glow", toRgba(progressColor1, 1));

  const titleEl = document.getElementById("title");
  if (titleEl) titleEl.textContent = title;

  const iconEl = document.getElementById("goalIcon");
  if (iconEl) iconEl.textContent = iconMap[type] || "money_bag";

  const current = getCurrentValue(type);
  const suffix = (type === "tips") ? "€" : "";

  const curEl = document.getElementById("current");
  const curMask = document.getElementById("currentMask");
  const tarEl = document.getElementById("target");
  const previousCurrentText = curEl ? curEl.textContent : "";
  if (curEl) curEl.textContent = suffix ? `${current}${suffix}` : `${current}`;
  if (tarEl) tarEl.textContent = suffix ? `${target}${suffix}` : `${target}`;

  if (lastCurrent !== null && current !== lastCurrent){
    bump(document.getElementById("goalIconWrap"));
    animateValueRoll(curEl, curMask, previousCurrentText);
  }
  lastCurrent = current;

  const isComplete = target > 0 && current >= target;
  const goalEl = document.getElementById("goal");
  if (lastComplete === false && isComplete){
    celebrate(goalEl);
  } else if (goalEl){
    if (isComplete) goalEl.classList.add("is-complete");
    else goalEl.classList.remove("is-complete");
  }
  lastComplete = isComplete;

  const pct = target > 0 ? (current / target) * 100 : 0;
  applyFillWidth(clamp(pct, 0, 100));
}

// ------------------------------------
// DEDUPE
// ------------------------------------
const SEEN = new Map();
const DEDUPE_MS = 6000;

function cleanupSeen(){
  const now = Date.now();
  for (const [k, t] of SEEN.entries()){
    if (now - t > DEDUPE_MS) SEEN.delete(k);
  }
}

function eventKey(listener, ev){
  const id = ev?.id ?? ev?._id ?? ev?.eventId ?? ev?.data?.id ?? ev?.data?._id ?? ev?.data?.eventId;
  if (id != null) return `id:${id}`;

  const type = String(ev?.type ?? "");
  const user = ev?.name ?? ev?.username ?? ev?.displayName ?? ev?.data?.name ?? ev?.data?.username ?? "";
  const amount =
    ev?.amount ?? ev?.data?.amount ?? ev?.data?.tipAmount ?? ev?.data?.donationAmount ??
    ev?.data?.count ?? ev?.count ?? ev?.data?.amountGifted ?? ev?.data?.bits ?? "";

  return `sig:${String(listener)}|${type}|${String(user)}|${String(amount)}`;
}

function shouldProcess(listener, ev){
  cleanupSeen();
  const key = eventKey(listener, ev);
  if (SEEN.has(key)) return false;
  SEEN.set(key, Date.now());
  return true;
}

// ------------------------------------
// Events
// ------------------------------------
function handleEvent(obj){
  const listener = String(obj?.detail?.listener || "").toLowerCase();
  const ev = obj?.detail?.event || null;
  if (!ev) return;

  if (!shouldProcess(listener, ev)) return;

  const type = String(ev.type || "").toLowerCase();

  // FOLLOW
  if (type === "follow" || listener.includes("follower")){
    followsAdded += 1;
    update();
    return;
  }

  // TIPS
  const isTip =
    type.includes("tip") || type.includes("donation") ||
    listener.includes("tip") || listener.includes("donation");

  if (isTip){
    const amount = num(
      ev.amount ??
      ev.tipAmount ??
      ev.donationAmount ??
      ev.total ??
      ev?.data?.amount ??
      ev?.data?.tipAmount ??
      ev?.data?.donationAmount ??
      ev?.data?.total ??
      0
    );

    if (amount > 0){
      tipsAdded += amount;
      update();
    }
    return;
  }

  // CHEERS / BITS
  const isCheer =
    type.includes("cheer") || type.includes("bits") || type.includes("bit") ||
    listener.includes("cheer") || listener.includes("bits");

  if (isCheer){
    const bits = num(
      ev.amount ??
      ev.bits ??
      ev?.data?.amount ??
      ev?.data?.bits ??
      ev?.data?.total ??
      0
    );

    if (bits > 0){
      cheersAdded += bits;
      update();
    }
    return;
  }

  // SUBS
  const looksLikeSub =
    listener.includes("sub") || listener.includes("subscriber") || listener.includes("subscription") ||
    type.includes("sub") || type.includes("subscriber") || type.includes("subscription") || type.includes("resub");

  const looksLikeGift =
    listener.includes("gift") || type.includes("gift") || type.includes("communitygift") || type.includes("subgift");

  if (looksLikeGift){
    const count = num(
      ev?.data?.amount ??
      ev?.data?.count ??
      ev?.data?.gifted ??
      ev?.data?.amountGifted ??
      ev?.amount ??
      ev?.count ??
      1
    );
    subsAdded += Math.max(1, count);
    update();
    return;
  }

  if (looksLikeSub){
    subsAdded += 1;
    update();
  }
}

// ------------------------------------
// Init
// ------------------------------------
function boot(rawFieldData){
  refreshSettingsFromFieldData(rawFieldData);
  const totals = readTotalsFromSession(SESSION);

  followsBase = totals.follows ?? followsBase ?? 0;
  cheersBase = totals.cheers ?? cheersBase ?? 0;
  subsBase = totals.subs ?? subsBase ?? 0;
  tipsBase = totals.tips ?? tipsBase ?? 0;

  followsAdded = 0;
  subsAdded = 0;
  cheersAdded = 0;
  tipsAdded = 0;

  update();
  requestAnimationFrame(update);
}

window.addEventListener("onWidgetLoad", (obj) => {
  SESSION = obj?.detail?.session || null;
  boot(obj?.detail?.fieldData || {});
});

window.addEventListener("onWidgetUpdate", (obj) => {
  boot(obj?.detail?.fieldData || {});
});

window.addEventListener("onSessionUpdate", (obj) => {
  const sess = obj?.detail?.session;
  if (!sess) return;

  SESSION = sess;
  const totals = readTotalsFromSession(SESSION);

  if (totals.follows !== null){
    followsBase = totals.follows;
    followsAdded = 0;
  }
  if (totals.cheers !== null){
    cheersBase = totals.cheers;
    cheersAdded = 0;
  }
  if (totals.subs !== null){
    subsBase = totals.subs;
    subsAdded = 0;
  }
  if (totals.tips !== null){
    tipsBase = totals.tips;
    tipsAdded = 0;
  }

  update();
});

window.addEventListener("onEventReceived", (obj) => {
  handleEvent(obj);
});
