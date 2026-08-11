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
  mediaSection: document.querySelector('[data-sidebar-section="media"]'),
  mediaLibraryList: document.querySelector("#media-library"),
  widgetSettingsDialog: document.querySelector("#widget-settings-dialog"),
  widgetSettingsForm: document.querySelector("#widget-settings-form"),
  widgetSettingsTitle: document.querySelector("#widget-settings-title"),
  widgetSettingsId: document.querySelector("#widget-settings-id"),
  widgetSettingsName: document.querySelector("#widget-settings-name"),
  widgetSettingsDescription: document.querySelector("#widget-settings-description"),
  widgetSettingsWidth: document.querySelector("#widget-settings-width"),
  widgetSettingsHeight: document.querySelector("#widget-settings-height"),
  widgetTypeChoices: document.querySelectorAll("[data-widget-type]"),
  widgetIconChoices: document.querySelector("#widget-icon-choices"),
  widgetSettingsMessage: document.querySelector("#widget-settings-message"),
  saveWidgetSettings: document.querySelector("#save-widget-settings"),
  overlayList: document.querySelector("#overlay-list"),
  overlayCount: document.querySelector("#overlay-count"),
  addOverlayButton: document.querySelector("#add-overlay"),
  overlaySettingsDialog: document.querySelector("#overlay-settings-dialog"),
  overlaySettingsForm: document.querySelector("#overlay-settings-form"),
  overlaySettingsTitle: document.querySelector("#overlay-settings-title"),
  overlaySettingsId: document.querySelector("#overlay-settings-id"),
  overlaySettingsName: document.querySelector("#overlay-settings-name"),
  overlaySettingsDescription: document.querySelector("#overlay-settings-description"),
  overlaySettingsWidth: document.querySelector("#overlay-settings-width"),
  overlaySettingsHeight: document.querySelector("#overlay-settings-height"),
  overlayRatioButtons: document.querySelectorAll("[data-overlay-ratio]"),
  overlayIconChoices: document.querySelector("#overlay-icon-choices"),
  overlaySettingsMessage: document.querySelector("#overlay-settings-message"),
  saveOverlaySettings: document.querySelector("#save-overlay-settings"),
  overlayEditorView: document.querySelector("#overlay-editor-view"),
  overlayEditorTitle: document.querySelector("#overlay-editor-title"),
  overlayAddItemButton: document.querySelector("#overlay-add-item"),
  overlayCanvasWrap: document.querySelector("#overlay-canvas-wrap"),
  overlayCanvasStage: document.querySelector("#overlay-canvas-stage"),
  overlayCanvas: document.querySelector("#overlay-canvas"),
  overlayGuidesLayer: document.querySelector("#overlay-guides"),
  overlayRulerTop: document.querySelector("#overlay-ruler-top"),
  overlayRulerLeft: document.querySelector("#overlay-ruler-left"),
  overlayRulerToggle: document.querySelector("#overlay-tool-rulers"),
  overlayItemPickerDialog: document.querySelector("#overlay-item-picker"),
  overlayItemPickerList: document.querySelector("#overlay-item-picker-list"),
  overlayToolbar: document.querySelector("#overlay-toolbar"),
  overlayToolbarHandle: document.querySelector(".overlay-toolbar__handle"),
  overlayToolButtons: document.querySelectorAll("[data-overlay-tool]"),
  overlayAddTrigger: document.querySelector("#overlay-add-tool-trigger"),
  overlayToolGroupButton: document.querySelector("#overlay-tool-group"),
  overlayDuplicateButton: document.querySelector("#overlay-tool-duplicate"),
  overlayDeleteButton: document.querySelector("#overlay-tool-delete"),
  overlayCenterButton: document.querySelector("#overlay-tool-center"),
  overlayUndoButton: document.querySelector("#overlay-tool-undo"),
  overlayRedoButton: document.querySelector("#overlay-tool-redo"),
  overlayZoomOutButton: document.querySelector("#overlay-zoom-out"),
  overlayZoomInButton: document.querySelector("#overlay-zoom-in"),
  overlayZoomLabel: document.querySelector("#overlay-zoom-label"),
  overlayLayers: document.querySelector("#overlay-layers"),
  overlayLayersToggle: document.querySelector("#overlay-layers-toggle"),
  overlayLayersList: document.querySelector("#overlay-layers-list"),
  overlayItemSettingsPanel: document.querySelector("#overlay-item-settings"),
  overlayItemSettingsTitle: document.querySelector("#overlay-item-settings-title"),
  overlayItemSettingsFields: document.querySelector("#overlay-item-settings-fields"),
  overlayItemSettingsClose: document.querySelector("#overlay-item-settings-close"),
  overlayAlignButtons: document.querySelectorAll("[data-overlay-align]"),
  overlayDistributeButtons: document.querySelectorAll("[data-overlay-distribute]"),
  widgetEditorView: document.querySelector("#widget-editor-view"),
  eventAccordion: document.querySelector("#event-type-accordion"),
  customEvent: document.querySelector("#custom-event"),
  console: document.querySelector("#console-output"),
  accountFab: document.querySelector("#account-fab"),
  accountPanel: document.querySelector("#account-panel"),
  themeSwitchButtons: document.querySelectorAll("[data-theme-choice]"),
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
  dashboardOverlayList: document.querySelector("#dashboard-overlay-list"),
  dashboardLibrarySearch: document.querySelector("#dashboard-library-search"),
  dashboardLibrarySuggestions: document.querySelector("#dashboard-library-suggestions"),
  dashboardFilterTriggers: document.querySelectorAll('[data-role="filter-trigger"]'),
  dashboardAddFabTrigger: document.querySelector("#dashboard-add-fab-trigger"),
  dashboardAddFabWidget: document.querySelector("#dashboard-add-fab-widget"),
  dashboardAddFabAlert: document.querySelector("#dashboard-add-fab-alert"),
  dashboardConnectionList: document.querySelector("#dashboard-connection-list"),
  dashboardMediaList: document.querySelector("#dashboard-media-library"),
  dashboardOverlayPagination: document.querySelector("#dashboard-overlay-pagination"),
  dashboardWidgetPagination: document.querySelector("#dashboard-widget-pagination"),
  dashboardAlertPagination: document.querySelector("#dashboard-alert-pagination"),
  dashboardMediaPagination: document.querySelector("#dashboard-media-pagination"),
  workspace: document.querySelector(".workspace"),
  sidebarControls: document.querySelector(".workspace .controls"),
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
let librarySortMode = { widget: "name-asc", alert: "name-asc", overlay: "name-asc" };
let widgetSwitching = false;
let selectedWidgetIcon = "widgets";
let selectedWidgetType = "widget";
let widgetSettingsMode = "edit";
let overlayCatalog = [];
let activeOverlay = null;
let activeOverlayId = "";
let overlayPersistTimer;
let selectedOverlayIcon = "desktop_landscape";
let overlaySettingsMode = "edit";
const overlayItemBundleCache = new Map();
let activeOverlayTool = "select";
// "fit" (comportement historique, toujours ≤ 100%, recalculé à chaque
// redimensionnement) ou un nombre (0.25-4, échelle absolue choisie via la
// jauge de zoom de la barre d'outils — cf. setOverlayZoom/stepOverlayZoom).
let overlayZoomMode = "fit";
// Style texte capturé par l'outil pipette (tout .props sauf `content`), en
// attente d'application sur un autre item texte — null tant que rien n'a
// été capturé. Cf. handleOverlayEyedropperClick.
let overlayEyedropperStyle = null;
let selectedOverlayItemIds = new Set();
let overlaySettingsItemId = null;
// Dernier calque cliqué dans le panneau des calques + horodatage, pour
// détecter un double-clic manuellement (cf. buildOverlayLayerRow) puisque
// le "dblclick" natif ne survit pas au ré-rendu déclenché par le premier clic.
let overlayLastLayerClick = { itemId: null, time: 0 };
let overlayHistory = [];
let overlayHistoryIndex = -1;
const overlayToolbarPositionStorageKey = "overlay-toolbar-position";
// Préférence d'affichage des règles/repères : un réglage d'édition personnel
// (comme le damier de l'aperçu widget), pas un contenu d'overlay — reste donc
// en localStorage, jamais dans overlay.json (contrairement aux repères
// eux-mêmes, voir activeOverlay.guides).
const overlayGuidesVisibleStorageKey = "overlay-guides-visible";
let showOverlayGuides = localStorage.getItem(overlayGuidesVisibleStorageKey) === "true";
let overlayGuidesPersistTimer;
// Distance d'accroche en pixels ÉCRAN (constante quel que soit le zoom) :
// convertie en pixels logiques via l'échelle courante au moment de l'accroche
// (cf. snapEdge/snapMovePosition), jamais stockée déjà convertie.
const GUIDE_SNAP_SCREEN_PX = 6;
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
// Thème de l'interface elle-même (panneau "Mon compte") — distinct de
// previewThemeStorageKey ci-dessus, qui ne concerne que le damier clair/sombre
// de l'aperçu widget seul.
const appThemeStorageKey = "se-lab-app-theme";
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
const overlayIconChoices = [
  ["desktop_landscape", "Overlay"],
  ["space_dashboard", "Tableau"],
  ["view_quilt", "Composition"],
  ["grid_view", "Grille"],
  ["dashboard_customize", "Personnalisé"],
  ["sports_esports", "Jeu"],
  ["forum", "Chat"],
  ["celebration", "Célébration"]
];
const DEFAULT_OVERLAY_CANVAS = { width: 1920, height: 1080 };
// Doit rester identique au plancher MIN_ITEM_SIZE de lib/overlays.mjs : une
// valeur differente cote client ferait "rebondir" visuellement un item a la
// prochaine synchronisation (le serveur reclamperait a une autre taille que
// celle affichee pendant le drag).
const MIN_OVERLAY_ITEM_SIZE = 8;
// Repli pour les widgets/alertes créés avant l'ajout du champ "Taille par
// défaut" (leur manifeste n'a pas encore width/height) : mêmes valeurs que
// l'ancien placement en dur dans addOverlayItem, pour ne rien faire bouger
// rétroactivement.
const DEFAULT_WIDGET_SIZE = { width: 320, height: 180 };
// Outils regroupés dans le menu déroulant "+ Ajouter" de la barre d'outils :
// leur bouton respectif n'est visible qu'une fois le menu ouvert, donc c'est
// le déclencheur du menu lui-même qui doit porter l'état "actif" pendant le
// placement (sinon rien ne signale visuellement quel outil est armé). Doit
// rester déclaré avant `await initialize()` plus bas : ce top-level await
// suspend le reste du module tant qu'il n'est pas résolu, et initialize()
// peut appeler setOverlayTool() (via openOverlayEditor) avant d'y arriver.
const OVERLAY_ADD_MENU_TOOLS = new Set(["image", "video", "embed", "icon", "shape"]);
// Icône par type de champ (panneau "Champs" widget/alerte), même principe
// que overlayLayerIcon pour le panneau Calques : un repère visuel rapide du
// type de contrôle, avant même de lire le libellé. Doit rester déclaré
// avant `await initialize()` plus bas, même remarque qu'au-dessus.
const FIELD_TYPE_ICON = {
  dropdown: "list",
  colorpicker: "palette",
  slider: "tune",
  googleFont: "font_download",
  fontpicker: "font_download",
  textfield: "text_fields",
  text: "text_fields",
  imagepicker: "image",
  soundpicker: "music_note",
  videopicker: "videocam",
  number: "numbers",
  checkbox: "check_box",
  button: "smart_button"
};
// Types dont l'input tient raisonnablement à côté du libellé sur une seule
// ligne (panneau étroit, ~300px) : les autres (texte long, police, URL,
// slider…) gardent leur input en pleine largeur sous le libellé.
const FIELD_INLINE_TYPES = new Set(["number", "colorpicker", "dropdown"]);
// Marge sous le canevas mis à l'échelle pour ne jamais coller au bord du
// viewport (cf. updateOverlayCanvasScale). Même remarque qu'au-dessus : doit
// être déclarée avant `await initialize()`.
const OVERLAY_CANVAS_BOTTOM_MARGIN = 24;
// Doit aussi rester déclaré avant `await initialize()` plus bas :
// showDashboard() (appelée depuis initialize() elle-même) rend la
// bibliothèque de médias, qui construit son bouton d'upload avec ceci.
// Les extensions sont listées en plus des types MIME (pas juste eux) : sans
// QuickTime installé, Windows n'associe aucun type MIME à .mov, et le
// sélecteur de fichiers grise silencieusement ces fichiers si le filtre ne
// matche que par MIME — l'extension seule suffit à les laisser passer.
const MEDIA_UPLOAD_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm,.mov";
// Pagination des 4 listes du dashboard. Même remarque qu'au-dessus : doit
// rester déclaré avant `await initialize()`, renderOverlayLibrary/
// renderWidgetLibrary/renderMediaLibrary (appelées depuis showDashboard, elle
// même appelée depuis initialize()) lisent ces deux objets.
const DASHBOARD_PAGE_SIZE = { overlay: 3, widget: 5, alert: 5, media: 8 };
const dashboardPage = { overlay: 0, widget: 0, alert: 0, media: 0 };
// Cible des raccourcis .url (widgets/alertes/overlays) : le Lab ne crée
// jamais rien à distance, donc aucun ID StreamElements/Streamlabs connu pour
// pointer vers "ce" widget précis sur la plateforme — seul son tableau de
// bord général d'édition est atteignable. StreamElements gère overlays ET
// widgets au même endroit (un widget s'ajoute à l'intérieur d'un overlay) ;
// côté Streamlabs, les overlays vivent dans Streamlabs Desktop (pas de page
// web dédiée), donc on pointe aussi vers l'éditeur de Custom Widget, seul
// équivalent web du contenu exporté par le Lab.
const PLATFORM_DASHBOARD_URLS = {
  [PLATFORM_STREAM_ELEMENTS]: "https://streamelements.com/dashboard/overlays",
  [PLATFORM_STREAMLABS]: "https://streamlabs.com/dashboard#/widgets/customwidget"
};
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

// Remplace les tooltips natifs (attribut title, moche et non stylable) par
// la bulle maison de styles/components/_tooltip.scss (déclenchée sur
// data-tooltip). Un MutationObserver plutôt qu'un simple scan au chargement :
// des dizaines d'éléments avec title sont créés après coup par l'appli (ex.
// items de la bibliothèque média, pagination du dashboard), un scan unique
// les manquerait tous.
function initializeTooltips() {
  const convertTooltip = (el) => {
    const title = el.getAttribute("title");
    if (!title) return;
    el.removeAttribute("title");
    el.setAttribute("data-tooltip", title);
    // Filet de sécurité : si l'élément ne porte pas déjà de nom accessible
    // par un autre moyen, title en faisait office — on ne veut pas régresser
    // l'accessibilité en le retirant.
    if (!el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby")) {
      el.setAttribute("aria-label", title);
    }
  };
  for (const el of document.querySelectorAll("[title]")) convertTooltip(el);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        convertTooltip(mutation.target);
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.hasAttribute("title")) convertTooltip(node);
        for (const el of node.querySelectorAll?.("[title]") || []) convertTooltip(el);
      }
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["title"] });

  // Élément unique repositionné en JS (position: fixed) plutôt qu'un
  // pseudo-élément par déclencheur : échappe à l'overflow:hidden de
  // .overlay-canvas-stage (panning/zoom de l'éditeur d'overlay), qui
  // aurait sinon rogné la bulle de tout bouton de la barre d'outils.
  const bubble = document.createElement("div");
  bubble.className = "app-tooltip";
  bubble.setAttribute("role", "tooltip");
  bubble.hidden = true;
  document.body.append(bubble);

  let showTimer = null;
  let activeTrigger = null;
  let hideTimer = null;

  const placeTooltip = (trigger) => {
    const text = trigger.getAttribute("data-tooltip");
    if (!text) return;
    clearTimeout(hideTimer);
    bubble.textContent = text;
    bubble.hidden = false;
    const triggerRect = trigger.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const gap = 9;
    const below = triggerRect.top < bubbleRect.height + gap + 8;
    bubble.classList.toggle("is-below", below);
    let left = triggerRect.left + triggerRect.width / 2 - bubbleRect.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - bubbleRect.width - 8));
    const top = below ? triggerRect.bottom + gap : triggerRect.top - gap - bubbleRect.height;
    bubble.style.left = `${Math.round(left)}px`;
    bubble.style.top = `${Math.round(top)}px`;
    // Décalage horizontal de la flèche pour qu'elle continue de pointer le
    // centre du déclencheur même quand la bulle est recalée près d'un bord.
    bubble.style.setProperty("--tooltip-arrow-left", `${Math.round(triggerRect.left + triggerRect.width / 2 - left)}px`);
    requestAnimationFrame(() => bubble.classList.add("is-visible"));
  };

  const hideTooltip = () => {
    clearTimeout(showTimer);
    activeTrigger = null;
    bubble.classList.remove("is-visible");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { bubble.hidden = true; }, 160);
  };

  document.addEventListener("mouseover", (event) => {
    const trigger = event.target.closest("[data-tooltip]");
    if (!trigger || trigger === activeTrigger) return;
    activeTrigger = trigger;
    clearTimeout(showTimer);
    // Léger délai avant apparition (pas au survol furtif) : lecture plus
    // posée, comme les tooltips de Linear/Figma, plutôt que le tooltip
    // natif qui saute immédiatement.
    showTimer = setTimeout(() => { if (activeTrigger === trigger) placeTooltip(trigger); }, 350);
  });
  document.addEventListener("mouseout", (event) => {
    const trigger = event.target.closest("[data-tooltip]");
    if (!trigger || (event.relatedTarget && trigger.contains(event.relatedTarget))) return;
    hideTooltip();
  });
  document.addEventListener("focusin", (event) => {
    const trigger = event.target.closest("[data-tooltip]");
    if (!trigger) return;
    activeTrigger = trigger;
    placeTooltip(trigger);
  });
  document.addEventListener("focusout", (event) => {
    if (event.target.closest("[data-tooltip]")) hideTooltip();
  });
  window.addEventListener("scroll", hideTooltip, true);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") hideTooltip(); });
}

initializeTooltips();
initializePreviewPlatform();
initializeAppTheme();
initializeExportMenu();
initializePreviewControls();
initializePreviewTheme();
initializeSidebarSections();
initializeMediaLibrary();
initializeLibraryGroups();
initializeWidgetSettings();
initializeOverlaySettings();
initializeOverlayCanvas();
initializeDropdowns();
initializeDashboardLibraryControls();
initializeDashboardPagination();
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

