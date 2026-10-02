// TV - Starting screen : logo TomaVega dont le contour se trace, puis se
// révèle et respire ; titre tapé lettre par lettre ; fondu puis retour en
// boucle. Converti depuis TomaVega-animation.html (les boutons de scène de la
// page sont remplacés par le champ « Texte »).
const svg = document.querySelector(".brand > svg");
const ns = "http://www.w3.org/2000/svg";

// Calque « original » (le logo) et calque « outline » (les tracés animés)
const artwork = [...svg.children].filter((node) => node.tagName.toLowerCase() !== "defs");
const original = document.createElementNS(ns, "g");
original.id = "original";
artwork.forEach((node) => original.append(node));
svg.append(original);

const outline = document.createElementNS(ns, "g");
outline.id = "outline";
const borders = original.querySelector("#BORDERS");
const shapes = borders ? [...borders.querySelectorAll("path,polygon")] : [];
const central = original.querySelector("#BORDERS4");
if (central) shapes.push(central);
const blackLetterContours = [...original.querySelectorAll("#TEXTE_NOIR path:not([class]),#TEXTE_NOIR polygon:not([class]),#TEXTE_NOIR1 path:not([class]),#TEXTE_NOIR1 polygon:not([class])")];
shapes.push(...blackLetterContours);
shapes.forEach((node, i) => {
  const path = node.cloneNode(false);
  path.removeAttribute("id");
  path.removeAttribute("class");
  path.removeAttribute("style");
  path.setAttribute("class", "draw");
  path.setAttribute("pathLength", "1");
  const interior = blackLetterContours.includes(node);
  const green = node === central || Boolean(node.closest("#TEXTE_NOIR1"));
  if (interior) path.style.strokeWidth = "1.8";
  const color = green ? "#76ff24" : i % 2 ? "#9162ff" : "#4bc9ff";
  path.style.stroke = color;
  path.style.color = color;
  path.style.animationDelay = (green ? 1.4 : Math.min(i * 0.12, 0.8)) + "s";
  outline.append(path);
});
svg.append(outline);

let SETTINGS = {
  status_text: "STREAM IS STARTING",
  loop_seconds: 52,
  show_socials: "yes",
  handle_tiktok: "@TomaVega",
  handle_youtube: "@TomaVega",
  handle_twitch: "@TomaVega",
  handle_soundcloud: "@TomaVega",
  ambient_lights: "yes",
  energy_effects: "yes"
};
let fadeTimer;
let returnTimer;

// Rejoue toute l'animation ; après « Durée avant sortie », le logo et le titre
// sortent en glitch, puis tout revient 3,2 s plus tard (0 = pas de boucle)
const RETURN_DELAY_MS = 3200;
function replay(){
  clearTimeout(fadeTimer);
  clearTimeout(returnTimer);
  const stage = document.querySelector(".stage");
  stage.classList.add("resetting");
  stage.classList.remove("leaving");
  const nodes = [document.querySelector("#label"), ...document.querySelectorAll(".typed-letter"), svg, original, ...original.querySelectorAll("#MONOGRAMME"), outline, ...outline.children, document.querySelector(".status")];
  nodes.forEach((node) => (node.style.animation = "none"));
  void svg.getBoundingClientRect();
  nodes.forEach((node) => node.style.removeProperty("animation"));
  void stage.offsetWidth;
  stage.classList.remove("resetting");
  const loopMs = Math.max(0, Number(SETTINGS.loop_seconds) || 0) * 1000;
  if (loopMs > 0){
    fadeTimer = setTimeout(() => {
      stage.classList.add("leaving");
      returnTimer = setTimeout(replay, RETURN_DELAY_MS);
    }, loopMs);
  }
}

// Texte du champ « Texte », tapé lettre par lettre avec l'effet glitch
function showText(){
  const label = document.querySelector("#label");
  const text = String(SETTINGS.status_text ?? "");
  label.classList.add("glitch-intro");
  label.replaceChildren();
  label.setAttribute("aria-label", text);
  [...text].forEach((character, i) => {
    const span = document.createElement("span");
    span.className = "typed-letter" + (character === " " ? " typed-space" : "");
    span.textContent = character;
    span.dataset.letter = character;
    span.setAttribute("aria-hidden", "true");
    span.style.setProperty("--type-delay", (6 + i * 0.095 + (i > 6 ? 0.14 : 0) + (i > 9 ? 0.12 : 0)) + "s");
    label.append(span);
  });
  replay();
}

