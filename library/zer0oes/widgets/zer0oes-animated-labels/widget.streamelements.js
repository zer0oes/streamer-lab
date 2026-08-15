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

function colorToRgb(value, fallback) {
  const color = String(value || "").trim();
  const short = /^#([0-9a-f]{3})$/i.exec(color);
  const full = /^#([0-9a-f]{6})$/i.exec(color);
  const hex = full?.[1] || short?.[1].split("").map((digit) => digit + digit).join("");
  if (!hex) return fallback;
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(", ");
}

/* =========================
   Normalize fieldData (indexé ou nommé)
========================= */
function normalizeFieldData(raw) {
  if (!raw) return {};
  if (raw.fontFamily || raw.orderCustom) return raw;

  // Compatibilité avec l'ancien format Fields sous forme de tableau.
  const idx = (k, fallback) => (raw[k] !== undefined ? raw[k] : fallback);
  return {
    fontFamily: idx("0", "Poppins"),
    fontSize: idx("1", "13"),
    fontWeight: idx("2", "500"),
    textColor: idx("3", "#FFFFFF"),
    followGlowColor: idx("4", "#FF4D8D"),
    subGlowColor: idx("5", "#2ABDFF"),
    cheerGlowColor: idx("6", "#FF1BDF"),
    tipGlowColor: idx("7", "#571BC3"),
    orderCustom: idx("8", "follow,sub,cheer,tip"),
    showAmounts: idx("9", "yes"),
    animDuration: idx("10", "220"),
    animDistance: idx("11", "10"),
  };
}