// Recale l'aperçu sur la taille par défaut réglée dans les paramètres du
// widget/alerte concerné (widget.widgetMeta.width/height, cf. les champs
// "Largeur"/"Hauteur" de openWidgetSettings) — appelé à chaque ouverture ou
// changement de widget, jamais lors d'un simple rechargement de code/champs
// sur le MÊME widget (cf. ses appelants), pour ne pas écraser un
// redimensionnement manuel fait en cours d'édition.
function applyWidgetDefaultPreviewSize(widgetBundle) {
  const meta = widgetBundle?.widgetMeta || {};
  previewSize = {
    width: clampPreviewDimension(meta.width, DEFAULT_WIDGET_SIZE.width),
    height: clampPreviewDimension(meta.height, DEFAULT_WIDGET_SIZE.height)
  };
  elements.previewWidth.value = previewSize.width;
  elements.previewHeight.value = previewSize.height;
  localStorage.setItem(previewSizeStorageKey, JSON.stringify(previewSize));
  applyPreviewSize();
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

      // Sur le canevas overlay, aucun éditeur de code widget n'est affiché :
      // la plateforme ne sert ici qu'à choisir le format ciblé par Export
      // (voir exportOverlayCode), donc pas de flush/rechargement de l'éditeur
      // de widget en arrière-plan, qui serait hors-sujet et fausserait les
      // toasts affichés à l'utilisateur.
      if (!elements.overlayEditorView.hidden) {
        previewPlatform = nextPlatform;
        applyPreviewPlatform();
        localStorage.setItem(previewPlatformStorageKey, previewPlatform);
        showToast(`Export configuré pour ${previewPlatform === PLATFORM_STREAMLABS ? "Streamlabs" : "StreamElements"}`);
        return;
      }

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
  const isOverlayView = !elements.overlayEditorView.hidden;
  elements.exportMenuTrigger.setAttribute(
    "aria-label",
    `Exporter ${isOverlayView ? "l’overlay" : "le widget"} depuis ${previewPlatform === PLATFORM_STREAMLABS ? "Streamlabs" : "StreamElements"}`
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
      const isOverlayView = !elements.overlayEditorView.hidden;
      if (item.dataset.exportAction === "shortcut") {
        setExportMenuOpen(false);
        if (isOverlayView) exportOverlayShortcut(); else exportWidgetShortcut();
        return;
      }
      const platform = item.dataset.exportAction === "download"
        ? previewPlatform
        : previewPlatform === PLATFORM_STREAMLABS ? PLATFORM_STREAM_ELEMENTS : PLATFORM_STREAMLABS;
      setExportMenuOpen(false);
      elements.exportMenuTrigger.disabled = true;
      try {
        if (isOverlayView) await exportOverlayCode(platform); else await exportWidgetCode(platform);
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

// Thème de l'interface (panneau "Mon compte"), distinct de
// initializePreviewTheme() ci-dessus qui ne pilote que le damier clair/sombre
// de l'aperçu widget seul.
function loadAppTheme() {
  return localStorage.getItem(appThemeStorageKey) === "light" ? "light" : "dark";
}

function applyAppTheme(theme) {
  if (theme === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  for (const button of elements.themeSwitchButtons) {
    const active = button.dataset.themeChoice === theme;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

function initializeAppTheme() {
  // Le script inline de index.html a déjà posé data-theme avant le premier
  // paint (anti-flash) : on ne fait ici que synchroniser l'état visuel des
  // boutons avec cette même préférence, pas re-décider du thème.
  applyAppTheme(loadAppTheme());
  for (const button of elements.themeSwitchButtons) {
    button.addEventListener("click", () => {
      const theme = button.dataset.themeChoice === "light" ? "light" : "dark";
      localStorage.setItem(appThemeStorageKey, theme);
      applyAppTheme(theme);
    });
  }
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
    dashboardPage.overlay = 0;
    dashboardPage.widget = 0;
    dashboardPage.alert = 0;
    renderWidgetLibrary();
    renderOverlayLibrary();
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
        dashboardPage[scope] = 0;
        renderWidgetLibrary();
        renderOverlayLibrary();
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
    nickname: document.querySelector("#contact-nickname").value.trim(),
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
  elements.widgetSettingsWidth.value = entry.width || DEFAULT_WIDGET_SIZE.width;
  elements.widgetSettingsHeight.value = entry.height || DEFAULT_WIDGET_SIZE.height;
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
  elements.widgetSettingsWidth.value = DEFAULT_WIDGET_SIZE.width;
  elements.widgetSettingsHeight.value = DEFAULT_WIDGET_SIZE.height;
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
  const width = Math.max(MIN_OVERLAY_ITEM_SIZE, Number(elements.widgetSettingsWidth.value) || DEFAULT_WIDGET_SIZE.width);
  const height = Math.max(MIN_OVERLAY_ITEM_SIZE, Number(elements.widgetSettingsHeight.value) || DEFAULT_WIDGET_SIZE.height);
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
          body: JSON.stringify({ name, description, icon: selectedWidgetIcon, type: selectedWidgetType, width, height })
        })
      : await fetch("/api/widget/metadata", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ widgetId, name, description, icon: selectedWidgetIcon, type: selectedWidgetType, width, height })
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
      applyWidgetDefaultPreviewSize(widget);
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

// --- Overlays : bibliothèque, dialogue de création/édition ---

function initializeOverlaySettings() {
  for (const [iconName, label] of overlayIconChoices) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "widget-icon-choices__choice";
    button.dataset.widgetIcon = iconName;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${iconName}</span>`;
    button.addEventListener("click", () => selectOverlayIcon(iconName));
    elements.overlayIconChoices.append(button);
  }

  const close = () => elements.overlaySettingsDialog.close();
  document.querySelector("#close-overlay-settings").addEventListener("click", close);
  document.querySelector("#cancel-overlay-settings").addEventListener("click", close);
  elements.overlaySettingsDialog.addEventListener("click", event => {
    if (event.target === elements.overlaySettingsDialog) close();
  });
  elements.overlaySettingsForm.addEventListener("submit", event => {
    event.preventDefault();
    void saveOverlayMetadata();
  });
  elements.addOverlayButton.addEventListener("click", () => openOverlayCreation());

  for (const button of elements.overlayRatioButtons) {
    button.addEventListener("click", () => applyOverlayRatio(button.dataset.overlayRatio));
  }
}

function renderOverlayLibrary() {
  elements.overlayCount.textContent = String(overlayCatalog.length);
  elements.overlayList.replaceChildren();
  if (overlayCatalog.length) {
    for (const entry of overlayCatalog) elements.overlayList.append(buildOverlayLibraryRow(entry));
  } else {
    elements.overlayList.append(buildLibraryEmptyState("Aucun overlay pour l’instant."));
  }

  const filteredOverlays = filterAndSortLibraryEntries(overlayCatalog, "overlay");
  const { pageEntries: overlayPageEntries, pageCount: overlayPageCount } = paginateDashboardEntries("overlay", filteredOverlays);
  elements.dashboardOverlayList.replaceChildren();
  if (overlayPageEntries.length) {
    for (const entry of overlayPageEntries) elements.dashboardOverlayList.append(buildOverlayLibraryRow(entry, { showMeta: true, showPreview: true }));
  } else {
    elements.dashboardOverlayList.append(buildLibraryEmptyState(dashboardLibraryEmptyMessage("Aucun overlay pour l’instant.")));
  }
  renderDashboardPagination(elements.dashboardOverlayPagination, "overlay", overlayPageCount);

  updateDashboardLibrarySuggestions();
}

function buildOverlayLibraryRow(entry, { showMeta = false, showPreview = false } = {}) {
  const row = document.createElement("div");
  row.className = "widget-library__row";

  const isActive = entry.id === activeOverlayId && !elements.overlayEditorView.hidden;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "widget-library__item";
  button.classList.toggle("is-active", isActive);
  button.dataset.overlayId = entry.id;
  button.setAttribute("aria-pressed", String(isActive));

  const icon = document.createElement("span");
  icon.className = "widget-library__icon";
  icon.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${escapeHtml(entry.icon || "desktop_landscape")}</span>`;

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

  button.append(icon, copy);
  button.addEventListener("click", () => void openOverlayEditor(entry.id));

  const menu = document.createElement("div");
  menu.className = "widget-library__menu";

  const menuTrigger = document.createElement("button");
  menuTrigger.type = "button";
  menuTrigger.className = "widget-library__options";
  menuTrigger.dataset.dropdownTrigger = "";
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
    openOverlaySettings(entry);
  });

  const duplicateItem = document.createElement("button");
  duplicateItem.type = "button";
  duplicateItem.className = "widget-library__options-item";
  duplicateItem.setAttribute("role", "menuitem");
  duplicateItem.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">content_copy</span><span>Dupliquer</span>';
  duplicateItem.addEventListener("click", () => {
    closeAllDropdowns();
    void duplicateOverlayEntry(entry);
  });

  const deleteItem = document.createElement("button");
  deleteItem.type = "button";
  deleteItem.className = "widget-library__options-item is-danger";
  deleteItem.setAttribute("role", "menuitem");
  deleteItem.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">delete</span><span>Supprimer</span>';
  deleteItem.addEventListener("click", () => {
    closeAllDropdowns();
    void deleteOverlayEntry(entry);
  });

  menuPanel.append(editItem, duplicateItem, deleteItem);
  menuTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleDropdown(menuTrigger);
  });
  menu.append(menuTrigger, menuPanel);

  row.append(button, menu);
  if (!showPreview) return row;

  const card = document.createElement("div");
  card.className = "overlay-preview-card";
  card.append(buildOverlayPreviewThumb(entry), row);
  return card;
}

function overlayPreviewItemIcon(item) {
  if (item.type === "icon" && item.props?.name) return item.props.name;
  return overlayLayerIcon(item);
}

// Miniature de la composition d'un overlay : chaque item est représenté par
// un petit rectangle positionné/dimensionné proportionnellement à x/y/w/h
// (jamais un rendu live des widgets — trop coûteux à multiplier sur une
// grille de cartes du dashboard). Les formes reprennent leur vraie couleur
// de remplissage pour rester fidèles à l'aperçu réel ; tout le reste utilise
// une teinte neutre + une icône, juste pour indiquer le type et la position.
function buildOverlayPreviewThumb(entry) {
  const canvas = entry.canvas || DEFAULT_OVERLAY_CANVAS;
  const thumb = document.createElement("button");
  thumb.type = "button";
  thumb.className = "overlay-preview-card__thumb";
  thumb.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
  thumb.setAttribute("aria-label", `Ouvrir l’overlay ${entry.name}`);

  for (const item of entry.items) {
    if (item.type === "group") continue;
    const mini = document.createElement("span");
    mini.className = "overlay-preview-card__item";
    mini.style.left = `${(item.x / canvas.width) * 100}%`;
    mini.style.top = `${(item.y / canvas.height) * 100}%`;
    mini.style.width = `${(item.w / canvas.width) * 100}%`;
    mini.style.height = `${(item.h / canvas.height) * 100}%`;
    if (item.type === "shape") {
      mini.style.background = item.props.fill || "#7c5cff";
      mini.style.borderColor = item.props.stroke && item.props.stroke !== "transparent" ? item.props.stroke : "transparent";
      if (item.props.shape === "ellipse") mini.style.borderRadius = "50%";
    } else {
      mini.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${escapeHtml(overlayPreviewItemIcon(item))}</span>`;
    }
    thumb.append(mini);
  }

  thumb.addEventListener("click", () => void openOverlayEditor(entry.id));
  return thumb;
}

function openOverlaySettings(entry) {
  overlaySettingsMode = "edit";
  elements.overlaySettingsId.value = entry.id;
  elements.overlaySettingsName.value = entry.name;
  elements.overlaySettingsDescription.value = entry.description || "";
  const canvas = entry.canvas || DEFAULT_OVERLAY_CANVAS;
  elements.overlaySettingsWidth.value = canvas.width;
  elements.overlaySettingsHeight.value = canvas.height;
  setOverlaySettingsMessage("");
  selectOverlayIcon(entry.icon || "desktop_landscape");
  elements.overlaySettingsTitle.textContent = "Modifier l’overlay";
  elements.saveOverlaySettings.textContent = "Enregistrer";
  elements.overlaySettingsDialog.showModal();
  elements.overlaySettingsName.focus();
  elements.overlaySettingsName.select();
}

function openOverlayCreation() {
  overlaySettingsMode = "create";
  elements.overlaySettingsId.value = "";
  elements.overlaySettingsName.value = "";
  elements.overlaySettingsDescription.value = "";
  elements.overlaySettingsWidth.value = DEFAULT_OVERLAY_CANVAS.width;
  elements.overlaySettingsHeight.value = DEFAULT_OVERLAY_CANVAS.height;
  setOverlaySettingsMessage("");
  selectOverlayIcon("desktop_landscape");
  elements.overlaySettingsTitle.textContent = "Nouvel overlay";
  elements.saveOverlaySettings.textContent = "Créer";
  elements.overlaySettingsDialog.showModal();
  elements.overlaySettingsName.focus();
}

function applyOverlayRatio(ratio) {
  const [w, h] = ratio === "9:16" ? [1080, 1920] : [1920, 1080];
  elements.overlaySettingsWidth.value = w;
  elements.overlaySettingsHeight.value = h;
}

function selectOverlayIcon(iconName) {
  selectedOverlayIcon = overlayIconChoices.some(([value]) => value === iconName) ? iconName : "desktop_landscape";
  for (const button of elements.overlayIconChoices.querySelectorAll("[data-widget-icon]")) {
    const selected = button.dataset.widgetIcon === selectedOverlayIcon;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
}

function setOverlaySettingsMessage(message, state = "") {
  elements.overlaySettingsMessage.textContent = message;
  elements.overlaySettingsMessage.className = `widget-settings__message${state ? ` is-${state}` : ""}`;
}

async function saveOverlayMetadata() {
  const isCreating = overlaySettingsMode === "create";
  const overlayId = elements.overlaySettingsId.value;
  const name = elements.overlaySettingsName.value.trim();
  const description = elements.overlaySettingsDescription.value.trim();
  const width = Number(elements.overlaySettingsWidth.value);
  const height = Number(elements.overlaySettingsHeight.value);
  if (!name) {
    elements.overlaySettingsName.focus();
    return;
  }

  elements.saveOverlaySettings.disabled = true;
  elements.saveOverlaySettings.textContent = isCreating ? "Création…" : "Enregistrement…";
  setOverlaySettingsMessage(isCreating ? "Création en cours…" : "Enregistrement en cours…");
  try {
    const response = isCreating
      ? await fetch("/api/overlays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, icon: selectedOverlayIcon, width, height })
        })
      : await fetch("/api/overlay/metadata", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overlayId, name, description, icon: selectedOverlayIcon, width, height })
        });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Erreur HTTP ${response.status}`);
    }

    const { overlay: updatedOverlay } = await response.json();

    if (isCreating) {
      overlayCatalog = [...overlayCatalog, updatedOverlay];
      renderOverlayLibrary();
      elements.overlaySettingsDialog.close();
      showToast(`${updatedOverlay.name} créé`);
      await openOverlayEditor(updatedOverlay.id);
      return;
    }

    overlayCatalog = overlayCatalog.map(entry =>
      entry.id === updatedOverlay.id ? { ...entry, ...updatedOverlay } : entry
    );
    if (activeOverlayId === updatedOverlay.id && activeOverlay) {
      activeOverlay = { ...activeOverlay, ...updatedOverlay };
      elements.overlayEditorTitle.textContent = activeOverlay.name;
      renderOverlayCanvas();
    }
    renderOverlayLibrary();
    setOverlaySettingsMessage("Informations enregistrées.", "success");
    elements.overlaySettingsDialog.close();
    showToast("Informations de l’overlay enregistrées");
  } catch (error) {
    setOverlaySettingsMessage(error.message, "error");
  } finally {
    elements.saveOverlaySettings.disabled = false;
    elements.saveOverlaySettings.textContent = isCreating ? "Créer" : "Enregistrer";
  }
}

async function duplicateOverlayEntry(entry) {
  try {
    const response = await fetch("/api/overlay/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overlayId: entry.id })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Erreur HTTP ${response.status}`);
    }
    const { overlay: duplicated } = await response.json();
    overlayCatalog = [...overlayCatalog, duplicated];
    renderOverlayLibrary();
    showToast(`${duplicated.name} créé`);
  } catch (error) {
    showToast(`Duplication impossible : ${error.message}`);
  }
}

async function deleteOverlayEntry(entry) {
  if (!window.confirm(`Supprimer définitivement « ${entry.name} » ? Cette action est irréversible.`)) return;

  try {
    const response = await fetch(`/api/overlay?id=${encodeURIComponent(entry.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Erreur HTTP ${response.status}`);
    }
    overlayCatalog = overlayCatalog.filter(item => item.id !== entry.id);
    renderOverlayLibrary();
    showToast(`${entry.name} supprimé`);
    if (activeOverlayId === entry.id) {
      activeOverlay = null;
      activeOverlayId = "";
      showDashboard();
    }
  } catch (error) {
    showToast(`Suppression impossible : ${error.message}`);
  }
}

// --- Overlays : canevas de composition (import, glisser-déposer, redimensionnement) ---

function initializeOverlayCanvas() {
  elements.overlayAddItemButton.addEventListener("click", () => {
    // Vit maintenant dans le panneau "+ Ajouter" de la barre d'outils (avant :
    // gros bouton dédié dans l'en-tête) : fermer le menu avant d'ouvrir le
    // sélecteur, sinon les deux resteraient superposés à l'écran.
    closeAllDropdowns();
    openOverlayItemPicker();
  });

  const closePicker = () => elements.overlayItemPickerDialog.close();
  document.querySelector("#close-overlay-item-picker").addEventListener("click", closePicker);
  elements.overlayItemPickerDialog.addEventListener("click", event => {
    if (event.target === elements.overlayItemPickerDialog) closePicker();
  });

  for (const button of elements.overlayToolButtons) {
    button.addEventListener("click", () => {
      // Sans effet pour "Sélection" (hors menu) ; ferme le menu "+ Ajouter"
      // pour les autres, choisis depuis son panneau déroulant.
      closeAllDropdowns();
      setOverlayTool(button.dataset.overlayTool);
    });
  }
  if (elements.overlayAddTrigger) {
    // Manquait : le déclencheur du menu "+ Ajouter" n'a pas [data-overlay-tool]
    // (seuls ses items en ont un), donc la boucle ci-dessus ne l'atteint pas —
    // sans ce listener dédié, rien n'ouvre jamais son panneau.
    elements.overlayAddTrigger.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleDropdown(elements.overlayAddTrigger);
    });
  }
  elements.overlayToolGroupButton.addEventListener("click", () => {
    if (elements.overlayToolGroupButton.dataset.mode === "ungroup") ungroupOverlaySelection();
    else createOverlayGroup();
  });
  elements.overlayDuplicateButton.addEventListener("click", duplicateOverlaySelection);
  elements.overlayDeleteButton.addEventListener("click", removeOverlaySelection);
  elements.overlayCenterButton.addEventListener("click", centerOverlaySelection);
  elements.overlayUndoButton.addEventListener("click", undoOverlay);
  elements.overlayRedoButton.addEventListener("click", redoOverlay);
  elements.overlayZoomOutButton.addEventListener("click", () => stepOverlayZoom(-1));
  elements.overlayZoomInButton.addEventListener("click", () => stepOverlayZoom(1));
  elements.overlayZoomLabel.addEventListener("click", () => setOverlayZoom("fit"));
  for (const button of elements.overlayAlignButtons) {
    button.addEventListener("click", () => alignOverlaySelection(button.dataset.overlayAlign));
  }
  for (const button of elements.overlayDistributeButtons) {
    button.addEventListener("click", () => distributeOverlaySelection(button.dataset.overlayDistribute));
  }
  elements.overlayItemSettingsClose.addEventListener("click", () => {
    overlaySettingsItemId = null;
    renderOverlayItemSettings();
  });
  initializeOverlayToolbarDrag();

  elements.overlayRulerToggle?.addEventListener("click", () => setOverlayGuidesVisible(!showOverlayGuides));
  elements.overlayRulerTop?.addEventListener("pointerdown", (event) => startOverlayGuideCreate(event, "horizontal"));
  elements.overlayRulerLeft?.addEventListener("pointerdown", (event) => startOverlayGuideCreate(event, "vertical"));
  // Synchronise l'état initial (préférence localStorage) sur le bouton/stage
  // dès le chargement du module — openOverlayEditor rappellera
  // setOverlayGuidesVisible une fois l'overlay chargé pour (re)dessiner les
  // règles/repères propres à CET overlay.
  setOverlayGuidesVisible(showOverlayGuides);

  elements.overlayCanvas.addEventListener("pointerdown", (event) => {
    // Traité à part, avant même le placement générique ci-dessous : cet
    // outil ne crée jamais de nouvel item, il lit/écrit le style d'un item
    // texte EXISTANT sur lequel on clique (cf. handleOverlayEyedropperClick).
    if (activeOverlayTool === "eyedropper") {
      const itemEl = event.target.closest(".overlay-item");
      if (itemEl) handleOverlayEyedropperClick(itemEl.dataset.itemId);
      return;
    }
    // Un clic sur un texte déjà posé, outil Texte actif, l'édite sur place
    // au lieu d'en empiler un nouveau par-dessus — seul un clic dans le vide
    // tombe encore dans le placement générique juste en dessous.
    if (activeOverlayTool === "text") {
      const textItemEl = event.target.closest(".overlay-item--text");
      if (textItemEl) {
        const textEl = textItemEl.querySelector(".overlay-item__text");
        selectedOverlayItemIds = new Set([textItemEl.dataset.itemId]);
        updateOverlaySelectionUI();
        setOverlayTool("select");
        if (textEl) enterOverlayTextEdit(textItemEl.dataset.itemId, textItemEl, textEl);
        return;
      }
    }
    if (activeOverlayTool !== "select" && !event.target.closest("[data-handle]")) {
      const point = canvasPointFromEvent(event);
      placeOverlayItem(activeOverlayTool, point.x, point.y);
      setOverlayTool("select");
      return;
    }

    const handle = event.target.closest("[data-handle]");
    const itemEl = event.target.closest(".overlay-item");

    if (itemEl) {
      if (itemEl.classList.contains("is-editing") && event.target.isContentEditable) return;
      if (event.shiftKey && !handle) {
        toggleOverlaySelection(itemEl.dataset.itemId);
        return;
      }
      if (!selectedOverlayItemIds.has(itemEl.dataset.itemId)) {
        selectedOverlayItemIds = new Set([itemEl.dataset.itemId]);
        updateOverlaySelectionUI();
      }
      if (handle) {
        const item = findOverlayItem(itemEl.dataset.itemId);
        if (item?.type === "group") startOverlayGroupResize(event, itemEl, handle.dataset.handle);
        else startOverlayItemResize(event, itemEl, handle.dataset.handle);
      } else if (!event.target.closest(".overlay-item__chrome")) {
        startOverlayItemDrag(event, itemEl);
      }
      return;
    }

    // Aucun .overlay-item touché directement : un groupe reste
    // pointer-events:none en permanence (voir _overlay-canvas.scss), donc sa
    // sélection se résout par un test de coordonnées sur les données plutôt
    // que par un hit-test DOM — sinon sa zone (l'union de ses enfants)
    // volerait des clics qui doivent atteindre les enfants eux-mêmes.
    const point = canvasPointFromEvent(event);
    const group = hitTestOverlayGroup(point);
    if (group) {
      selectedOverlayItemIds = new Set([group.id]);
      updateOverlaySelectionUI();
      const groupEl = elements.overlayCanvas.querySelector(`[data-item-id="${group.id}"]`);
      if (groupEl) startOverlayItemDrag(event, groupEl);
      return;
    }

    selectedOverlayItemIds.clear();
    updateOverlaySelectionUI();
  });

  document.addEventListener("keydown", (event) => {
    if (elements.overlayEditorView.hidden) return;
    // Laisse l'annuler natif du navigateur agir pendant l'édition d'un texte
    // : sinon Ctrl+Z reviendrait sur la dernière mutation du canevas (peut-
    // être sans rapport) au lieu de défaire la frappe en cours.
    if (document.activeElement?.isContentEditable) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey) {
      event.preventDefault();
      undoOverlay();
    } else if ((event.ctrlKey || event.metaKey) && (key === "y" || (key === "z" && event.shiftKey))) {
      event.preventDefault();
      redoOverlay();
    } else if ((event.ctrlKey || event.metaKey) && key === "d") {
      // preventDefault avant tout : sans ça, le navigateur ouvre son propre
      // dialogue "Ajouter aux favoris" (comportement natif de Ctrl+D) en plus
      // de dupliquer la sélection.
      event.preventDefault();
      duplicateOverlaySelection();
    } else if (event.key === "Escape" && activeOverlayTool !== "select") {
      setOverlayTool("select");
    }
  });

  new ResizeObserver(updateOverlayCanvasScale).observe(elements.overlayCanvasWrap);
  // Un redimensionnement vertical pur (largeur inchangée) ne fait pas bouger
  // .overlay-canvas-wrap tant que updateOverlayCanvasScale n'a pas déjà
  // recalculé sa hauteur : sans cet écouteur, le ResizeObserver ci-dessus ne
  // se déclenche jamais pour ce cas, seul window.innerHeight en a changé.
  window.addEventListener("resize", updateOverlayCanvasScale);
}

