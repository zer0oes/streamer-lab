import {
  PLATFORM_STREAM_ELEMENTS,
  PLATFORM_STREAMLABS,
  buildStreamlabsLoadDetail,
  normalizePlatform,
  toStreamlabsEvent
} from "/platform-adapters.js";
import { buildPlatformExport, createZip } from "/widget-export.js";

const elements = {
  frame: document.querySelector("#widget-frame"),
  fields: document.querySelector("#fields-form"),
  libraryGroups: document.querySelectorAll("[data-library-group]"),
  widgetList: document.querySelector("#widget-list"),
  widgetCount: document.querySelector("#widget-count"),
  addWidgetButton: document.querySelector("#add-widget"),
  alertList: document.querySelector("#alert-list"),
  alertCount: document.querySelector("#alert-count"),
  addAlertButton: document.querySelector("#add-alert"),
  sidebarSections: document.querySelectorAll("[data-sidebar-section]"),
  widgetSettingsDialog: document.querySelector("#widget-settings-dialog"),
  widgetSettingsForm: document.querySelector("#widget-settings-form"),
  widgetSettingsTitle: document.querySelector("#widget-settings-title"),
  widgetSettingsId: document.querySelector("#widget-settings-id"),
  widgetSettingsName: document.querySelector("#widget-settings-name"),
  widgetSettingsDescription: document.querySelector("#widget-settings-description"),
  widgetTypeChoices: document.querySelectorAll("[data-widget-type]"),
  widgetIconChoices: document.querySelector("#widget-icon-choices"),
  widgetSettingsMessage: document.querySelector("#widget-settings-message"),
  saveWidgetSettings: document.querySelector("#save-widget-settings"),
  eventAccordion: document.querySelector("#event-type-accordion"),
  customEvent: document.querySelector("#custom-event"),
  console: document.querySelector("#console-output"),
  accountFab: document.querySelector("#account-fab"),
  accountPanel: document.querySelector("#account-panel"),
  accountError: document.querySelector("#account-error"),
  loggedOutPanel: document.querySelector("#logged-out-panel"),
  loggedInPanel: document.querySelector("#logged-in-panel"),
  accountAvatar: document.querySelector("#account-avatar"),
  accountDisplayName: document.querySelector("#account-display-name"),
  logoutButton: document.querySelector("#logout-button"),
  integrationCards: document.querySelectorAll(".integration-card"),
  dashboardFab: document.querySelector("#dashboard-fab"),
  dashboardView: document.querySelector("#dashboard-view"),
  dashboardWidgetList: document.querySelector("#dashboard-widget-list"),
  dashboardAlertList: document.querySelector("#dashboard-alert-list"),
  dashboardLibrarySearch: document.querySelector("#dashboard-library-search"),
  dashboardLibrarySuggestions: document.querySelector("#dashboard-library-suggestions"),
  dashboardFilterTriggers: document.querySelectorAll('[data-role="filter-trigger"]'),
  dashboardAddFabTrigger: document.querySelector("#dashboard-add-fab-trigger"),
  dashboardAddFabWidget: document.querySelector("#dashboard-add-fab-widget"),
  dashboardAddFabAlert: document.querySelector("#dashboard-add-fab-alert"),
  dashboardConnectionList: document.querySelector("#dashboard-connection-list"),
  workspace: document.querySelector(".workspace"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  topbarCenter: document.querySelector(".topbar__center"),
  footerYear: document.querySelector("#footer-year"),
  contactDialog: document.querySelector("#contact-dialog"),
  contactForm: document.querySelector("#contact-form"),
  contactOpenButton: document.querySelector("#contact-form-open"),
  previewShell: document.querySelector("#preview-shell"),
  previewCanvas: document.querySelector("#preview-canvas"),
  previewTitle: document.querySelector("#preview-title"),
  previewMeta: document.querySelector("#preview-meta"),
  previewWidth: document.querySelector("#preview-width"),
  previewHeight: document.querySelector("#preview-height"),
  previewTheme: document.querySelector("#preview-theme"),
  previewColumn: document.querySelector(".preview-column"),
  fieldsFilenameHint: document.querySelector("#fields-filename-hint"),
  platformButtons: document.querySelectorAll("[data-platform]"),
  exportMenu: document.querySelector("#export-menu"),
  exportMenuTrigger: document.querySelector("#export-menu-trigger"),
  exportMenuPanel: document.querySelector("#export-menu-panel"),
  exportMenuItems: document.querySelectorAll("[data-export-action]"),
  exportConvertLabel: document.querySelector("#export-convert-label"),
  editor: document.querySelector("#widget-code-editor"),
  editorHighlight: document.querySelector("#widget-code-highlight"),
  editorHighlightCode: document.querySelector("#widget-code-highlight code"),
  editorTabs: document.querySelectorAll("[data-editor-file]"),
  editorCopyButton: document.querySelector("#editor-copy-button"),
  editorStatus: document.querySelector("#editor-status"),
  editorFilename: document.querySelector("#editor-filename"),
  eventFab: document.querySelector("#event-fab"),
  eventSimulator: document.querySelector("#event-simulator"),
  toast: document.querySelector("#toast")
};

let widget;
let eventSimulatorCloseTimer;
let widgetCatalog = [];
let activeWidgetId = "";
let librarySearchTerm = "";
let librarySortMode = { widget: "name-asc", alert: "name-asc" };
let widgetSwitching = false;
let selectedWidgetIcon = "widgets";
let selectedWidgetType = "widget";
let widgetSettingsMode = "edit";
let fieldData = {};
let session = {};
let channel = { id: "local-channel", username: "MaChaine" };
let reloadTimer;
let toastTimer;
let previewReloadTimer;
let widgetFileReloadTimer;
let pendingWidgetChange = null;
let platformSwitching = false;
let activeEditorFile = "html";
let editorInitialized = false;
let editorApplyTimer;
const editorSources = {};
const editorSaveTimers = new Map();
const editorSaveRevisions = new Map();
const editorFileStates = new Map();
let editorCopyResetTimer;
const editorFiles = {
  html: { filename: "widget.html", property: "html", label: "Code HTML du widget" },
  css: { filename: "widget.css", property: "css", label: "Code CSS du widget" },
  js: { filename: "widget.streamelements.js", property: "js", label: "Code JavaScript du widget" },
  fields: { filename: "fields.streamelements.json", property: "fieldsSource", label: "Champs JSON du widget" },
  data: { filename: "data.streamelements.json", property: "dataSource", label: "Données brutes simulées (fieldData)" }
};
const pendingApiCalls = new Map();
const chatRoleBadges = {
  moderator: {
    type: "moderator",
    version: "1",
    url: "https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/3",
    description: "Modérateur"
  },
  vip: {
    type: "vip",
    version: "1",
    url: "https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3",
    description: "VIP"
  },
  "artist-badge": {
    type: "artist-badge",
    version: "1",
    url: "https://static-cdn.jtvnw.net/badges/v1/4300a897-03dc-4e83-8c0e-c332fee7057f/3",
    description: "Artiste"
  },
  subscriber: {
    type: "subscriber",
    version: "1",
    url: "https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/3",
    description: "Abonné"
  },
  broadcaster: {
    type: "broadcaster",
    version: "1",
    url: "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/3",
    description: "Streamer"
  }
};
const chatBadgePool = [
  [], [], [], [],
  ["subscriber"], ["subscriber"],
  ["moderator"],
  ["vip"],
  ["artist-badge"],
  ["moderator", "subscriber"]
];

function randomChatBadges() {
  const roles = chatBadgePool[Math.floor(Math.random() * chatBadgePool.length)];
  return roles.map((role) => chatRoleBadges[role]).filter(Boolean);
}

const chatMessageWords = [
  "salut", "coucou", "haha", "gg", "nice", "wow", "trop", "bien", "hype", "incroyable",
  "lol", "on", "y", "va", "cette", "partie", "est", "folle", "je", "adore", "ce", "stream",
  "chill", "super", "content", "d'être", "là", "soir", "vous", "êtes", "les", "meilleurs",
  "franchement", "ça", "déchire", "encore", "un", "peu", "et", "gagne", "clean", "propre",
  "belle", "action", "sérieux", "quel", "niveau", "j'y", "crois", "pas", "besoin", "d'un",
  "petit", "café", "avant", "de", "continuer", "vivement", "prochain", "objectif", "merci",
  "pour", "le", "contenu", "toujours", "aussi", "bon", "public", "au", "rendez", "vous"
];

function randomChatMessageLength() {
  const roll = Math.random();
  if (roll < 0.5) return Math.floor(Math.random() * 4) + 1;
  if (roll < 0.85) return Math.floor(Math.random() * 8) + 5;
  return Math.floor(Math.random() * 20) + 13;
}

function randomChatMessage() {
  const length = randomChatMessageLength();
  const words = Array.from({ length }, () => chatMessageWords[Math.floor(Math.random() * chatMessageWords.length)]);
  const message = words.join(" ");
  return message.charAt(0).toUpperCase() + message.slice(1) + (Math.random() < 0.3 ? " !" : "");
}

const randomNameAdjectives = [
  "Pixel", "Nova", "Ombre", "Cyber", "Neon", "Astro", "Mystique", "Turbo",
  "Solaire", "Glacial", "Sauvage", "Cosmique", "Rebelle", "Chromatique", "Electrique"
];
const randomNameNouns = [
  "Loutre", "Renard", "Phoenix", "Wolf", "Faucon", "Dragon", "Panda",
  "Comete", "Ninja", "Griffon", "Lynx", "Corbeau", "Tigre", "Otarie", "Yeti"
];

function randomEventName() {
  const adjective = randomNameAdjectives[Math.floor(Math.random() * randomNameAdjectives.length)];
  const noun = randomNameNouns[Math.floor(Math.random() * randomNameNouns.length)];
  const suffix = Math.random() < 0.5 ? String(Math.floor(Math.random() * 99)) : "";
  return `${adjective}${noun}${suffix}`;
}

const cheerBitAmounts = [100, 200, 300, 500, 1000, 1500, 2500, 5000, 10000];

function randomEventAmount(listener) {
  if (listener === "raid-latest") return Math.floor(Math.random() * 249) + 2;
  if (listener === "cheer-latest") return cheerBitAmounts[Math.floor(Math.random() * cheerBitAmounts.length)];
  return Math.floor(Math.random() * 50) + 1;
}

const previewSizeStorageKey = "se-lab-preview-size-v2";
const previewThemeStorageKey = "se-lab-preview-theme";
const previewPlatformStorageKey = "widget-lab-platform";
const activeWidgetStorageKey = "widget-lab-active-widget";
const sidebarStateStorageKey = "widget-lab-sidebar-sections";
const libraryGroupsStorageKey = "widget-lab-library-groups";
const librarySortStorageKey = "widget-lab-library-sort";
try {
  // JSON.parse d'une ancienne valeur "name-asc" (chaîne simple, pré-migration
  // vers un tri par colonne) n'est pas un JSON valide et lève : on retombe
  // proprement sur le défaut, migration gratuite sans code spécial.
  librarySortMode = { ...librarySortMode, ...JSON.parse(localStorage.getItem(librarySortStorageKey)) };
} catch {
  // valeur absente ou invalide : on garde le défaut défini plus haut.
}
const widgetIconChoices = [
  ["widgets", "Widgets"],
  ["animation", "Animation"],
  ["sports_esports", "Jeu"],
  ["forum", "Chat"],
  ["chat_bubble", "Message"],
  ["social_leaderboard", "Objectif"],
  ["monitoring", "Statistiques"],
  ["notifications", "Notification"],
  ["favorite", "Cœur"],
  ["star", "Étoile"],
  ["celebration", "Célébration"],
  ["bolt", "Éclair"],
  ["trophy", "Trophée"],
  ["inventory_2", "Archive"]
];
let previewSize = loadPreviewSize();
let previewTheme = loadPreviewTheme();
let previewPlatform = normalizePlatform(localStorage.getItem(previewPlatformStorageKey));
let liveStatuses = { streamelements: "disabled", streamlabs: "disabled" };

function buildTokenizer(rules) {
  const pattern = rules.map(([, source], index) => `(?<t${index}>${source})`).join("|");
  const regex = new RegExp(pattern, "g");
  return function highlight(source) {
    let output = "";
    let lastIndex = 0;
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(source))) {
      if (match.index > lastIndex) output += escapeHtml(source.slice(lastIndex, match.index));
      const typeIndex = rules.findIndex((_, index) => match.groups[`t${index}`] !== undefined);
      output += `<span class="tok-${rules[typeIndex][0]}">${escapeHtml(match[0])}</span>`;
      lastIndex = match.index + match[0].length;
      if (match[0].length === 0) regex.lastIndex += 1;
    }
    output += escapeHtml(source.slice(lastIndex));
    return output;
  };
}

