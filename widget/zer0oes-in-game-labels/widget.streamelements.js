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

/* =========================
   Normalize fieldData (indexé ou nommé)
========================= */
function normalizeFieldData(raw) {
  if (!raw) return {};
  if (raw.fontFamily || raw.shadow1Color || raw.labelsOrderCustom || raw.hitFollowColor) return raw;

  const idx = (k, fallback) => (raw[k] !== undefined ? raw[k] : fallback);
  return {
    fontFamily: idx("0", "Poppins"),
    fontSize: idx("1", "13"),
    fontWeight: idx("2", "500"),
    textColor: idx("3", "#FFFFFF"),

    shadow1Color: idx("4", "#7A00FF"),
    shadow1Opacity: idx("5", "1"),
    shadow1X: idx("6", "0"),
    shadow1Y: idx("7", "1"),
    shadow1Blur: idx("8", "0"),

    shadow2Color: idx("9", "#78BEFF"),
    shadow2Opacity: idx("10", "0.5"),
    shadow2X: idx("11", "0"),
    shadow2Y: idx("12", "2"),
    shadow2Blur: idx("13", "0"),

    labelsOrderCustom: idx("14", "follow,sub,cheer,tip"),

    hitFollowColor: idx("15", "#FF4D9D"),
    hitSubColor: idx("16", "#2ABDFF"),
    hitCheerColor: idx("17", "#FF1BDF"),
    hitTipColor: idx("18", "#5900FF"),
  };
}

/* =========================
   Colors
========================= */
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
  return `${r},${g},${b}`; // pour rgba(var(--hit-rgb), alpha)
}

/* =========================
   Fonts (FIABLE)
========================= */
async function loadGoogleFont(family, weight = "500") {
  const link = $("googleFontLink");
  if (!link) return;

  const fam = String(family || "Poppins").trim();
  const famParam = encodeURIComponent(fam).replace(/%20/g, "+");
  link.href = `https://fonts.googleapis.com/css2?family=${famParam}:wght@300;400;500;600;700&display=swap`;

  try {
    if (document.fonts && document.fonts.load) {
      await document.fonts.load(`${weight} 16px "${fam}"`);
      await document.fonts.ready;
    }
  } catch (_) {}
}

/* =========================
   Order (réordonne les .label)
========================= */
function applyOrder(f) {
  const orderStr = String(f.labelsOrderCustom ?? "follow,sub,cheer,tip").toLowerCase().trim();

  const map = {
    follow: $("lblFollow")?.closest(".label"),
    sub: $("lblSub")?.closest(".label"),
    cheer: $("lblCheer")?.closest(".label"),
    tip: $("lblTip")?.closest(".label"),
  };

  const tokens = [...new Set(
    orderStr
      .split(",")
      .map((token) => token.trim())
      .filter((token) => map[token])
  )];

  Object.entries(map).forEach(([token, element]) => {
    if (!element) return;
    element.style.display = tokens.includes(token) ? "flex" : "none";
  });

  tokens.forEach((t, i) => { if (map[t]) map[t].style.order = String(i); });
}

/* =========================
   HIT Icon (utilise tes ids ico*)
========================= */
function getIconByKey(key) {
  const map = {
    follow: $("icoFollow"),
    sub: $("icoSub"),
    cheer: $("icoCheer"),
    tip: $("icoTip"),
  };
  return map[key] || null;
}

function hitIcon(key, glowColor) {
  const el = getIconByKey(key);
  if (!el) return;

  // couleur du hit
  el.style.setProperty("--hit-rgb", hexToRgbStr(glowColor));

  // restart animation
  el.classList.remove("is-hit");
  void el.offsetWidth; // reflow
  el.classList.add("is-hit");

  clearTimeout(el.__hitT);
  el.__hitT = setTimeout(() => el.classList.remove("is-hit"), 750);
}

/* =========================
   Theme (async)
   -> styles sur .txt ET .icon
   -> drop-shadow basé sur fields
========================= */
let lastFields = {};