function initializeOverlayToolbarDrag() {
  const saved = loadOverlayToolbarPosition();
  if (saved) applyOverlayToolbarPosition(saved);

  elements.overlayToolbarHandle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    const toolbar = elements.overlayToolbar;
    toolbar.setPointerCapture(event.pointerId);
    toolbar.classList.add("is-dragging");
    // .overlay-canvas-stage, pas .overlay-canvas-wrap : c'est le stage (taille
    // exacte canvas.width/height * scale, centré dans le wrap) qui sert de
    // bloc conteneur positionné à la barre d'outils depuis l'introduction du
    // stage — le wrap peut être plus large que lui (letterboxing horizontal).
    const stageRect = elements.overlayCanvasStage.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const offsetX = event.clientX - toolbarRect.left;
    const offsetY = event.clientY - toolbarRect.top;

    const onMove = (moveEvent) => {
      const maxLeft = Math.max(0, stageRect.width - toolbarRect.width);
      const maxTop = Math.max(0, stageRect.height - toolbarRect.height);
      const left = Math.min(maxLeft, Math.max(0, moveEvent.clientX - stageRect.left - offsetX));
      const top = Math.min(maxTop, Math.max(0, moveEvent.clientY - stageRect.top - offsetY));
      applyOverlayToolbarPosition({ left, top });
    };
    const onUp = () => {
      toolbar.releasePointerCapture(event.pointerId);
      toolbar.removeEventListener("pointermove", onMove);
      toolbar.removeEventListener("pointerup", onUp);
      toolbar.classList.remove("is-dragging");
      const rect = toolbar.getBoundingClientRect();
      saveOverlayToolbarPosition({ left: rect.left - stageRect.left, top: rect.top - stageRect.top });
    };
    toolbar.addEventListener("pointermove", onMove);
    toolbar.addEventListener("pointerup", onUp);
  });
}

function applyOverlayToolbarPosition({ left, top }) {
  elements.overlayToolbar.style.left = `${left}px`;
  elements.overlayToolbar.style.top = `${top}px`;
}

function loadOverlayToolbarPosition() {
  try {
    return JSON.parse(localStorage.getItem(overlayToolbarPositionStorageKey) || "null");
  } catch {
    return null;
  }
}

function saveOverlayToolbarPosition(position) {
  localStorage.setItem(overlayToolbarPositionStorageKey, JSON.stringify(position));
}