const TEMPLATE_TOKEN = ["template", String.raw`\{\{\s*[\w.-]+\s*\}\}`];

const EDITOR_HIGHLIGHTERS = {
  html: buildTokenizer([
    ["comment", String.raw`<!--[\s\S]*?-->`],
    TEMPLATE_TOKEN,
    ["string", String.raw`"[^"]*"|'[^']*'`],
    ["tag", String.raw`</?[a-zA-Z][\w:-]*`],
    ["attr", String.raw`[a-zA-Z_:][\w:-]*(?=\s*=)`]
  ]),
  css: buildTokenizer([
    ["comment", String.raw`/\*[\s\S]*?\*/`],
    TEMPLATE_TOKEN,
    ["string", String.raw`"[^"]*"|'[^']*'`],
    ["keyword", String.raw`@[a-zA-Z-]+`],
    ["number", String.raw`#[0-9a-fA-F]{3,8}\b|-?\b\d+\.?\d*(px|em|rem|%|deg|ms|s|vh|vw|fr)?\b`],
    ["attr", String.raw`[a-zA-Z-]+(?=\s*:)`]
  ]),
  js: buildTokenizer([
    ["comment", String.raw`//[^\n]*|/\*[\s\S]*?\*/`],
    TEMPLATE_TOKEN,
    ["string", String.raw`\`(?:\\.|[^\`\\])*\`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'`],
    ["bool", String.raw`\b(?:true|false|null|undefined)\b`],
    ["keyword", String.raw`\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|this|typeof|instanceof|in|of|try|catch|finally|throw|async|await|yield|import|export|default|from|delete|void|static|get|set)\b`],
    ["number", String.raw`\b\d+\.?\d*(?:[eE][+-]?\d+)?\b`]
  ]),
  fields: buildTokenizer([
    ["key", String.raw`"(?:\\.|[^"\\])*"(?=\s*:)`],
    ["string", String.raw`"(?:\\.|[^"\\])*"`],
    ["bool", String.raw`\btrue\b|\bfalse\b|\bnull\b`],
    ["number", String.raw`-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b`]
  ])
};
EDITOR_HIGHLIGHTERS.data = EDITOR_HIGHLIGHTERS.fields;

function renderEditorHighlight() {
  if (!elements.editorHighlightCode) return;
  const highlight = EDITOR_HIGHLIGHTERS[activeEditorFile] || EDITOR_HIGHLIGHTERS.js;
  elements.editorHighlightCode.innerHTML = highlight(elements.editor.value);
}

function syncEditorScroll() {
  if (!elements.editorHighlight) return;
  elements.editorHighlight.scrollTop = elements.editor.scrollTop;
  elements.editorHighlight.scrollLeft = elements.editor.scrollLeft;
}

function initializeEditorCopyButton() {
  if (!elements.editorCopyButton) return;
  elements.editorCopyButton.addEventListener("click", () => void copyActiveEditorFile());
}

async function copyActiveEditorFile() {
  const file = activeEditorFile;
  const content = editorSources[file] ?? "";
  const button = elements.editorCopyButton;
  const icon = button.querySelector(".material-symbols-rounded");

  try {
    await navigator.clipboard.writeText(content);
    showToast(`${editorFiles[file].filename} copié`);
    button.classList.add("is-copied");
    icon.textContent = "check";
    clearTimeout(editorCopyResetTimer);
    editorCopyResetTimer = setTimeout(() => {
      button.classList.remove("is-copied");
      icon.textContent = "content_copy";
    }, 1200);
  } catch (error) {
    showToast(`Copie impossible : ${error.message}`);
  }
}

initializePreviewPlatform();
initializeExportMenu();
initializePreviewControls();
initializePreviewTheme();
initializeSidebarSections();
initializeLibraryGroups();
initializeWidgetSettings();
initializeDropdowns();
initializeDashboardLibraryControls();
initializeEditorCopyButton();
initializeContactForm();
await initialize();

function loadPreviewSize() {
  try {
    const saved = JSON.parse(localStorage.getItem(previewSizeStorageKey) || "null");
    return {
      width: clampPreviewDimension(saved?.width, 1920),
      height: clampPreviewDimension(saved?.height, 1080)
    };
  } catch {
    return { width: 1920, height: 1080 };
  }
}

function clampPreviewDimension(value, fallback) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(4096, Math.max(64, number)) : fallback;
}

function loadPreviewTheme() {
  return localStorage.getItem(previewThemeStorageKey) === "light" ? "light" : "dark";
}

function initializePreviewPlatform() {
  applyPreviewPlatform();
  updateCustomEventExample();
  for (const button of elements.platformButtons) {
    button.addEventListener("click", async () => {
      const nextPlatform = normalizePlatform(button.dataset.platform);
      if (nextPlatform === previewPlatform || platformSwitching || widgetSwitching) return;

      if (!await flushWidgetEditor()) {
        showToast("Corrigez les erreurs de l’éditeur avant de changer de plateforme.");
        return;
      }

      const previousPlatform = previewPlatform;
      platformSwitching = true;
      for (const platformButton of elements.platformButtons) platformButton.disabled = true;
      renderWidgetLibrary();
      previewPlatform = nextPlatform;
      applyPreviewPlatform();
      updateCustomEventExample();
      const loaded = await refreshWidgetPreview(
        { file: nextPlatform === PLATFORM_STREAMLABS ? "version Streamlabs" : "version StreamElements" },
        false,
        { resetEditor: true, resetFields: true }
      );

      if (loaded) {
        localStorage.setItem(previewPlatformStorageKey, previewPlatform);
        showToast(`Version ${previewPlatform === PLATFORM_STREAMLABS ? "Streamlabs" : "StreamElements"} chargée`);
      } else {
        previewPlatform = previousPlatform;
        applyPreviewPlatform();
        updateCustomEventExample();
        await refreshWidgetPreview({ file: "restauration de la plateforme" }, false, {
          resetEditor: true,
          resetFields: true
        });
      }

      platformSwitching = false;
      for (const platformButton of elements.platformButtons) platformButton.disabled = false;
      renderWidgetLibrary();
    });
  }
}

