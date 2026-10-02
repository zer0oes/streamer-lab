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
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function num(v){
  const s = String(v ?? "").trim().replace(",", ".");
  const n = Number(s.replace(/[^\d.-]/g,''));
  return Number.isFinite(n) ? n : 0;
}

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_PLAYER_URL = "https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode";

let SETTINGS = {};
let EDITOR_MODE = false;

// État de lecture courant (null = rien à afficher)
// { id, title, artist, cover, durationMs, progressMs, isPlaying, syncedAt }
let NOW = null;
let lastTrackId = null;
let isVisible = false;

let pollTimer = null;
let tickTimer = null;
let bootId = 0;

let accessToken = null;
let accessTokenExpiresAt = 0;

// ------------------------------------
// Google Fonts
// ------------------------------------
function setGoogleFont(family){
  const link = document.getElementById("googleFontLink");
  if (!link) return;

  const name = String(family || "Poppins").trim();
  const urlName = name.replace(/\s+/g, "+");
  link.href = `https://fonts.googleapis.com/css2?family=${urlName}:wght@300;400;500;600;700;800&display=swap`;
  document.documentElement.style.setProperty("--font", `"${name}"`);
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
function toRgba(hexValue, alpha){
  const { r, g, b } = hexToRgb(hexValue);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}
function buildPaint(type, color1, color2, angle, alpha){
  const c1 = toRgba(color1, alpha);
  const c2 = toRgba(color2, alpha);
  return type === "gradient" ? `linear-gradient(${angle}deg, ${c1}, ${c2})` : c1;
}

// ------------------------------------
// Normalisation du fieldData
// ------------------------------------
function oneOf(v, allowed, fallback){
  const s = String(v ?? "").toLowerCase();
  return allowed.includes(s) ? s : fallback;
}

function normalizeFields(raw){
  if (Array.isArray(raw)){
    raw = Object.fromEntries(raw.filter(field => field?.name).map(field => [field.name, field.value]));
  }
  raw = raw || {};

  return {
    spotify_client_id: String(raw.spotify_client_id ?? "").trim(),
    spotify_client_secret: String(raw.spotify_client_secret ?? "").trim(),
    spotify_refresh_token: String(raw.spotify_refresh_token ?? "").trim(),
    poll_interval: clamp(num(raw.poll_interval ?? 5) || 5, 2, 60),
    hide_when_paused: oneOf(raw.hide_when_paused, ["hide", "show"], "hide"),
    demo_mode: oneOf(raw.demo_mode, ["auto", "always", "never"], "auto"),

    show_cover: oneOf(raw.show_cover, ["yes", "no"], "yes"),
    show_progress: oneOf(raw.show_progress, ["yes", "no"], "yes"),

    font_family: String(raw.font_family ?? "Poppins"),
    font_weight: String(raw.font_weight ?? "600"),
    text_size: num(raw.text_size ?? 14),
    width: num(raw.width ?? 400),
    height: num(raw.height ?? 46),
    corner_radius: num(raw.corner_radius ?? -1),

    text_color: hexOr(raw.text_color, "#ffffff"),
    accent_color: hexOr(raw.accent_color, "#571bc3"),
    border_color: hexOr(raw.border_color, "#ffffff"),
    border_width: Math.max(0, num(raw.border_width ?? 1)),
    border_opacity: clamp(num(raw.border_opacity ?? 1), 0, 1),
    background_type: oneOf(raw.background_type, ["solid", "gradient"], "gradient"),
    background_color1: hexOr(raw.background_color1, "#161225"),
    background_color2: hexOr(raw.background_color2, "#231a3d"),
    background_opacity: clamp(num(raw.background_opacity ?? 1), 0, 1)
  };
}

function hasCredentials(){
  return Boolean(SETTINGS.spotify_client_id && SETTINGS.spotify_client_secret && SETTINGS.spotify_refresh_token);
}

function isDemo(){
  if (SETTINGS.demo_mode === "always") return true;
  if (SETTINGS.demo_mode === "never") return false;
  // "auto" : uniquement dans l'éditeur, jamais de faux morceaux en live
  return EDITOR_MODE && !hasCredentials();
}

// ------------------------------------
// Apparence
// ------------------------------------
function applyStyle(){
  const root = document.documentElement.style;
  const s = SETTINGS;

  setGoogleFont(s.font_family);
  root.setProperty("--textWeight", s.font_weight);
  if (s.text_size > 0) root.setProperty("--textSize", s.text_size + "px");

  const h = s.height > 0 ? s.height : 46;
  root.setProperty("--w", s.width > 0 ? s.width + "px" : "100%");
  root.setProperty("--h", h + "px");
  root.setProperty("--radius", (s.corner_radius >= 0 ? s.corner_radius : h / 2) + "px");

  root.setProperty("--text", s.text_color);
  root.setProperty("--text-muted", toRgba(s.text_color, .65));
  root.setProperty("--accent", s.accent_color);
  root.setProperty("--border-color", toRgba(s.border_color, s.border_opacity));
  root.setProperty("--border-width", s.border_width + "px");
  root.setProperty("--bg", buildPaint(s.background_type, s.background_color1, s.background_color2, 135, s.background_opacity));

  const player = document.getElementById("player");
  player.classList.toggle("no-cover", s.show_cover === "no");
  player.classList.toggle("no-progress", s.show_progress === "no");

  fillShapeWidth = 0;
  ensureFillShape();
}

// ------------------------------------
// Rendu
// ------------------------------------
function restartClass(el, cls){
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// Fait défiler un texte trop long dans sa ligne (aller-retour)
function updateMarquee(el){
  if (!el) return;
  el.classList.remove("is-overflowing");
  el.style.removeProperty("--scroll");

  requestAnimationFrame(() => {
    const overflow = el.scrollWidth - el.parentElement.clientWidth;
    if (overflow <= 2) return;
    el.style.setProperty("--scroll", `-${overflow + 4}px`);
    el.style.setProperty("--scroll-duration", `${clamp(overflow / 25, 4, 14)}s`);
    el.classList.add("is-overflowing");
  });
}

function setCover(url){
  const img = document.getElementById("cover");
  if (!img) return;
  if (!url){
    img.removeAttribute("src");
    img.classList.remove("is-loaded");
    return;
  }
  if (img.getAttribute("src") === url) return;
  img.classList.remove("is-loaded");
  img.onload = () => img.classList.add("is-loaded");
  img.onerror = () => img.classList.remove("is-loaded");
  img.src = url;
}

function currentProgress(){
  if (!NOW) return 0;
  const elapsed = NOW.isPlaying ? Date.now() - NOW.syncedAt : 0;
  return clamp(NOW.progressMs + elapsed, 0, NOW.durationMs || Infinity);
}

// ------------------------------------
// Forme du croissant (même tracé que la goal bar, mis à l'échelle)
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

let fillObserverStarted = false;
let fillShapeWidth = 0;

// Le croissant occupe toute la largeur du lecteur ; seule la fenêtre qui le révèle change de largeur
function applyFillShape(){
  const fillEl = document.getElementById("fill");
  const playerEl = document.getElementById("player");
  if (!fillEl || !playerEl) return false;

  const fullWidthPx = playerEl.clientWidth;
  if (!fullWidthPx || fullWidthPx < 10) return false;
  if (fullWidthPx === fillShapeWidth) return true;

  fillShapeWidth = fullWidthPx;
  fillEl.style.width = fullWidthPx + "px";
  fillEl.style.clipPath = `path("${buildCrescentPath(fullWidthPx, 24)}")`;
  return true;
}

function ensureFillShape(){
  if (!applyFillShape()) requestAnimationFrame(applyFillShape);

  if (!fillObserverStarted && typeof ResizeObserver !== "undefined"){
    fillObserverStarted = true;
    new ResizeObserver(() => applyFillShape()).observe(document.getElementById("player"));
  }
}

function renderProgress(instant){
  if (!NOW) return;
  const progress = currentProgress();
  const pct = NOW.durationMs > 0 ? (progress / NOW.durationMs) * 100 : 0;

  const progressWindow = document.getElementById("progressWindow");
  progressWindow.classList.toggle("no-transition", Boolean(instant));
  progressWindow.style.width = clamp(pct, 0, 100) + "%";
}

function setVisible(visible){
  const player = document.getElementById("player");
  if (visible === isVisible) return;
  isVisible = visible;
  player.classList.remove("is-initial");
  if (visible){
    player.classList.remove("is-hidden");
  } else {
    player.classList.add("is-hidden");
  }
}

function render(){
  const player = document.getElementById("player");

  const shouldShow = Boolean(NOW) && (NOW.isPlaying || SETTINGS.hide_when_paused === "show");
  if (!NOW){
    setVisible(false);
    return;
  }

  player.classList.toggle("is-paused", !NOW.isPlaying);

  if (NOW.id !== lastTrackId){
    const changed = lastTrackId !== null;
    lastTrackId = NOW.id;

    const artistEl = document.getElementById("artist");
    document.getElementById("title").textContent = NOW.title;
    artistEl.textContent = NOW.artist;
    artistEl.classList.toggle("is-empty", !NOW.artist);
    document.getElementById("sep").classList.toggle("is-empty", !NOW.artist);
    setCover(NOW.cover);

    if (changed && isVisible){
      restartClass(document.querySelector(".player-body"), "is-swapping");
      restartClass(document.getElementById("coverWrap"), "is-swapping");
    }

    renderProgress(true);
    updateMarquee(document.getElementById("trackLine"));
  } else {
    renderProgress(false);
  }

  setVisible(shouldShow);
}

function showError(message){
  const player = document.getElementById("player");
  const errorEl = document.getElementById("error");
  console.warn("[Music player]", message);

  // L'erreur n'est affichée que dans l'éditeur : en live, le lecteur se masque simplement
  if (!EDITOR_MODE){
    NOW = null;
    render();
    return;
  }
  errorEl.textContent = message;
  player.classList.add("has-error");
  setVisible(true);
}

function clearError(){
  document.getElementById("player").classList.remove("has-error");
}

// ------------------------------------
// Spotify Web API
// ------------------------------------
async function getAccessToken(force){
  if (!force && accessToken && Date.now() < accessTokenExpiresAt) return accessToken;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: SETTINGS.spotify_refresh_token
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${SETTINGS.spotify_client_id}:${SETTINGS.spotify_client_secret}`)
    },
    body
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token){
    const reason = data.error_description || data.error || `HTTP ${res.status}`;
    const err = new Error(`Authentification Spotify refusée : ${reason}. Vérifiez Client ID, Client Secret et refresh token.`);
    err.fatal = res.status === 400 || res.status === 401;
    throw err;
  }

  accessToken = data.access_token;
  accessTokenExpiresAt = Date.now() + (num(data.expires_in) || 3600) * 1000 - 60000;
  return accessToken;
}

function parsePlayback(data){
  const item = data?.item;
  if (!item) return null;

  const isEpisode = item.type === "episode";
  const images = (isEpisode ? item.images || item.show?.images : item.album?.images) || [];
  // Les images sont triées de la plus grande à la plus petite : on prend la plus petite >= 160px
  const cover = [...images].reverse().find(img => (img.width || 0) >= 160)?.url || images[0]?.url || "";

  return {
    id: item.id || item.uri || `${item.name}`,
    title: item.name || "",
    artist: isEpisode
      ? (item.show?.name || "")
      : (item.artists || []).map(a => a.name).filter(Boolean).join(", "),
    cover,
    durationMs: num(item.duration_ms),
    progressMs: num(data.progress_ms),
    isPlaying: Boolean(data.is_playing),
    syncedAt: Date.now()
  };
}

async function fetchNowPlaying(retried){
  const token = await getAccessToken(false);
  const res = await fetch(SPOTIFY_PLAYER_URL, { headers: { Authorization: `Bearer ${token}` } });

  if (res.status === 204) return { playback: null };
  if (res.status === 401 && !retried){
    accessToken = null;
    return fetchNowPlaying(true);
  }
  if (res.status === 429){
    return { playback: NOW, retryAfter: num(res.headers.get("Retry-After")) || 30 };
  }
  if (!res.ok){
    const data = await res.json().catch(() => ({}));
    const err = new Error(`Spotify : ${data?.error?.message || `HTTP ${res.status}`}`);
    err.fatal = res.status === 403;
    throw err;
  }

  const data = await res.json().catch(() => null);
  return { playback: parsePlayback(data) };
}

function schedulePoll(seconds, id){
  clearTimeout(pollTimer);
  pollTimer = setTimeout(() => poll(id), seconds * 1000);
}

async function poll(id){
  if (id !== bootId) return;

  try {
    const result = await fetchNowPlaying(false);
    if (id !== bootId) return;
    clearError();
    NOW = result.playback;
    render();
    schedulePoll(result.retryAfter || SETTINGS.poll_interval, id);
  } catch (err){
    if (id !== bootId) return;
    showError(err?.message || String(err));
    // Identifiants invalides : inutile de marteler l'API, on réessaie lentement
    schedulePoll(err?.fatal ? 60 : Math.max(SETTINGS.poll_interval, 10), id);
  }
}

// ------------------------------------
// Mode démo (aucun identifiant : aperçu dans le labo / l'éditeur)
// ------------------------------------
function demoCover(c1, c2){
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
    `</linearGradient></defs><rect width="100" height="100" fill="url(#g)"/>` +
    `<circle cx="50" cy="50" r="22" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>` +
    `<circle cx="50" cy="50" r="5" fill="#fff" fill-opacity=".7"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const DEMO_TRACKS = [
  { title: "Midnight City", artist: "M83", durationMs: 243000, cover: demoCover("#571bc3", "#ff4d8d") },
  { title: "Une chanson avec un titre beaucoup trop long pour tenir sur une ligne", artist: "Artiste démo, Featuring quelqu'un", durationMs: 32000, cover: demoCover("#2abdff", "#161225") },
  { title: "Instant Crush", artist: "Daft Punk, Julian Casablancas", durationMs: 337000, cover: demoCover("#ff1bdf", "#231a3d") }
];
let demoIndex = 0;

function demoStep(id){
  if (id !== bootId) return;

  const track = DEMO_TRACKS[demoIndex % DEMO_TRACKS.length];
  // Démarre près de la fin pour voir rapidement l'enchaînement des morceaux
  const startAt = Math.max(0, track.durationMs - 20000);
  NOW = { id: `demo-${demoIndex}`, ...track, progressMs: startAt, isPlaying: true, syncedAt: Date.now() };
  render();

  clearTimeout(pollTimer);
  pollTimer = setTimeout(() => {
    demoIndex += 1;
    demoStep(id);
  }, track.durationMs - startAt);
}

// ------------------------------------
// Init
// ------------------------------------
function startTicker(){
  clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    if (NOW && NOW.isPlaying && isVisible) renderProgress(false);
  }, 500);
}

async function detectEditorMode(){
  try {
    const status = await window.SE_API?.getOverlayStatus?.();
    EDITOR_MODE = Boolean(status?.isEditorMode);
  } catch (_){
    EDITOR_MODE = false;
  }
}

function boot(rawFieldData){
  bootId += 1;
  const id = bootId;
  clearTimeout(pollTimer);

  const previous = SETTINGS;
  SETTINGS = normalizeFields(rawFieldData);

  const credentialsChanged =
    previous.spotify_client_id !== SETTINGS.spotify_client_id ||
    previous.spotify_client_secret !== SETTINGS.spotify_client_secret ||
    previous.spotify_refresh_token !== SETTINGS.spotify_refresh_token;
  if (credentialsChanged){
    accessToken = null;
    accessTokenExpiresAt = 0;
  }

  NOW = null;
  lastTrackId = null;
  clearError();
  applyStyle();
  startTicker();

  if (isDemo()){
    demoIndex = 0;
    demoStep(id);
    return;
  }

  if (!hasCredentials()){
    showError("Renseignez Client ID, Client Secret et refresh token Spotify dans les champs du widget.");
    return;
  }

  poll(id);
}

window.addEventListener("onWidgetLoad", async (obj) => {
  await detectEditorMode();
  boot(obj?.detail?.fieldData || {});
});

window.addEventListener("onWidgetUpdate", (obj) => {
  boot(obj?.detail?.fieldData || {});
});