function setOverlayTool(tool) {
  // Quitter l'outil pipette (quelle qu'en soit la raison : Échap, un autre
  // outil choisi…) abandonne toujours le style éventuellement en attente —
  // le rearmer au prochain passage sur "eyedropper" évite qu'un style
  // capturé lors d'une session précédente s'applique par surprise bien plus
  // tard.
  if (activeOverlayTool === "eyedropper" && tool !== "eyedropper") overlayEyedropperStyle = null;
  activeOverlayTool = tool;
  for (const button of elements.overlayToolButtons) {
    const active = button.dataset.overlayTool === tool;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  if (elements.overlayAddTrigger) {
    elements.overlayAddTrigger.classList.toggle("is-active", OVERLAY_ADD_MENU_TOOLS.has(tool));
  }
  elements.overlayCanvas.classList.toggle("is-placing", tool !== "select");
}

// Premier clic (sur un texte) : capture son style et reste en attente d'une
// cible — l'outil reste actif pour permettre plusieurs applications de
// suite, jusqu'à Échap ou un changement d'outil (cf. setOverlayTool). Clic
// suivant (sur un autre texte) : applique le style capturé.
function handleOverlayEyedropperClick(itemId) {
  const item = findOverlayItem(itemId);
  if (!item || item.type !== "text") {
    showToast("La pipette de style ne fonctionne que sur des éléments texte.");
    return;
  }
  if (!overlayEyedropperStyle) {
    const { content, ...style } = item.props;
    overlayEyedropperStyle = style;
    showToast("Style copié — cliquez un autre texte pour l'appliquer (Échap pour annuler).");
    return;
  }
  item.props = { ...item.props, ...overlayEyedropperStyle };
  renderOverlayCanvas();
  pushOverlayHistory();
  scheduleOverlayPersist();
  showToast("Style appliqué.");
}

// Relit l'échelle réellement appliquée sur .overlay-canvas-stage (dont la
// largeur en px est posée par updateOverlayCanvasScale) plutôt que de la
// recalculer à partir de .overlay-canvas-wrap : ce dernier ne borne plus que
// la largeur disponible, alors que l'échelle réelle peut être bornée par la
// hauteur (overlay 9:16, fenêtre basse) — recalculer ici diffusion à part
// aurait redonné un ratio clic/glisser faux dans ce cas.
function overlayCanvasScale() {
  const canvas = activeOverlay?.canvas || DEFAULT_OVERLAY_CANVAS;
  return (elements.overlayCanvasStage.offsetWidth || canvas.width) / canvas.width;
}

// getBoundingClientRect() sur #overlay-canvas tient déjà compte de son
// transform:scale() (il retourne la boîte visuelle à l'écran) : on peut donc
// en déduire un point en coordonnées "réelles" du canevas (celles stockées
// dans overlay.json) sans dupliquer le calcul d'échelle.
function canvasPointFromEvent(event) {
  const rect = elements.overlayCanvas.getBoundingClientRect();
  const scale = overlayCanvasScale();
  return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
}

function generateOverlayItemId() {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function placeOverlayItem(tool, x, y) {
  if (!activeOverlay) return;
  if (tool === "image") {
    const src = window.prompt("URL de l'image (http/https)");
    if (!src) return;
    createOverlayPrimitive("image", x, y, 320, 180, { src, fit: "cover" });
    return;
  }
  if (tool === "text") {
    const item = createOverlayPrimitive("text", x, y, 320, 120, {
      content: "Texte", fontFamily: "inherit", fontSize: 32, fontWeight: 600, color: "#ffffff", align: "left"
    });
    window.requestAnimationFrame(() => {
      const el = elements.overlayCanvas.querySelector(`[data-item-id="${item.id}"]`);
      const textEl = el?.querySelector(".overlay-item__text");
      if (el && textEl) enterOverlayTextEdit(item.id, el, textEl);
    });
    return;
  }
  if (tool === "icon") {
    createOverlayPrimitive("icon", x, y, 96, 96, { name: "star", color: "#ffffff" });
    return;
  }
  if (tool === "shape") {
    createOverlayPrimitive("shape", x, y, 200, 200, {
      shape: "rectangle", fill: "#7c5cff", stroke: "transparent", strokeWidth: 0, radius: 0
    });
    return;
  }
  if (tool === "video") {
    const src = window.prompt("URL de la vidéo (mp4, webm… http/https)");
    if (!src) return;
    createOverlayPrimitive("video", x, y, 320, 180, { src, fit: "cover", loop: true, muted: true });
    return;
  }
  if (tool === "embed") {
    const src = window.prompt("URL du contenu à intégrer (page web, widget externe… http/https)");
    if (!src) return;
    createOverlayPrimitive("embed", x, y, 400, 300, { src });
  }
}

function createOverlayPrimitive(type, x, y, w, h, props) {
  const nextZ = activeOverlay.items.reduce((max, item) => Math.max(max, item.z), 0) + 1;
  const item = { id: generateOverlayItemId(), type, x: Math.round(x - w / 2), y: Math.round(y - h / 2), w, h, z: nextZ, props };
  activeOverlay.items = [...activeOverlay.items, item];
  renderOverlayCanvas();
  selectedOverlayItemIds = new Set([item.id]);
  updateOverlaySelectionUI();
  pushOverlayHistory();
  scheduleOverlayPersist();
  return item;
}

function updateOverlaySelectionUI() {
  for (const node of elements.overlayCanvas.querySelectorAll(".overlay-item")) {
    node.classList.toggle("is-active", selectedOverlayItemIds.has(node.dataset.itemId));
  }
  const selectionCount = selectedOverlayItemIds.size;
  // Un seul groupe sélectionné : le bouton "Grouper" devient "Dégrouper"
  // plutôt que de rester désactivé (grouper une sélection d'1 seul élément
  // n'a pas de sens, mais dégrouper l'unique groupe sélectionné si).
  const soleSelection = selectionCount === 1 ? findOverlayItem([...selectedOverlayItemIds][0]) : null;
  const isUngroupMode = soleSelection?.type === "group";
  const groupVisible = isUngroupMode || selectionCount >= 2;
  elements.overlayToolGroupButton.dataset.mode = isUngroupMode ? "ungroup" : "group";
  elements.overlayToolGroupButton.disabled = isUngroupMode ? false : selectionCount < 2;
  elements.overlayToolGroupButton.hidden = !groupVisible;
  elements.overlayToolGroupButton.title = isUngroupMode ? "Dégrouper" : "Grouper la sélection";
  elements.overlayToolGroupButton.setAttribute("aria-label", isUngroupMode ? "Dégrouper" : "Grouper la sélection");
  const groupButtonIcon = elements.overlayToolGroupButton.querySelector(".material-symbols-rounded");
  if (groupButtonIcon) groupButtonIcon.textContent = isUngroupMode ? "call_split" : "select_all";
  // Dupliquer/Supprimer/Centrer/alignement n'ont de sens que sur une
  // sélection non vide ; masqués (pas juste désactivés) en dehors de ce cas
  // pour ne pas encombrer la barre d'outils par défaut.
  elements.overlayDuplicateButton.disabled = selectionCount < 1;
  elements.overlayDuplicateButton.hidden = selectionCount < 1;
  elements.overlayDeleteButton.disabled = selectionCount < 1;
  elements.overlayDeleteButton.hidden = selectionCount < 1;
  elements.overlayCenterButton.disabled = selectionCount < 1;
  elements.overlayCenterButton.hidden = selectionCount < 1;
  for (const button of elements.overlayAlignButtons) {
    button.disabled = selectionCount < 1;
    button.hidden = selectionCount < 1;
  }
  // La distribution ne fait quelque chose qu'à partir de 3 items (cf.
  // distributeOverlaySelection), mais reste visible dès 2 pour annoncer la
  // fonctionnalité avant qu'elle ne devienne utilisable.
  for (const button of elements.overlayDistributeButtons) {
    button.disabled = selectionCount < 3;
    button.hidden = selectionCount < 2;
  }
  if (overlaySettingsItemId && !(selectionCount === 1 && selectedOverlayItemIds.has(overlaySettingsItemId))) {
    overlaySettingsItemId = null;
  }
  updateOverlayToolbarDividers();
  renderOverlayLayers();
  renderOverlayItemSettings();
}

// Un séparateur n'a de sens que s'il sépare deux groupes de boutons
// effectivement visibles : sans ça, masquer Grouper/Dupliquer/Supprimer/
// Alignement/Distribution (ci-dessus, selon la sélection) laisse leurs
// séparateurs voisins affichés côte à côte au-dessus d'un vide. Découpe les
// enfants de la barre d'outils en segments [avant, séparateur, après, ...] et
// ne montre chaque séparateur que si les deux segments qui l'entourent
// contiennent au moins un bouton visible.
function updateOverlayToolbarDividers() {
  if (!elements.overlayToolbar) return;
  const hasVisibleControl = (el) => (el.matches("button") ? !el.hidden : !!el.querySelector("button:not([hidden])"));
  const segments = [[]];
  for (const child of elements.overlayToolbar.children) {
    if (child.classList.contains("overlay-toolbar__divider")) segments.push(child, []);
    else segments[segments.length - 1].push(child);
  }
  for (let i = 1; i < segments.length; i += 2) {
    const before = segments[i - 1];
    const after = segments[i + 1] || [];
    segments[i].hidden = !(before.some(hasVisibleControl) && after.some(hasVisibleControl));
  }
}

function toggleOverlaySelection(itemId) {
  if (selectedOverlayItemIds.has(itemId)) selectedOverlayItemIds.delete(itemId);
  else selectedOverlayItemIds.add(itemId);
  updateOverlaySelectionUI();
}

function hitTestOverlayGroup(point) {
  if (!activeOverlay) return null;
  const groups = activeOverlay.items.filter((item) => item.type === "group").sort((a, b) => b.z - a.z);
  return groups.find((group) =>
    point.x >= group.x && point.x <= group.x + group.w &&
    point.y >= group.y && point.y <= group.y + group.h
  ) || null;
}

function createOverlayGroup() {
  if (!activeOverlay) return;
  const ids = [...selectedOverlayItemIds];
  const members = ids.map(findOverlayItem).filter(Boolean);
  if (members.length < 2) return;
  const x = Math.min(...members.map((member) => member.x));
  const y = Math.min(...members.map((member) => member.y));
  const w = Math.max(...members.map((member) => member.x + member.w)) - x;
  const h = Math.max(...members.map((member) => member.y + member.h)) - y;
  const z = Math.min(...members.map((member) => member.z)) - 1;
  const group = { id: generateOverlayItemId(), type: "group", x, y, w, h, z, props: { children: ids } };
  activeOverlay.items = [...activeOverlay.items, group];
  renderOverlayCanvas();
  selectedOverlayItemIds = new Set([group.id]);
  updateOverlaySelectionUI();
  pushOverlayHistory();
  scheduleOverlayPersist();
}

// Dissout le groupe sélectionné : retire uniquement l'item "group" lui-même
// (removeOverlayItem ne supprime jamais ses enfants en cascade, cf. son
// propre commentaire), puis resélectionne ses anciens enfants — comme un
// dégroupement Photoshop, ils restent en place et sélectionnés.
function ungroupOverlaySelection() {
  if (selectedOverlayItemIds.size !== 1) return;
  const group = findOverlayItem([...selectedOverlayItemIds][0]);
  if (!group || group.type !== "group") return;
  const childIds = [...group.props.children];
  removeOverlayItem(group.id);
  selectedOverlayItemIds = new Set(childIds);
  updateOverlaySelectionUI();
}

// Items sélectionnés au premier niveau uniquement : si un groupe sélectionné
// a aussi l'un de ses propres enfants directement sélectionné (possible,
// chaque enfant reste cliquable/shift-sélectionnable indépendamment), cet
// enfant est exclu ici pour ne jamais être déplacé deux fois par
// moveOverlayItemTo (une fois via le delta du groupe, une fois pour lui-même).
function selectedOverlayItemsList() {
  const items = [...selectedOverlayItemIds].map(findOverlayItem).filter(Boolean);
  const childIdsOfSelectedGroups = new Set(
    items.filter((entry) => entry.type === "group").flatMap((group) => group.props.children)
  );
  return items.filter((entry) => !childIdsOfSelectedGroups.has(entry.id));
}

const OVERLAY_DUPLICATE_OFFSET = 20;

// Duplique la sélection de premier niveau (cf. selectedOverlayItemsList) :
// un groupe emmène une copie de chacun de ses enfants avec lui (jamais les
// ids d'origine — sinon les deux groupes partageraient les mêmes membres),
// toujours au premier niveau même si l'original était lui-même dans un
// groupe (une duplication "à l'intérieur" du groupe parent ajouterait de la
// complexité non demandée ici).
function duplicateOverlaySelection() {
  if (!activeOverlay) return;
  const items = selectedOverlayItemsList();
  if (!items.length) return;
  let nextZ = activeOverlay.items.reduce((max, item) => Math.max(max, item.z), 0) + 1;
  const clones = [];

  const cloneItem = (item) => {
    const clone = {
      ...item,
      id: generateOverlayItemId(),
      x: item.x + OVERLAY_DUPLICATE_OFFSET,
      y: item.y + OVERLAY_DUPLICATE_OFFSET,
      z: nextZ++,
      props: { ...item.props }
    };
    clones.push(clone);
    return clone;
  };

  const topClones = items.map((item) => {
    const clone = cloneItem(item);
    if (item.type === "group") {
      const childClones = item.props.children.map(findOverlayItem).filter(Boolean).map(cloneItem);
      clone.props = { ...clone.props, children: childClones.map((child) => child.id) };
    }
    return clone;
  });

  activeOverlay.items = [...activeOverlay.items, ...clones];
  renderOverlayCanvas();
  selectedOverlayItemIds = new Set(topClones.map((clone) => clone.id));
  updateOverlaySelectionUI();
  pushOverlayHistory();
  scheduleOverlayPersist();
}

function moveOverlayItemTo(item, newX, newY) {
  if (item.locked) return;
  const dx = newX - item.x;
  const dy = newY - item.y;
  if (dx === 0 && dy === 0) return;
  // Un groupe déplace aussi tous ses enfants du même delta, comme pour un
  // glisser-déposer (voir startOverlayItemDrag).
  const movingIds = item.type === "group" ? [item.id, ...item.props.children] : [item.id];
  for (const id of movingIds) {
    const target = findOverlayItem(id);
    if (!target) continue;
    target.x += dx;
    target.y += dy;
    const el = elements.overlayCanvas.querySelector(`[data-item-id="${id}"]`);
    if (el) applyOverlayItemStyle(el, target);
  }
}

// Bornes de référence pour aligner/centrer : celles de tout le canevas si un
// seul item est sélectionné (l'aligner par rapport à sa propre boîte ne
// bougerait rien), sinon celles de la boîte englobante de la sélection.
function overlaySelectionBounds(items) {
  const canvas = activeOverlay.canvas || DEFAULT_OVERLAY_CANVAS;
  if (items.length === 1) return { minX: 0, maxX: canvas.width, minY: 0, maxY: canvas.height };
  return {
    minX: Math.min(...items.map((entry) => entry.x)),
    maxX: Math.max(...items.map((entry) => entry.x + entry.w)),
    minY: Math.min(...items.map((entry) => entry.y)),
    maxY: Math.max(...items.map((entry) => entry.y + entry.h))
  };
}

function alignOverlaySelection(mode) {
  if (!activeOverlay) return;
  const items = selectedOverlayItemsList();
  if (items.length < 1) return;
  const { minX, maxX, minY, maxY } = overlaySelectionBounds(items);
  for (const item of items) {
    if (mode === "left") moveOverlayItemTo(item, Math.round(minX), item.y);
    else if (mode === "center") moveOverlayItemTo(item, Math.round(minX + (maxX - minX) / 2 - item.w / 2), item.y);
    else if (mode === "right") moveOverlayItemTo(item, Math.round(maxX - item.w), item.y);
    else if (mode === "top") moveOverlayItemTo(item, item.x, Math.round(minY));
    else if (mode === "middle") moveOverlayItemTo(item, item.x, Math.round(minY + (maxY - minY) / 2 - item.h / 2));
    else if (mode === "bottom") moveOverlayItemTo(item, item.x, Math.round(maxY - item.h));
  }
  pushOverlayHistory();
  scheduleOverlayPersist();
}

// Centre chaque item à la fois horizontalement et verticalement en un seul
// geste (un historique/une persistance), plutôt que deux clics successifs
// sur "center" puis "middle".
function centerOverlaySelection() {
  if (!activeOverlay) return;
  const items = selectedOverlayItemsList();
  if (items.length < 1) return;
  const { minX, maxX, minY, maxY } = overlaySelectionBounds(items);
  for (const item of items) {
    moveOverlayItemTo(
      item,
      Math.round(minX + (maxX - minX) / 2 - item.w / 2),
      Math.round(minY + (maxY - minY) / 2 - item.h / 2)
    );
  }
  pushOverlayHistory();
  scheduleOverlayPersist();
}

// Distribution à espacement égal entre les bords des boîtes englobantes
// (pas un espacement centre-à-centre naïf) : le premier et le dernier item
// (selon l'axe trié) restent fixes, les items intermédiaires sont replacés
// avec un intervalle constant entre eux.
function distributeOverlaySelection(axis) {
  const items = selectedOverlayItemsList();
  if (items.length < 3) return;
  const sizeKey = axis === "vertical" ? "h" : "w";
  const posKey = axis === "vertical" ? "y" : "x";
  const sorted = [...items].sort((a, b) => a[posKey] - b[posKey]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = (last[posKey] + last[sizeKey]) - first[posKey];
  const totalSize = sorted.reduce((sum, entry) => sum + entry[sizeKey], 0);
  const gap = (span - totalSize) / (sorted.length - 1);
  let cursor = first[posKey] + first[sizeKey] + gap;
  for (let i = 1; i < sorted.length - 1; i++) {
    const item = sorted[i];
    const newPos = Math.round(cursor);
    if (axis === "vertical") moveOverlayItemTo(item, item.x, newPos);
    else moveOverlayItemTo(item, newPos, item.y);
    cursor += item[sizeKey] + gap;
  }
  pushOverlayHistory();
  scheduleOverlayPersist();
}

async function openOverlayEditor(overlayId) {
  try {
    const response = await fetch(`/api/overlay?id=${encodeURIComponent(overlayId)}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Erreur HTTP ${response.status}`);
    }
    const { overlay } = await response.json();
    activeOverlay = overlay;
    activeOverlayId = overlay.id;
    selectedOverlayItemIds = new Set();
    overlaySettingsItemId = null;
    overlayZoomMode = "fit";
    setOverlayTool("select");
    elements.overlayEditorTitle.textContent = overlay.name;
    showOverlayEditor();
    renderOverlayLibrary();
    updateOverlaySelectionUI();
    renderOverlayCanvas();
    resetOverlayHistory();
    renderOverlayGuides();
  } catch (error) {
    showToast(`Overlay introuvable : ${error.message}`);
  }
}

function renderOverlayCanvas() {
  if (!activeOverlay) return;
  const canvas = activeOverlay.canvas || DEFAULT_OVERLAY_CANVAS;
  elements.overlayCanvas.style.width = `${canvas.width}px`;
  elements.overlayCanvas.style.height = `${canvas.height}px`;
  window.requestAnimationFrame(updateOverlayCanvasScale);

  elements.overlayCanvas.replaceChildren();
  for (const item of activeOverlay.items) {
    elements.overlayCanvas.append(buildOverlayItemElement(item));
  }
  // #overlay-guides est un frère de #overlay-canvas (pas un enfant, voir
  // _overlay-canvas.scss), donc epargné par le replaceChildren() ci-dessus —
  // seul son contenu (les lignes) a besoin d'être resynchronisé.
  renderOverlayGuides();
  updateOverlaySelectionUI();
}

// Échelle d'ajustement pure (comme avant l'ajout du zoom manuel) : jamais
// au-delà de 100%, toujours contrainte par l'espace dispo. Sert de valeur
// par défaut (overlayZoomMode === "fit") et de base pour +/- (cf. stepOverlayZoom).
function computeOverlayFitScale(canvas) {
  // Mesurée sur .overlay-canvas-wrap (flex: 1, jamais redimensionné en JS),
  // jamais sur .overlay-canvas-stage : comme le stage est explicitement
  // dimensionné ci-dessous, lire sa propre largeur serait auto-référentiel
  // (chaque recalcul repartirait de la taille posée par le calcul précédent
  // au lieu de l'espace réellement disponible).
  const availableWidth = elements.overlayCanvasWrap.clientWidth || canvas.width;
  // Sans cette borne verticale, un overlay au format portrait (9:16) ou une
  // fenêtre basse laissait le canevas dépasser le bas du viewport : la mise à
  // l'échelle ne tenait compte que de la largeur disponible.
  const top = elements.overlayCanvasWrap.getBoundingClientRect().top;
  const availableHeight = Math.max(120, window.innerHeight - top - OVERLAY_CANVAS_BOTTOM_MARGIN);
  return Math.min(1, availableWidth / canvas.width, availableHeight / canvas.height);
}

function updateOverlayCanvasScale() {
  if (!activeOverlay) return;
  const canvas = activeOverlay.canvas || DEFAULT_OVERLAY_CANVAS;
  const fitScale = computeOverlayFitScale(canvas);
  // En zoom manuel (jauge de la barre d'outils), l'échelle appliquée ignore
  // l'espace disponible — .overlay-canvas-wrap devient alors scrollable
  // (overflow: auto, voir _overlay-canvas.scss) au lieu de recadrer le
  // canevas comme en mode "ajuster".
  const scale = overlayZoomMode === "fit" ? fitScale : overlayZoomMode;
  // Une seule échelle uniforme pour les deux dimensions (jamais scaleX/scaleY
  // séparés) + le stage dimensionné exactement à canvas.width/height * scale
  // (jamais étiré en % par le flex-row parent) : le ratio indiqué par
  // l'overlay est donc toujours respecté, que ce soit la largeur ou la
  // hauteur qui borne l'échelle.
  elements.overlayCanvas.style.transform = `scale(${scale})`;
  // .overlay-guides est un frère de .overlay-canvas, pas un enfant (voir le
  // commentaire sur .overlay-guides dans _overlay-canvas.scss) : il lui faut
  // donc exactement le même transform, posé séparément ici.
  elements.overlayGuidesLayer.style.transform = `scale(${scale})`;
  elements.overlayCanvasStage.style.width = `${canvas.width * scale}px`;
  elements.overlayCanvasStage.style.height = `${canvas.height * scale}px`;
  if (showOverlayGuides) drawOverlayRulers(canvas, scale);
  updateOverlayZoomDisplay(scale);
}

const OVERLAY_ZOOM_MIN = 0.25;
const OVERLAY_ZOOM_MAX = 4;
const OVERLAY_ZOOM_STEP = 0.25;

function setOverlayZoom(mode) {
  overlayZoomMode = mode === "fit" ? "fit" : Math.min(OVERLAY_ZOOM_MAX, Math.max(OVERLAY_ZOOM_MIN, mode));
  updateOverlayCanvasScale();
}

function stepOverlayZoom(direction) {
  if (!activeOverlay) return;
  const canvas = activeOverlay.canvas || DEFAULT_OVERLAY_CANVAS;
  const current = overlayZoomMode === "fit" ? computeOverlayFitScale(canvas) : overlayZoomMode;
  // Aligné sur un multiple du pas (25%) plutôt que juste += pas : partir
  // d'un ajustement à une valeur "moche" (ex. 63%) doit quand même retomber
  // sur des paliers ronds (75%, 100%…), pas s'accumuler depuis cette valeur.
  const stepped = direction > 0
    ? Math.floor(current / OVERLAY_ZOOM_STEP) * OVERLAY_ZOOM_STEP + OVERLAY_ZOOM_STEP
    : Math.ceil(current / OVERLAY_ZOOM_STEP) * OVERLAY_ZOOM_STEP - OVERLAY_ZOOM_STEP;
  setOverlayZoom(stepped);
}

function updateOverlayZoomDisplay(scale) {
  if (elements.overlayZoomLabel) elements.overlayZoomLabel.textContent = `${Math.round(scale * 100)}%`;
  if (elements.overlayZoomOutButton) elements.overlayZoomOutButton.disabled = scale <= OVERLAY_ZOOM_MIN;
  if (elements.overlayZoomInButton) elements.overlayZoomInButton.disabled = scale >= OVERLAY_ZOOM_MAX;
}

// --- Overlays : règles et repères (bouton "Repères" de la barre d'outils) --

const OVERLAY_RULER_SIZE = 20; // doit rester synchro avec $ruler-size (styles/layouts/_overlay-canvas.scss)

function setOverlayGuidesVisible(visible) {
  showOverlayGuides = visible;
  localStorage.setItem(overlayGuidesVisibleStorageKey, String(visible));
  elements.overlayRulerToggle?.classList.toggle("is-active", visible);
  elements.overlayRulerToggle?.setAttribute("aria-pressed", String(visible));
  elements.overlayCanvasStage.classList.toggle("show-rulers", visible);
  if (!visible || !activeOverlay) return;
  drawOverlayRulers(activeOverlay.canvas || DEFAULT_OVERLAY_CANVAS, overlayCanvasScale());
  renderOverlayGuides();
}

// Choisit un intervalle "rond" (1/2/5/10/20/25/50…) tel que son équivalent à
// l'écran (step * scale) reste lisible — sans ça, les graduations se
// chevaucheraient au zoom réduit ou se retrouveraient trop clairsemées au zoom élevé.
function pickRulerStep(scale) {
  const niceSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  return niceSteps.find((step) => step * scale >= 50) ?? niceSteps[niceSteps.length - 1];
}

function drawOverlayRulers(canvas, scale) {
  const step = pickRulerStep(scale);
  drawOverlayRuler(elements.overlayRulerTop, canvas.width, scale, step, true);
  drawOverlayRuler(elements.overlayRulerLeft, canvas.height, scale, step, false);
}

function drawOverlayRuler(canvasEl, logicalLength, scale, step, isHorizontal) {
  if (!canvasEl) return;
  const dpr = window.devicePixelRatio || 1;
  const displayLength = Math.max(1, Math.round(logicalLength * scale));
  const thickness = OVERLAY_RULER_SIZE;
  canvasEl.style.width = isHorizontal ? `${displayLength}px` : `${thickness}px`;
  canvasEl.style.height = isHorizontal ? `${thickness}px` : `${displayLength}px`;
  canvasEl.width = Math.round((isHorizontal ? displayLength : thickness) * dpr);
  canvasEl.height = Math.round((isHorizontal ? thickness : displayLength) * dpr);

  const ctx = canvasEl.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, displayLength, thickness);

  const rootStyle = getComputedStyle(document.documentElement);
  ctx.strokeStyle = rootStyle.getPropertyValue("--line-soft").trim() || "#373d4a";
  ctx.fillStyle = rootStyle.getPropertyValue("--muted").trim() || "#858b98";
  ctx.font = "9px system-ui, sans-serif";
  ctx.lineWidth = 1;
  ctx.textBaseline = "alphabetic";

  const minorDivisions = 5;
  const minorStep = step / minorDivisions;
  const totalTicks = Math.ceil(logicalLength / minorStep);
  for (let i = 0; i <= totalTicks; i++) {
    const value = i * minorStep;
    if (value > logicalLength + minorStep) break;
    const isMajor = i % minorDivisions === 0;
    // +0.5 pour un trait net d'1px physique (évite l'anti-aliasing d'une
    // ligne posée pile sur une frontière de pixel).
    const pos = Math.round(value * scale) + 0.5;
    const tickLength = isMajor ? thickness * 0.55 : thickness * 0.3;
    ctx.beginPath();
    if (isHorizontal) {
      ctx.moveTo(pos, thickness - tickLength);
      ctx.lineTo(pos, thickness);
    } else {
      ctx.moveTo(thickness - tickLength, pos);
      ctx.lineTo(thickness, pos);
    }
    ctx.stroke();
    if (isMajor && value > 0) {
      const label = String(Math.round(value));
      if (isHorizontal) {
        ctx.fillText(label, pos + 2, 9);
      } else {
        ctx.save();
        ctx.translate(9, pos - 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
  }
}

function renderOverlayGuides() {
  if (!elements.overlayGuidesLayer) return;
  elements.overlayGuidesLayer.replaceChildren();
  if (!activeOverlay?.guides || !showOverlayGuides) return;
  activeOverlay.guides.horizontal.forEach((value, index) => {
    elements.overlayGuidesLayer.append(buildOverlayGuideElement("horizontal", value, index));
  });
  activeOverlay.guides.vertical.forEach((value, index) => {
    elements.overlayGuidesLayer.append(buildOverlayGuideElement("vertical", value, index));
  });
}

function buildOverlayGuideElement(axis, value, index) {
  const el = document.createElement("div");
  el.className = `overlay-guide overlay-guide--${axis}`;
  if (axis === "horizontal") el.style.top = `${value}px`;
  else el.style.left = `${value}px`;
  el.addEventListener("pointerdown", (event) => startOverlayGuideDrag(event, axis, index));
  return el;
}

// true si le pointeur est en dehors du stage (damier + rubans) — glisser un
// repère jusque là le supprime, comme sur Photoshop (repère renvoyé vers/au-delà
// des règles).
function isOutsideOverlayStage(clientX, clientY) {
  const rect = elements.overlayCanvasStage.getBoundingClientRect();
  return clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom;
}

function startOverlayGuideDrag(event, axis, index) {
  event.stopPropagation();
  event.preventDefault();
  const guideEl = event.currentTarget;
  guideEl.classList.add("is-dragging");

  const onMove = (moveEvent) => {
    const outside = isOutsideOverlayStage(moveEvent.clientX, moveEvent.clientY);
    guideEl.style.opacity = outside ? "0.35" : "";
    if (outside) return;
    const point = canvasPointFromEvent(moveEvent);
    if (axis === "horizontal") guideEl.style.top = `${Math.round(point.y)}px`;
    else guideEl.style.left = `${Math.round(point.x)}px`;
  };
  const onUp = (upEvent) => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    const list = axis === "horizontal" ? activeOverlay.guides.horizontal : activeOverlay.guides.vertical;
    if (isOutsideOverlayStage(upEvent.clientX, upEvent.clientY)) {
      list.splice(index, 1);
    } else {
      const point = canvasPointFromEvent(upEvent);
      list[index] = Math.round(axis === "horizontal" ? point.y : point.x);
    }
    renderOverlayGuides();
    scheduleGuidesPersist();
  };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

// Glisser depuis une règle crée un nouveau repère : suit le pointeur sans
// rien persister tant qu'on n'a pas vraiment déplacé la souris (sinon un
// simple clic sur la règle créerait un repère parasite à la position 0), et
// annule si relâché en dehors du stage.
function startOverlayGuideCreate(event, axis) {
  event.preventDefault();
  if (!activeOverlay) return;
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;
  const guideEl = buildOverlayGuideElement(axis, 0, -1);
  guideEl.classList.add("is-dragging");
  guideEl.style.display = "none";
  elements.overlayGuidesLayer.append(guideEl);

  const onMove = (moveEvent) => {
    if (!moved && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 3) return;
    moved = true;
    const outside = isOutsideOverlayStage(moveEvent.clientX, moveEvent.clientY);
    guideEl.style.display = outside ? "none" : "";
    if (outside) return;
    const point = canvasPointFromEvent(moveEvent);
    if (axis === "horizontal") guideEl.style.top = `${Math.round(point.y)}px`;
    else guideEl.style.left = `${Math.round(point.x)}px`;
  };
  const onUp = (upEvent) => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    guideEl.remove();
    if (!moved || isOutsideOverlayStage(upEvent.clientX, upEvent.clientY)) return;
    const point = canvasPointFromEvent(upEvent);
    const value = Math.round(axis === "horizontal" ? point.y : point.x);
    if (axis === "horizontal") activeOverlay.guides.horizontal.push(value);
    else activeOverlay.guides.vertical.push(value);
    renderOverlayGuides();
    scheduleGuidesPersist();
  };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

// Accroche un bord/centre à ~GUIDE_SNAP_SCREEN_PX pixels écran d'un repère —
// convertit ce seuil en pixels logiques via l'échelle courante, jamais
// l'inverse (le seuil doit rester visuellement constant quel que soit le zoom).
function snapEdge(value, guides, scale) {
  if (!showOverlayGuides || !guides?.length) return value;
  const threshold = GUIDE_SNAP_SCREEN_PX / scale;
  let best = value;
  let bestDist = threshold;
  for (const guide of guides) {
    const dist = Math.abs(guide - value);
    if (dist < bestDist) {
      bestDist = dist;
      best = guide;
    }
  }
  return Math.round(best);
}

// Comme snapEdge, mais teste aussi le bord opposé et le centre (pas juste
// pos) : au drag, n'importe lequel des trois peut être celui qui aligne
// visuellement l'item sur le repère.
function snapMovePosition(pos, size, guides, scale) {
  if (!showOverlayGuides || !guides?.length) return pos;
  const threshold = GUIDE_SNAP_SCREEN_PX / scale;
  const offsets = [0, size / 2, size];
  let bestPos = pos;
  let bestDist = threshold;
  for (const guide of guides) {
    for (const offset of offsets) {
      const dist = Math.abs(guide - (pos + offset));
      if (dist < bestDist) {
        bestDist = dist;
        bestPos = guide - offset;
      }
    }
  }
  return Math.round(bestPos);
}

function findOverlayItem(itemId) {
  return activeOverlay?.items.find((item) => item.id === itemId);
}

function overlayItemDefaultLabel(item) {
  switch (item.type) {
    case "text": return "Texte";
    case "image": return "Image";
    case "video": return "Vidéo";
    case "embed": return "Lien";
    case "icon": return "Icône";
    case "shape": return "Forme";
    case "group": return `Groupe (${item.props.children.length})`;
    default: return item.widgetId;
  }
}

function buildOverlayItemElement(item) {
  const el = document.createElement("div");
  el.className = `overlay-item overlay-item--${item.type}${item.hidden ? " overlay-item--hidden" : ""}${item.locked ? " overlay-item--locked" : ""}`;
  el.dataset.itemId = item.id;
  applyOverlayItemStyle(el, item);

  const chrome = document.createElement("div");
  chrome.className = "overlay-item__chrome";

  const label = document.createElement("span");
  label.className = "overlay-item__label";
  label.textContent = overlayItemDefaultLabel(item);
  chrome.append(label);

  if (item.type === "icon") chrome.append(buildIconInspector(item, el));
  else if (item.type === "shape") chrome.append(buildShapeInspector(item, el));
  else if (item.type === "image") chrome.append(buildImageInspector(item, el));
  else if (item.type === "video") chrome.append(buildVideoInspector(item, el));
  else if (item.type === "embed") chrome.append(buildEmbedInspector(item, el));

  el.append(chrome);

  if (item.type === "widget" || item.type === "alert") buildWidgetItemContent(item, el, label);
  else if (item.type === "text") buildTextItemContent(item, el);
  else if (item.type === "image") buildImageItemContent(item, el);
  else if (item.type === "video") buildVideoItemContent(item, el);
  else if (item.type === "embed") buildEmbedItemContent(item, el);
  else if (item.type === "icon") buildIconItemContent(item, el);
  else if (item.type === "shape") buildShapeItemContent(item, el);
  else if (item.type === "group") buildGroupItemContent(item, el);

  for (const position of ["nw", "ne", "sw", "se"]) {
    const handle = document.createElement("div");
    handle.className = `overlay-item__handle overlay-item__handle--${position}`;
    handle.dataset.handle = position;
    el.append(handle);
  }

  return el;
}

async function buildWidgetItemContent(item, el, label) {
  // Le bundle est résolu AVANT toute insertion dans le DOM, pour attacher
  // l'iframe avec son srcdoc final dès sa première navigation plutôt que de
  // la laisser d'abord commiter un document vide (about:blank implicite) et
  // naviguer une seconde fois une fois le bundle arrivé.
  const bundle = await loadOverlayItemBundle(item.widgetId);

  const frame = document.createElement("iframe");
  frame.className = "overlay-item__frame";
  frame.setAttribute("sandbox", "allow-scripts");
  // Certains widgets (labels animés, in-game labels…) posent délibérément
  // overflow: visible sur leur html/body pour laisser peindre des glows/
  // ombres au-delà de leur boîte — mais overflow: visible sur la racine d'un
  // document est spécifié comme équivalent à "auto" une fois propagé au
  // viewport, donc affiche une vraie scrollbar dès que l'item est redimensionné
  // plus petit que le contenu. scrolling="no" désactive ce scroll interne côté
  // iframe, sans toucher au CSS de chaque widget (qui doit garder overflow:
  // visible pour ses effets).
  frame.setAttribute("scrolling", "no");
  frame.title = item.widgetId;

  if (!bundle) {
    el.append(frame);
    frame.srcdoc = "<!doctype html><body></body>";
    return;
  }

  label.textContent = bundle.widgetMeta?.name || item.widgetId;
  frame.title = bundle.widgetMeta?.name || item.widgetId;
  el.append(frame);
  renderOverlayItemFrame(frame, bundle, resolveOverlayItemFieldData(bundle, item));
}

// Fusionne les valeurs par défaut du widget avec les overrides propres à cet
// item d'overlay (item.props.fieldData), en ignorant silencieusement toute
// clé devenue invalide (dropdown dont l'option a disparu, nombre hors bornes,
// etc.) — mêmes garde-fous que loadFieldData pour l'aperçu widget seul.
function resolveOverlayItemFieldData(bundle, item) {
  const defaults = Object.fromEntries(Object.entries(bundle.fields).map(([key, field]) => [key, field.value]));
  const saved = item.props?.fieldData && typeof item.props.fieldData === "object" ? item.props.fieldData : {};
  const merged = { ...defaults };
  for (const [key, definition] of Object.entries(bundle.fields)) {
    if (!Object.hasOwn(saved, key)) continue;
    if (definition.type === "dropdown" && !Object.hasOwn(definition.options || {}, saved[key])) continue;
    if (["number", "slider"].includes(definition.type)) {
      const numericValue = Number(saved[key]);
      if (!Number.isFinite(numericValue)) continue;
      merged[key] = Math.min(definition.max ?? numericValue, Math.max(definition.min ?? numericValue, numericValue));
      continue;
    }
    merged[key] = saved[key];
  }
  return merged;
}

// Seul point d'entrée qui (re)navigue l'iframe d'un item d'overlay : partagé
// entre la construction initiale et chaque changement de champ dans le
// panneau de réglages, pour ne jamais diverger. Un rechargement complet du
// srcdoc (plutôt qu'un postMessage "onWidgetUpdate" en direct) est
// nécessaire ici : certains widgets de la bibliothèque (ex. zer0oes-neon-chat,
// zer0oes-animated-labels) n'écoutent pas onWidgetUpdate, alors que
// onWidgetLoad est géré par tous (c'est leur seul point d'initialisation).
function renderOverlayItemFrame(frame, bundle, fieldData) {
  frame.srcdoc = buildWidgetSrcdoc(bundle, fieldData, { platform: PLATFORM_STREAM_ELEMENTS, transparent: true });
  // Dispatché directement depuis le parent (comme dispatchToWidget pour
  // l'aperçu principal) plutôt que baké dans le bootstrap du srcdoc, pour
  // rester cohérent avec le seul mécanisme d'initialisation déjà en place.
  frame.onload = () => {
    frame.contentWindow?.postMessage({
      source: "se-lab",
      kind: "dispatch",
      eventType: "onWidgetLoad",
      eventTarget: "window",
      detail: {
        session: { data: structuredClone(session) },
        recents: buildRecents(session),
        currency: { code: "EUR", name: "Euro", symbol: "€" },
        channel: { ...channel, apiToken: "" },
        fieldData: structuredClone(fieldData)
      }
    }, "*");
  };
}

// Envoi ciblé vers l'iframe d'UN SEUL item d'overlay : ne jamais réutiliser
// dispatchToWidget ici, qui diffuse volontairement à tous les iframes de la
// vue overlay (un bouton "Tester" dans le panneau de réglages d'un item ne
// doit déclencher que cet item-là, pas toutes ses copies sur le canevas).
function dispatchToOverlayItemFrame(itemId, eventType, detail, eventTarget = "window") {
  const frame = elements.overlayCanvas.querySelector(`[data-item-id="${itemId}"] .overlay-item__frame`);
  frame?.contentWindow?.postMessage({ source: "se-lab", kind: "dispatch", eventType, eventTarget, detail }, "*");
}

async function commitOverlayItemField(itemId, key, value) {
  const item = findOverlayItem(itemId);
  if (!item) return;
  item.props = item.props && typeof item.props === "object" ? item.props : {};
  item.props.fieldData = { ...(item.props.fieldData || {}), [key]: value };

  const bundle = await loadOverlayItemBundle(item.widgetId);
  const frame = elements.overlayCanvas.querySelector(`[data-item-id="${itemId}"] .overlay-item__frame`);
  if (bundle && frame) renderOverlayItemFrame(frame, bundle, resolveOverlayItemFieldData(bundle, item));
  pushOverlayHistory();
  scheduleOverlayPersist();
}

// Équivalent paramétré de createFieldInput (aperçu widget seul) : celui-ci
// est couplé aux globales fieldData/updateField/activeWidgetId, inutilisable
// tel quel pour une valeur/callback arbitraires par item d'overlay.
function createOverlayItemFieldInput(key, definition, value, onCommit) {
  let input;
  if (definition.type === "dropdown") {
    input = document.createElement("select");
    for (const [optionValue, optionLabel] of Object.entries(definition.options || {})) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionLabel;
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
  input.value = value ?? "";
  input.addEventListener("change", () => {
    onCommit(["number", "slider"].includes(definition.type) ? Number(input.value) : input.value);
  });
  return input;
}

function commitOverlayItemPosition(itemId, key, rawValue) {
  const item = findOverlayItem(itemId);
  const value = Number(rawValue);
  if (!item || !Number.isFinite(value)) return;
  item[key] = (key === "w" || key === "h") ? Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(value)) : Math.round(value);

  const el = elements.overlayCanvas.querySelector(`[data-item-id="${itemId}"]`);
  if (el) applyOverlayItemStyle(el, item);
  pushOverlayHistory();
  scheduleOverlayPersist();
}

function buildOverlayItemPositionFields(item) {
  const details = document.createElement("details");
  details.className = "field-group";
  details.open = true;
  const summary = document.createElement("summary");
  summary.className = "field-group__summary";
  summary.textContent = "Position et taille";
  summary.addEventListener("click", (event) => {
    event.preventDefault();
    if (details.open) collapseDetails(details);
    else expandDetails(details);
  });

  const body = document.createElement("div");
  body.className = "field-group__body overlay-item-position";

  const buildInput = (labelText, key) => {
    const label = document.createElement("label");
    label.className = "field";
    const caption = document.createElement("span");
    caption.className = "field__label";
    caption.textContent = labelText;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "1";
    if (key === "w" || key === "h") input.min = String(MIN_OVERLAY_ITEM_SIZE);
    input.value = String(Math.round(item[key]));
    input.addEventListener("change", () => commitOverlayItemPosition(item.id, key, input.value));
    label.append(caption, input);
    return label;
  };

  body.append(buildInput("X", "x"), buildInput("Y", "y"), buildInput("Largeur", "w"), buildInput("Hauteur", "h"));
  details.append(summary, body);
  return details;
}

// --- Overlays : réglages d'un item "texte" ----------------------------
// Même apparence (field-group/field/checkbox-field) que les champs widget
// juste au-dessus, mais un schéma fixe (pas de fields.json) et un commit
// synchrone dédié (commitOverlayTextProp) plutôt que commitOverlayItemField,
// qui écrit dans item.props.fieldData et redessine un iframe de widget —
// aucun des deux ne s'applique à un item texte.

function buildOverlayFieldGroup(title, open, onToggle) {
  const details = document.createElement("details");
  details.className = "field-group";
  details.open = open;
  const summary = document.createElement("summary");
  summary.className = "field-group__summary";
  summary.textContent = title;
  summary.addEventListener("click", (event) => {
    event.preventDefault();
    const willOpen = !details.open;
    if (details.open) collapseDetails(details);
    else expandDetails(details);
    onToggle?.(willOpen);
  });
  const body = document.createElement("div");
  body.className = "field-group__body";
  details.append(summary, body);
  return { details, body };
}

function buildOverlayField(labelText, inputEl) {
  const label = document.createElement("label");
  label.className = "field";
  const caption = document.createElement("span");
  caption.className = "field__label";
  caption.textContent = labelText;
  label.append(caption, inputEl);
  return label;
}

function buildOverlayCheckboxField(labelText, checked, onCommit) {
  const label = document.createElement("label");
  label.className = "checkbox-field";
  label.innerHTML = `<span class="checkbox-field__label">${escapeHtml(labelText)}</span>`;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.addEventListener("change", () => onCommit(input.checked));
  label.append(input);
  return label;
}

const OVERLAY_TEXT_FONT_WEIGHTS = {
  "400": "Regular (400)",
  "500": "Medium (500)",
  "600": "SemiBold (600)",
  "700": "Bold (700)",
  "800": "ExtraBold (800)",
  "900": "Black (900)"
};

// Sélection volontairement restreinte aux polices Google Fonts les plus
// utilisées (plutôt que le catalogue complet, ~1500 familles) pour un menu
// déroulant qui reste consultable d'un coup d'œil.
const OVERLAY_TEXT_FONTS = [
  "Roboto", "Open Sans", "Montserrat", "Lato", "Poppins", "Oswald", "Raleway",
  "Inter", "Nunito", "Playfair Display", "Merriweather", "Rubik", "Work Sans",
  "Bebas Neue", "Anton", "Inconsolata", "Source Sans Pro", "PT Sans", "Ubuntu", "Quicksand"
];

// Charge une seule fois (garde sur l'id du <link>) le CSS Google Fonts pour
// TOUTES les polices ci-dessus, plutôt qu'à la demande par police
// sélectionnée : nécessaire pour que l'aperçu direct dans le <select>
// (chaque <option> stylée avec sa propre font-family, cf.
// buildOverlayFontFamilyInput) affiche autre chose que la police de repli.
function loadOverlayTextFonts() {
  if (document.querySelector("#overlay-text-fonts-link")) return;
  const link = document.createElement("link");
  link.id = "overlay-text-fonts-link";
  link.rel = "stylesheet";
  const families = OVERLAY_TEXT_FONTS
    .map((name) => `family=${encodeURIComponent(name)}:wght@400;500;600;700;800;900`)
    .join("&");
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.append(link);
}

function buildOverlayFontFamilyInput(value, onCommit) {
  loadOverlayTextFonts();
  const select = document.createElement("select");

  const defaultOption = document.createElement("option");
  defaultOption.value = "inherit";
  defaultOption.textContent = "Police par défaut";
  select.append(defaultOption);

  for (const font of OVERLAY_TEXT_FONTS) {
    const option = document.createElement("option");
    option.value = font;
    option.textContent = font;
    option.style.fontFamily = `'${font}', sans-serif`;
    select.append(option);
  }

  // Une valeur déjà enregistrée mais absente de la liste (ancien champ texte
  // libre, ou police non listée ici) doit rester sélectionnée et visible
  // plutôt que de silencieusement retomber sur la police par défaut.
  if (value && value !== "inherit" && !OVERLAY_TEXT_FONTS.includes(value)) {
    const customOption = document.createElement("option");
    customOption.value = value;
    customOption.textContent = value;
    select.append(customOption);
  }

  select.value = value || "inherit";
  select.addEventListener("change", () => onCommit(select.value));
  return select;
}
const OVERLAY_TEXT_ALIGNS = { left: "Gauche", center: "Centré", right: "Droite" };
const OVERLAY_TEXT_COLOR_MODES = { solid: "Couleur unie", gradient: "Dégradé" };

// Groupes de réglages (Police/Couleur/Ombre/Contour) ouverts par calque
// texte — le panneau est entièrement redessiné à chaque champ modifié (cf.
// commitOverlayTextProp -> renderOverlayItemSettings), donc sans cet état
// explicite un <details> rouvrirait/refermerait tout seul à chaque frappe
// au lieu de rester tel que l'utilisateur l'a laissé. Fermé par défaut
// (absent de la Map) pour tout calque jamais déplié.
const overlayTextSettingsOpenGroups = new Map();

function isOverlayTextGroupOpen(itemId, title) {
  return overlayTextSettingsOpenGroups.get(itemId)?.has(title) ?? false;
}

function setOverlayTextGroupOpen(itemId, title, open) {
  let openTitles = overlayTextSettingsOpenGroups.get(itemId);
  if (!openTitles) {
    openTitles = new Set();
    overlayTextSettingsOpenGroups.set(itemId, openTitles);
  }
  if (open) openTitles.add(title);
  else openTitles.delete(title);
}

function commitOverlayTextProp(itemId, key, value) {
  const item = findOverlayItem(itemId);
  if (!item) return;
  item.props[key] = value;
  const textEl = elements.overlayCanvas.querySelector(`[data-item-id="${itemId}"] .overlay-item__text`);
  if (textEl) applyOverlayTextStyle(textEl, item.props);
  pushOverlayHistory();
  scheduleOverlayPersist();
  // Redessine le panneau : colorMode/shadowEnabled/strokeEnabled font/défont
  // apparaître des champs (dégradé, ombre, contour) — sans ça, cocher "Activer
  // l'ombre" ne ferait rien apparaître tant qu'on ne referme/rouvre pas le panneau.
  renderOverlayItemSettings();
}

function buildOverlayTextSettingsFields(item) {
  const fragment = document.createDocumentFragment();
  const props = item.props;
  const commit = (key) => (value) => commitOverlayTextProp(item.id, key, value);
  const groupOpen = (title) => isOverlayTextGroupOpen(item.id, title);
  const onGroupToggle = (title) => (open) => setOverlayTextGroupOpen(item.id, title, open);

  const typo = buildOverlayFieldGroup("Police", groupOpen("Police"), onGroupToggle("Police"));
  typo.body.append(
    buildOverlayField("Police", buildOverlayFontFamilyInput(props.fontFamily, commit("fontFamily"))),
    buildOverlayField("Taille (px)", createOverlayItemFieldInput("fontSize", { type: "number", min: 6, max: 400, step: 1 }, props.fontSize, (value) => commit("fontSize")(Math.max(6, value)))),
    buildOverlayField("Graisse", createOverlayItemFieldInput("fontWeight", { type: "dropdown", options: OVERLAY_TEXT_FONT_WEIGHTS }, String(props.fontWeight), (value) => commit("fontWeight")(Number(value)))),
    buildOverlayField("Interlettrage (px)", createOverlayItemFieldInput("letterSpacing", { type: "number", min: -20, max: 100, step: 0.5 }, props.letterSpacing, commit("letterSpacing"))),
    buildOverlayField("Hauteur de ligne", createOverlayItemFieldInput("lineHeight", { type: "number", min: 0.5, max: 4, step: 0.1 }, props.lineHeight, commit("lineHeight"))),
    buildOverlayField("Alignement", createOverlayItemFieldInput("align", { type: "dropdown", options: OVERLAY_TEXT_ALIGNS }, props.align, commit("align")))
  );
  fragment.append(typo.details);

  const colorGroup = buildOverlayFieldGroup("Couleur", groupOpen("Couleur"), onGroupToggle("Couleur"));
  colorGroup.body.append(
    buildOverlayField("Type", createOverlayItemFieldInput("colorMode", { type: "dropdown", options: OVERLAY_TEXT_COLOR_MODES }, props.colorMode, commit("colorMode")))
  );
  if (props.colorMode === "gradient") {
    colorGroup.body.append(
      buildOverlayField("Couleur 1", createOverlayItemFieldInput("gradientFrom", { type: "colorpicker" }, props.gradientFrom, commit("gradientFrom"))),
      buildOverlayField("Couleur 2", createOverlayItemFieldInput("gradientTo", { type: "colorpicker" }, props.gradientTo, commit("gradientTo"))),
      buildOverlayField("Angle (°)", createOverlayItemFieldInput("gradientAngle", { type: "number", min: 0, max: 360, step: 1 }, props.gradientAngle, commit("gradientAngle")))
    );
  } else {
    colorGroup.body.append(
      buildOverlayField("Couleur", createOverlayItemFieldInput("color", { type: "colorpicker" }, props.color, commit("color")))
    );
  }
  fragment.append(colorGroup.details);

  const shadowGroup = buildOverlayFieldGroup("Ombre", groupOpen("Ombre"), onGroupToggle("Ombre"));
  shadowGroup.body.append(buildOverlayCheckboxField("Activer l'ombre", props.shadowEnabled, commit("shadowEnabled")));
  if (props.shadowEnabled) {
    shadowGroup.body.append(
      buildOverlayField("Couleur", createOverlayItemFieldInput("shadowColor", { type: "colorpicker" }, props.shadowColor, commit("shadowColor"))),
      buildOverlayField("Flou (px)", createOverlayItemFieldInput("shadowBlur", { type: "number", min: 0, max: 100, step: 1 }, props.shadowBlur, commit("shadowBlur"))),
      buildOverlayField("Décalage X (px)", createOverlayItemFieldInput("shadowOffsetX", { type: "number", min: -100, max: 100, step: 1 }, props.shadowOffsetX, commit("shadowOffsetX"))),
      buildOverlayField("Décalage Y (px)", createOverlayItemFieldInput("shadowOffsetY", { type: "number", min: -100, max: 100, step: 1 }, props.shadowOffsetY, commit("shadowOffsetY")))
    );
  }
  fragment.append(shadowGroup.details);

  const strokeGroup = buildOverlayFieldGroup("Contour", groupOpen("Contour"), onGroupToggle("Contour"));
  strokeGroup.body.append(buildOverlayCheckboxField("Activer le contour", props.strokeEnabled, commit("strokeEnabled")));
  if (props.strokeEnabled) {
    strokeGroup.body.append(
      buildOverlayField("Couleur", createOverlayItemFieldInput("strokeColor", { type: "colorpicker" }, props.strokeColor, commit("strokeColor"))),
      buildOverlayField("Épaisseur (px)", createOverlayItemFieldInput("strokeWidth", { type: "number", min: 0, max: 20, step: 0.5 }, props.strokeWidth, commit("strokeWidth")))
    );
  }
  fragment.append(strokeGroup.details);

  return fragment;
}

async function renderOverlayItemSettings() {
  const item = overlaySettingsItemId ? findOverlayItem(overlaySettingsItemId) : null;
  if (!item || !["widget", "alert", "text"].includes(item.type)) {
    elements.overlayItemSettingsPanel.hidden = true;
    return;
  }

  elements.overlayItemSettingsPanel.hidden = false;
  elements.overlayItemSettingsFields.replaceChildren();
  elements.overlayItemSettingsFields.append(buildOverlayItemPositionFields(item));

  if (item.type === "text") {
    // Pas de bundle à charger (contrairement à widget/alert) : synchrone,
    // donc on peut se permettre de tout redessiner à chaque champ modifié
    // (cf. commitOverlayTextProp) pour garder les groupes conditionnels
    // (dégradé/ombre/contour) toujours en phase avec leurs cases à cocher.
    elements.overlayItemSettingsTitle.textContent = "Texte";
    elements.overlayItemSettingsFields.append(buildOverlayTextSettingsFields(item));
    return;
  }

  const bundle = await loadOverlayItemBundle(item.widgetId);
  elements.overlayItemSettingsTitle.textContent = bundle?.widgetMeta?.name || item.widgetId;

  if (!bundle) {
    elements.overlayItemSettingsFields.append(buildLibraryEmptyState("Widget introuvable."));
    return;
  }

  const fieldData = resolveOverlayItemFieldData(bundle, item);
  const groups = new Map();
  const getContainer = (definition) => {
    if (!definition.group) return elements.overlayItemSettingsFields;
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
    elements.overlayItemSettingsFields.append(details);
    groups.set(definition.group, body);
    return body;
  };

  for (const [key, definition] of Object.entries(bundle.fields)) {
    if (definition.type === "hidden") continue;
    const container = getContainer(definition);

    if (definition.type === "button") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button--quiet button--wide";
      button.textContent = definition.value || definition.label || key;
      button.addEventListener("click", () => dispatchToOverlayItemFrame(item.id, "onEventReceived", {
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
      input.addEventListener("change", () => commitOverlayItemField(item.id, key, input.checked));
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
    const input = createOverlayItemFieldInput(key, definition, fieldData[key], (value) => commitOverlayItemField(item.id, key, value));

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

function applyOverlayTextStyle(el, props) {
  el.style.fontFamily = props.fontFamily;
  el.style.fontSize = `${props.fontSize}px`;
  el.style.fontWeight = String(props.fontWeight);
  el.style.textAlign = props.align;
  el.style.letterSpacing = `${props.letterSpacing ?? 0}px`;
  el.style.lineHeight = String(props.lineHeight ?? 1.2);

  // Dégradé : peint le texte via background-clip au lieu de color (aucune
  // propriété CSS native "gradient de texte" n'existe) — d'où le besoin de
  // repasser color à transparent et de nettoyer le fond quand on revient en
  // couleur unie, sinon l'ancien dégradé resterait visible sous le texte.
  if (props.colorMode === "gradient") {
    el.style.color = "transparent";
    el.style.backgroundImage = `linear-gradient(${props.gradientAngle ?? 90}deg, ${props.gradientFrom}, ${props.gradientTo})`;
    el.style.backgroundClip = "text";
    el.style.webkitBackgroundClip = "text";
  } else {
    el.style.color = props.color;
    el.style.backgroundImage = "none";
    el.style.backgroundClip = "";
    el.style.webkitBackgroundClip = "";
  }

  el.style.textShadow = props.shadowEnabled
    ? `${props.shadowOffsetX ?? 0}px ${props.shadowOffsetY ?? 4}px ${Math.max(0, props.shadowBlur ?? 8)}px ${props.shadowColor}`
    : "none";
  el.style.webkitTextStroke = props.strokeEnabled ? `${props.strokeWidth}px ${props.strokeColor}` : "";
}

function buildTextItemContent(item, el) {
  const text = document.createElement("div");
  text.className = "overlay-item__text";
  text.contentEditable = "false";
  text.textContent = item.props.content;
  applyOverlayTextStyle(text, item.props);
  text.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    enterOverlayTextEdit(item.id, el, text);
  });
  el.append(text);
}

function enterOverlayTextEdit(itemId, el, textEl) {
  el.classList.add("is-editing");
  textEl.contentEditable = "true";
  textEl.focus();
  const range = document.createRange();
  range.selectNodeContents(textEl);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  const commit = () => {
    textEl.contentEditable = "false";
    el.classList.remove("is-editing");
    const target = findOverlayItem(itemId);
    if (target) {
      target.props.content = textEl.textContent.slice(0, 500) || "Texte";
      pushOverlayHistory();
      scheduleOverlayPersist();
    }
    textEl.removeEventListener("blur", commit);
  };
  textEl.addEventListener("blur", commit);
}

function buildImageItemContent(item, el) {
  const img = document.createElement("img");
  img.className = "overlay-item__image";
  img.src = item.props.src;
  img.style.objectFit = item.props.fit;
  img.alt = "";
  el.append(img);
}

function buildImageInspector(item, el) {
  const wrap = document.createElement("span");
  wrap.className = "overlay-item__image-inspector";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "text-button";
  editButton.textContent = "URL";
  editButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  editButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const target = findOverlayItem(item.id);
    if (!target) return;
    const nextUrl = window.prompt("URL de l'image", target.props.src);
    if (!nextUrl) return;
    target.props.src = nextUrl;
    const img = el.querySelector(".overlay-item__image");
    if (img) img.src = nextUrl;
    pushOverlayHistory();
    scheduleOverlayPersist();
  });
  wrap.append(editButton);
  return wrap;
}

function buildVideoItemContent(item, el) {
  const video = document.createElement("video");
  video.className = "overlay-item__video";
  video.src = item.props.src;
  video.style.objectFit = item.props.fit;
  video.autoplay = true;
  video.loop = item.props.loop !== false;
  video.muted = item.props.muted !== false;
  video.playsInline = true;
  el.append(video);
}

function buildVideoInspector(item, el) {
  const wrap = document.createElement("span");
  wrap.className = "overlay-item__image-inspector";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "text-button";
  editButton.textContent = "URL";
  editButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  editButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const target = findOverlayItem(item.id);
    if (!target) return;
    const nextUrl = window.prompt("URL de la vidéo", target.props.src);
    if (!nextUrl) return;
    target.props.src = nextUrl;
    const video = el.querySelector(".overlay-item__video");
    if (video) video.src = nextUrl;
    pushOverlayHistory();
    scheduleOverlayPersist();
  });
  wrap.append(editButton);
  return wrap;
}

function buildEmbedItemContent(item, el) {
  const frame = document.createElement("iframe");
  frame.className = "overlay-item__embed";
  frame.src = item.props.src;
  frame.title = "Contenu intégré";
  // Autorise les intégrations courantes (lecteurs vidéo, widgets tiers…) sans
  // laisser la page distante naviguer la fenêtre parente (pas de
  // allow-top-navigation) : même logique de moindre privilège que le sandbox
  // des iframes de widgets, adaptée à une URL externe arbitraire.
  frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-forms allow-presentation");
  el.append(frame);
}

function buildEmbedInspector(item, el) {
  const wrap = document.createElement("span");
  wrap.className = "overlay-item__image-inspector";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "text-button";
  editButton.textContent = "URL";
  editButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  editButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const target = findOverlayItem(item.id);
    if (!target) return;
    const nextUrl = window.prompt("URL du contenu à intégrer", target.props.src);
    if (!nextUrl) return;
    target.props.src = nextUrl;
    const frame = el.querySelector(".overlay-item__embed");
    if (frame) frame.src = nextUrl;
    pushOverlayHistory();
    scheduleOverlayPersist();
  });
  wrap.append(editButton);
  return wrap;
}

function buildIconItemContent(item, el) {
  const glyph = document.createElement("span");
  glyph.className = "material-symbols-rounded overlay-item__icon-glyph";
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = item.props.name;
  glyph.style.color = item.props.color;
  el.append(glyph);
}

function buildIconInspector(item, el) {
  const wrap = document.createElement("span");
  wrap.className = "overlay-item__icon-inspector";
  const select = document.createElement("select");
  for (const [iconName, iconLabel] of widgetIconChoices) {
    const option = document.createElement("option");
    option.value = iconName;
    option.textContent = iconLabel;
    option.selected = iconName === item.props.name;
    select.append(option);
  }
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = item.props.color;

  const commit = () => {
    const target = findOverlayItem(item.id);
    if (!target) return;
    target.props.name = select.value;
    target.props.color = colorInput.value;
    const glyph = el.querySelector(".overlay-item__icon-glyph");
    if (glyph) {
      glyph.textContent = target.props.name;
      glyph.style.color = target.props.color;
    }
    pushOverlayHistory();
    scheduleOverlayPersist();
  };
  select.addEventListener("change", commit);
  colorInput.addEventListener("change", commit);
  for (const input of [select, colorInput]) input.addEventListener("pointerdown", (event) => event.stopPropagation());
  wrap.append(select, colorInput);
  return wrap;
}

function applyOverlayShapeStyle(el, props) {
  el.style.background = props.fill;
  el.style.border = props.strokeWidth > 0 ? `${props.strokeWidth}px solid ${props.stroke}` : "none";
  el.style.borderRadius = props.shape === "ellipse" ? "50%" : `${props.radius}px`;
}

function buildShapeItemContent(item, el) {
  const shape = document.createElement("div");
  shape.className = "overlay-item__shape";
  applyOverlayShapeStyle(shape, item.props);
  el.append(shape);
}

function buildShapeInspector(item, el) {
  const wrap = document.createElement("span");
  wrap.className = "overlay-item__shape-inspector";
  const select = document.createElement("select");
  for (const [value, optionLabel] of [["rectangle", "Rectangle"], ["ellipse", "Ellipse"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = optionLabel;
    option.selected = value === item.props.shape;
    select.append(option);
  }
  const fillInput = document.createElement("input");
  fillInput.type = "color";
  fillInput.value = item.props.fill;

  const commit = () => {
    const target = findOverlayItem(item.id);
    if (!target) return;
    target.props.shape = select.value;
    target.props.fill = fillInput.value;
    const shapeEl = el.querySelector(".overlay-item__shape");
    if (shapeEl) applyOverlayShapeStyle(shapeEl, target.props);
    pushOverlayHistory();
    scheduleOverlayPersist();
  };
  select.addEventListener("change", commit);
  fillInput.addEventListener("change", commit);
  for (const input of [select, fillInput]) input.addEventListener("pointerdown", (event) => event.stopPropagation());
  wrap.append(select, fillInput);
  return wrap;
}

function buildGroupItemContent(item, el) {
  const frame = document.createElement("div");
  frame.className = "overlay-item__group-frame";
  el.append(frame);
}

async function loadOverlayItemBundle(widgetId) {
  if (overlayItemBundleCache.has(widgetId)) return overlayItemBundleCache.get(widgetId);
  try {
    const response = await fetch(`/api/widget?id=${encodeURIComponent(widgetId)}&platform=streamelements`);
    if (!response.ok) throw new Error();
    const bundle = await response.json();
    bundle.fields = normalizeFieldDefinitions(bundle.fields);
    overlayItemBundleCache.set(widgetId, bundle);
    return bundle;
  } catch {
    overlayItemBundleCache.set(widgetId, null);
    return null;
  }
}

function applyOverlayItemStyle(el, item) {
  el.style.left = `${item.x}px`;
  el.style.top = `${item.y}px`;
  el.style.width = `${item.w}px`;
  el.style.height = `${item.h}px`;
  el.style.zIndex = String(item.z);
  if (item.type === "icon") {
    const glyph = el.querySelector(".overlay-item__icon-glyph");
    if (glyph) glyph.style.fontSize = `${Math.min(item.w, item.h) * 0.7}px`;
  }
}

// --- Overlays : historique annuler/rétablir ---

function resetOverlayHistory() {
  if (!activeOverlay) return;
  overlayHistory = [structuredClone(activeOverlay.items)];
  overlayHistoryIndex = 0;
  updateOverlayHistoryButtons();
}

function pushOverlayHistory() {
  if (!activeOverlay) return;
  overlayHistory = overlayHistory.slice(0, overlayHistoryIndex + 1);
  overlayHistory.push(structuredClone(activeOverlay.items));
  if (overlayHistory.length > 100) overlayHistory.shift();
  overlayHistoryIndex = overlayHistory.length - 1;
  updateOverlayHistoryButtons();
}

function undoOverlay() {
  if (!activeOverlay || overlayHistoryIndex <= 0) return;
  overlayHistoryIndex--;
  applyOverlayHistoryState();
}

function redoOverlay() {
  if (!activeOverlay || overlayHistoryIndex >= overlayHistory.length - 1) return;
  overlayHistoryIndex++;
  applyOverlayHistoryState();
}

function applyOverlayHistoryState() {
  activeOverlay.items = structuredClone(overlayHistory[overlayHistoryIndex]);
  const ids = new Set(activeOverlay.items.map((item) => item.id));
  selectedOverlayItemIds = new Set([...selectedOverlayItemIds].filter((id) => ids.has(id)));
  renderOverlayCanvas();
  updateOverlayHistoryButtons();
  scheduleOverlayPersist();
}

function updateOverlayHistoryButtons() {
  elements.overlayUndoButton.disabled = overlayHistoryIndex <= 0;
  elements.overlayRedoButton.disabled = overlayHistoryIndex >= overlayHistory.length - 1;
}

// --- Overlays : panneau de calques ---

function renderOverlayLayers() {
  if (!activeOverlay) return;
  elements.overlayLayersList.replaceChildren();
  if (!activeOverlay.items.length) {
    elements.overlayLayersList.append(buildLibraryEmptyState("Aucun élément."));
    return;
  }
  // Un calque qui appartient à un groupe n'apparaît plus au premier niveau :
  // il est rendu imbriqué sous ce groupe par appendOverlayGroupNode, jamais
  // aux deux endroits à la fois (comme un dossier Photoshop).
  const nestedIds = new Set(
    activeOverlay.items.filter((entry) => entry.type === "group").flatMap((group) => group.props.children)
  );
  const topLevel = activeOverlay.items.filter((entry) => !nestedIds.has(entry.id)).sort((a, b) => b.z - a.z);
  for (const item of topLevel) {
    if (item.type === "group") appendOverlayGroupNode(item);
    else appendOverlayLayerRow(elements.overlayLayersList, item);
  }
}

function appendOverlayLayerRow(list, item) {
  list.append(buildOverlayLayerRow(item));
  // Le panneau de réglages est un unique élément DOM partagé (jamais
  // recréé, cf. renderOverlayItemSettings) : on le rattache ici, juste
  // après le calque qu'il concerne, plutôt qu'en pied de liste — replaceChildren()
  // dans renderOverlayLayers l'en a détaché au passage précédent, donc rien
  // ne le duplique.
  if (item.id === overlaySettingsItemId) list.append(elements.overlayItemSettingsPanel);
}

// Un seul niveau d'imbrication est rendu (un groupe ne peut pas se déplier
// lui-même s'il contient un autre groupe) : suffisant pour l'usage courant
// et évite un panneau récursif à profondeur arbitraire pour un cas limite
// que l'éditeur ne met pas en avant (createOverlayGroup n'empêche pas
// techniquement de grouper un groupe, mais rien ne l'encourage non plus).
function appendOverlayGroupNode(group) {
  const wrapper = document.createElement("div");
  wrapper.className = "overlay-layers__group";
  const headerRow = buildOverlayLayerRow(group, wrapper, true);
  wrapper.append(headerRow);
  if (group.id === overlaySettingsItemId) wrapper.append(elements.overlayItemSettingsPanel);

  const childrenList = document.createElement("div");
  childrenList.className = "overlay-layers__group-children";
  childrenList.hidden = Boolean(group.collapsed);
  const children = group.props.children.map(findOverlayItem).filter(Boolean).sort((a, b) => b.z - a.z);
  for (const child of children) appendOverlayLayerRow(childrenList, child);
  wrapper.append(childrenList);

  elements.overlayLayersList.append(wrapper);
}

function overlayLayerIcon(item) {
  switch (item.type) {
    case "alert": return "campaign";
    case "text": return "title";
    case "image": return "image";
    case "video": return "videocam";
    case "embed": return "link";
    case "icon": return "star";
    case "shape": return "category";
    case "group": return "select_all";
    default: return widgetCatalog.find((entry) => entry.id === item.widgetId)?.icon || "widgets";
  }
}

function overlayLayerLabel(item) {
  // Un calque renommé (double-clic sur son libellé, cf. startOverlayLayerRename)
  // garde ce nom tant qu'il n'est pas explicitement vidé — sinon retombe sur
  // le libellé calculé habituel ci-dessous.
  if (item.name) return item.name;
  switch (item.type) {
    case "text": return item.props.content || "Texte";
    case "image": return "Image";
    case "video": return "Vidéo";
    case "embed": return "Lien";
    case "icon": return `Icône (${item.props.name})`;
    case "shape": return item.props.shape === "ellipse" ? "Forme (ellipse)" : "Forme (rectangle)";
    case "group": return `Groupe (${item.props.children.length})`;
    default: return widgetCatalog.find((entry) => entry.id === item.widgetId)?.name || item.widgetId;
  }
}

// dragUnit : nœud effectivement déplacé lors d'un glisser (par défaut la
// ligne elle-même ; pour l'en-tête d'un groupe c'est son wrapper
// .overlay-layers__group tout entier, header + enfants, cf. appendOverlayGroupNode).
// expandable : true seulement pour l'en-tête d'un groupe rendu au premier
// niveau — un groupe imbriqué dans un autre (cas limite non exposé par
// l'UI) n'affiche pas son propre chevron, faute de conteneur d'enfants à déplier.
function buildOverlayLayerRow(item, dragUnit, expandable = false) {
  const row = document.createElement("div");
  row.className = [
    "overlay-layers__item",
    selectedOverlayItemIds.has(item.id) ? "is-active" : "",
    item.hidden ? "is-hidden" : "",
    item.locked ? "is-locked" : ""
  ].filter(Boolean).join(" ");
  row.dataset.itemId = item.id;
  const unit = dragUnit || row;

  const visibilityButton = document.createElement("button");
  visibilityButton.type = "button";
  visibilityButton.className = "icon-button";
  visibilityButton.setAttribute("aria-label", item.hidden ? "Afficher" : "Masquer");
  visibilityButton.title = item.hidden ? "Afficher" : "Masquer";
  visibilityButton.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${item.hidden ? "visibility_off" : "visibility"}</span>`;
  visibilityButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleOverlayItemVisibility(item.id);
  });

  let disclosure = null;
  if (item.type === "group" && expandable) {
    disclosure = document.createElement("button");
    disclosure.type = "button";
    disclosure.className = `icon-button overlay-layers__disclosure${item.collapsed ? "" : " is-open"}`;
    disclosure.setAttribute("aria-label", item.collapsed ? "Déplier le groupe" : "Replier le groupe");
    disclosure.title = item.collapsed ? "Déplier le groupe" : "Replier le groupe";
    disclosure.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">chevron_right</span>';
    disclosure.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleOverlayGroupCollapsed(item.id);
    });
  }

  const icon = document.createElement("span");
  icon.className = "material-symbols-rounded";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = overlayLayerIcon(item);

  const label = document.createElement("span");
  label.className = "overlay-layers__label";
  label.textContent = overlayLayerLabel(item);
  label.title = "Double-cliquer pour renommer";

  const lockButton = document.createElement("button");
  lockButton.type = "button";
  lockButton.className = `icon-button${item.locked ? " overlay-layers__lock--active" : ""}`;
  lockButton.setAttribute("aria-label", item.locked ? "Déverrouiller" : "Verrouiller");
  lockButton.title = item.locked ? "Déverrouiller (position et taille)" : "Verrouiller (position et taille)";
  lockButton.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${item.locked ? "lock" : "lock_open"}</span>`;
  lockButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleOverlayItemLocked(item.id);
  });

  let settingsButton = null;
  if (item.type === "widget" || item.type === "alert" || item.type === "text") {
    settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.className = "icon-button";
    settingsButton.setAttribute("aria-label", "Réglages");
    settingsButton.title = "Réglages";
    settingsButton.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">tune</span>';
    settingsButton.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedOverlayItemIds = new Set([item.id]);
      overlaySettingsItemId = item.id;
      updateOverlaySelectionUI();
    });
  }

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button";
  deleteButton.setAttribute("aria-label", "Supprimer");
  deleteButton.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">delete</span>';
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    removeOverlayItem(item.id);
  });

  row.append(
    visibilityButton,
    ...(disclosure ? [disclosure] : []),
    icon,
    label,
    lockButton,
    ...(settingsButton ? [settingsButton] : []),
    deleteButton
  );
  row.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    if (event.shiftKey) {
      toggleOverlaySelection(item.id);
      return;
    }
    // Détection manuelle du double-clic plutôt qu'un écouteur natif
    // "dblclick" sur le libellé : le premier clic ci-dessous appelle déjà
    // updateOverlaySelectionUI(), qui reconstruit toute la ligne (donc aussi
    // .overlay-layers__label) via renderOverlayLayers() — le navigateur ne
    // reconnaît alors plus le second clic comme portant sur le même élément
    // et ne déclenche jamais "dblclick".
    const now = Date.now();
    const isDoubleClick = overlayLastLayerClick.itemId === item.id && now - overlayLastLayerClick.time < 400;
    overlayLastLayerClick = isDoubleClick ? { itemId: null, time: 0 } : { itemId: item.id, time: now };
    if (isDoubleClick) {
      startOverlayLayerRename(item, row, row.querySelector(":scope > .overlay-layers__label"));
      return;
    }
    selectedOverlayItemIds = new Set([item.id]);
    updateOverlaySelectionUI();
  });
  // Plus de poignée dédiée : toute la ligne sert de prise pour réordonner
  // (voir startOverlayLayerReorder, qui n'engage un vrai glisser qu'au-delà
  // d'un seuil de mouvement pour ne pas gêner le simple clic de sélection
  // ci-dessus).
  row.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    startOverlayLayerReorder(event, unit);
  });
  return row;
}