function applyPreviewPlatform() {
  for (const button of elements.platformButtons) {
    const active = button.dataset.platform === previewPlatform;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  renderLiveStatusIndicator();
  const conversionTarget = previewPlatform === PLATFORM_STREAMLABS ? "StreamElements" : "Streamlabs";
  elements.fieldsFilenameHint.textContent = previewPlatform === PLATFORM_STREAMLABS
    ? "fields.streamlabs.json"
    : "fields.streamelements.json";
  elements.exportConvertLabel.textContent = `Convertir pour ${conversionTarget}`;
  elements.exportMenuTrigger.setAttribute(
    "aria-label",
    `Exporter le widget depuis ${previewPlatform === PLATFORM_STREAMLABS ? "Streamlabs" : "StreamElements"}`
  );
  setExportMenuOpen(false);
  document.documentElement.dataset.platform = previewPlatform;
}

function initializeExportMenu() {
  elements.exportMenuTrigger.addEventListener("click", () => {
    setExportMenuOpen(elements.exportMenuTrigger.getAttribute("aria-expanded") !== "true");
  });

  for (const item of elements.exportMenuItems) {
    item.addEventListener("click", async () => {
      if (item.dataset.exportAction === "shortcut") {
        setExportMenuOpen(false);
        exportWidgetShortcut();
        return;
      }
      const platform = item.dataset.exportAction === "download"
        ? previewPlatform
        : previewPlatform === PLATFORM_STREAMLABS ? PLATFORM_STREAM_ELEMENTS : PLATFORM_STREAMLABS;
      setExportMenuOpen(false);
      elements.exportMenuTrigger.disabled = true;
      try {
        await exportWidgetCode(platform);
      } finally {
        elements.exportMenuTrigger.disabled = false;
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (!elements.exportMenu.contains(event.target)) setExportMenuOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || elements.exportMenuPanel.hidden) return;
    setExportMenuOpen(false);
    elements.exportMenuTrigger.focus();
  });
}

function setExportMenuOpen(open) {
  if (!elements.exportMenuTrigger || !elements.exportMenuPanel) return;
  elements.exportMenuTrigger.setAttribute("aria-expanded", String(open));
  elements.exportMenuPanel.hidden = !open;
  if (open) elements.exportMenuItems[0]?.focus();
}

function updateCustomEventExample() {
  const detail = previewPlatform === PLATFORM_STREAMLABS
    ? { type: "follow", name: "DebugUser", platform: "twitch_account", isTest: true }
    : { listener: "follower-latest", event: { name: "DebugUser", amount: 1 } };
  elements.customEvent.value = JSON.stringify(detail, null, 2);
}

function initializePreviewTheme() {
  elements.previewTheme.checked = previewTheme === "light";
  applyPreviewTheme();
  elements.previewTheme.addEventListener("change", () => {
    previewTheme = elements.previewTheme.checked ? "light" : "dark";
    localStorage.setItem(previewThemeStorageKey, previewTheme);
    applyPreviewTheme();
    if (widget) renderWidget();
  });
}

function applyPreviewTheme() {
  elements.previewShell.classList.toggle("is-light", previewTheme === "light");
  const nextTheme = previewTheme === "light" ? "sombre" : "clair";
  const label = `Passer en mode ${nextTheme}`;
  elements.previewTheme.setAttribute("aria-label", label);
  elements.previewTheme.closest(".preview-theme").title = label;
}

function initializePreviewControls() {
  elements.previewWidth.value = previewSize.width;
  elements.previewHeight.value = previewSize.height;
  applyPreviewSize();

  const updateFromInputs = () => {
    previewSize = {
      width: clampPreviewDimension(elements.previewWidth.value, previewSize.width),
      height: clampPreviewDimension(elements.previewHeight.value, previewSize.height)
    };
    elements.previewWidth.value = previewSize.width;
    elements.previewHeight.value = previewSize.height;
    localStorage.setItem(previewSizeStorageKey, JSON.stringify(previewSize));
    applyPreviewSize();

    clearTimeout(previewReloadTimer);
    previewReloadTimer = setTimeout(() => {
      if (widget) renderWidget();
    }, 160);
  };

  elements.previewWidth.addEventListener("change", updateFromInputs);
  elements.previewHeight.addEventListener("change", updateFromInputs);
  new ResizeObserver(updatePreviewScale).observe(elements.previewColumn);
}

function applyPreviewSize() {
  elements.previewMeta.textContent = `${previewSize.width} × ${previewSize.height}`;
  elements.previewShell.style.setProperty("--preview-width", `${previewSize.width}px`);
  elements.previewCanvas.style.width = `${previewSize.width}px`;
  elements.previewCanvas.style.height = `${previewSize.height}px`;
  window.requestAnimationFrame(updatePreviewScale);
}

function updatePreviewScale() {
  const availableWidth = elements.previewShell.clientWidth || previewSize.width;
  const scale = Math.min(1, availableWidth / previewSize.width);
  elements.previewCanvas.style.transform = `scale(${scale})`;
  elements.previewShell.style.height = `${previewSize.height * scale}px`;
}

// Anime l'ouverture/fermeture d'un <details> natif : le navigateur ne peut
// pas transitionner display:none <-> visible en CSS pur, donc on intercepte
// le clic sur <summary>, on anime la hauteur via la Web Animations API, puis
// on pose details.open au bon moment (ce qui déclenche le toggle natif, donc
// aucun changement requis à la logique de persistance qui l'écoute déjà).
function makeDetailsAnimatable(details) {
  const summary = details.querySelector(":scope > summary");
  const body = details.lastElementChild;
  if (!summary || body === summary) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--duration-slow")) || 200;
  let animation = null;

  summary.addEventListener("click", (event) => {
    event.preventDefault();
    if (animation) animation.cancel();
    details.style.overflow = "hidden";
    if (details.open) shrink(); else grow();
  });

  function shrink() {
    const startHeight = `${details.offsetHeight}px`;
    const endHeight = `${summary.offsetHeight}px`;
    animation = details.animate({ height: [startHeight, endHeight] }, { duration, easing: "ease" });
    animation.onfinish = () => finish(false);
  }

  function grow() {
    details.open = true;
    requestAnimationFrame(() => {
      const startHeight = `${summary.offsetHeight}px`;
      const endHeight = `${summary.offsetHeight + body.offsetHeight}px`;
      details.style.height = startHeight;
      animation = details.animate({ height: [startHeight, endHeight] }, { duration, easing: "ease" });
      animation.onfinish = () => finish(true);
    });
  }

  function finish(open) {
    details.open = open;
    details.style.height = "";
    details.style.overflow = "";
    animation = null;
  }
}

// Persiste l'état ouvert/fermé d'un groupe de <details> dans localStorage,
// partagé entre les sections de la sidebar et les groupes de bibliothèque.
function wireAccordionPersistence(detailsElements, storageKey, keyOf) {
  let savedState = {};
  try {
    savedState = JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    savedState = {};
  }

  for (const details of detailsElements) {
    const key = keyOf(details);
    if (typeof savedState[key] === "boolean") details.open = savedState[key];
    details.addEventListener("toggle", () => {
      let currentState = {};
      try {
        currentState = JSON.parse(localStorage.getItem(storageKey) || "{}");
      } catch {
        currentState = {};
      }
      currentState[key] = details.open;
      localStorage.setItem(storageKey, JSON.stringify(currentState));
    });
  }
}

function initializeSidebarSections() {
  for (const section of elements.sidebarSections) makeDetailsAnimatable(section);
  wireAccordionPersistence(elements.sidebarSections, sidebarStateStorageKey, (details) => details.dataset.sidebarSection);
}

function initializeLibraryGroups() {
  for (const group of elements.libraryGroups) makeDetailsAnimatable(group);
  wireAccordionPersistence(elements.libraryGroups, libraryGroupsStorageKey, (details) => details.dataset.libraryGroup);
}

// Les 2 groupes (Widgets/Alertes) peuvent être ouverts indépendamment ; on se
// contente d'ouvrir celui qui contient le widget concerné, sans toucher à
// l'autre (contrairement à l'ancien système d'onglets mutuellement exclusifs).
function revealLibraryGroupForWidget(widgetId) {
  const entry = widgetCatalog.find((item) => item.id === widgetId);
  if (!entry) return;
  const isAlert = entry.type === "alert";
  const group = document.querySelector(`[data-library-group="${isAlert ? "alert" : "widget"}"]`);
  if (group && !group.open) group.open = true;

  const shownList = isAlert ? elements.alertList : elements.widgetList;
  shownList.classList.remove("is-entering");
  void shownList.offsetWidth;
  shownList.classList.add("is-entering");
}

function initializeWidgetSettings() {
  for (const [iconName, label] of widgetIconChoices) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "widget-icon-choices__choice";
    button.dataset.widgetIcon = iconName;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${iconName}</span>`;
    button.addEventListener("click", () => selectWidgetIcon(iconName));
    elements.widgetIconChoices.append(button);
  }

  for (const button of elements.widgetTypeChoices) {
    button.addEventListener("click", () => selectWidgetType(button.dataset.widgetType));
  }

  const close = () => elements.widgetSettingsDialog.close();
  document.querySelector("#close-widget-settings").addEventListener("click", close);
  document.querySelector("#cancel-widget-settings").addEventListener("click", close);
  elements.widgetSettingsDialog.addEventListener("click", event => {
    if (event.target === elements.widgetSettingsDialog) close();
  });
  elements.widgetSettingsForm.addEventListener("submit", event => {
    event.preventDefault();
    void saveWidgetMetadata();
  });
  elements.addWidgetButton.addEventListener("click", () => openWidgetCreation("widget"));
  elements.addAlertButton.addEventListener("click", () => openWidgetCreation("alert"));
}

function initializeDashboardLibraryControls() {
  elements.dashboardLibrarySearch.addEventListener("input", () => {
    librarySearchTerm = elements.dashboardLibrarySearch.value;
    renderWidgetLibrary();
  });

  for (const trigger of elements.dashboardFilterTriggers) {
    const scope = trigger.dataset.scope;
    const panel = trigger.nextElementSibling;
    updateFilterPanelChecks(panel, librarySortMode[scope]);

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleDropdown(trigger);
    });

    for (const item of panel.querySelectorAll("[data-sort]")) {
      item.addEventListener("click", () => {
        librarySortMode[scope] = item.dataset.sort;
        localStorage.setItem(librarySortStorageKey, JSON.stringify(librarySortMode));
        updateFilterPanelChecks(panel, librarySortMode[scope]);
        closeAllDropdowns();
        renderWidgetLibrary();
      });
    }
  }

  elements.dashboardAddFabTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleDropdown(elements.dashboardAddFabTrigger);
  });
  elements.dashboardAddFabWidget.addEventListener("click", () => {
    closeAllDropdowns();
    openWidgetCreation("widget");
  });
  elements.dashboardAddFabAlert.addEventListener("click", () => {
    closeAllDropdowns();
    openWidgetCreation("alert");
  });
}

function updateFilterPanelChecks(panel, activeSort) {
  for (const item of panel.querySelectorAll("[data-sort]")) {
    item.setAttribute("aria-checked", String(item.dataset.sort === activeSort));
  }
}

function initializeContactForm() {
  const close = () => elements.contactDialog.close();
  elements.contactOpenButton.addEventListener("click", () => {
    elements.contactForm.reset();
    setContactMessage("");
    elements.contactDialog.showModal();
  });
  document.querySelector("#close-contact-dialog").addEventListener("click", close);
  document.querySelector("#cancel-contact").addEventListener("click", close);
  elements.contactDialog.addEventListener("click", event => {
    if (event.target === elements.contactDialog) close();
  });
  elements.contactForm.addEventListener("submit", event => {
    event.preventDefault();
    void submitContactForm();
  });
}

function setContactMessage(message, state) {
  const el = document.querySelector("#contact-message-status");
  el.textContent = message;
  el.className = `widget-settings__message${state ? ` is-${state}` : ""}`;
}

async function submitContactForm() {
  const payload = {
    firstName: document.querySelector("#contact-first-name").value.trim(),
    lastName: document.querySelector("#contact-last-name").value.trim(),
    email: document.querySelector("#contact-email").value.trim(),
    subject: document.querySelector("#contact-subject").value.trim(),
    message: document.querySelector("#contact-message").value.trim()
  };
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Erreur HTTP ${response.status}`);
    elements.contactDialog.close();
    showToast("Message envoyé, merci !");
  } catch (error) {
    setContactMessage(error.message, "error");
  }
}

function openWidgetSettings(entry) {
  widgetSettingsMode = "edit";
  elements.widgetSettingsId.value = entry.id;
  elements.widgetSettingsName.value = entry.name;
  elements.widgetSettingsDescription.value = entry.description || "";
  setWidgetSettingsMessage("");
  selectWidgetIcon(entry.icon || "widgets");
  selectWidgetType(entry.type || "widget");
  elements.widgetSettingsTitle.textContent = "Modifier le widget";
  elements.saveWidgetSettings.textContent = "Enregistrer";
  elements.widgetSettingsDialog.showModal();
  elements.widgetSettingsName.focus();
  elements.widgetSettingsName.select();
}

function openWidgetCreation(defaultType = "widget") {
  widgetSettingsMode = "create";
  elements.widgetSettingsId.value = "";
  elements.widgetSettingsName.value = "";
  elements.widgetSettingsDescription.value = "";
  setWidgetSettingsMessage("");
  selectWidgetIcon(defaultType === "alert" ? "celebration" : "widgets");
  selectWidgetType(defaultType);
  elements.widgetSettingsTitle.textContent = defaultType === "alert" ? "Nouvelle alerte" : "Nouveau widget";
  elements.saveWidgetSettings.textContent = "Créer";
  elements.widgetSettingsDialog.showModal();
  elements.widgetSettingsName.focus();
}

function selectWidgetIcon(iconName) {
  selectedWidgetIcon = widgetIconChoices.some(([value]) => value === iconName) ? iconName : "widgets";
  for (const button of elements.widgetIconChoices.querySelectorAll("[data-widget-icon]")) {
    const selected = button.dataset.widgetIcon === selectedWidgetIcon;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
}

function selectWidgetType(type) {
  selectedWidgetType = type === "alert" ? "alert" : "widget";
  for (const button of elements.widgetTypeChoices) {
    const selected = button.dataset.widgetType === selectedWidgetType;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
}

function setWidgetSettingsMessage(message, state = "") {
  elements.widgetSettingsMessage.textContent = message;
  elements.widgetSettingsMessage.className = `widget-settings__message${state ? ` is-${state}` : ""}`;
}

async function saveWidgetMetadata() {
  const isCreating = widgetSettingsMode === "create";
  const widgetId = elements.widgetSettingsId.value;
  const name = elements.widgetSettingsName.value.trim();
  const description = elements.widgetSettingsDescription.value.trim();
  if (!name) {
    elements.widgetSettingsName.focus();
    return;
  }

  elements.saveWidgetSettings.disabled = true;
  elements.saveWidgetSettings.textContent = isCreating ? "Création…" : "Enregistrement…";
  setWidgetSettingsMessage(isCreating ? "Création en cours…" : "Enregistrement en cours…");
  try {
    const response = isCreating
      ? await fetch("/api/widgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, icon: selectedWidgetIcon, type: selectedWidgetType })
        })
      : await fetch("/api/widget/metadata", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ widgetId, name, description, icon: selectedWidgetIcon, type: selectedWidgetType })
        });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = response.status === 405
        ? "Le serveur local doit être redémarré pour activer cette fonctionnalité."
        : body.error || `Erreur HTTP ${response.status}`;
      throw new Error(message);
    }

    const { widget: updatedWidget } = await response.json();

    if (isCreating) {
      widgetCatalog = [...widgetCatalog, updatedWidget];
      renderWidgetLibrary();
      elements.widgetSettingsDialog.close();
      showToast(`${updatedWidget.name} créé`);
      await switchWidget(updatedWidget.id);
      return;
    }

    widgetCatalog = widgetCatalog.map(entry =>
      entry.id === updatedWidget.id ? { ...entry, ...updatedWidget } : entry
    );
    if (activeWidgetId === updatedWidget.id && widget) {
      widget.widgetMeta = { ...widget.widgetMeta, ...updatedWidget };
      applyWidgetMeta();
    }
    revealLibraryGroupForWidget(updatedWidget.id);
    renderWidgetLibrary();
    setWidgetSettingsMessage("Informations enregistrées.", "success");
    elements.widgetSettingsDialog.close();
    showToast("Informations du widget enregistrées");
  } catch (error) {
    setWidgetSettingsMessage(error.message, "error");
  } finally {
    elements.saveWidgetSettings.disabled = false;
    elements.saveWidgetSettings.textContent = isCreating ? "Créer" : "Enregistrer";
  }
}