async function applyTheme(rawFieldData) {
  const f = normalizeFieldData(rawFieldData);
  lastFields = f;

  const allowedFonts = ["Poppins", "Inter", "Montserrat", "Roboto"];
  const incomingFamily = String(f.fontFamily || "").trim();
  const family = allowedFonts.includes(incomingFamily) ? incomingFamily : "Poppins";

  const size = clamp(num(f.fontSize, 13), 1, 200);
  const weight = String(f.fontWeight || "500");
  const color = f.textColor || "#FFFFFF";

  await loadGoogleFont(family, weight);

  const ds1 = `drop-shadow(${num(f.shadow1X, 0)}px ${num(f.shadow1Y, 1)}px ${num(f.shadow1Blur, 0)}px ${hexToRgba(
    f.shadow1Color || "#7A00FF",
    f.shadow1Opacity
  )})`;

  const ds2 = `drop-shadow(${num(f.shadow2X, 0)}px ${num(f.shadow2Y, 2)}px ${num(f.shadow2Blur, 0)}px ${hexToRgba(
    f.shadow2Color || "#78BEFF",
    f.shadow2Opacity
  )})`;

  const filterValue = `${ds1} ${ds2}`;

  // Textes
  document.querySelectorAll(".txt").forEach((node) => {
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

  // Icônes
  document.querySelectorAll(".icon.material-symbols-sharp").forEach((ico) => {
    ico.style.setProperty("color", color, "important");
    ico.style.setProperty("filter", filterValue, "important");

    ico.style.setProperty("font-size", "24px", "important");
    ico.style.setProperty("line-height", "1", "important");
    ico.style.setProperty("display", "flex", "important");
    ico.style.setProperty("align-items", "center", "important");
    ico.style.setProperty("justify-content", "center", "important");
  });

  applyOrder(f);
}

/* =========================
   Fade out + slide DOWN
   Fade in  + slide UP
========================= */
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

/* =========================
   State
========================= */
const state = { follow: null, sub: null, cheer: null, cheerAmt: 0, tip: null, tipAmt: 0 };

/* =========================
   Render initial
========================= */
function renderInitial() {
  if ($("lblFollow") && state.follow) $("lblFollow").textContent = state.follow;
  if ($("lblSub") && state.sub) $("lblSub").textContent = state.sub;
  if ($("lblCheer") && state.cheer) $("lblCheer").textContent = `${state.cheer} (${state.cheerAmt})`;
  if ($("lblTip") && state.tip) $("lblTip").textContent = `${state.tip} (${state.tipAmt}€)`;
}

/* =========================
   Init from recents
========================= */
function initFromRecents(recents) {
  if (!Array.isArray(recents) || recents.length === 0) return;

  for (let i = 0; i < recents.length; i++) {
    const r = recents[i];
    const t = String(r?.type || r?.listener || "").toLowerCase();

    if (!state.follow && (t.includes("follow") || t === "follower")) {
      state.follow = r?.name || r?.username || r?.displayName || null;
      continue;
    }
    if (!state.sub && (t.includes("sub") || t === "subscriber")) {
      state.sub = r?.name || r?.username || r?.displayName || null;
      continue;
    }
    if (!state.cheer && (t.includes("cheer") || t.includes("bits"))) {
      state.cheer = r?.name || r?.username || r?.displayName || null;
      state.cheerAmt = r?.amount || r?.bits || 0;
      continue;
    }
    if (!state.tip && (t.includes("tip") || t.includes("donation"))) {
      state.tip = r?.name || r?.username || r?.displayName || null;
      state.tipAmt = r?.amount || 0;
      continue;
    }

    if (state.follow && state.sub && state.cheer && state.tip) break;
  }
}

/* =========================
   Live events (fade+slide + hit icon)
========================= */
function handleEvent(detail) {
  const e = detail?.event || detail;
  const typeRaw = (e?.type || detail?.listener || "").toString().toLowerCase();

  if (typeRaw.includes("follow")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;

    state.follow = name;
    setTextWithFadeSlide($("lblFollow"), name);
    hitIcon("follow", lastFields?.hitFollowColor || "#FF4D9D");
    return;
  }

  if (typeRaw.includes("sub")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;

    state.sub = name;
    setTextWithFadeSlide($("lblSub"), name);
    hitIcon("sub", lastFields?.hitSubColor || "#2ABDFF");
    return;
  }

  if (typeRaw.includes("cheer") || typeRaw.includes("bits")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;
    const amt = e?.amount || e?.bits || e?.message?.amount || 0;

    state.cheer = name;
    state.cheerAmt = amt;
    setTextWithFadeSlide($("lblCheer"), `${name} (${amt})`);
    hitIcon("cheer", lastFields?.hitCheerColor || "#FF1BDF");
    return;
  }

  if (typeRaw.includes("tip") || typeRaw.includes("donation")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;
    const amt = e?.amount || e?.message?.amount || 0;

    state.tip = name;
    state.tipAmt = amt;
    setTextWithFadeSlide($("lblTip"), `${name} (${amt}€)`);
    hitIcon("tip", lastFields?.hitTipColor || "#5900FF");
    return;
  }
}

/* =========================
   StreamElements hooks
========================= */
window.addEventListener("onWidgetLoad", async (obj) => {
  await applyTheme(obj?.detail?.fieldData || {});
  const recents = obj?.detail?.recents || [];
  initFromRecents(recents);
  renderInitial();
});

window.addEventListener("onWidgetUpdate", async (obj) => {
  await applyTheme(obj?.detail?.fieldData || {});
});

window.addEventListener("onEventReceived", (obj) => {
  handleEvent(obj?.detail);
});