function isOverlayLayerUnit(el) {
  return el.classList.contains("overlay-layers__item") || el.classList.contains("overlay-layers__group");
}

// unit : le nœud à déplacer (une ligne simple, ou le wrapper d'un groupe —
// cf. buildOverlayLayerRow). Le glisser reste cantonné au conteneur parent
// de unit : la liste de premier niveau pour un item/groupe, ou la liste des
// enfants d'UN SEUL groupe pour un calque imbriqué — jamais les deux à la
// fois, pour ne pas faire sortir un calque de son groupe (ou l'inverse) par accident.
function startOverlayLayerReorder(event, unit) {
  const list = unit.parentElement;
  if (!list) return;
  const startX = event.clientX;
  const startY = event.clientY;
  let dragging = false;
  const DRAG_THRESHOLD_PX = 4;

  const onMove = (moveEvent) => {
    if (!dragging) {
      if (Math.abs(moveEvent.clientX - startX) < DRAG_THRESHOLD_PX && Math.abs(moveEvent.clientY - startY) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      unit.classList.add("is-dragging");
    }
    const siblings = [...list.children].filter((candidate) => candidate !== unit && isOverlayLayerUnit(candidate));
    const after = siblings.find((candidate) => moveEvent.clientY < candidate.getBoundingClientRect().top + candidate.offsetHeight / 2);
    list.insertBefore(unit, after || null);
  };
  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    if (!dragging) return;
    unit.classList.remove("is-dragging");
    commitOverlayLayerOrder();
  };
  // Écouté sur document, pas sur unit : list.insertBefore() ci-dessus déplace
  // unit dans le DOM à chaque déplacement, ce qui fait relâcher implicitement
  // la pointer capture par le navigateur (setPointerCapture ne survit pas à
  // un repositionnement du nœud capturé) — sans ça, pointerup n'atteint plus
  // jamais unit une fois le curseur passé sur une autre ligne, et le drag ne
  // se termine jamais (commitOverlayLayerOrder n'est jamais appelé).
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

// Un groupe garde toujours un z inférieur à celui de tous ses enfants (sa
// frame est de toute façon pointer-events:none et purement décorative, voir
// _overlay-canvas.scss) : on parcourt donc chaque enfant AVANT le groupe qui
// le contient, pour que le compteur descendant leur réserve les valeurs les
// plus hautes du bloc.
function commitOverlayLayerOrder() {
  if (!activeOverlay) return;
  let z = activeOverlay.items.length;
  const applyOrder = (list) => {
    const units = [...list.children].filter(isOverlayLayerUnit);
    for (const unit of units) {
      if (unit.classList.contains("overlay-layers__group")) {
        const childrenList = unit.querySelector(":scope > .overlay-layers__group-children");
        if (childrenList) applyOrder(childrenList);
        const headerRow = unit.querySelector(":scope > .overlay-layers__item");
        const group = headerRow ? findOverlayItem(headerRow.dataset.itemId) : null;
        if (group) group.z = z--;
      } else {
        const item = findOverlayItem(unit.dataset.itemId);
        if (item) item.z = z--;
      }
    }
  };
  applyOrder(elements.overlayLayersList);
  renderOverlayCanvas();
  pushOverlayHistory();
  scheduleOverlayPersist();
}

function toggleOverlayGroupCollapsed(itemId) {
  const item = findOverlayItem(itemId);
  if (!item || item.type !== "group") return;
  item.collapsed = !item.collapsed;
  renderOverlayLayers();
  scheduleOverlayPersist();
}

function toggleOverlayItemLocked(itemId) {
  const item = findOverlayItem(itemId);
  if (!item) return;
  item.locked = !item.locked;
  renderOverlayLayers();
  renderOverlayCanvas();
  pushOverlayHistory();
  scheduleOverlayPersist();
}

// Remplace le libellé d'un calque (item normal ou groupe) par un champ texte
// éditable en place — Entrée ou perte de focus valide, Échap annule sans
// rien persister.
function startOverlayLayerRename(item, row, label) {
  if (row.querySelector(".overlay-layers__rename-input")) return;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "overlay-layers__rename-input";
  input.maxLength = 200;
  input.value = overlayLayerLabel(item);
  label.replaceWith(input);
  input.focus();
  input.select();

  let settled = false;
  const finish = (commit) => {
    if (settled) return;
    settled = true;
    input.removeEventListener("blur", onBlur);
    input.removeEventListener("keydown", onKeydown);
    if (commit) renameOverlayItem(item.id, input.value.trim());
    else renderOverlayLayers();
  };
  const onBlur = () => finish(true);
  const onKeydown = (event) => {
    // Empêche le raccourci global Ctrl+Z (écouté sur document, cf. son garde
    // isContentEditable qui ne couvre pas un <input>) d'interrompre la
    // saisie ou l'annuler natif du champ pendant le renommage.
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  };
  input.addEventListener("blur", onBlur);
  input.addEventListener("keydown", onKeydown);
  input.addEventListener("pointerdown", (event) => event.stopPropagation());
  input.addEventListener("click", (event) => event.stopPropagation());
}

function renameOverlayItem(itemId, name) {
  const item = findOverlayItem(itemId);
  if (!item) return;
  item.name = name;
  renderOverlayLayers();
  pushOverlayHistory();
  scheduleOverlayPersist();
}

function openOverlayItemPicker() {
  elements.overlayItemPickerList.replaceChildren();
  if (!widgetCatalog.length) {
    elements.overlayItemPickerList.append(buildLibraryEmptyState("Aucun widget ni alerte disponible."));
  } else {
    for (const entry of widgetCatalog) {
      const row = document.createElement("div");
      row.className = "widget-library__row";

      const item = document.createElement("button");
      item.type = "button";
      item.className = "widget-library__item";
      const icon = document.createElement("span");
      icon.className = "widget-library__icon";
      icon.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${escapeHtml(entry.icon || "widgets")}</span>`;
      const copy = document.createElement("span");
      copy.className = "widget-library__copy";
      const name = document.createElement("strong");
      name.textContent = entry.name;
      const description = document.createElement("small");
      description.textContent = entry.type === "alert" ? "Alerte" : "Widget";
      copy.append(name, description);
      item.append(icon, copy);
      item.addEventListener("click", () => {
        addOverlayItem(entry);
        elements.overlayItemPickerDialog.close();
      });
      row.append(item);
      elements.overlayItemPickerList.append(row);
    }
  }
  elements.overlayItemPickerDialog.showModal();
}

function addOverlayItem(entry) {
  if (!activeOverlay) return;
  const nextZ = activeOverlay.items.reduce((max, item) => Math.max(max, item.z), 0) + 1;
  // Décale chaque nouvel item en cascade (comme des fenêtres qui s'empilent
  // en escalier) : sans ça, deux ajouts successifs atterrissent exactement
  // au même x/y/largeur/hauteur et se superposent totalement, rendant l'un
  // des deux invisible sur le canevas.
  const cascade = (activeOverlay.items.length % 8) * 32;
  // Point de départ décalé sous la barre d'outils flottante (positionnée par
  // défaut en haut à gauche du canevas) : sans ce décalage vertical, le tout
  // premier widget ajouté atterrit exactement sous elle et devient difficile
  // à sélectionner/glisser tant qu'on n'a pas déplacé la barre.
  const item = {
    id: generateOverlayItemId(),
    widgetId: entry.id,
    type: entry.type === "alert" ? "alert" : "widget",
    x: 40 + cascade,
    y: 220 + cascade,
    w: entry.width || DEFAULT_WIDGET_SIZE.width,
    h: entry.height || DEFAULT_WIDGET_SIZE.height,
    z: nextZ,
    props: {}
  };
  activeOverlay.items = [...activeOverlay.items, item];
  renderOverlayCanvas();
  pushOverlayHistory();
  scheduleOverlayPersist();
}

// Supprimer un groupe ne supprime jamais ses enfants en cascade : ils
// redeviennent de simples items indépendants (équivaut à un "dégrouper"
// implicite, pas de commande dédiée nécessaire pour ça).
function removeOverlayItem(itemId) {
  if (!activeOverlay) return;
  activeOverlay.items = activeOverlay.items.filter((item) => item.id !== itemId);
  selectedOverlayItemIds.delete(itemId);
  renderOverlayCanvas();
  pushOverlayHistory();
  scheduleOverlayPersist();
}

// Supprime toute la sélection en un seul geste (un historique/une
// persistance/un rendu), plutôt qu'un appel répété à removeOverlayItem qui
// re-rendrait le canevas une fois par item supprimé. Comme pour un item
// seul, un groupe sélectionné ne supprime jamais ses enfants en cascade.
function removeOverlaySelection() {
  if (!activeOverlay || !selectedOverlayItemIds.size) return;
  const idsToRemove = selectedOverlayItemIds;
  activeOverlay.items = activeOverlay.items.filter((item) => !idsToRemove.has(item.id));
  selectedOverlayItemIds = new Set();
  renderOverlayCanvas();
  updateOverlaySelectionUI();
  pushOverlayHistory();
  scheduleOverlayPersist();
}

function toggleOverlayItemVisibility(itemId) {
  const item = findOverlayItem(itemId);
  if (!item) return;
  item.hidden = !item.hidden;
  renderOverlayCanvas();
  pushOverlayHistory();
  scheduleOverlayPersist();
}

function scheduleOverlayPersist() {
  if (!activeOverlay) return;
  clearTimeout(overlayPersistTimer);
  const overlayId = activeOverlay.id;
  const items = activeOverlay.items;
  overlayPersistTimer = setTimeout(async () => {
    try {
      const response = await fetch("/api/overlay/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overlayId, items })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Erreur HTTP ${response.status}`);
      }
    } catch (error) {
      showToast(`Enregistrement de l’overlay impossible : ${error.message}`);
    }
  }, 400);
}