async function initialize() {
  elements.footerYear.textContent = String(new Date().getFullYear());
  try {
    const [catalogResponse, stateResponse] = await Promise.all([
      fetch("/api/widgets"),
      fetch("/api/state")
    ]);
    if (!catalogResponse.ok) throw new Error((await catalogResponse.json()).error);
    const catalog = await catalogResponse.json();
    widgetCatalog = catalog.widgets || [];
    const requestedWidgetId = new URLSearchParams(window.location.search).get("widget");
    const openDirectly = widgetCatalog.some(entry => entry.id === requestedWidgetId);
    const savedWidgetId = localStorage.getItem(activeWidgetStorageKey);
    activeWidgetId = openDirectly
      ? requestedWidgetId
      : widgetCatalog.some(entry => entry.id === savedWidgetId)
        ? savedWidgetId
        : widgetCatalog.some(entry => entry.id === catalog.defaultWidgetId)
          ? catalog.defaultWidgetId
          : widgetCatalog[0]?.id;
    if (!activeWidgetId) throw new Error("Aucun widget disponible");

    const widgetResponse = await fetch(
      `/api/widget?id=${encodeURIComponent(activeWidgetId)}&platform=${encodeURIComponent(previewPlatform)}`
    );
    if (!widgetResponse.ok) throw new Error((await widgetResponse.json()).error);
    widget = await widgetResponse.json();
    widget.fields = normalizeFieldDefinitions(widget.fields);
    configureEditorFiles(widget);
    const state = await stateResponse.json();
    session = state.session;
    channel = state.channel;
    fieldData = loadFieldData(widget.fields);
    revealLibraryGroupForWidget(activeWidgetId);
    renderWidgetLibrary();
    applyWidgetMeta();
    renderFields();
    renderWidget();
    initializeWidgetEditor();
    updateLiveStatus(state.live);
    connectEventStream();
    if (openDirectly) hideDashboard(); else showDashboard();
  } catch (error) {
    addConsole("error", error.message);
    showToast(error.message);
  }
}

function renderWidgetLibrary() {
  const widgets = widgetCatalog.filter((entry) => entry.type !== "alert");
  const alerts = widgetCatalog.filter((entry) => entry.type === "alert");

  elements.widgetCount.textContent = String(widgets.length);
  populateWidgetLibraryList(elements.widgetList, widgets, "Aucun widget pour l’instant.");
  populateWidgetLibraryList(elements.dashboardWidgetList, filterAndSortLibraryEntries(widgets, "widget"), dashboardLibraryEmptyMessage("Aucun widget pour l’instant."), { showMeta: true });

  elements.alertCount.textContent = String(alerts.length);
  populateWidgetLibraryList(elements.alertList, alerts, "Aucune alerte pour l’instant.");
  populateWidgetLibraryList(elements.dashboardAlertList, filterAndSortLibraryEntries(alerts, "alert"), dashboardLibraryEmptyMessage("Aucune alerte pour l’instant."), { showMeta: true });

  updateDashboardLibrarySuggestions();
}

function dashboardLibraryEmptyMessage(defaultMessage) {
  const term = librarySearchTerm.trim();
  return term ? `Aucun résultat pour « ${term} ».` : defaultMessage;
}