// ------------------------------------
// Halos d'ambiance : même palette discrète, nouvelle position à chaque fois
// ------------------------------------
const ambientLayer = document.getElementById("ambient");
const ambientMotion = matchMedia("(prefers-reduced-motion: reduce)");
const AMBIENT_PALETTE = ["rgba(75,201,255,.13)", "rgba(118,72,229,.17)", "rgba(100,255,45,.08)"];
let ambientTimer;
const ambientRandom = (min, max) => min + Math.random() * (max - min);

function ambientEnabled(){
  return SETTINGS.ambient_lights !== "no" && !ambientMotion.matches && !document.hidden;
}

function spawnAmbientHalo(){
  if (!ambientEnabled()) return;
  if (ambientLayer.children.length < 3){
    const halo = document.createElement("div");
    halo.className = "ambient-halo";
    halo.style.setProperty("--halo-color", AMBIENT_PALETTE[Math.floor(Math.random() * AMBIENT_PALETTE.length)]);
    halo.style.left = ambientRandom(-30, 70) + "%";
    halo.style.top = ambientRandom(-40, 75) + "%";
    halo.style.width = ambientRandom(45, 75) + "vw";
    halo.style.height = ambientRandom(55, 90) + "vh";
    ambientLayer.append(halo);
    const dx = ambientRandom(-3, 3);
    const dy = ambientRandom(-3, 3);
    const animation = halo.animate([
      { opacity: 0, transform: "translate(0,0) scale(.92)", offset: 0 },
      { opacity: ambientRandom(0.65, 0.95), transform: "translate(" + dx + "vw," + dy + "vh) scale(1.06)", offset: 0.45 },
      { opacity: 0, transform: "translate(" + dx * 1.5 + "vw," + dy * 1.5 + "vh) scale(1.12)", offset: 1 }
    ], { duration: ambientRandom(18000, 28000), easing: "ease-in-out" });
    animation.onfinish = () => halo.remove();
  }
  ambientTimer = setTimeout(spawnAmbientHalo, ambientRandom(10000, 18000));
}

function restartAmbient(){
  clearTimeout(ambientTimer);
  ambientLayer.replaceChildren();
  ambientLayer.classList.toggle("is-off", SETTINGS.ambient_lights === "no");
  if (ambientEnabled()) ambientTimer = setTimeout(spawnAmbientHalo, ambientRandom(2000, 5000));
}

ambientMotion.addEventListener("change", restartAmbient);
document.addEventListener("visibilitychange", restartAmbient);

// ------------------------------------
// Énergie en arrière-plan : de temps en temps, un éclair sur un côté, des
// traits qui glitchent ou un flash, toujours derrière le logo et les panneaux
// ------------------------------------
const energyLayer = document.createElement("div");
energyLayer.className = "energy-layer";
energyLayer.setAttribute("aria-hidden", "true");
document.querySelector(".stage").prepend(energyLayer);
const ENERGY_PALETTE = ["#4bc9ff", "#7648e5", "#64ff2d"];
let energyTimer;

function energyEnabled(){
  return SETTINGS.energy_effects !== "no" && !ambientMotion.matches && !document.hidden;
}