function scheduleGuidesPersist() {
  if (!activeOverlay) return;
  clearTimeout(overlayGuidesPersistTimer);
  const overlayId = activeOverlay.id;
  const guides = activeOverlay.guides;
  overlayGuidesPersistTimer = setTimeout(async () => {
    try {
      const response = await fetch("/api/overlay/guides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overlayId, guides })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Erreur HTTP ${response.status}`);
      }
    } catch (error) {
      showToast(`Enregistrement des repères impossible : ${error.message}`);
    }
  }, 400);
}

function startOverlayItemDrag(event, itemEl) {
  const item = findOverlayItem(itemEl.dataset.itemId);
  if (!item || item.locked) return;
  itemEl.setPointerCapture(event.pointerId);
  elements.overlayCanvas.classList.add("is-dragging");
  const scale = overlayCanvasScale();
  const startX = event.clientX;
  const startY = event.clientY;
  // Un groupe déplace aussi tous ses enfants du même delta ; un item normal
  // ne déplace que lui-même (tableau à un seul id).
  const movingIds = item.type === "group" ? [item.id, ...item.props.children] : [item.id];
  const origins = new Map(movingIds.map((id) => [id, { ...findOverlayItem(id) }]));

  const onMove = (moveEvent) => {
    const dx = (moveEvent.clientX - startX) / scale;
    const dy = (moveEvent.clientY - startY) / scale;
    for (const id of movingIds) {
      const target = findOverlayItem(id);
      const origin = origins.get(id);
      if (!target || !origin) continue;
      let nextX = Math.round(origin.x + dx);
      let nextY = Math.round(origin.y + dy);
      // Accroche uniquement pour un item seul (pas un groupe) : sur un
      // déplacement de groupe, chaque enfant devrait s'accrocher
      // indépendamment, ce qui casserait le delta commun voulu ici.
      if (movingIds.length === 1) {
        nextX = snapMovePosition(nextX, target.w, activeOverlay.guides?.vertical, scale);
        nextY = snapMovePosition(nextY, target.h, activeOverlay.guides?.horizontal, scale);
      }
      target.x = nextX;
      target.y = nextY;
      const el = elements.overlayCanvas.querySelector(`[data-item-id="${id}"]`);
      if (el) applyOverlayItemStyle(el, target);
    }
  };
  const onUp = () => {
    itemEl.releasePointerCapture(event.pointerId);
    itemEl.removeEventListener("pointermove", onMove);
    itemEl.removeEventListener("pointerup", onUp);
    elements.overlayCanvas.classList.remove("is-dragging");
    pushOverlayHistory();
    scheduleOverlayPersist();
  };
  itemEl.addEventListener("pointermove", onMove);
  itemEl.addEventListener("pointerup", onUp);
}