function filterAndSortLibraryEntries(entries, scope) {
  const term = librarySearchTerm.trim().toLowerCase();
  const filtered = term
    ? entries.filter((entry) =>
        entry.name.toLowerCase().includes(term) ||
        (entry.description || "").toLowerCase().includes(term))
    : entries;

  const byName = (a, b) => a.name.localeCompare(b.name, "fr");
  const sorters = {
    "name-asc": byName,
    "name-desc": (a, b) => -byName(a, b),
    "updated-asc": (a, b) => (a.updatedAt || 0) - (b.updatedAt || 0),
    "updated-desc": (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
    "created-asc": (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
    "created-desc": (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  };
  return [...filtered].sort(sorters[librarySortMode[scope]] || sorters["name-asc"]);
}

function updateDashboardLibrarySuggestions() {
  const names = [...new Set(widgetCatalog.map((entry) => entry.name))].sort((a, b) => a.localeCompare(b, "fr"));
  elements.dashboardLibrarySuggestions.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
}

function populateWidgetLibraryList(container, entries, emptyMessage, options) {
  container.replaceChildren();
  if (entries.length) {
    for (const entry of entries) container.append(buildWidgetLibraryRow(entry, options));
  } else {
    container.append(buildLibraryEmptyState(emptyMessage));
  }
}

function buildLibraryEmptyState(message) {
  const empty = document.createElement("p");
  empty.className = "widget-library__empty";
  empty.textContent = message;
  return empty;
}

function buildWidgetLibraryRow(entry, { showMeta = false } = {}) {
  const row = document.createElement("div");
  row.className = "widget-library__row";

  // Sur le dashboard, aucun widget/alerte n'est "en cours d'édition" à l'écran :
  // ne jamais afficher de sélection tant que le dashboard est visible.
  const isActive = entry.id === activeWidgetId && elements.dashboardView.hidden;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "widget-library__item";
  button.classList.toggle("is-active", isActive);
  button.disabled = widgetSwitching || platformSwitching;
  button.dataset.widgetId = entry.id;
  button.setAttribute("aria-pressed", String(isActive));

  const icon = document.createElement("span");
  icon.className = "widget-library__icon";
  icon.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${escapeHtml(entry.icon || "widgets")}</span>`;

  const copy = document.createElement("span");
  copy.className = "widget-library__copy";
  const name = document.createElement("strong");
  name.textContent = entry.name;
  const description = document.createElement("small");
  description.textContent = entry.description;
  copy.append(name, description);

  if (showMeta && entry.updatedAt) {
    const meta = document.createElement("small");
    meta.className = "widget-library__meta";
    meta.textContent = `Modifié le ${formatAccountDate(entry.updatedAt)}`;
    copy.append(meta);
  }

  const status = document.createElement("span");
  if (isActive) {
    status.className = "material-symbols-rounded widget-library__active-mark";
    status.textContent = "check_circle";
    status.setAttribute("aria-hidden", "true");
  } else if (entry.archived) {
    status.className = "widget-library__badge";
    status.textContent = "Archive";
  }

  button.append(icon, copy, status);
  button.addEventListener("click", () => {
    hideDashboard();
    void switchWidget(entry.id);
  });

  const menu = document.createElement("div");
  menu.className = "widget-library__menu";

  const menuTrigger = document.createElement("button");
  menuTrigger.type = "button";
  menuTrigger.className = "widget-library__options";
  menuTrigger.dataset.dropdownTrigger = "";
  menuTrigger.disabled = widgetSwitching || platformSwitching;
  menuTrigger.title = `Options de ${entry.name}`;
  menuTrigger.setAttribute("aria-label", `Options de ${entry.name}`);
  menuTrigger.setAttribute("aria-haspopup", "menu");
  menuTrigger.setAttribute("aria-expanded", "false");
  menuTrigger.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">more_vert</span>';

  const menuPanel = document.createElement("div");
  menuPanel.className = "widget-library__options-panel";
  menuPanel.setAttribute("role", "menu");
  menuPanel.hidden = true;

  const editItem = document.createElement("button");
  editItem.type = "button";
  editItem.className = "widget-library__options-item";
  editItem.setAttribute("role", "menuitem");
  editItem.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">edit</span><span>Modifier</span>';
  editItem.addEventListener("click", () => {
    closeAllDropdowns();
    openWidgetSettings(entry);
  });

  const deleteItem = document.createElement("button");
  deleteItem.type = "button";
  deleteItem.className = "widget-library__options-item is-danger";
  deleteItem.setAttribute("role", "menuitem");
  deleteItem.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">delete</span><span>Supprimer</span>';
  deleteItem.addEventListener("click", () => {
    closeAllDropdowns();
    void deleteWidgetEntry(entry);
  });

  menuPanel.append(editItem, deleteItem);
  menuTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleDropdown(menuTrigger);
  });
  menu.append(menuTrigger, menuPanel);

  row.append(button, menu);
  return row;
}

// Mécanique de dropdown partagée par le menu d'options widget/alerte, les
// filtres de tri par colonne du dashboard et le bouton flottant "Ajouter" :
// tout déclencheur porte [data-dropdown-trigger] et son panneau (hidden par
// défaut) est son frère immédiat dans le DOM.
function closeAllDropdowns() {
  for (const trigger of document.querySelectorAll('[data-dropdown-trigger][aria-expanded="true"]')) {
    trigger.setAttribute("aria-expanded", "false");
    trigger.nextElementSibling.hidden = true;
  }
}

function toggleDropdown(trigger) {
  const panel = trigger.nextElementSibling;
  const wasOpen = trigger.getAttribute("aria-expanded") === "true";
  closeAllDropdowns();
  if (!wasOpen) {
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }
}

function initializeDropdowns() {
  document.addEventListener("click", (event) => {
    if (!event.target.closest('[data-dropdown-trigger], [role="menu"]')) closeAllDropdowns();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllDropdowns();
  });
}

async function deleteWidgetEntry(entry) {
  if (widgetCatalog.length <= 1) {
    showToast("Impossible de supprimer le dernier widget.");
    return;
  }
  if (!window.confirm(`Supprimer définitivement « ${entry.name} » ? Cette action est irréversible.`)) return;

  try {
    const response = await fetch(`/api/widget?id=${encodeURIComponent(entry.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Erreur HTTP ${response.status}`);
    }
    widgetCatalog = widgetCatalog.filter(item => item.id !== entry.id);
    renderWidgetLibrary();
    showToast(`${entry.name} supprimé`);
    if (activeWidgetId === entry.id) {
      const nextId = widgetCatalog[0]?.id;
      if (nextId) await switchWidget(nextId);
    }
  } catch (error) {
    showToast(`Suppression impossible : ${error.message}`);
  }
}

function applyWidgetMeta() {
  const name = widget?.widgetMeta?.name || "Widget";
  elements.previewTitle.textContent = `Aperçu · ${name}`;
}

async function switchWidget(nextWidgetId) {
  if (nextWidgetId === activeWidgetId || widgetSwitching || platformSwitching) return;
  if (!await flushWidgetEditor()) {
    showToast("Corrigez les erreurs de l’éditeur avant de changer de widget.");
    return;
  }

  const previousWidgetId = activeWidgetId;
  activeWidgetId = nextWidgetId;
  widgetSwitching = true;
  for (const platformButton of elements.platformButtons) platformButton.disabled = true;
  revealLibraryGroupForWidget(activeWidgetId);
  renderWidgetLibrary();

  const loaded = await refreshWidgetPreview(
    { file: widgetCatalog.find(entry => entry.id === nextWidgetId)?.name || nextWidgetId },
    false,
    { resetEditor: true, resetFields: true }
  );

  if (loaded) {
    localStorage.setItem(activeWidgetStorageKey, activeWidgetId);
    showToast(`${widget.widgetMeta?.name || "Widget"} chargé`);
  } else {
    activeWidgetId = previousWidgetId;
    await refreshWidgetPreview({ file: "restauration du widget" }, false, {
      resetEditor: true,
      resetFields: true
    });
  }

  widgetSwitching = false;
  for (const platformButton of elements.platformButtons) platformButton.disabled = false;
  renderWidgetLibrary();
}

function initializeWidgetEditor() {
  syncWidgetEditorSources({ force: true });
  if (editorInitialized) return;
  editorInitialized = true;

  for (const tab of elements.editorTabs) {
    tab.addEventListener("click", () => selectEditorFile(tab.dataset.editorFile));
  }

  elements.editor.addEventListener("scroll", syncEditorScroll);

  elements.editor.addEventListener("input", () => {
    const file = activeEditorFile;
    const content = elements.editor.value;
    editorSources[file] = content;
    setEditorFileState(file, "dirty", "Modifié");
    renderEditorHighlight();

    clearTimeout(editorApplyTimer);
    editorApplyTimer = setTimeout(() => {
      applyEditorSource(file, editorSources[file]);
    }, 150);

    clearTimeout(editorSaveTimers.get(file));
    editorSaveTimers.set(file, setTimeout(() => {
      void saveEditorFile(file, editorSources[file]);
    }, 650));
  });

  elements.editor.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = elements.editor.selectionStart;
      const end = elements.editor.selectionEnd;
      elements.editor.setRangeText("  ", start, end, "end");
      elements.editor.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      clearTimeout(editorApplyTimer);
      clearTimeout(editorSaveTimers.get(activeEditorFile));
      editorSources[activeEditorFile] = elements.editor.value;
      applyEditorSource(activeEditorFile, editorSources[activeEditorFile]);
      void saveEditorFile(activeEditorFile, editorSources[activeEditorFile]);
    }
  });
}

function selectEditorFile(file) {
  if (!editorFiles[file]) return;
  activeEditorFile = file;
  for (const tab of elements.editorTabs) {
    const active = tab.dataset.editorFile === file;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  }
  elements.editor.value = editorSources[file] ?? "";
  elements.editor.setAttribute("aria-label", editorFiles[file].label);
  elements.editorFilename.textContent = editorFiles[file].filename;
  renderEditorFileState(file);
  renderEditorHighlight();
  elements.editor.focus();
}

function syncWidgetEditorSources({ force = false } = {}) {
  if (!widget || !elements.editor) return;
  const nextSources = {
    html: widget.html,
    css: widget.css,
    js: widget.js,
    fields: widget.fieldsSource || `${JSON.stringify(widget.fields, null, 2)}\n`,
    data: widget.dataSource || "{}\n"
  };

  for (const [file, content] of Object.entries(nextSources)) {
    const state = editorFileStates.get(file)?.state;
    const activelyEditing = file === activeEditorFile && document.activeElement === elements.editor;
    if (!force && (state === "dirty" || state === "saving" || activelyEditing)) continue;
    editorSources[file] = content;
    if (!editorFileStates.has(file) || force) setEditorFileState(file, "synced", "Synchronisé", false);
  }

  if (force || document.activeElement !== elements.editor) {
    const content = editorSources[activeEditorFile] ?? "";
    if (elements.editor.value !== content) elements.editor.value = content;
  }
  elements.editorFilename.textContent = editorFiles[activeEditorFile].filename;
  elements.editor.setAttribute("aria-label", editorFiles[activeEditorFile].label);
  renderEditorFileState(activeEditorFile);
  renderEditorHighlight();
}

function configureEditorFiles(widgetData) {
  editorFiles.html.filename = widgetData.files?.html || "widget.html";
  editorFiles.css.filename = widgetData.files?.css || "widget.css";
  editorFiles.js.filename = widgetData.files?.js ||
    (previewPlatform === PLATFORM_STREAMLABS ? "widget.streamlabs.js" : "widget.streamelements.js");
  editorFiles.fields.filename = widgetData.files?.fields ||
    (previewPlatform === PLATFORM_STREAMLABS ? "fields.streamlabs.json" : "fields.streamelements.json");
  editorFiles.data.filename = widgetData.files?.data ||
    (previewPlatform === PLATFORM_STREAMLABS ? "data.streamlabs.json" : "data.streamelements.json");
}

function applyEditorSource(file, content) {
  if (!widget || editorSources[file] !== content) return false;

  try {
    if (file === "fields") {
      const parsed = JSON.parse(content);
      const nextFields = normalizeFieldDefinitions(parsed);
      const defaults = Object.fromEntries(
        Object.entries(nextFields).map(([key, definition]) => [key, definition.value])
      );
      const retainedValues = Object.fromEntries(
        Object.entries(fieldData).filter(([key]) => Object.hasOwn(nextFields, key))
      );
      widget.fieldsSource = content;
      widget.fields = nextFields;
      fieldData = { ...defaults, ...retainedValues };
      localStorage.setItem(fieldStorageKey(), JSON.stringify(fieldData));
      renderFields();
    } else if (file === "data") {
      JSON.parse(content);
      widget.dataSource = content;
    } else {
      widget[editorFiles[file].property] = content;
    }

    renderWidget();
    if (editorFileStates.get(file)?.state === "error") setEditorFileState(file, "dirty", "Modifié");
    return true;
  } catch (error) {
    setEditorFileState(file, "error", `JSON invalide · ${error.message}`);
    return false;
  }
}

async function saveEditorFile(file, content) {
  clearTimeout(editorSaveTimers.get(file));
  if (editorSources[file] !== content) return false;
  if (!applyEditorSource(file, content)) return false;

  const revision = (editorSaveRevisions.get(file) || 0) + 1;
  editorSaveRevisions.set(file, revision);
  setEditorFileState(file, "saving", "Enregistrement…");

  try {
    const response = await fetch("/api/widget/file", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetId: activeWidgetId, file: editorFiles[file].filename, content })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Erreur HTTP ${response.status}`);
    }

    if (editorSaveRevisions.get(file) === revision && editorSources[file] === content) {
      setEditorFileState(file, "synced", "Synchronisé");
      addConsole("info", `Enregistré : ${editorFiles[file].filename}`);
    }
    return true;
  } catch (error) {
    if (editorSaveRevisions.get(file) === revision) {
      setEditorFileState(file, "error", `Échec · ${error.message}`);
      showToast(`Impossible d’enregistrer ${editorFiles[file].filename} : ${error.message}`);
    }
    return false;
  }
}

async function flushWidgetEditor() {
  if (!editorInitialized) return true;
  clearTimeout(editorApplyTimer);

  let success = true;
  for (const file of Object.keys(editorFiles)) {
    clearTimeout(editorSaveTimers.get(file));
    const state = editorFileStates.get(file)?.state;
    if (state === "dirty" || state === "error") {
      if (!await saveEditorFile(file, editorSources[file])) success = false;
    }
  }
  return success;
}

function setEditorFileState(file, state, message, shouldRender = true) {
  editorFileStates.set(file, { state, message });
  if (shouldRender && file === activeEditorFile) renderEditorFileState(file);
}

function renderEditorFileState(file) {
  if (!elements.editorStatus) return;
  const { state = "synced", message = "Synchronisé" } = editorFileStates.get(file) || {};
  elements.editorStatus.className = `widget-editor__status is-${state}`;
  elements.editorStatus.querySelector("span").textContent = message;
}

function normalizeFieldDefinitions(definitions) {
  if (!Array.isArray(definitions)) return definitions;
  return Object.fromEntries(
    definitions.map((definition, index) => [definition.name || String(index), definition])
  );
}

function loadFieldData(definitions) {
  const defaults = Object.fromEntries(Object.entries(definitions).map(([key, field]) => [key, field.value]));
  try {
    const legacy = activeWidgetId === "zer0oes-goal-bar" && previewPlatform === PLATFORM_STREAM_ELEMENTS
      ? localStorage.getItem("se-lab-fields")
      : null;
    const persisted = JSON.parse(localStorage.getItem(fieldStorageKey()) || legacy || "{}");
    const saved = Object.fromEntries(
      Object.entries(persisted).filter(([key]) => Object.hasOwn(definitions, key))
    );
    for (const [key, definition] of Object.entries(definitions)) {
      if (
        definition.type === "dropdown" &&
        saved[key] !== undefined &&
        !Object.hasOwn(definition.options || {}, saved[key])
      ) {
        delete saved[key];
      }
      if (["number", "slider"].includes(definition.type) && saved[key] !== undefined) {
        const numericValue = Number(saved[key]);
        if (!Number.isFinite(numericValue)) {
          delete saved[key];
        } else {
          saved[key] = Math.min(
            definition.max ?? numericValue,
            Math.max(definition.min ?? numericValue, numericValue)
          );
        }
      }
    }
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

function fieldStorageKey() {
  return `se-lab-fields-${activeWidgetId}-${previewPlatform}`;
}

function renderFields() {
  elements.fields.replaceChildren();
  const groups = new Map();

  const getContainer = (definition) => {
    if (!definition.group) return elements.fields;
    if (groups.has(definition.group)) return groups.get(definition.group);

    const details = document.createElement("details");
    details.className = "field-group";
    const summary = document.createElement("summary");
    summary.className = "field-group__summary";
    summary.textContent = definition.group;
    summary.addEventListener("click", (event) => {
      event.preventDefault();
      if (details.open) collapseDetails(details);
      else expandDetails(details);
    });
    const body = document.createElement("div");
    body.className = "field-group__body";
    details.append(summary, body);
    elements.fields.append(details);
    groups.set(definition.group, body);
    return body;
  };

  for (const [key, definition] of Object.entries(widget.fields)) {
    if (definition.type === "hidden") continue;
    const container = getContainer(definition);

    if (definition.type === "button") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button--quiet button--wide";
      button.textContent = definition.value || definition.label || key;
      button.addEventListener("click", () => dispatchPlatformEvent({
        listener: "widget-button",
        event: { field: key, value: definition.value }
      }));
      container.append(button);
      continue;
    }

    if (definition.type === "checkbox") {
      const label = document.createElement("label");
      label.className = "checkbox-field";
      label.innerHTML = `<span class="checkbox-field__label">${escapeHtml(definition.label || key)}</span>`;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(fieldData[key]);
      input.addEventListener("change", () => updateField(key, input.checked));
      label.append(input);
      container.append(label);
      continue;
    }

    const label = document.createElement("label");
    label.className = "field";
    const caption = document.createElement("span");
    caption.className = "field__label";
    caption.textContent = definition.label || key;
    label.append(caption);
    const input = createFieldInput(key, definition);

    if (definition.type === "slider") {
      const row = document.createElement("div");
      row.className = "field-group__control-row";
      const output = document.createElement("output");
      output.className = "field-group__control-output";
      output.textContent = fieldData[key];
      input.addEventListener("input", () => { output.textContent = input.value; });
      row.append(input, output);
      label.append(row);
    } else {
      label.append(input);
    }
    container.append(label);
  }
}

function createFieldInput(key, definition) {
  let input;
  if (definition.type === "dropdown") {
    input = document.createElement("select");
    for (const [value, label] of Object.entries(definition.options || {})) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      input.append(option);
    }
  } else {
    input = document.createElement("input");
    input.type = ({
      colorpicker: "color",
      slider: "range",
      googleFont: "text",
      fontpicker: "text",
      textfield: "text",
      imagepicker: "url",
      soundpicker: "url",
      videopicker: "url"
    })[definition.type] ||
      (["number", "text"].includes(definition.type) ? definition.type : "url");
    for (const attribute of ["min", "max", "step"]) {
      if (definition[attribute] !== undefined) input[attribute] = definition[attribute];
    }
    if (definition.steps !== undefined && definition.step === undefined) input.step = definition.steps;
  }
  input.value = fieldData[key] ?? "";
  input.addEventListener("change", () => {
    const value = ["number", "slider"].includes(definition.type) ? Number(input.value) : input.value;
    updateField(key, value);
  });
  return input;
}

function updateField(key, value, shouldReload = true) {
  fieldData[key] = value;
  localStorage.setItem(fieldStorageKey(), JSON.stringify(fieldData));
  if (shouldReload) {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(renderWidget, 120);
  }
}

function parseDataOverrides() {
  try {
    const parsed = JSON.parse(widget?.dataSource || "{}");
    return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    return {};
  }
}

function renderWidget() {
  if (!widget) return;
  const html = substituteFields(widget.html, fieldData);
  const css = substituteFields(widget.css, fieldData);
  const js = substituteFields(widget.js, fieldData);
  const effectiveFieldData = { ...parseDataOverrides(), ...fieldData };
  const executableJs = JSON.stringify(js).replaceAll("<", "\\u003c");
  const checkerClass = elements.previewShell.classList.contains("is-checker") ? " se-lab-checker" : "";
  const themeClass = previewTheme === "light" ? " se-lab-light" : "";

  elements.frame.onload = () => {
    if (previewPlatform === PLATFORM_STREAMLABS) {
      dispatchToWidget(
        "onLoad",
        buildStreamlabsLoadDetail(widget.fields, effectiveFieldData, structuredClone(session)),
        "document"
      );
      addConsole("event", "onLoad · Streamlabs");
    } else {
      dispatchToWidget("onWidgetLoad", {
        session: { data: structuredClone(session) },
        recents: buildRecents(session),
        currency: { code: "EUR", name: "Euro", symbol: "€" },
        channel: { ...channel, apiToken: "" },
        fieldData: structuredClone(effectiveFieldData)
      });
      addConsole("event", "onWidgetLoad · StreamElements");
    }

    if (isChatWidget()) {
      window.setTimeout(() => dispatchChatMessage({
        name: "NovaViewer",
        message: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum cursus dignissim turpis quis efficitur. Phasellus fermentum et libero vitae placerat. Sed iaculis neque in justo.",
        color: "#9f75ff"
      }), 350);
    }
  };

  elements.frame.srcdoc = `<!doctype html>
<html class="se-lab-preview${checkerClass}${themeClass}"><head><meta charset="utf-8"><style>${css}</style>
<style id="se-lab-surface">
  html.se-lab-preview { background: #11141a !important; }
  html.se-lab-preview.se-lab-light { background: #f2f4f7 !important; }
  html.se-lab-preview body { background: transparent !important; }
  html.se-lab-preview.se-lab-checker {
    background-color: #15171c !important;
    background-image:
      linear-gradient(45deg, #252932 25%, transparent 25%),
      linear-gradient(-45deg, #252932 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #252932 75%),
      linear-gradient(-45deg, transparent 75%, #252932 75%) !important;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0 !important;
    background-size: 20px 20px !important;
  }
  html.se-lab-preview.se-lab-checker.se-lab-light {
    background-color: #f4f6f9 !important;
    background-image:
      linear-gradient(45deg, #dfe3e9 25%, transparent 25%),
      linear-gradient(-45deg, #dfe3e9 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #dfe3e9 75%),
      linear-gradient(-45deg, transparent 75%, #dfe3e9 75%) !important;
  }
</style><script src="/vendor/jquery.min.js"></script></head>
<body>${html}
<script>
(() => {
  const pending = new Map();
  let callId = 0;
  const send = (kind, payload = {}) => parent.postMessage({ source: "se-widget", kind, ...payload }, "*");
  const request = (method, args = []) => new Promise((resolve, reject) => {
    const id = String(++callId);
    pending.set(id, { resolve, reject });
    send("se-api-request", { id, method, args });
  });
  const serialize = (value) => {
    if (typeof value === "string") return value;
    try { return JSON.stringify(value); } catch { return String(value); }
  };
  for (const level of ["log", "info", "warn", "error"]) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      send("console", { level, args: args.map(serialize) });
      original(...args);
    };
  }
  window.addEventListener("error", (event) => send("console", { level: "error", args: [event.message] }));
  window.addEventListener("unhandledrejection", (event) => send("console", { level: "error", args: [serialize(event.reason)] }));
  window.addEventListener("message", (message) => {
    const data = message.data;
    if (!data || data.source !== "se-lab") return;
    if (data.kind === "dispatch") {
      if (data.eventType === "onLoad" && data.detail?.custom_json) {
        window.fieldData = data.detail.custom_json;
        window.customFields = data.detail.custom_json;
      }
      const eventTarget = data.eventTarget === "document" ? document : window;
      eventTarget.dispatchEvent(new CustomEvent(data.eventType, { detail: data.detail }));
    }
    if (data.kind === "se-api-response") {
      const promise = pending.get(data.id);
      if (!promise) return;
      pending.delete(data.id);
      data.error ? promise.reject(new Error(data.error)) : promise.resolve(data.value);
    }
  });
  window.__WIDGET_PLATFORM__ = ${JSON.stringify(previewPlatform)};
  if (window.__WIDGET_PLATFORM__ === "streamelements") window.SE_API = {
    store: {
      get: (key) => request("store.get", [key]),
      set: (key, value) => request("store.set", [key, value])
    },
    counters: { get: (key) => request("counters.get", [key]) },
    sanitize: (text) => Promise.resolve(text),
    cheerFilter: (text) => Promise.resolve(text),
    getOverlayStatus: () => Promise.resolve({ isEditorMode: true, muted: false }),
    setField: (key, value, shouldReload = true) => send("set-field", { key, value, shouldReload }),
    resumeQueue: () => send("queue-resume")
  };
  try { (new Function(${executableJs}))(); } catch (error) { console.error(error.stack || error.message); }
})();
</script></body></html>`;
}

function substituteFields(source, values) {
  let result = source;
  for (const [key, value] of Object.entries(values)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, "g"), String(value));
    result = result.replaceAll(`{${key}}`, String(value));
  }
  return result;
}

