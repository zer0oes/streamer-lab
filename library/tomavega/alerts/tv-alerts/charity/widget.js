// Alerte « Don caritatif » : code « custom CSS » de l'AlertBox StreamElements.
// Chaque alerte charge ce code dans une iframe neuve, avec ses variables déjà
// remplacées (bloc #alertData du HTML). Le son, la durée et la file d'attente
// sont gérés nativement par l'AlertBox.
// Attention : l'AlertBox remplace aussi les variables à accolade simple, ne
// jamais écrire une variable AlertBox entre accolades dans ce code.
const ns = "http://www.w3.org/2000/svg";
const DEFAULTS = {
  "event_text": "Don caritatif · [n]",
  "detail_text": "Merci pour cette belle cause !",
  "show_message": "yes",
  "alert_color": "#64FF2D",
  "major": "no",
  "card_width": 440,
  "name_size": 35.5,
  "wire_enabled": "yes",
  "fragments_enabled": "yes"
};
const OUT_MS = 600;

let SETTINGS = { ...DEFAULTS };
let hideTimer = null;
let hasShown = false;

// Racine de CETTE alerte : dans OBS, les alertes précédentes peuvent rester
// dans la même page (ids en double). On prend la plus récente pas encore utilisée.
const ALERT_ROOT = (() => {
  const free = [...document.querySelectorAll(".stage:not([data-alert-used])")];
  const root = free[free.length - 1] || document.querySelector(".stage") || document.body;
  root.setAttribute("data-alert-used", "");
  return root;
})();

function byId(id){
  return ALERT_ROOT.querySelector("#" + id);
}

function num(v){
  const n = Number(String(v ?? "").trim().replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}

function color(v, fallback){
  const s = String(v ?? "").trim();
  return /^#[0-9a-f]{3,8}$/i.test(s) || /^(rgb|hsl)a?\(/i.test(s) ? s : fallback;
}

// ------------------------------------
// Variables de l'alerte (une variable absente peut rester avec ses accolades)
// ------------------------------------
function isUnresolved(text){
  return /^\{\{?\s*\w+\s*\}\}?$/.test(text);
}

function readVar(key){
  const el = ALERT_ROOT.querySelector('#alertData [data-var="' + key + '"]');
  const text = el ? el.textContent.trim() : "";
  return isUnresolved(text) ? "" : text;
}

// Montant d'un don : « 5 € », « 4,50 € »
function formatMoney(amount, currency){
  const value = num(amount);
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
  return currency ? text + " " + currency : text;
}

function alertDurationMs(){
  const seconds = num(readVar("duration"));
  return (seconds > 0 ? seconds : 8) * 1000;
}

// Remplace [n] et [qui] dans les textes des champs
function fill(template, values){
  return String(template ?? "").replace(/\[(n|qui)\]/g, (match, key) => values[key] ?? "");
}

function eventText(n){
  return fill(SETTINGS.event_text, { n: n });
}

// ------------------------------------
// Réglages
// ------------------------------------
function applySettings(raw){
  if (Array.isArray(raw)) raw = Object.fromEntries(raw.filter(field => field?.name).map(field => [field.name, field.value]));
  SETTINGS = { ...DEFAULTS, ...(raw || {}) };
  const style = ALERT_ROOT.style;
  style.setProperty("--card-width", clamp(num(SETTINGS.card_width) || 440, 240, 900) + "px");
  style.setProperty("--name-size", clamp(num(SETTINGS.name_size) || 35.5, 16, 90) + "px");
  const card = byId("alert");
  if (card){
    card.style.setProperty("--alert-color", color(SETTINGS.alert_color, DEFAULTS.alert_color));
    card.classList.toggle("major", SETTINGS.major === "yes");
  }
}

// ------------------------------------
// Rendu (comme previewAlert de la page)
// ------------------------------------
const WIRES = [
  "M0 85 L80 85 L104 65 L116 104 L138 80 L215 80 L238 62 L258 81 L425 81 L453 98 L471 73 L502 90 L575 90 L592 68 L605 94 L680 94",
  "M0 123 L68 123 L94 110 L109 137 L139 119 L235 119 M435 123 L510 123 L531 108 L548 132 L576 120 L680 120"
];

function setPerson(el, name){
  el.setAttribute("aria-label", name);
  el.replaceChildren(...[...name].map((letter, i) => {
    const glyph = document.createElement("span");
    glyph.textContent = letter;
    glyph.style.setProperty("--i", i);
    glyph.setAttribute("aria-hidden", "true");
    return glyph;
  }));
}

function addWire(card){
  const wire = document.createElementNS(ns, "svg");
  wire.setAttribute("viewBox", "0 0 680 190");
  wire.setAttribute("preserveAspectRatio", "none");
  wire.setAttribute("aria-hidden", "true");
  wire.classList.add("alert-wire");
  for (const d of WIRES){
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    path.setAttribute("pathLength", "1");
    wire.append(path);
  }
  card.prepend(wire);
}

function addFragments(card, count){
  for (let i = 0; i < count; i++){
    const piece = document.createElement("i");
    piece.className = "alert-fragment";
    piece.setAttribute("aria-hidden", "true");
    const angle = Math.random() * Math.PI * 2;
    const distance = 75 + Math.random() * 100;
    piece.style.setProperty("--x", Math.cos(angle) * distance + "px");
    piece.style.setProperty("--y", Math.sin(angle) * distance * 0.4 + "px");
    piece.style.setProperty("--r", angle + "rad");
    piece.style.setProperty("--w", 8 + Math.random() * 24 + "px");
    piece.style.setProperty("--delay", Math.random() * 0.25 + "s");
    card.append(piece);
  }
}

// Dans OBS, l'alerte suivante peut être préparée dans une iframe encore
// masquée (taille nulle) : on attend une vraie taille avant d'afficher.
function whenLaidOut(callback){
  const isLaidOut = () => window.innerWidth > 0 && window.innerHeight > 0;
  if (isLaidOut()) return callback();
  const onResize = () => {
    if (!isLaidOut()) return;
    window.removeEventListener("resize", onResize);
    callback();
  };
  window.addEventListener("resize", onResize);
}

function showAlert(){
  if (hasShown) return;
  hasShown = true;
  const card = byId("alert");
  if (!card) return;
  const n = formatMoney(readVar("amount"), readVar("currency"));
  const values = { n: n };
  byId("alertEvent").textContent = eventText(n);
  setPerson(byId("alertPerson"), readVar("name") || "Anonyme");
  byId("alertDetail").textContent = SETTINGS.show_message === "yes" && readVar("message") ? readVar("message") : fill(SETTINGS.detail_text, values);
  if (SETTINGS.wire_enabled !== "no") addWire(card);
  if (SETTINGS.fragments_enabled !== "no") addFragments(card, SETTINGS.major === "yes" ? 12 : 7);

  // L'alerte est retirée au bout de sa durée : la sortie se termine juste avant
  const exitAt = Math.max(0, alertDurationMs() - OUT_MS - 100);
  card.style.setProperty("--progress", exitAt + "ms");
  card.classList.add("is-visible");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    card.classList.remove("is-visible");
    card.classList.add("is-leaving");
  }, exitAt);
}

window.addEventListener("onWidgetLoad", (obj) => {
  applySettings(obj?.detail?.fieldData || {});
  whenLaidOut(showAlert);
});

window.addEventListener("onWidgetUpdate", (obj) => {
  applySettings(obj?.detail?.fieldData || {});
});
