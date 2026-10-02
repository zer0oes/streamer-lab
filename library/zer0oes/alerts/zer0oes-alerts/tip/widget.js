function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function num(v){
  const s = String(v ?? "").trim().replace(",", ".");
  const n = Number(s.replace(/[^\d.-]/g,''));
  return Number.isFinite(n) ? n : 0;
}

// Tip alert : code « custom CSS » de l'AlertBox StreamElements. Chaque
// alerte charge ce code dans une iframe neuve, avec ses variables déjà
// remplacées (bloc #alertData du HTML). Le son, la durée et la file
// d'attente sont gérés nativement par l'AlertBox.
// Attention : l'AlertBox remplace aussi les variables à accolade simple, ne
// jamais écrire une variable AlertBox entre accolades dans ce code.
const ALERT_ICON = "money_bag";

let SETTINGS = {};
let countFrame = null;
let hideTimer = null;
let hasShown = false;

// Racine de CETTE alerte. Dans OBS, l'AlertBox peut laisser les alertes
// précédentes dans la même page : les ids existent alors en double et
// document.getElementById renverrait l'ancienne carte (masquée), d'où un titre
// mesuré à 0. On prend la carte la plus récente pas encore utilisée et tout
// est cherché (et stylé) à l'intérieur.
const ALERT_ROOT = (() => {
  const free = [...document.querySelectorAll(".stage:not([data-alert-used])")];
  const root = free[free.length - 1] || document.querySelector(".stage") || document.body;
  root.setAttribute("data-alert-used", "");
  return root;
})();

function byId(id){
  return ALERT_ROOT.querySelector("#" + id) || (id === "googleFontLink" ? document.getElementById(id) : null);
}