function dispatchToWidget(eventType, detail, eventTarget = "window") {
  elements.frame.contentWindow?.postMessage({
    source: "se-lab",
    kind: "dispatch",
    eventType,
    eventTarget,
    detail
  }, "*");
}

function dispatchPlatformEvent(detail) {
  if (previewPlatform === PLATFORM_STREAMLABS) {
    dispatchToWidget("onEventReceived", toStreamlabsEvent(detail), "document");
  } else {
    dispatchToWidget("onEventReceived", detail);
  }
}

function isChatWidget() {
  return widget.html.includes('id="chatlist_item"') || widget.js.includes("attachEmotes");
}

function dispatchChatMessage({ name, message, color = "#9f75ff", badges = [] }) {
  dispatchPlatformEvent({
    listener: "message",
    event: {
      data: {
        time: Date.now(),
        nick: name.toLowerCase(),
        userId: crypto.randomUUID(),
        displayName: name,
        displayColor: color,
        badges,
        text: message,
        isAction: false,
        emotes: []
      }
    }
  });
}

function eventField(itemEl, field) {
  return itemEl.querySelector(`[data-field="${field}"]`);
}

function sendPresetEvent(itemEl) {
  const listener = itemEl.dataset.eventType;
  const nameField = eventField(itemEl, "name");
  const broadcasterField = eventField(itemEl, "broadcaster");
  const amountField = eventField(itemEl, "amount");
  const messageField = eventField(itemEl, "message");
  const subTypeField = eventField(itemEl, "sub-type");
  const isBroadcaster = listener === "message" && broadcasterField?.checked;
  const name = isBroadcaster
    ? (channel.username || "MaChaine")
    : (nameField.value.trim() || randomEventName());

  if (listener === "message") {
    const badges = isBroadcaster ? [chatRoleBadges.broadcaster] : randomChatBadges();
    const message = messageField.value.trim() || randomChatMessage();
    dispatchChatMessage({ name, message, badges });
    addConsole("event", `${listener} · ${name}`);
    return;
  }

  const event = { name, gifted: false, id: crypto.randomUUID() };

  if (amountField) {
    const raw = amountField.value.trim();
    const amount = raw === "" ? randomEventAmount(listener) : Math.max(0, Number(raw) || 0);
    amountField.value = amount;
    event.amount = amount;
    if (listener === "raid-latest") event.viewers = amount;
  }

  if (messageField) {
    event.message = messageField.value;
  }

  if (subTypeField) {
    const subType = subTypeField.value;
    event.subType = subType;
    event.tier = subType === "prime" ? "prime" : "1000";
    event.gifted = subType === "gift" || subType === "communitygift";
    event.bulkGifted = subType === "communitygift";
  }

  session[listener] = event;
  updateSimulatedSessionTotal(listener, event.amount || 0);
  dispatchPlatformEvent({ listener, event });
  if (previewPlatform === PLATFORM_STREAM_ELEMENTS) {
    dispatchToWidget("onSessionUpdate", { session: structuredClone(session) });
  }

  addConsole("event", `${listener} · ${name}`);
}

function updateSimulatedSessionTotal(listener, amount) {
  const metrics = {
    "follower-latest": { key: "follower-total", property: "count", delta: 1 },
    "subscriber-latest": { key: "subscriber-total", property: "count", delta: 1 },
    "tip-latest": { key: "tip-total", property: "amount", delta: Math.max(0, amount) },
    "cheer-latest": { key: "cheer-total", property: "amount", delta: Math.max(0, amount) }
  };
  const metric = metrics[listener];
  if (!metric) return;

  const previous = Number(session[metric.key]?.[metric.property]) || 0;
  session[metric.key] = {
    ...session[metric.key],
    [metric.property]: previous + metric.delta
  };
}

function connectEventStream() {
  const stream = new EventSource("/api/stream");
  stream.addEventListener("reload", ({ data }) => {
    try {
      const payload = JSON.parse(data);
      if (Array.isArray(payload.changes)) {
        const relevantChanges = payload.changes
          .map(change => String(change).replaceAll("\\", "/"))
          .filter(change => change.split("/").at(-2) === activeWidgetId);
        if (!relevantChanges.length) return;
        pendingWidgetChange = {
          widgetId: activeWidgetId,
          files: relevantChanges.map(change => change.split("/").at(-1))
        };
      } else {
        pendingWidgetChange = payload;
      }
    } catch {
      pendingWidgetChange = { file: "widget" };
    }

    clearTimeout(widgetFileReloadTimer);
    widgetFileReloadTimer = setTimeout(() => {
      const change = pendingWidgetChange;
      pendingWidgetChange = null;
      void refreshWidgetPreview(change);
    }, 100);
  });
  stream.addEventListener("status", ({ data }) => updateLiveStatus(JSON.parse(data)));
  stream.addEventListener("widget-event", ({ data }) => {
    const payload = JSON.parse(data);
    if (payload.type === "onSessionUpdate") session = payload.detail.session;
    if (previewPlatform === PLATFORM_STREAMLABS) {
      if (payload.type === "onEventReceived") dispatchPlatformEvent(payload.detail);
    } else {
      dispatchToWidget(payload.type, payload.detail);
    }
    addConsole("event", `[LIVE · ${previewPlatform === PLATFORM_STREAMLABS ? "SL" : "SE"}] ${payload.type} · ${payload.detail.listener || "session"}`);
  });
  stream.addEventListener("astro", ({ data }) => addConsole("info", `[ASTRO] ${JSON.parse(data).topic}`));
  stream.onerror = () => updateLiveStatus({ streamelements: "reconnecting", streamlabs: "reconnecting" });
}

async function refreshWidgetPreview(change = {}, showSuccessToast = true, options = {}) {
  let lastError;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(
        `/api/widget?id=${encodeURIComponent(activeWidgetId)}&platform=${encodeURIComponent(previewPlatform)}&revision=${Date.now()}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Erreur HTTP ${response.status}`);
      }

      const nextWidget = await response.json();
      nextWidget.fields = normalizeFieldDefinitions(nextWidget.fields);
      widget = nextWidget;
      configureEditorFiles(widget);
      applyWidgetMeta();
      if (options.resetFields) {
        fieldData = loadFieldData(nextWidget.fields);
      } else {
        const defaults = Object.fromEntries(
          Object.entries(nextWidget.fields).map(([key, definition]) => [key, definition.value])
        );
        const retainedValues = Object.fromEntries(
          Object.entries(fieldData).filter(([key]) => Object.hasOwn(nextWidget.fields, key))
        );
        fieldData = { ...defaults, ...retainedValues };
      }
      localStorage.setItem(fieldStorageKey(), JSON.stringify(fieldData));
      renderFields();
      renderWidget();
      if (options.resetEditor) {
        clearTimeout(editorApplyTimer);
        for (const timer of editorSaveTimers.values()) clearTimeout(timer);
        editorSaveTimers.clear();
        editorFileStates.clear();
        syncWidgetEditorSources({ force: true });
      } else {
        syncWidgetEditorSources();
      }

      const files = change.files || (change.file ? [change.file] : []);
      const label = files.length ? files.join(", ") : "widget";
      addConsole("info", `Aperçu mis à jour : ${label}`);
      if (showSuccessToast) showToast(`Aperçu mis à jour · ${label}`);
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 80 * (attempt + 1)));
      }
    }
  }

  addConsole("error", lastError.message);
  showToast(`Impossible de mettre à jour l’aperçu : ${lastError.message}`);
  return false;
}