function startOverlayItemResize(event, itemEl, handlePosition) {
  event.stopPropagation();
  const item = findOverlayItem(itemEl.dataset.itemId);
  if (!item || item.locked) return;
  itemEl.setPointerCapture(event.pointerId);
  elements.overlayCanvas.classList.add("is-dragging");
  const scale = overlayCanvasScale();
  const startX = event.clientX;
  const startY = event.clientY;
  const origin = { x: item.x, y: item.y, w: item.w, h: item.h };

  const onMove = (moveEvent) => {
    const dx = (moveEvent.clientX - startX) / scale;
    const dy = (moveEvent.clientY - startY) / scale;
    const vGuides = activeOverlay.guides?.vertical;
    const hGuides = activeOverlay.guides?.horizontal;

    if (handlePosition.includes("e")) {
      const rightEdge = snapEdge(origin.x + origin.w + dx, vGuides, scale);
      item.w = Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(rightEdge - origin.x));
    }
    if (handlePosition.includes("s")) {
      const bottomEdge = snapEdge(origin.y + origin.h + dy, hGuides, scale);
      item.h = Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(bottomEdge - origin.y));
    }
    if (handlePosition.includes("w")) {
      const leftEdge = snapEdge(origin.x + dx, vGuides, scale);
      item.w = Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(origin.x + origin.w - leftEdge));
      item.x = Math.round(origin.x + origin.w - item.w);
    }
    if (handlePosition.includes("n")) {
      const topEdge = snapEdge(origin.y + dy, hGuides, scale);
      item.h = Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(origin.y + origin.h - topEdge));
      item.y = Math.round(origin.y + origin.h - item.h);
    }
    applyOverlayItemStyle(itemEl, item);
  };
  const onUp = () => {
    itemEl.releasePointerCapture(event.pointerId);
    itemEl.removeEventListener("pointermove", onMove);
    itemEl.removeEventListener("pointerup", onUp);
    elements.overlayCanvas.classList.remove("is-dragging");
    pushOverlayHistory();
    scheduleOverlayPersist();
  };
  itemEl.addEventListener("pointermove", onMove);
  itemEl.addEventListener("pointerup", onUp);
}

// Redimensionnement proportionnel d'un groupe : capture la position/taille
// d'origine du groupe ET de chaque enfant au pointerdown, puis à chaque
// pointermove calcule un facteur d'échelle scaleX/scaleY à partir du delta
// de la poignée et le réapplique à chaque enfant relativement au coin fixe
// (transformation classique à origine fixe, comme un redimensionnement
// proportionnel dans un éditeur graphique).
function startOverlayGroupResize(event, itemEl, handlePosition) {
  event.stopPropagation();
  const group = findOverlayItem(itemEl.dataset.itemId);
  if (!group || group.locked) return;
  itemEl.setPointerCapture(event.pointerId);
  elements.overlayCanvas.classList.add("is-dragging");
  const scale = overlayCanvasScale();
  const startX = event.clientX;
  const startY = event.clientY;
  const groupOrigin = { ...group };
  const childOrigins = new Map(group.props.children.map((id) => [id, { ...findOverlayItem(id) }]));

  const onMove = (moveEvent) => {
    const dx = (moveEvent.clientX - startX) / scale;
    const dy = (moveEvent.clientY - startY) / scale;
    let { x, y, w, h } = groupOrigin;
    if (handlePosition.includes("e")) w = Math.max(MIN_OVERLAY_ITEM_SIZE, groupOrigin.w + dx);
    if (handlePosition.includes("s")) h = Math.max(MIN_OVERLAY_ITEM_SIZE, groupOrigin.h + dy);
    if (handlePosition.includes("w")) {
      w = Math.max(MIN_OVERLAY_ITEM_SIZE, groupOrigin.w - dx);
      x = groupOrigin.x + groupOrigin.w - w;
    }
    if (handlePosition.includes("n")) {
      h = Math.max(MIN_OVERLAY_ITEM_SIZE, groupOrigin.h - dy);
      y = groupOrigin.y + groupOrigin.h - h;
    }
    const scaleX = w / groupOrigin.w;
    const scaleY = h / groupOrigin.h;

    Object.assign(group, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
    applyOverlayItemStyle(itemEl, group);

    for (const [id, childOrigin] of childOrigins) {
      const child = findOverlayItem(id);
      if (!child) continue;
      child.x = Math.round(x + (childOrigin.x - groupOrigin.x) * scaleX);
      child.y = Math.round(y + (childOrigin.y - groupOrigin.y) * scaleY);
      child.w = Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(childOrigin.w * scaleX));
      child.h = Math.max(MIN_OVERLAY_ITEM_SIZE, Math.round(childOrigin.h * scaleY));
      const childEl = elements.overlayCanvas.querySelector(`[data-item-id="${id}"]`);
      if (childEl) applyOverlayItemStyle(childEl, child);
    }
  };
  const onUp = () => {
    itemEl.releasePointerCapture(event.pointerId);
    itemEl.removeEventListener("pointermove", onMove);
    itemEl.removeEventListener("pointerup", onUp);
    elements.overlayCanvas.classList.remove("is-dragging");
    pushOverlayHistory();
    scheduleOverlayPersist();
  };
  itemEl.addEventListener("pointermove", onMove);
  itemEl.addEventListener("pointerup", onUp);
}

async function initialize() {
  elements.footerYear.textContent = String(new Date().getFullYear());
  try {
    const [catalogResponse, stateResponse, overlaysResponse] = await Promise.all([
      fetch("/api/widgets"),
      fetch("/api/state"),
      fetch("/api/overlays")
    ]);
    if (!catalogResponse.ok) throw new Error((await catalogResponse.json()).error);
    const catalog = await catalogResponse.json();
    widgetCatalog = catalog.widgets || [];
    if (overlaysResponse.ok) {
      overlayCatalog = (await overlaysResponse.json()).overlays || [];
      renderOverlayLibrary();
    }
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
    applyWidgetDefaultPreviewSize(widget);
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
    const requestedOverlayId = new URLSearchParams(window.location.search).get("overlay");
    if (overlayCatalog.some(entry => entry.id === requestedOverlayId)) await openOverlayEditor(requestedOverlayId);
    else if (openDirectly) hideDashboard();
    else showDashboard();
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
  const { pageEntries: widgetPageEntries, pageCount: widgetPageCount } = paginateDashboardEntries("widget", filterAndSortLibraryEntries(widgets, "widget"));
  populateWidgetLibraryList(elements.dashboardWidgetList, widgetPageEntries, dashboardLibraryEmptyMessage("Aucun widget pour l’instant."), { showMeta: true });
  renderDashboardPagination(elements.dashboardWidgetPagination, "widget", widgetPageCount);

  elements.alertCount.textContent = String(alerts.length);
  populateWidgetLibraryList(elements.alertList, alerts, "Aucune alerte pour l’instant.");
  const { pageEntries: alertPageEntries, pageCount: alertPageCount } = paginateDashboardEntries("alert", filterAndSortLibraryEntries(alerts, "alert"));
  populateWidgetLibraryList(elements.dashboardAlertList, alertPageEntries, dashboardLibraryEmptyMessage("Aucune alerte pour l’instant."), { showMeta: true });
  renderDashboardPagination(elements.dashboardAlertPagination, "alert", alertPageCount);

  updateDashboardLibrarySuggestions();
}

function dashboardLibraryEmptyMessage(defaultMessage) {
  const term = librarySearchTerm.trim();
  return term ? `Aucun résultat pour « ${term} ».` : defaultMessage;
}

function filterLibraryEntriesBySearch(entries) {
  const term = librarySearchTerm.trim().toLowerCase();
  if (!term) return entries;
  return entries.filter((entry) =>
    entry.name.toLowerCase().includes(term) ||
    (entry.description || "").toLowerCase().includes(term));
}

function filterAndSortLibraryEntries(entries, scope) {
  const filtered = filterLibraryEntriesBySearch(entries);

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
  const names = [...new Set([...widgetCatalog, ...overlayCatalog].map((entry) => entry.name))].sort((a, b) => a.localeCompare(b, "fr"));
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

// Découpe `entries` à la page courante de `scope` (cf. DASHBOARD_PAGE_SIZE /
// dashboardPage) et recale cette page si elle est devenue hors bornes (ex :
// suppression d'un item, ou changement de recherche/tri qui réduit le total).
function paginateDashboardEntries(scope, entries) {
  const pageSize = DASHBOARD_PAGE_SIZE[scope];
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  dashboardPage[scope] = Math.min(Math.max(dashboardPage[scope], 0), pageCount - 1);
  const start = dashboardPage[scope] * pageSize;
  return { pageEntries: entries.slice(start, start + pageSize), pageCount };
}

function renderDashboardPagination(nav, scope, pageCount) {
  if (!nav) return;
  nav.hidden = pageCount <= 1;
  nav.querySelector('[data-role="label"]').textContent = `${dashboardPage[scope] + 1} / ${pageCount}`;
  nav.querySelector('[data-role="prev"]').disabled = dashboardPage[scope] <= 0;
  nav.querySelector('[data-role="next"]').disabled = dashboardPage[scope] >= pageCount - 1;
}

function initializeDashboardPagination() {
  const configs = [
    { nav: elements.dashboardOverlayPagination, scope: "overlay", render: renderOverlayLibrary },
    { nav: elements.dashboardWidgetPagination, scope: "widget", render: renderWidgetLibrary },
    { nav: elements.dashboardAlertPagination, scope: "alert", render: renderWidgetLibrary },
    { nav: elements.dashboardMediaPagination, scope: "media", render: () => void renderMediaLibrary(elements.dashboardMediaList) }
  ];
  for (const { nav, scope, render } of configs) {
    if (!nav) continue;
    nav.querySelector('[data-role="prev"]').addEventListener("click", () => {
      dashboardPage[scope] -= 1;
      render();
    });
    nav.querySelector('[data-role="next"]').addEventListener("click", () => {
      dashboardPage[scope] += 1;
      render();
    });
  }
}

function buildLibraryEmptyState(message) {
  const empty = document.createElement("p");
  empty.className = "widget-library__empty";
  empty.textContent = message;
  return empty;
}

// Ne scanne les overlays StreamElements (potentiellement lent : liste +
// détail de chacun, cf. /api/integrations/streamelements/media côté serveur)
// qu'à la toute première ouverture du panneau — jamais au chargement de la
// page pour un utilisateur qui ne l'ouvre jamais.
let mediaLibraryLoaded = false;

function initializeMediaLibrary() {
  if (!elements.mediaSection) return;
  elements.mediaSection.addEventListener("toggle", () => {
    if (elements.mediaSection.open && !mediaLibraryLoaded) {
      mediaLibraryLoaded = true;
      void renderMediaLibrary(elements.mediaLibraryList);
    }
  });
}

// Deux instances rendent dans des conteneurs distincts (le panneau replié de
// la sidebar, et le bloc toujours visible du dashboard) : mêmes appels
// réseau (le StreamElements est mis en cache côté serveur, cf.
// /api/integrations/streamelements/media), juste une cible différente à
// chaque fois. La bibliothèque locale (upload direct dans le Lab) est
// toujours affichée, StreamElements vient s'y ajouter quand disponible — en
// attendant de pouvoir aussi récupérer les médias Streamlabs (aucune API
// publique équivalente trouvée, cf. recherche précédente).
async function renderMediaLibrary(container) {
  if (!container) return;
  const uploadControl = buildMediaUploadControl(container);
  container.replaceChildren(uploadControl, buildLibraryEmptyState("Chargement…"));

  let localMedia = [];
  try {
    const response = await fetch("/api/media");
    if (response.ok) {
      const body = await response.json();
      localMedia = body.media.map((item) => ({ ...item, source: "local" }));
    }
  } catch {
    // Best-effort : une bibliothèque locale indisponible ne doit pas bloquer
    // l'affichage des médias StreamElements ci-dessous.
  }

  let remoteMedia = [];
  let connectPrompt = null;
  try {
    const response = await fetch("/api/integrations/streamelements/media");
    if (response.status === 401 || response.status === 404) {
      connectPrompt = buildMediaConnectPrompt("Connecte aussi StreamElements (OAuth2 ou jeton JWT/apikey, dans Mon compte) pour retrouver les images et vidéos déjà utilisées dans tes overlays.");
    } else if (response.ok) {
      const body = await response.json();
      remoteMedia = body.media.map((item) => ({ ...item, source: "streamelements" }));
    }
  } catch {
    // Idem : une erreur réseau côté StreamElements n'empêche pas d'afficher
    // la bibliothèque locale.
  }

  const allMedia = [...localMedia, ...remoteMedia];
  // Seul l'aperçu du dashboard est paginé (8/page) : le panneau complet de la
  // sidebar (élément dashboardMediaList vs mediaLibraryList) reste une seule
  // liste, cohérent avec le reste de la bibliothèque (Overlays/Widgets/
  // Alertes) qui suit la même distinction.
  const isDashboard = container === elements.dashboardMediaList;
  const { pageEntries, pageCount } = isDashboard
    ? paginateDashboardEntries("media", allMedia)
    : { pageEntries: allMedia, pageCount: 1 };

  const nodes = [uploadControl];
  if (connectPrompt) nodes.push(connectPrompt);
  if (pageEntries.length) nodes.push(...pageEntries.map((item) => buildMediaLibraryItem(item, container)));
  else if (!connectPrompt) nodes.push(buildLibraryEmptyState("Aucun média pour l’instant."));
  container.replaceChildren(...nodes);

  if (isDashboard) renderDashboardPagination(elements.dashboardMediaPagination, "media", pageCount);
}

// <label> pleine largeur (pas un simple <button>) : c'est ce qui permet de
// cliquer n'importe où dessus pour ouvrir le sélecteur de fichiers de
// l'<input type="file"> qu'il contient, sans JS dédié au clic — le glisser-
// déposer vient s'ajouter par-dessus via les événements drag*/drop.
function buildMediaUploadControl(container) {
  const zone = document.createElement("label");
  zone.className = "media-library__dropzone";
  const icon = document.createElement("span");
  icon.className = "material-symbols-rounded";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "upload";
  const text = document.createElement("span");
  text.className = "media-library__dropzone-text";
  text.textContent = "Glisser un média ici, ou cliquer pour parcourir";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = MEDIA_UPLOAD_ACCEPT;
  input.multiple = true;
  input.hidden = true;

  const importFiles = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    for (const file of files) await uploadLocalMedia(file);
    void renderMediaLibrary(container);
  };

  input.addEventListener("change", () => {
    // Snapshot en tableau AVANT de vider input.value : FileList est une vue
    // live sur l'input, la vider efface aussi les fichiers qu'on vient de
    // lire si on ne les a pas déjà copiés.
    const files = [...input.files];
    input.value = "";
    void importFiles(files);
  });

  // dragenter/dragleave se déclenchent aussi pour les enfants (icône, texte)
  // du label : un compteur de profondeur évite que is-dragover clignote en
  // survolant ces enfants pendant le survol.
  let dragDepth = 0;
  zone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragDepth += 1;
    zone.classList.add("is-dragover");
  });
  zone.addEventListener("dragover", (event) => event.preventDefault());
  zone.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) zone.classList.remove("is-dragover");
  });
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    dragDepth = 0;
    zone.classList.remove("is-dragover");
    void importFiles(event.dataTransfer?.files || []);
  });

  zone.append(icon, text, input);
  return zone;
}

async function uploadLocalMedia(file) {
  try {
    const response = await fetch(`/api/media?filename=${encodeURIComponent(file.name)}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Erreur HTTP ${response.status}`);
    }
    showToast(`${file.name} ajouté`);
  } catch (error) {
    showToast(`Import impossible : ${error.message}`);
  }
}

function buildMediaConnectPrompt(message) {
  const wrap = document.createElement("div");
  wrap.className = "media-library__empty";
  const text = document.createElement("p");
  text.className = "widget-library__empty";
  text.textContent = message;
  // Ouvre le panneau "Mon compte" (choix entre OAuth2 et JWT/apikey, cf. la
  // carte StreamElements) plutôt qu'un lien direct vers /auth/streamelements/start :
  // ce dernier ne couvrait que la moitié des façons de se connecter.
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button--wide";
  button.textContent = "Connecter StreamElements";
  button.addEventListener("click", () => setAccountPanelOpen(true));
  wrap.append(text, button);
  return wrap;
}

