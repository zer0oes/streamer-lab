const el = document.getElementById("date");
const fontLink = document.getElementById("googleFontLink");
const row = document.querySelector(".date-row");
const icon = document.querySelector(".icon");

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
   Normalize fieldData
========================= */
function normalizeFieldData(raw) {
  if (!raw) return {};
  if (raw.fontFamily || raw.fontSize || raw.shadow1Color || raw.shadow2Color) return raw;

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

/* =========================
   Google Fonts
========================= */
function loadGoogleFont(family) {
  if (!fontLink) return;
  const fam = encodeURIComponent(String(family || "Poppins")).replace(/%20/g, "+");
  fontLink.href = `https://fonts.googleapis.com/css2?family=${fam}:wght@300;400;500;600;700&display=swap`;
}

/* =========================
   Date (FR)
========================= */
function updateDate() {
  if (!el) return;

  const now = new Date();
  // ✅ France : JJ/MM/AAAA
  el.textContent = now.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* =========================
   Apply styles (texte + icône)
========================= */
function applyStyles(rawFieldData) {
  const f = normalizeFieldData(rawFieldData);

  const family = f.fontFamily || "Poppins";
  const size = clamp(num(f.fontSize, 13), 1, 200);
  const weight = String(f.fontWeight || "500");
  const color = f.textColor || "#FFFFFF";

  loadGoogleFont(family);

  // ✅ Couleurs drop-shadow basées sur fields
  const ds1 = `drop-shadow(${num(f.shadow1X, 0)}px ${num(f.shadow1Y, 1)}px ${num(f.shadow1Blur, 0)}px ${hexToRgba(
    f.shadow1Color || "#7A00FF",
    f.shadow1Opacity
  )})`;

  const ds2 = `drop-shadow(${num(f.shadow2X, 0)}px ${num(f.shadow2Y, 2)}px ${num(f.shadow2Blur, 0)}px ${hexToRgba(
    f.shadow2Color || "#78BEFF",
    f.shadow2Opacity
  )})`;

  const filterValue = `${ds1} ${ds2}`;

  // ✅ couleur héritée (icône + date)
  if (row) row.style.setProperty("color", color, "important");

  // ✅ typographie + couleur
  if (el) {
    el.style.setProperty("font-family", `'${family}', sans-serif`, "important");
    el.style.setProperty("font-size", `${size}px`, "important");
    el.style.setProperty("font-weight", weight, "important");
    el.style.setProperty("color", color, "important");

    // ✅ drop-shadow sur le conteneur du texte
    el.style.setProperty("filter", filterValue, "important");
  }

  // ✅ même drop-shadow sur l’icône
  if (icon) {
    icon.style.setProperty("color", color, "important");
    icon.style.setProperty("filter", filterValue, "important");
  }
}


/* =========================
   Init (robuste)
   - marche avec StreamElements
   - marche aussi sans (preview / OBS)
========================= */
function init(rawFieldData = {}) {
  applyStyles(rawFieldData);
  updateDate();
}

// ✅ StreamElements
window.addEventListener("onWidgetLoad", (obj) => {
  init(obj?.detail?.fieldData || {});
});

window.addEventListener("onWidgetUpdate", (obj) => {
  init(obj?.detail?.fieldData || {});
});

// ✅ Fallback si onWidgetLoad ne se déclenche pas
document.addEventListener("DOMContentLoaded", () => {
  init({});
});

// ✅ update chaque minute
setInterval(updateDate, 60 * 1000);