function updateLiveStatus(statuses) {
  liveStatuses = { ...liveStatuses, ...statuses };
  renderLiveStatusIndicator();
}

function renderLiveStatusIndicator() {
  if (!elements.accountFab) return;
  const key = previewPlatform === PLATFORM_STREAMLABS ? "streamlabs" : "streamelements";
  const status = liveStatuses[key] || "disabled";
  elements.accountFab.title = status === "disabled" ? "Mon compte (simulation)" : `Mon compte (${status})`;
}

function handleWidgetMessage(message) {
  const data = message.data;
  if (!data || data.source !== "se-widget") return;
  if (data.kind === "console") addConsole(data.level, data.args.join(" "));
  if (data.kind === "set-field") {
    updateField(data.key, data.value, data.shouldReload);
    renderFields();
  }
  if (data.kind === "queue-resume") addConsole("info", "SE_API.resumeQueue()");
  if (data.kind === "se-api-request") handleApiRequest(data);
}

function handleApiRequest(request) {
  let value;
  let error;
  try {
    const store = JSON.parse(localStorage.getItem("se-lab-store") || "{}");
    if (request.method === "store.get") value = store[request.args[0]] ?? null;
    else if (request.method === "store.set") {
      const [key, nextValue] = request.args;
      store[key] = nextValue;
      localStorage.setItem("se-lab-store", JSON.stringify(store));
      value = nextValue;
      dispatchToWidget("onEventReceived", {
        listener: "kvstore:update",
        event: { data: { key: `customWidget.${key}`, value: nextValue } }
      });
    } else if (request.method === "counters.get") {
      value = 0;
    } else throw new Error(`Méthode SE_API non prise en charge : ${request.method}`);
  } catch (caught) {
    error = caught.message;
  }
  elements.frame.contentWindow?.postMessage({
    source: "se-lab",
    kind: "se-api-response",
    id: request.id,
    value,
    error
  }, "*");
}

function buildRecents(data) {
  return Object.entries(data)
    .filter(([key]) => key.endsWith("-latest"))
    .map(([type, value]) => ({ type: type.replace("-latest", ""), ...value }))
    .slice(-25);
}

function addConsole(level, message) {
  elements.console.querySelector(".console-panel__empty")?.remove();
  const line = document.createElement("div");
  line.className = `console-panel__line console-panel__line--${level}`;
  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const badge = document.createElement("b");
  badge.textContent = level.toUpperCase();
  const text = document.createElement("span");
  text.textContent = message;
  line.append(time, badge, text);
  elements.console.append(line);
  elements.console.scrollTop = elements.console.scrollHeight;
  while (elements.console.children.length > 100) elements.console.firstElementChild.remove();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 3500);
}

function setEventSimulatorOpen(open, restoreFocus = false) {
  clearTimeout(eventSimulatorCloseTimer);
  elements.eventFab.setAttribute("aria-expanded", String(open));
  if (open) {
    elements.eventSimulator.hidden = false;
    requestAnimationFrame(() => {
      elements.eventSimulator.classList.add("is-open");
    });
    requestAnimationFrame(() => document.querySelector(".event-type-item[open] summary")?.focus());
  } else {
    elements.eventSimulator.classList.remove("is-open");
    eventSimulatorCloseTimer = setTimeout(() => {
      elements.eventSimulator.hidden = true;
    }, 180);
    if (restoreFocus) elements.eventFab.focus();
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

window.addEventListener("message", handleWidgetMessage);

for (const itemEl of document.querySelectorAll(".event-type-item")) {
  eventField(itemEl, "submit")?.addEventListener("click", () => sendPresetEvent(itemEl));
}

const detailsReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const detailsAnimDuration = 220;

function detailsBody(detailsEl) {
  return detailsEl.querySelector(":scope > summary ~ *");
}

function collapseDetails(detailsEl) {
  if (!detailsEl.open) return Promise.resolve();
  if (detailsReduceMotion) {
    detailsEl.open = false;
    return Promise.resolve();
  }
  const startHeight = detailsEl.offsetHeight;
  const endHeight = detailsEl.querySelector("summary").offsetHeight;
  detailsEl.style.overflow = "hidden";
  const animation = detailsEl.animate(
    { height: [`${startHeight}px`, `${endHeight}px`] },
    { duration: detailsAnimDuration, easing: "ease" }
  );
  return animation.finished.then(() => {
    detailsEl.open = false;
    detailsEl.style.overflow = "";
    detailsEl.style.height = "";
  });
}

function expandDetails(detailsEl) {
  if (detailsEl.open) return;
  if (detailsReduceMotion) {
    detailsEl.open = true;
    return;
  }
  const startHeight = detailsEl.querySelector("summary").offsetHeight;
  detailsEl.style.overflow = "hidden";
  detailsEl.open = true;
  const endHeight = startHeight + detailsBody(detailsEl).offsetHeight;
  detailsEl.animate(
    { height: [`${startHeight}px`, `${endHeight}px`] },
    { duration: detailsAnimDuration, easing: "ease" }
  ).finished.then(() => {
    detailsEl.style.overflow = "";
    detailsEl.style.height = "";
  });
}

const eventAccordionItems = [...document.querySelectorAll(".event-type-item")];

for (const itemEl of eventAccordionItems) {
  itemEl.querySelector("summary").addEventListener("click", (event) => {
    event.preventDefault();
    if (itemEl.open) {
      collapseDetails(itemEl);
      return;
    }
    for (const other of eventAccordionItems) {
      if (other !== itemEl && other.open) collapseDetails(other);
    }
    expandDetails(itemEl);
  });
}

for (const sectionEl of elements.sidebarSections) {
  sectionEl.querySelector(":scope > summary").addEventListener("click", (event) => {
    event.preventDefault();
    if (sectionEl.open) collapseDetails(sectionEl);
    else expandDetails(sectionEl);
  });
}

const chatBroadcasterField = eventField(document.querySelector('.event-type-item[data-event-type="message"]'), "broadcaster");
const chatNameField = eventField(document.querySelector('.event-type-item[data-event-type="message"]'), "name");
chatBroadcasterField.addEventListener("change", () => {
  const isBroadcaster = chatBroadcasterField.checked;
  chatNameField.disabled = isBroadcaster;
  chatNameField.placeholder = isBroadcaster
    ? (channel.username || "MaChaine")
    : "Aléatoire si vide";
});

elements.eventFab.addEventListener("click", () => {
  setEventSimulatorOpen(elements.eventSimulator.hidden);
});
document.querySelector("#close-event-simulator").addEventListener("click", () => {
  setEventSimulatorOpen(false, true);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.eventSimulator.hidden) {
    setEventSimulatorOpen(false, true);
  }
});
document.addEventListener("pointerdown", (event) => {
  if (
    !elements.eventSimulator.hidden &&
    !elements.eventSimulator.contains(event.target) &&
    !elements.eventFab.contains(event.target)
  ) {
    setEventSimulatorOpen(false);
  }
});
document.querySelector("#send-custom").addEventListener("click", () => {
  try {
    const detail = JSON.parse(elements.customEvent.value);
    if (previewPlatform === PLATFORM_STREAMLABS) {
      dispatchToWidget("onEventReceived", detail, "document");
      addConsole("event", `JSON · Streamlabs · ${detail.type ?? "sans type"}`);
    } else {
      dispatchToWidget("onEventReceived", detail);
      addConsole("event", `JSON · StreamElements · ${detail.listener ?? "sans listener"}`);
    }
  } catch (error) {
    showToast(`JSON invalide : ${error.message}`);
  }
});

let accountPanelCloseTimer;
let accountPanelLoaded = false;

function setAccountPanelOpen(open, restoreFocus = false) {
  clearTimeout(accountPanelCloseTimer);
  elements.accountFab.setAttribute("aria-expanded", String(open));
  if (open) {
    elements.accountPanel.hidden = false;
    requestAnimationFrame(() => elements.accountPanel.classList.add("is-open"));
    if (!accountPanelLoaded) {
      accountPanelLoaded = true;
      initializeAccountPanel();
    }
  } else {
    elements.accountPanel.classList.remove("is-open");
    accountPanelCloseTimer = setTimeout(() => {
      elements.accountPanel.hidden = true;
    }, 200);
    if (restoreFocus) elements.accountFab.focus();
  }
}

elements.accountFab.addEventListener("click", () => {
  setAccountPanelOpen(elements.accountPanel.hidden);
});
document.querySelector("#close-account-panel").addEventListener("click", () => {
  setAccountPanelOpen(false, true);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.accountPanel.hidden) {
    setAccountPanelOpen(false, true);
  }
});
document.addEventListener("pointerdown", (event) => {
  if (
    !elements.accountPanel.hidden &&
    !elements.accountPanel.contains(event.target) &&
    !elements.accountFab.contains(event.target)
  ) {
    setAccountPanelOpen(false);
  }
});

const ACCOUNT_ERROR_MESSAGES = {
  twitch_not_configured: "La connexion Twitch n’est pas encore configurée sur ce serveur.",
  cancelled: "Connexion Twitch annulée.",
  failed: "La connexion Twitch a échoué. Réessaie."
};

async function fetchAccountJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || `Erreur ${response.status}`), { status: response.status });
  return body;
}

function formatAccountDate(ms) {
  return ms ? new Date(ms).toLocaleString("fr-FR") : "";
}

function renderIntegrationCard(card, integration) {
  const statusEl = card.querySelector('[data-role="status"]');
  const helpEl = card.querySelector(".integration-card__help");
  const formEl = card.querySelector('[data-role="form"]');
  const connectedEl = card.querySelector('[data-role="connected"]');

  if (integration) {
    statusEl.textContent = "Connecté";
    statusEl.classList.add("is-connected");
    helpEl.hidden = true;
    formEl.hidden = true;
    connectedEl.hidden = false;
    connectedEl.querySelector('[data-role="channel-name"]').textContent = integration.channelName || integration.channelId || "Connecté";
    connectedEl.querySelector('[data-role="connected-at"]').textContent = `Connecté le ${formatAccountDate(integration.connectedAt)}`;
  } else {
    statusEl.textContent = "Non connecté";
    statusEl.classList.remove("is-connected");
    helpEl.hidden = false;
    formEl.hidden = false;
    connectedEl.hidden = true;
    formEl.reset();
  }
}

async function loadAccountIntegrations() {
  const { integrations } = await fetchAccountJson("/api/integrations");
  for (const card of elements.integrationCards) {
    const provider = card.dataset.provider;
    const integration = integrations.find((entry) => entry.provider === provider) || null;
    renderIntegrationCard(card, integration);
  }
}