// Clic = copie l'URL dans le presse-papiers (usage universel : elle peut
// ensuite être collée dans n'importe quel champ image/vidéo, widget ou
// overlay, sans dépendre du contexte d'où le panneau Médias a été ouvert).
// Un média local porte en plus un bouton de suppression (on possède ce
// fichier) ; un média StreamElements reste en lecture seule.
function buildMediaLibraryItem(item, container) {
  const wrap = document.createElement("div");
  wrap.className = "media-library__item-wrap";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "media-library__item";
  button.title = item.source === "local"
    ? item.name
    : (item.overlayName ? `Depuis l'overlay "${item.overlayName}"` : item.url);

  if (item.type === "video") {
    // preload="metadata" seul (pas "auto", pas de lecture) : assez pour que
    // le navigateur affiche la première frame comme aperçu statique, sans
    // télécharger toute la vidéo juste pour une vignette.
    const frame = document.createElement("span");
    frame.className = "media-library__thumb-frame";
    const thumb = document.createElement("video");
    thumb.className = "media-library__thumb media-library__thumb--video";
    thumb.src = item.url;
    thumb.muted = true;
    thumb.playsInline = true;
    thumb.preload = "metadata";
    const playBadge = document.createElement("span");
    playBadge.className = "material-symbols-rounded media-library__play-badge";
    playBadge.textContent = "play_circle";
    playBadge.setAttribute("aria-hidden", "true");
    frame.append(thumb, playBadge);
    button.append(frame);
  } else {
    const thumb = document.createElement("img");
    thumb.className = "media-library__thumb";
    thumb.src = item.url;
    thumb.alt = "";
    thumb.loading = "lazy";
    button.append(thumb);
  }

  const label = document.createElement("span");
  label.className = "media-library__label";
  label.textContent = item.source === "local" ? item.name : decodeURIComponent(item.url.split("/").pop().split("?")[0] || item.url);
  button.append(label);

  button.addEventListener("click", () => {
    navigator.clipboard.writeText(item.url)
      .then(() => showToast("URL copiée"))
      .catch(() => showToast("Copie impossible"));
  });

  wrap.append(button);

  if (item.source === "local") {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button media-library__delete";
    deleteButton.setAttribute("aria-label", "Supprimer");
    deleteButton.title = "Supprimer";
    deleteButton.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">delete</span>';
    deleteButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        const response = await fetch(`/api/media?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
        void renderMediaLibrary(container);
      } catch {
        showToast("Suppression impossible");
      }
    });
    wrap.append(deleteButton);
  }

  return wrap;
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
  if (entry.archived) {
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

  const shortcutItem = document.createElement("button");
  shortcutItem.type = "button";
  shortcutItem.className = "widget-library__options-item";
  shortcutItem.setAttribute("role", "menuitem");
  shortcutItem.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">link</span><span>Créer un raccourci .url</span>';
  shortcutItem.addEventListener("click", () => {
    closeAllDropdowns();
    exportWidgetShortcut(entry.id, entry.name);
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

  menuPanel.append(editItem, shortcutItem, deleteItem);
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
    { resetEditor: true, resetFields: true, resetPreviewSize: true }
  );

  if (loaded) {
    localStorage.setItem(activeWidgetStorageKey, activeWidgetId);
    showToast(`${widget.widgetMeta?.name || "Widget"} chargé`);
  } else {
    activeWidgetId = previousWidgetId;
    await refreshWidgetPreview({ file: "restauration du widget" }, false, {
      resetEditor: true,
      resetFields: true,
      resetPreviewSize: true
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

function fieldTypeIcon(definition) {
  return FIELD_TYPE_ICON[definition.type] || "tune";
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

  const buildIcon = (definition) => {
    const icon = document.createElement("span");
    icon.className = "material-symbols-rounded field__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = fieldTypeIcon(definition);
    return icon;
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
      const caption = document.createElement("span");
      caption.className = "checkbox-field__label";
      caption.textContent = definition.label || key;
      caption.title = caption.textContent;
      label.append(buildIcon(definition), caption);
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(fieldData[key]);
      input.addEventListener("change", () => updateField(key, input.checked));
      label.append(input);
      container.append(label);
      continue;
    }

    const label = document.createElement("label");
    label.className = `field${FIELD_INLINE_TYPES.has(definition.type) ? " field--inline" : ""}`;
    const caption = document.createElement("span");
    caption.className = "field__label";
    caption.textContent = definition.label || key;
    caption.title = caption.textContent;
    label.append(buildIcon(definition), caption);
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
  const effectiveFieldData = { ...parseDataOverrides(), ...fieldData };
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

  elements.frame.srcdoc = buildWidgetSrcdoc(widget, fieldData, { checkerClass, themeClass, platform: previewPlatform });
}

// Extrait de renderWidget() : fonction pure (aucun effet de bord sur
// elements.frame) afin d'être réutilisable pour composer plusieurs aperçus
// de widgets/alertes sur le canevas d'un overlay, un par iframe.
function buildWidgetSrcdoc(bundle, values, { checkerClass = "", themeClass = "", platform = PLATFORM_STREAM_ELEMENTS, transparent = false } = {}) {
  const html = substituteFields(bundle.html, values);
  const css = substituteFields(bundle.css, values);
  const js = substituteFields(bundle.js, values);
  const executableJs = JSON.stringify(js).replaceAll("<", "\\u003c");

  // Sur le canevas d'overlay, chaque widget est un item parmi d'autres posés
  // sur le damier de .overlay-canvas-wrap : son iframe ne doit jamais peindre
  // sa propre surface, sinon on voit un rectangle opaque plutôt que le widget
  // composité sur le fond commun.
  const surfaceCss = transparent
    ? `html.se-lab-preview, html.se-lab-preview body { background: transparent !important; }`
    : `html.se-lab-preview { background: #11141a !important; }
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
  }`;

  return `<!doctype html>
<html class="se-lab-preview${transparent ? "" : checkerClass}${transparent ? "" : themeClass}"><head><meta charset="utf-8"><style>${css}</style>
<style id="se-lab-surface">
  ${surfaceCss}
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
  window.__WIDGET_PLATFORM__ = ${JSON.stringify(platform)};
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
  const message = { source: "se-lab", kind: "dispatch", eventType, eventTarget, detail };
  // Sur la vue overlay, il n'y a pas un widget "actif" unique : le bouton de
  // déclenchement d'événements diffuse à tous les iframes widget/alerte
  // posés sur le canevas simultanément (le sélecteur .overlay-item__frame
  // n'existe que sur ces items-là, texte/image/icône/forme/groupe n'ont pas
  // d'iframe et sont donc ignorés sans test de type explicite).
  if (!elements.overlayEditorView.hidden) {
    for (const frame of document.querySelectorAll("#overlay-canvas .overlay-item__frame")) {
      frame.contentWindow?.postMessage(message, "*");
    }
    return;
  }
  elements.frame.contentWindow?.postMessage(message, "*");
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
  stream.addEventListener("full-reload", () => window.location.reload());
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
      // Uniquement lors d'un vrai changement de widget (cf. switchWidget) :
      // les autres appelants (rechargement de code, changement de
      // plateforme…) concernent le MÊME widget et ne doivent pas écraser un
      // redimensionnement manuel fait en cours d'édition.
      if (options.resetPreviewSize) applyWidgetDefaultPreviewSize(widget);
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
  failed: "La connexion Twitch a échoué. Réessaie.",
  login_required: "Connecte-toi avec Twitch avant de connecter StreamElements.",
  streamelements_not_configured: "La connexion StreamElements (médias) n’est pas encore configurée sur ce serveur — SE_OAUTH_CLIENT_ID/SECRET manquants dans .env."
};

// Issue du callback /auth/streamelements/callback (cf. server.mjs) : un
// paramètre "streamelements" séparé de "error"/"login" (ceux-ci restent
// Twitch-only) pour ne jamais faire porter à ces derniers le résultat d'un
// flux OAuth différent.
const STREAMELEMENTS_STATUS_MESSAGES = {
  cancelled: "Connexion StreamElements annulée.",
  failed: "La connexion StreamElements a échoué. Réessaie."
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
  // Uniquement présents sur la carte StreamElements (cf. index.html) : le
  // bouton OAuth2 et sa séparation "ou" au-dessus du formulaire manuel.
  const oauthButton = card.querySelector('[data-role="oauth-connect"]');
  const oauthHint = card.querySelector('[data-role="oauth-hint"]');
  const oauthDivider = card.querySelector('[data-role="oauth-divider"]');

  if (integration) {
    statusEl.textContent = "Connecté";
    statusEl.classList.add("is-connected");
    helpEl.hidden = true;
    formEl.hidden = true;
    connectedEl.hidden = false;
    if (oauthButton) oauthButton.hidden = true;
    if (oauthHint) oauthHint.hidden = true;
    if (oauthDivider) oauthDivider.hidden = true;
    connectedEl.querySelector('[data-role="channel-name"]').textContent = integration.channelName || integration.channelId || "Connecté";
    connectedEl.querySelector('[data-role="connected-at"]').textContent = `Connecté le ${formatAccountDate(integration.connectedAt)}`;
  } else {
    statusEl.textContent = "Non connecté";
    statusEl.classList.remove("is-connected");
    helpEl.hidden = false;
    formEl.hidden = false;
    connectedEl.hidden = true;
    if (oauthButton) oauthButton.hidden = false;
    if (oauthHint) oauthHint.hidden = false;
    if (oauthDivider) oauthDivider.hidden = false;
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
}

async function applyEnvDefaults(card, provider) {
  const formEl = card.querySelector('[data-role="form"]');
  const formError = card.querySelector('[data-role="form-error"]');
  try {
    const defaults = await fetchAccountJson(`/api/integrations/env-defaults/reveal?provider=${provider}`);
    for (const key of ["channelId", "channelName", "tokenType", "token"]) {
      if (formEl.elements[key] && defaults[key] != null) formEl.elements[key].value = defaults[key];
    }
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  }
}

function showAccountError(message) {
  elements.accountError.textContent = message;
  elements.accountError.hidden = false;
}

async function initializeAccountPanel() {
  const params = new URLSearchParams(window.location.search);
  const queryMessage = ACCOUNT_ERROR_MESSAGES[params.get("error")] || ACCOUNT_ERROR_MESSAGES[params.get("login")];
  if (queryMessage) showAccountError(queryMessage);

  const seStatus = params.get("streamelements");
  if (STREAMELEMENTS_STATUS_MESSAGES[seStatus]) showAccountError(STREAMELEMENTS_STATUS_MESSAGES[seStatus]);
  else if (seStatus === "connected") {
    showToast("StreamElements connecté");
    // La section Médias a pu être ouverte (et donc chargée, cf.
    // initializeMediaLibrary) avant que la connexion n'aboutisse — sans ce
    // reset, elle resterait figée sur son message "non connecté" jusqu'au
    // prochain repli/dépli manuel.
    mediaLibraryLoaded = false;
    if (elements.mediaLibraryList) void renderMediaLibrary(elements.mediaLibraryList);
    if (elements.dashboardMediaList) void renderMediaLibrary(elements.dashboardMediaList);
  }

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
        const provider = card.dataset.provider;
        const formEl = card.querySelector('[data-role="form"]');
        if (formEl.hidden || !envDefaults[provider]?.hasToken) continue;
        await applyEnvDefaults(card, provider);
      }
    } catch {
      // .env non configure ou endpoint indisponible : rien a charger automatiquement.
    }
  } catch (error) {
    showAccountError(error.message);
  }
}

// Généralise l'ancien binding dashboard/éditeur (2 états) à 3 vues
// mutuellement exclusives dans .preview-column, l'overlay étant une
// troisième vue au même niveau. Chaque appelant existant (showDashboard/
// hideDashboard) reste inchangé côté API, seule leur implémentation change.
function setActiveView(view) {
  elements.dashboardView.hidden = view !== "dashboard";
  elements.widgetEditorView.hidden = view !== "editor";
  elements.overlayEditorView.hidden = view !== "overlay";
  // Le bouton de test d'événements a du sens à la fois en édition d'un
  // widget/alerte unique et sur le canevas overlay (où il diffuse à tous les
  // items, voir dispatchToWidget) — seul le dashboard, où rien n'est
  // sélectionné/composé, ne l'affiche pas.
  elements.eventFab.hidden = view !== "editor" && view !== "overlay";
  // Plateforme simulée + Export ont un sens dès qu'un widget/alerte ou un
  // overlay est en cours d'édition — seul le dashboard, où rien de concret
  // n'est encore ouvert, les masque.
  elements.topbarCenter.hidden = view === "dashboard";
  applyPreviewPlatform();
  // .is-dashboard masque aussi la section "Champs" (styles/layouts/_sidebar.scss) :
  // non pertinente hors édition d'un widget/alerte précis, donc sur dashboard
  // ET sur le canevas overlay — seul le repère actif du bouton Dashboard doit
  // rester strictement lié à la vraie vue dashboard.
  elements.workspace.classList.toggle("is-dashboard", view !== "editor");
  elements.dashboardFab.classList.toggle("is-active", view === "dashboard");
}

function showDashboard() {
  setActiveView("dashboard");
  setEventSimulatorOpen(false);
  renderWidgetLibrary();
  renderDashboard();
  void renderMediaLibrary(elements.dashboardMediaList);
}

function hideDashboard() {
  setActiveView("editor");
}

function showOverlayEditor() {
  setActiveView("overlay");
  setEventSimulatorOpen(false);
}

function jumpToSidebarSection(sectionKey) {
  setSidebarCollapsed(false);
  const section = document.querySelector(`[data-sidebar-section="${sectionKey}"]`);
  // Sets .open directly rather than routing through expandDetails() — that
  // function drives its own separate WAAPI animation and doesn't know about
  // the shrink/grow closure state in makeDetailsAnimatable(), which already
  // owns click-driven open/close for these sections. Mixing the two was the
  // cause of the reopen bug (two competing animations racing to set .open).
  if (section && !section.open) section.open = true;
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
    dashboardConnectionRow("twitch", "Compte Twitch", authenticated, twitchDetail, { avatarUrl: user?.avatarUrl, dotConnected: authenticated }),
    dashboardConnectionRow("streamelements", "StreamElements", liveStatuses.streamelements === "connected", buildLiveConnectionDetail("streamelements", liveStatuses.streamelements === "connected", userIntegrationsByProvider), { linked: userIntegrations.has("streamelements"), dotConnected: userIntegrations.has("streamelements") }),
    dashboardConnectionRow("streamlabs", "Streamlabs", liveStatuses.streamlabs === "connected", buildLiveConnectionDetail("streamlabs", liveStatuses.streamlabs === "connected", userIntegrationsByProvider), { linked: userIntegrations.has("streamlabs"), dotConnected: userIntegrations.has("streamlabs") })
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
  const { avatarUrl, linked, dotConnected } = options;
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

  if (dotConnected !== undefined) {
    const linkDot = document.createElement("i");
    linkDot.className = `dashboard-view__connections-dot${dotConnected ? " is-connected" : ""}`;
    linkDot.title = dotConnected ? `${label} connecté` : `${label} non connecté`;
    item.append(linkDot);
  }

  return item;
}

// Collapsing is a single class toggle — the two-phase feel (buttons/icons
// settle into their collapsed shape, then the panel narrows) comes entirely
// from CSS: .is-sidebar-collapsed's `transition` on .controls carries an
// extra transition-delay (see _sidebar.scss) so its width animation starts
// only once the label-fade/padding phase has finished, all as one
// browser-scheduled animation instead of two JS-triggered style recalcs.
// That keeps it one continuous motion instead of a visible stop-start.
// Only once that (delayed) width transition actually ends do we remove the
// emptied content from layout/a11y (.is-sidebar-rail) — listening for
// `transitionend` keeps this in sync with the real CSS timing instead of a
// guessed setTimeout that could drift if the durations above ever change.
// Expanding reverses everything at once: the base (undelayed) `.controls`
// transition applies, so the panel widens immediately and the fade-in has
// something to animate right away.
function setSidebarCollapsed(collapsed) {
  elements.workspace.classList.toggle("is-sidebar-collapsed", collapsed);
  elements.sidebarControls.removeEventListener("transitionend", onSidebarWidthSettled);
  if (collapsed) {
    elements.sidebarControls.addEventListener("transitionend", onSidebarWidthSettled);
  } else {
    elements.workspace.classList.remove("is-sidebar-rail");
  }
  elements.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  elements.sidebarToggle.setAttribute("aria-label", collapsed ? "Déplier le panneau" : "Replier le panneau");
  elements.sidebarToggle.querySelector(".material-symbols-rounded").textContent = collapsed ? "chevron_right" : "chevron_left";
}

function onSidebarWidthSettled(event) {
  if (event.propertyName !== "width") return;
  elements.sidebarControls.removeEventListener("transitionend", onSidebarWidthSettled);
  if (elements.workspace.classList.contains("is-sidebar-collapsed")) {
    elements.workspace.classList.add("is-sidebar-rail");
  }
}

elements.sidebarToggle.addEventListener("click", () => {
  setSidebarCollapsed(!elements.workspace.classList.contains("is-sidebar-collapsed"));
});

// Repli manuel du panneau Calques : sur un écran de portable (~1366-1440px),
// la sidebar gauche + ce panneau fixe ne laissaient plus assez de place pour
// travailler confortablement sur le canevas (cf. .overlay-layers dans
// _overlay-canvas.scss). Pas de setOverlayCanvasScale() explicite ici : le
// ResizeObserver déjà posé sur .overlay-canvas-wrap (cf. plus haut) réagit de
// lui-même à chaque frame de la transition CSS, exactement comme pour le
// repli de la sidebar gauche.
function setOverlayLayersCollapsed(collapsed) {
  elements.overlayLayers.classList.toggle("is-collapsed", collapsed);
  elements.overlayEditorView.classList.toggle("is-layers-collapsed", collapsed);
  elements.overlayLayersToggle.setAttribute("aria-expanded", String(!collapsed));
  elements.overlayLayersToggle.setAttribute("aria-label", collapsed ? "Déplier le panneau Calques" : "Replier le panneau Calques");
  elements.overlayLayersToggle.title = collapsed ? "Déplier le panneau Calques" : "Replier le panneau Calques";
  elements.overlayLayersToggle.querySelector(".material-symbols-rounded").textContent = collapsed ? "right_panel_open" : "right_panel_close";
}

elements.overlayLayersToggle.addEventListener("click", () => {
  setOverlayLayersCollapsed(!elements.overlayLayers.classList.contains("is-collapsed"));
});

elements.dashboardFab.addEventListener("click", () => showDashboard());
document.querySelector("#library-nav").addEventListener("click", () => jumpToSidebarSection("library"));
document.querySelector("#media-nav").addEventListener("click", () => jumpToSidebarSection("media"));

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

// widgetId/displayName optionnels : sans eux, exporte le raccourci du widget
// actif (bouton Export de l'en-tête). Avec eux, exportable directement depuis
// une ligne de la bibliothèque (dashboard ou panneau latéral) sans avoir à
// ouvrir l'éditeur de ce widget au préalable.
function exportWidgetShortcut(widgetId = activeWidgetId, displayName) {
  if (!widgetId) return;
  const configuredName = String(
    displayName ||
    (widgetId === activeWidgetId
      ? fieldData?.widgetName || widget?.fields?.widgetName?.value || widget?.widgetMeta?.name
      : null) ||
    "custom-widget"
  );
  const slug = slugifyWidgetName(configuredName);
  // Ouvre le tableau de bord de la plateforme sélectionnée dans l'en-tête
  // (StreamElements/Streamlabs), pas l'éditeur local du Lab : voir
  // PLATFORM_DASHBOARD_URLS pour le pourquoi (aucun ID distant connu).
  const shortcutUrl = PLATFORM_DASHBOARD_URLS[previewPlatform] || PLATFORM_DASHBOARD_URLS[PLATFORM_STREAM_ELEMENTS];
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

function exportOverlayShortcut() {
  if (!activeOverlay) return;
  const slug = slugifyWidgetName(activeOverlay.name || "overlay");
  // Cf. exportWidgetShortcut : ouvre la plateforme sélectionnée, pas l'éditeur
  // local du Lab.
  const shortcutUrl = PLATFORM_DASHBOARD_URLS[previewPlatform] || PLATFORM_DASHBOARD_URLS[PLATFORM_STREAM_ELEMENTS];
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
  addConsole("info", "Raccourci overlay .url généré");
  showToast("Raccourci téléchargé");
}

// Pas d'équivalent "widget unique" côté StreamElements/Streamlabs pour un
// overlay entier (ce sont des widgets qu'on importe un par un côté
// plateforme) : on zippe donc le bundle exporté de chaque widget/alerte posé
// sur le canevas, un sous-dossier par item, en réutilisant buildPlatformExport
// telle quelle pour rester identique à l'export widget seul.
async function exportOverlayCode(platform) {
  if (!activeOverlay) return;
  const widgetItems = activeOverlay.items.filter((item) => item.type === "widget" || item.type === "alert");
  if (!widgetItems.length) {
    showToast("Cet overlay ne contient aucun widget ou alerte à exporter.");
    return;
  }

  const files = {};
  const usedFolders = new Set();
  let platformName = "";
  let bridgeInjectedAny = false;

  for (const item of widgetItems) {
    const bundle = await loadOverlayItemBundle(item.widgetId);
    if (!bundle) continue;
    const values = resolveOverlayItemFieldData(bundle, item);
    const exported = buildPlatformExport(bundle, values, platform);
    platformName = exported.platformName;
    if (exported.bridgeInjected) bridgeInjectedAny = true;

    const baseFolder = slugifyWidgetName(bundle.widgetMeta?.name || item.widgetId);
    let folder = baseFolder;
    let suffix = 2;
    while (usedFolders.has(folder)) folder = `${baseFolder}-${suffix++}`;
    usedFolders.add(folder);

    for (const [name, content] of Object.entries(exported.files)) {
      files[`${folder}/${name}`] = content;
    }
  }

  if (!Object.keys(files).length) {
    showToast("Aucun widget exportable trouvé dans cet overlay.");
    return;
  }

  const archive = createZip(files);
  const slug = slugifyWidgetName(activeOverlay.name || "overlay");
  const suffix = platform === PLATFORM_STREAMLABS ? "streamlabs" : "streamelements";
  const blob = new Blob([archive], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}-${suffix}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);

  const bridge = bridgeInjectedAny ? " · pont de compatibilité inclus sur au moins un widget" : "";
  addConsole("info", `Export overlay ${platformName}${bridge}`);
  showToast(`Export ${platformName} téléchargé${bridge}`);
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