/* =========================
   Fonts
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
   Order (colonnes)
========================= */
function applyOrder(f) {
  const orderStr = String(f.orderCustom ?? "follow,sub,cheer,tip").toLowerCase().trim();

  const map = {
    follow: $("colFollow"),
    sub: $("colSub"),
    cheer: $("colCheer"),
    tip: $("colTip"),
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
   Helpers DOM : on anime .txtInner
========================= */
function ensureInner(labelEl) {
  if (!labelEl) return null;
  let inner = labelEl.querySelector(".txtInner");
  if (!inner) {
    inner = document.createElement("span");
    inner.className = "txtInner";
    labelEl.textContent = "";
    labelEl.appendChild(inner);
  }
  return inner;
}

/* =========================
   Theme (sans ombres)
========================= */
let lastFields = {};

async function applyTheme(rawFieldData) {
  const f = normalizeFieldData(rawFieldData);
  lastFields = f;

  const allowedFonts = ["Poppins", "Inter", "Montserrat", "Roboto"];
  const incomingFamily = String(f.fontFamily || "").trim();
  const family = allowedFonts.includes(incomingFamily) ? incomingFamily : "Poppins";

  const size = clamp(num(f.fontSize, 13), 8, 24);
  const weight = String(f.fontWeight || "500");
  const color = f.textColor || "#FFFFFF";

  const glowColors = {
    "--glow-follow-rgb": colorToRgb(f.followGlowColor, "255, 77, 141"),
    "--glow-sub-rgb": colorToRgb(f.subGlowColor, "42, 189, 255"),
    "--glow-cheer-rgb": colorToRgb(f.cheerGlowColor, "255, 27, 223"),
    "--glow-tip-rgb": colorToRgb(f.tipGlowColor, "87, 27, 195"),
  };
  Object.entries(glowColors).forEach(([property, value]) => {
    document.documentElement.style.setProperty(property, value);
  });

  await loadGoogleFont(family, weight);

  // Couleur au niveau des boxes => icônes + texte héritent
  ["colFollow", "colSub", "colCheer", "colTip"].forEach((id) => {
    const box = document.getElementById(id);
    if (box) box.style.setProperty("color", color, "important");
  });

  // Applique typo sur les wrappers texte
  document.querySelectorAll(".txt").forEach((node) => {
    node.style.setProperty("font-family", `'${family}', sans-serif`, "important");
    node.style.setProperty("font-size", `${size}px`, "important");
    node.style.setProperty("font-weight", weight, "important");
  });

  // Et sur les inners aussi (au cas où)
  document.querySelectorAll(".txt .txtInner").forEach((inner) => {
    inner.style.setProperty("font-family", `'${family}', sans-serif`, "important");
    inner.style.setProperty("font-size", `${size}px`, "important");
    inner.style.setProperty("font-weight", weight, "important");
  });

  applyOrder(f);
}

/* =========================
   Fade out + slide down
   Fade in  + slide up
   (sur .txtInner uniquement)
========================= */
const animLocks = new Map();

function setTextWithFadeSlide(labelEl, newText) {
  const inner = ensureInner(labelEl);
  if (!inner) return;

  const next = String(newText ?? "").trim();
  if (!next) return;

  const current = String(inner.textContent ?? "").trim();
  if (current === next) return;

  const f = lastFields || {};
  const duration = clamp(num(f.animDuration, 220), 60, 2000);
  const distance = clamp(num(f.animDistance, 10), 0, 80);

  // kill anim en cours
  if (animLocks.has(inner)) {
    const { t1, t2 } = animLocks.get(inner);
    if (t1) clearTimeout(t1);
    if (t2) clearTimeout(t2);
    animLocks.delete(inner);
  }

  // IMPORTANT: on n'utilise pas l'opacité/transform du .txt (il est animé par ton CSS vidéo)
  // On anime le .txtInner, qui est indépendant.

  inner.style.willChange = "opacity, transform";
  inner.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;

  // OUT: fade out + slide down
  inner.style.opacity = "0";
  inner.style.transform = `translateY(${distance}px)`;

  const t1 = setTimeout(() => {
    inner.textContent = next;

    // reset invisible BELOW (pour entrer en remontant)
    inner.style.transition = "none";
    inner.style.opacity = "0";
    inner.style.transform = `translateY(${distance}px)`;
    void inner.offsetHeight;

    // IN: fade in + slide up
    inner.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    requestAnimationFrame(() => {
      inner.style.opacity = "1";
      inner.style.transform = "translateY(0px)";
    });

    const t2 = setTimeout(() => animLocks.delete(inner), duration + 40);
    animLocks.set(inner, { t1: null, t2 });
  }, duration);

  animLocks.set(inner, { t1, t2: null });
}

/* =========================
   State + format
========================= */
const state = {
  follow: null,
  sub: null,
  cheer: null,
  cheerAmt: 0,
  tip: null,
  tipAmt: 0,
};
let currencySymbol = "€";

function fmtCheer(name, amt, showAmounts) {
  const a = Number(amt || 0);
  if (!name) return "";
  if (!showAmounts || a <= 0) return `${name}`;
  return `${name} (${a})`;
}
function fmtTip(name, amt, showAmounts) {
  const a = Number(amt || 0);
  if (!name) return "";
  if (!showAmounts || a <= 0) return `${name}`;
  return `${name} (${a}${currencySymbol})`;
}

function renderInitial() {
  const showAmounts = String(lastFields?.showAmounts || "yes") === "yes";

  const followEl = $("lblFollow");
  const subEl = $("lblSub");
  const cheerEl = $("lblCheer");
  const tipEl = $("lblTip");

  if (followEl && state.follow) ensureInner(followEl).textContent = state.follow;
  if (subEl && state.sub) ensureInner(subEl).textContent = state.sub;
  if (cheerEl && state.cheer) ensureInner(cheerEl).textContent = fmtCheer(state.cheer, state.cheerAmt, showAmounts);
  if (tipEl && state.tip) ensureInner(tipEl).textContent = fmtTip(state.tip, state.tipAmt, showAmounts);
}

/* =========================
   Init from session + recents
========================= */
function initFromSession(session) {
  if (!session || typeof session !== "object") return;

  const follow = session["follower-latest"];
  const sub = session["subscriber-latest"] || session["sponsor-latest"];
  const cheer = session["cheer-latest"];
  const tip = session["tip-latest"];

  if (follow?.name) state.follow = follow.name;
  if (sub?.name) state.sub = sub.name;
  if (cheer?.name) {
    state.cheer = cheer.name;
    state.cheerAmt = cheer.amount || cheer.bits || 0;
  }
  if (tip?.name) {
    state.tip = tip.name;
    state.tipAmt = tip.amount || 0;
  }
}

function initFromRecents(recents) {
  if (!Array.isArray(recents) || recents.length === 0) return;

  // StreamElements fournit la liste chronologiquement : on part de la fin.
  for (let i = recents.length - 1; i >= 0; i--) {
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
   Live events
========================= */
function handleEvent(detail) {
  const e = detail?.event || detail;
  const typeRaw = (e?.type || detail?.listener || "").toString().toLowerCase();
  const showAmounts = String(lastFields?.showAmounts || "yes") === "yes";

  if (typeRaw.includes("follow")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;
    state.follow = name;
    setTextWithFadeSlide($("lblFollow"), name);
    return;
  }

  if (typeRaw.includes("sub")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;
    state.sub = name;
    setTextWithFadeSlide($("lblSub"), name);
    return;
  }

  if (typeRaw.includes("cheer") || typeRaw.includes("bits")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;
    const amt = e?.amount || e?.bits || e?.message?.amount || 0;

    state.cheer = name;
    state.cheerAmt = amt;
    setTextWithFadeSlide($("lblCheer"), fmtCheer(name, amt, showAmounts));
    return;
  }

  if (typeRaw.includes("tip") || typeRaw.includes("donation")) {
    const name = e?.name || e?.username || e?.displayName;
    if (!name) return;
    const amt = e?.amount || e?.message?.amount || 0;

    state.tip = name;
    state.tipAmt = amt;
    setTextWithFadeSlide($("lblTip"), fmtTip(name, amt, showAmounts));
    return;
  }
}

/* =========================
   StreamElements hooks
========================= */
window.addEventListener("onWidgetLoad", async (obj) => {
  await applyTheme(obj?.detail?.fieldData || {});
  currencySymbol = obj?.detail?.currency?.symbol || "€";
  initFromSession(obj?.detail?.session?.data || {});
  const recents = obj?.detail?.recents || [];
  initFromRecents(recents);
  renderInitial();
});

window.addEventListener("onSessionUpdate", (obj) => {
  const previous = { ...state };
  initFromSession(obj?.detail?.session || {});
  const showAmounts = String(lastFields?.showAmounts || "yes") === "yes";

  if (state.follow && state.follow !== previous.follow) {
    setTextWithFadeSlide($("lblFollow"), state.follow);
  }
  if (state.sub && state.sub !== previous.sub) {
    setTextWithFadeSlide($("lblSub"), state.sub);
  }
  if (state.cheer && (state.cheer !== previous.cheer || state.cheerAmt !== previous.cheerAmt)) {
    setTextWithFadeSlide($("lblCheer"), fmtCheer(state.cheer, state.cheerAmt, showAmounts));
  }
  if (state.tip && (state.tip !== previous.tip || state.tipAmt !== previous.tipAmt)) {
    setTextWithFadeSlide($("lblTip"), fmtTip(state.tip, state.tipAmt, showAmounts));
  }
});

window.addEventListener("onEventReceived", (obj) => {
  handleEvent(obj?.detail);
});