// ------------------------------------
// Google Fonts (police du bloc titre + police des chiffres)
// ------------------------------------
function setGoogleFonts(titleFamily, numberFamily){
  const link = byId("googleFontLink");
  if (!link) return;

  const title = String(titleFamily || "Bungee").trim();
  const number = String(numberFamily || "Anton").trim();
  const families = [...new Set([title, number])]
    .map(name => "family=" + name.replace(/\s+/g, "+"))
    .join("&");
  const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  if (link.getAttribute("href") !== href) link.href = href;

  ALERT_ROOT.style.setProperty("--title-font", `"${title}"`);
  ALERT_ROOT.style.setProperty("--number-font", `"${number}"`);
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
    alert_title: String(raw.alert_title ?? "Mer_|ci"),
    alert_unit: String(raw.alert_unit ?? "€"),
    accent_color: hexOr(raw.accent_color, "#00fe9f"),

    title_font: String(raw.title_font ?? "Bungee"),
    number_font: String(raw.number_font ?? "Anton"),
    card_width: clamp(num(raw.card_width ?? 240), 140, 800),
    text_size: Math.max(8, num(raw.text_size ?? 13)),
    card_bg: hexOr(raw.card_bg, "#ffffff"),
    card_border: hexOr(raw.card_border, "#e3dff0"),
    panel_bg: hexOr(raw.panel_bg, "#161225"),
    text_color: hexOr(raw.text_color, "#161225"),
    second_color: hexOr(raw.second_color, "#8b5cf6"),

    show_message: isYesNo(raw.show_message, "yes"),
    glitch_enabled: isYesNo(raw.glitch_enabled, "yes"),
    title_idle: isYesNo(raw.title_idle, "yes"),
    animation_duration: clamp(num(raw.animation_duration ?? 600), 0, 2000),
    anim_direction: directionOr(raw.anim_direction, "up"),
    exit_direction: exitDirectionOr(raw.exit_direction, "same")
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
  const root = ALERT_ROOT.style;
  setGoogleFonts(getSetting("title_font", "Bungee"), getSetting("number_font", "Anton"));
  root.setProperty("--w", getSetting("card_width", 240) + "px");
  root.setProperty("--text-size", getSetting("text_size", 13) + "px");
  root.setProperty("--card-bg", getSetting("card_bg", "#ffffff"));
  root.setProperty("--card-border", getSetting("card_border", "#e3dff0"));
  root.setProperty("--panel-bg", getSetting("panel_bg", "#161225"));
  root.setProperty("--text-color", getSetting("text_color", "#161225"));
  root.setProperty("--second-rgb", rgbTriplet(getSetting("second_color", "#8b5cf6")));
  root.setProperty("--anim", getSetting("animation_duration", 600) + "ms");
  root.setProperty("--accent-rgb", rgbTriplet(getSetting("accent_color", "#ffffff")));

  const alertEl = byId("alert");
  if (alertEl){
    const enter = getSetting("anim_direction", "up");
    alertEl.dataset.dir = enter;
    alertEl.dataset.out = resolveExitDirection(enter, getSetting("exit_direction", "same"));
  }

  fitCard();
}
function formatAmount(n){
  const value = Number(n) || 0;
  if (Number.isInteger(value)) return value.toLocaleString("fr-FR");
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// ------------------------------------
// Variables de l'alerte (remplacées par l'AlertBox dans le bloc #alertData)
// ------------------------------------
// Une variable absente de l'évènement peut rester telle quelle (accolades
// comprises) : on la traite alors comme vide.
function isUnresolved(text){
  return /^\{\{?\s*\w+\s*\}\}?$/.test(text);
}
function readVar(key){
  const el = ALERT_ROOT.querySelector('#alertData [data-var="' + key + '"]');
  const text = el ? el.textContent.trim() : "";
  return isUnresolved(text) ? "" : text;
}
// La variable message est du HTML (emotes en <img>) déjà fourni par StreamElements :
// on déplace ses nœuds tels quels plutôt que de le réinterpréter.
function takeMessageNodes(){
  const el = ALERT_ROOT.querySelector('#alertData [data-var="message"]');
  if (!el || isUnresolved(el.textContent.trim())) return [];
  return [...el.childNodes];
}
function alertDurationMs(){
  const seconds = num(readVar("duration"));
  return (seconds > 0 ? seconds : 8) * 1000;
}
// ------------------------------------
// Rendu de la carte
// ------------------------------------
function setTitle(text){
  const lines = String(text || "").split("|").map(s => s.trim()).filter(Boolean);
  for (const layer of ALERT_ROOT.querySelectorAll("#alertTitle .title-layer")){
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
  const title = byId("alertTitle");
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
  const unit = byId("alertUnit");
  if (!unit) return;
  unit.style.marginRight = "0px";
  const width = unit.offsetWidth;
  unit.style.marginRight = (-(1 - 0.62) * width).toFixed(2) + "px";
}
function fitCard(){
  fitTitle();
  fitUnit();
}
function setName(el, value){
  const strong = document.createElement("strong");
  strong.textContent = value;
  el.replaceChildren(strong);
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
// Dans OBS, l'AlertBox peut préparer l'alerte suivante dans une iframe encore
// masquée (taille nulle) : on attend qu'elle ait une vraie taille pour
// l'afficher, sinon le titre serait mesuré à 0 et resterait minuscule, et la
// sortie serait programmée trop tôt.
function whenLaidOut(callback){
  const panel = byId("alertTitle")?.parentElement;
  const isLaidOut = () => window.innerWidth > 0 && window.innerHeight > 0 && (!panel || panel.clientWidth > 0);
  if (isLaidOut()) return callback();
  const onResize = () => {
    if (!isLaidOut()) return;
    observer.disconnect();
    window.removeEventListener("resize", onResize);
    callback();
  };
  const observer = new ResizeObserver(onResize);
  observer.observe(document.documentElement);
  if (panel) observer.observe(panel);
  window.addEventListener("resize", onResize);
}

// Le titre est recalculé à chaque changement de taille du bloc titre (qui ne
// dépend pas du titre : ratio fixe, contenu rogné), polices tardives comprises.
function keepTitleFitted(){
  const panel = byId("alertTitle")?.parentElement;
  if (panel && typeof ResizeObserver !== "undefined") new ResizeObserver(fitCard).observe(panel);
}

// ------------------------------------
// Affichage (une alerte par chargement, sortie calée sur la durée de l'alerte)
// ------------------------------------
function showAlert(){
  if (hasShown) return;
  hasShown = true;

  // name = la personne qui donne, amount = montant
  const amount = num(readVar("amount"));
  const alertEl = byId("alert");
  const iconEl = byId("alertIcon");
  const numberEl = byId("alertNumber");
  const unitEl = byId("alertUnit");
  const nameEl = byId("alertName");
  const messageEl = byId("alertMessage");

  setTitle(getSetting("alert_title", ""));
  if (iconEl) iconEl.textContent = ALERT_ICON;
  if (unitEl) unitEl.textContent = getSetting("alert_unit", "");
  if (nameEl) setName(nameEl, readVar("name") || "Anonyme");
  if (numberEl) countUp(numberEl, amount, 900, 450);
  if (messageEl){
    const nodes = takeMessageNodes();
    const hasMessage = nodes.some(node => node.nodeType !== Node.TEXT_NODE || node.textContent.trim());
    const showMessage = getSetting("show_message", "yes") === "yes" && hasMessage;
    messageEl.replaceChildren(...(showMessage ? ["« ", ...nodes, " »"] : []));
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
  if (document.fonts?.ready) document.fonts.ready.then(fitCard);
  keepTitleFitted();

  // L'AlertBox retire l'alerte au bout de sa durée (variable widgetDuration) :
  // la sortie doit être terminée juste avant.
  const exitAt = Math.max(0, alertDurationMs() - getSetting("animation_duration", 600) - 100);
  clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hideAlert, exitAt);
}

function hideAlert(){
  const alertEl = byId("alert");
  if (!alertEl) return;
  alertEl.classList.remove("is-visible");
  alertEl.classList.add("is-leaving");
}
window.addEventListener("onWidgetLoad", (obj) => {
  refreshSettingsFromFieldData(obj?.detail?.fieldData || {});
  whenLaidOut(showAlert);
});

window.addEventListener("onWidgetUpdate", (obj) => {
  refreshSettingsFromFieldData(obj?.detail?.fieldData || {});
});