function wireIntegrationCard(card) {
  const provider = card.dataset.provider;
  const formEl = card.querySelector('[data-role="form"]');
  const formError = card.querySelector('[data-role="form-error"]');
  const disconnectButton = card.querySelector('[data-role="disconnect"]');
  const revealButton = card.querySelector('[data-role="reveal-token"]');
  const loadEnvButton = card.querySelector('[data-role="load-env-defaults"]');

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    formError.hidden = true;
    const data = Object.fromEntries(new FormData(formEl).entries());
    try {
      const { integration } = await fetchAccountJson(`/api/integrations/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      renderIntegrationCard(card, integration);
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
    }
  });

  disconnectButton.addEventListener("click", async () => {
    try {
      await fetchAccountJson(`/api/integration?provider=${provider}`, { method: "DELETE" });
      renderIntegrationCard(card, null);
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
    }
  });

  revealButton?.addEventListener("click", () => {
    const tokenInput = formEl.elements.token;
    const icon = revealButton.querySelector(".material-symbols-rounded");
    const revealed = tokenInput.type === "text";
    tokenInput.type = revealed ? "password" : "text";
    icon.textContent = revealed ? "visibility" : "visibility_off";
    revealButton.setAttribute("aria-label", revealed ? "Afficher le token" : "Masquer le token");
  });

  loadEnvButton?.addEventListener("click", async () => {
    formError.hidden = true;
    try {
      const defaults = await fetchAccountJson(`/api/integrations/env-defaults/reveal?provider=${provider}`);
      for (const key of ["channelId", "channelName", "tokenType", "token"]) {
        if (formEl.elements[key] && defaults[key] != null) formEl.elements[key].value = defaults[key];
      }
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
    }
  });
}

function showAccountError(message) {
  elements.accountError.textContent = message;
  elements.accountError.hidden = false;
}

async function initializeAccountPanel() {
  const params = new URLSearchParams(window.location.search);
  const queryMessage = ACCOUNT_ERROR_MESSAGES[params.get("error")] || ACCOUNT_ERROR_MESSAGES[params.get("login")];
  if (queryMessage) showAccountError(queryMessage);

  for (const card of elements.integrationCards) wireIntegrationCard(card);

  elements.logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    elements.loggedInPanel.hidden = true;
    elements.loggedOutPanel.hidden = false;
    updateAccountFabIcon(false);
  });

  try {
    const { authenticated, user } = await fetchAccountJson("/api/auth/me");
    if (!authenticated) {
      elements.loggedOutPanel.hidden = false;
      return;
    }

    elements.loggedInPanel.hidden = false;
    elements.accountDisplayName.textContent = user.displayName || user.twitchLogin;
    if (user.avatarUrl) {
      elements.accountAvatar.src = user.avatarUrl;
      elements.accountAvatar.hidden = false;
    }

    await loadAccountIntegrations();

    try {
      const envDefaults = await fetchAccountJson("/api/integrations/env-defaults");
      for (const card of elements.integrationCards) {
        const loadEnvButton = card.querySelector('[data-role="load-env-defaults"]');
        if (loadEnvButton) loadEnvButton.hidden = !envDefaults[card.dataset.provider]?.hasToken;
      }
    } catch {
      // .env non configure ou endpoint indisponible : les boutons restent masques.
    }
  } catch (error) {
    showAccountError(error.message);
  }
}

function showDashboard() {
  elements.dashboardView.hidden = false;
  elements.eventFab.hidden = true;
  setEventSimulatorOpen(false);
  setEditingChromeVisible(false);
  renderWidgetLibrary();
  renderDashboard();
}

function hideDashboard() {
  elements.dashboardView.hidden = true;
  elements.eventFab.hidden = false;
  setEditingChromeVisible(true);
}

// La bascule de plateforme, le menu Exporter et la section Champs n'ont de
// sens que lorsqu'un widget/une alerte est réellement en cours d'édition —
// masqués sur le dashboard, où rien n'est sélectionné.
function setEditingChromeVisible(editing) {
  elements.topbarCenter.hidden = !editing;
  elements.workspace.classList.toggle("is-dashboard", !editing);
  elements.dashboardFab.classList.toggle("is-active", !editing);
}

function jumpToSidebarSection(sectionKey) {
  setSidebarCollapsed(false);
  const section = document.querySelector(`[data-sidebar-section="${sectionKey}"]`);
  if (section && !section.open) expandDetails(section);
}

async function renderDashboard() {
  let authenticated = false;
  let user = null;
  let userIntegrations = new Set();
  let userIntegrationsByProvider = new Map();

  try {
    const me = await fetchAccountJson("/api/auth/me");
    authenticated = me.authenticated;
    user = me.user;
    updateAccountFabIcon(authenticated);
    if (authenticated) {
      const { integrations } = await fetchAccountJson("/api/integrations");
      userIntegrations = new Set(integrations.map((entry) => entry.provider));
      userIntegrationsByProvider = new Map(integrations.map((entry) => [entry.provider, entry]));
    }
  } catch {
    updateAccountFabIcon(false);
  }

  const twitchDetail = authenticated
    ? `${user.displayName || user.twitchLogin}${user.lastLoginAt ? ` · Connecté le ${formatAccountDate(user.lastLoginAt)}` : ""}`
    : "Non connecté";

  const rows = [
    dashboardConnectionRow("twitch", "Compte Twitch", authenticated, twitchDetail, { avatarUrl: user?.avatarUrl }),
    dashboardConnectionRow("streamelements", "StreamElements", liveStatuses.streamelements === "connected", buildLiveConnectionDetail("streamelements", liveStatuses.streamelements === "connected", userIntegrationsByProvider), { linked: userIntegrations.has("streamelements") }),
    dashboardConnectionRow("streamlabs", "Streamlabs", liveStatuses.streamlabs === "connected", buildLiveConnectionDetail("streamlabs", liveStatuses.streamlabs === "connected", userIntegrationsByProvider), { linked: userIntegrations.has("streamlabs") })
  ];

  elements.dashboardConnectionList.replaceChildren(...rows);
}

function updateAccountFabIcon(authenticated) {
  elements.accountFab.querySelector(".material-symbols-rounded").textContent = authenticated ? "account_circle" : "account_circle_off";
  elements.accountFab.classList.toggle("is-live", authenticated);
}

function buildLiveConnectionDetail(provider, connected, integrationsByProvider) {
  const status = connected ? "Connecté" : "Simulation";
  const integration = integrationsByProvider.get(provider);
  return integration?.connectedAt ? `${status} · Lié le ${formatAccountDate(integration.connectedAt)}` : status;
}

function dashboardConnectionRow(provider, label, connected, detail, options = {}) {
  const { avatarUrl, linked } = options;
  const item = document.createElement("li");
  item.className = `dashboard-view__connections-item${connected ? " is-connected" : ""}`;

  const logo = document.createElement("span");
  logo.className = "dashboard-view__connections-logo";
  if (provider === "twitch") {
    if (connected && avatarUrl) {
      const img = document.createElement("img");
      img.className = "dashboard-view__connections-avatar";
      img.src = avatarUrl;
      img.alt = "";
      logo.append(img);
    } else {
      logo.innerHTML = '<svg class="twitch-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"></path></svg>';
    }
  } else {
    logo.classList.add("dashboard-view__connections-logo--icon", `dashboard-view__connections-logo--${provider}`);
    const img = document.createElement("img");
    img.className = `dashboard-view__connections-platform-icon dashboard-view__connections-platform-icon--${provider}`;
    img.src = `/assets/platforms/${provider}.svg`;
    img.alt = "";
    logo.append(img);
  }

  const copy = document.createElement("span");
  copy.className = "dashboard-view__connections-copy";
  const strong = document.createElement("strong");
  strong.textContent = label;
  const span = document.createElement("span");
  span.textContent = detail;
  copy.append(strong, span);

  item.append(logo, copy);

  if (provider === "twitch" && connected) {
    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.className = "icon-button dashboard-view__connections-disconnect";
    logoutButton.setAttribute("aria-label", "Se déconnecter de Twitch");
    logoutButton.title = "Se déconnecter de Twitch";
    logoutButton.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">logout</span>';
    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        elements.loggedInPanel.hidden = true;
        elements.loggedOutPanel.hidden = false;
        updateAccountFabIcon(false);
        renderDashboard();
      } catch (error) {
        showToast(error.message);
        logoutButton.disabled = false;
      }
    });
    item.append(logoutButton);
  }

  if (linked !== undefined) {
    if (linked) {
      const disconnectButton = document.createElement("button");
      disconnectButton.type = "button";
      disconnectButton.className = "icon-button dashboard-view__connections-disconnect";
      disconnectButton.setAttribute("aria-label", `Déconnecter ${label}`);
      disconnectButton.title = `Déconnecter ${label}`;
      disconnectButton.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">link_off</span>';
      disconnectButton.addEventListener("click", async () => {
        disconnectButton.disabled = true;
        try {
          await fetchAccountJson(`/api/integration?provider=${provider}`, { method: "DELETE" });
          showToast(`${label} déconnecté`);
          renderDashboard();
        } catch (error) {
          showToast(error.message);
          disconnectButton.disabled = false;
        }
      });
      item.append(disconnectButton);
    }

    const linkDot = document.createElement("i");
    linkDot.className = `dashboard-view__connections-dot${linked ? " is-connected" : ""}`;
    linkDot.title = linked ? `${label} lié à ton compte` : `${label} non lié à ton compte`;
    item.append(linkDot);
  }

  return item;
}

function setSidebarCollapsed(collapsed) {
  elements.workspace.classList.toggle("is-sidebar-collapsed", collapsed);
  elements.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  elements.sidebarToggle.setAttribute("aria-label", collapsed ? "Déplier le panneau" : "Replier le panneau");
  elements.sidebarToggle.querySelector(".material-symbols-rounded").textContent = collapsed ? "chevron_right" : "chevron_left";
}

elements.sidebarToggle.addEventListener("click", () => {
  setSidebarCollapsed(!elements.workspace.classList.contains("is-sidebar-collapsed"));
});

elements.dashboardFab.addEventListener("click", () => showDashboard());
document.querySelector("#library-nav").addEventListener("click", () => jumpToSidebarSection("library"));
document.querySelector("#fields-nav").addEventListener("click", () => jumpToSidebarSection("fields"));

if (new URLSearchParams(window.location.search).get("account") === "open") {
  setAccountPanelOpen(true);
}

function slugifyWidgetName(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "custom-widget";
}

function exportWidgetShortcut() {
  if (!activeWidgetId) return;
  const configuredName = String(
    fieldData?.widgetName ||
    widget?.fields?.widgetName?.value ||
    widget?.widgetMeta?.name ||
    "custom-widget"
  );
  const slug = slugifyWidgetName(configuredName);
  const shortcutUrl = `${window.location.origin}/?widget=${encodeURIComponent(activeWidgetId)}`;
  const content = `[InternetShortcut]\r\nURL=${shortcutUrl}\r\n`;
  const blob = new Blob([content], { type: "application/x-mswinurl" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}.url`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  addConsole("info", "Raccourci .url généré");
  showToast("Raccourci téléchargé");
}

async function exportWidgetCode(platform) {
  const saved = await flushWidgetEditor();
  if (!saved) {
    showToast("Corrigez les erreurs de l’éditeur avant d’exporter.");
    return;
  }

  const refreshed = await refreshWidgetPreview({ file: "export" }, false);
  if (!refreshed) return;

  const exported = buildPlatformExport(widget, fieldData, platform);
  const archive = createZip(exported.files);
  const configuredName = String(
    fieldData.widgetName ||
    widget.fields.widgetName?.value ||
    widget.widgetMeta?.name ||
    "custom-widget"
  );
  const slug = slugifyWidgetName(configuredName);
  const suffix = exported.platform === PLATFORM_STREAMLABS ? "streamlabs" : "streamelements";
  const blob = new Blob([archive], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}-${suffix}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);

  const bridge = exported.bridgeInjected ? " · pont de compatibilité inclus" : "";
  addConsole("info", `Export ${exported.platformName}${bridge}`);
  showToast(`Export ${exported.platformName} téléchargé${bridge}`);
}
document.querySelector("#checker-toggle").addEventListener("click", ({ currentTarget }) => {
  const active = currentTarget.getAttribute("aria-pressed") !== "true";
  const label = active ? "Désactiver le damier" : "Activer le damier";
  currentTarget.setAttribute("aria-pressed", String(active));
  currentTarget.setAttribute("aria-label", label);
  currentTarget.title = label;
  currentTarget.classList.toggle("is-active", active);
  elements.previewShell.classList.toggle("is-checker", active);
  renderWidget();
});
document.querySelector("#clear-console").addEventListener("click", () => {
  elements.console.innerHTML = '<span class="console-panel__empty">La console est vide.</span>';
});