function backgroundEnergy(){
  if (!energyEnabled()) return;
  const color = ENERGY_PALETTE[Math.floor(Math.random() * ENERGY_PALETTE.length)];
  const kind = Math.random();
  if (kind < 0.5){
    // Éclair : ligne brisée qui descend sur un côté de l'écran
    const bolt = document.createElementNS(ns, "svg");
    bolt.classList.add("energy-bolt");
    bolt.setAttribute("viewBox", "0 0 1920 1080");
    bolt.setAttribute("preserveAspectRatio", "none");
    let x = Math.random() < 0.5 ? ambientRandom(50, 420) : ambientRandom(1510, 1870);
    let y = ambientRandom(-40, 150);
    let d = "M " + x + " " + y;
    for (let i = 0; i < 7; i++){
      x += ambientRandom(-90, 90);
      y += ambientRandom(65, 135);
      d += " L " + x + " " + y;
    }
    const glow = document.createElementNS(ns, "path");
    glow.setAttribute("d", d);
    glow.setAttribute("stroke", color);
    glow.setAttribute("stroke-width", "8");
    glow.setAttribute("opacity", ".14");
    const core = glow.cloneNode();
    core.setAttribute("stroke-width", "1.8");
    core.setAttribute("opacity", ".7");
    bolt.append(glow, core);
    energyLayer.append(bolt);
    const animation = bolt.animate([{ opacity: 0 }, { opacity: 0.7, offset: 0.12 }, { opacity: 0.15, offset: 0.28 }, { opacity: 0.45, offset: 0.4 }, { opacity: 0 }], { duration: 950, easing: "linear" });
    animation.onfinish = () => bolt.remove();
  } else if (kind < 0.8){
    // Traits horizontaux qui glitchent
    const top = ambientRandom(8, 92);
    for (let i = 0; i < 4; i++){
      const strip = document.createElement("div");
      strip.className = "energy-strip";
      strip.style.setProperty("--energy-color", color);
      strip.style.top = top + i * 0.7 + "%";
      strip.style.left = ambientRandom(0, 70) + "%";
      strip.style.width = ambientRandom(10, 32) + "%";
      energyLayer.append(strip);
      const animation = strip.animate([
        { opacity: 0, transform: "translateX(-18px)" },
        { opacity: 0.32, offset: 0.25, transform: "translateX(12px)" },
        { opacity: 0.13, offset: 0.6, transform: "translateX(-5px)" },
        { opacity: 0, transform: "translateX(24px)" }
      ], { duration: 650 + i * 55, easing: "steps(2,end)" });
      animation.onfinish = () => strip.remove();
    }
  } else {
    // Flash de lumière
    const flash = document.createElement("div");
    flash.className = "energy-flash";
    flash.style.setProperty("--energy-color", color);
    flash.style.left = ambientRandom(-25, 70) + "%";
    flash.style.top = ambientRandom(-25, 65) + "%";
    energyLayer.append(flash);
    const animation = flash.animate([{ opacity: 0, transform: "scale(.9)" }, { opacity: 0.11, offset: 0.18 }, { opacity: 0, transform: "scale(1.15)" }], { duration: 1500, easing: "ease-out" });
    animation.onfinish = () => flash.remove();
  }
  energyTimer = setTimeout(backgroundEnergy, ambientRandom(6500, 13000));
}

function restartEnergy(){
  clearTimeout(energyTimer);
  energyLayer.replaceChildren();
  energyLayer.classList.toggle("is-off", SETTINGS.energy_effects === "no");
  if (energyEnabled()) energyTimer = setTimeout(backgroundEnergy, ambientRandom(2500, 4500));
}

document.addEventListener("visibilitychange", restartEnergy);
ambientMotion.addEventListener("change", restartEnergy);

// Bouton « Aperçu de la sortie » : lance la sortie en glitch tout de suite
function previewExit(){
  clearTimeout(fadeTimer);
  clearTimeout(returnTimer);
  const stage = document.querySelector(".stage");
  stage.classList.remove("leaving");
  void stage.offsetWidth;
  stage.classList.add("leaving");
  returnTimer = setTimeout(replay, RETURN_DELAY_MS);
}

window.addEventListener("onEventReceived", ({ detail }) => {
  const event = detail?.event || {};
  // Sur un overlay, le clic est envoyé à tous les widgets : seulement notre champ
  if ((detail?.listener || event.listener) === "widget-button" && event.field === "preview_exit") previewExit();
});

function applySettings(fieldData){
  SETTINGS = { ...SETTINGS, ...Object.fromEntries(Object.entries(fieldData || {}).filter(([key, value]) => value !== undefined && (value !== "" || key.startsWith("handle_") || key === "status_text"))) };
  document.getElementById("socials")?.classList.toggle("is-hidden", SETTINGS.show_socials === "no");
  // Pseudo par réseau ; un réseau sans pseudo est masqué
  for (const handle of document.querySelectorAll(".social-handle")){
    const value = String(SETTINGS["handle_" + handle.dataset.network] ?? "").trim();
    handle.textContent = value;
    handle.closest(".social-icon")?.classList.toggle("is-hidden", !value);
  }
  showText();
  restartAmbient();
  restartEnergy();
}

window.addEventListener("onWidgetLoad", (obj) => applySettings(obj?.detail?.fieldData));
window.addEventListener("onWidgetUpdate", (obj) => applySettings(obj?.detail?.fieldData));
