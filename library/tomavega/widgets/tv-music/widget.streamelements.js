// TV - Music : emplacement « LE SON » de TomaVega-animation.html, qui affiche
// le morceau en cours sur Spotify (pochette, titre, artiste). Logique Spotify
// reprise de zer0oes - Music player. Aucun morceau fictif : seul le bouton
// « Morceau d'essai » en affiche un, à la demande.
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_PLAYER_URL = "https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode";

const TEST_TRACKS = [
  { title: "Midnight City", artist: "M83" },
  { title: "Instant Crush", artist: "Daft Punk, Julian Casablancas" },
  { title: "Un titre beaucoup trop long pour tenir sur une seule ligne du panneau", artist: "Artiste d'essai" }
];

let SETTINGS = {};
let EDITOR_MODE = false;
let NOW = null;
let lastTrackId = null;
let pollTimer = null;
let bootId = 0;
let accessToken = null;
let accessTokenExpiresAt = 0;
let nextTestTrack = 0;

function num(value){
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function normalizeFields(raw){
  raw = raw || {};
  return {
    music_title: String(raw.music_title ?? "LE SON"),
    spotify_client_id: String(raw.spotify_client_id ?? "").trim(),
    spotify_client_secret: String(raw.spotify_client_secret ?? "").trim(),
    spotify_refresh_token: String(raw.spotify_refresh_token ?? "").trim(),
    spotify_auth_return: String(raw.spotify_auth_return ?? "").trim(),
    spotify_client_id_link: String(raw.spotify_client_id_link ?? "").trim(),
    poll_interval: Math.min(60, Math.max(2, num(raw.poll_interval) || 5)),
    when_idle: raw.when_idle === "hide" ? "hide" : "heading"
  };
}

function hasCredentials(){
  return Boolean(SETTINGS.spotify_client_id && SETTINGS.spotify_client_secret && SETTINGS.spotify_refresh_token);
}

// ------------------------------------
// Rendu
// ------------------------------------
function setState(message){
  const state = document.getElementById("state");
  state.textContent = message || "";
  state.hidden = !message;
}

function setCover(url){
  const img = document.getElementById("cover");
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

function render(){
  const music = document.getElementById("music");
  const track = document.getElementById("track");
  // Rien ne joue (ou lecture en pause) : en-tête seul, ou panneau masqué
  const playing = Boolean(NOW && NOW.isPlaying);
  track.hidden = !playing;
  music.classList.toggle("is-hidden", !playing && SETTINGS.when_idle === "hide");
  if (!playing){
    lastTrackId = null;
    return;
  }
  if (NOW.id === lastTrackId) return;
  lastTrackId = NOW.id;
  document.getElementById("title").textContent = NOW.title;
  document.getElementById("artist").textContent = NOW.artist;
  setCover(NOW.cover);
  track.classList.remove("is-changing");
  void track.offsetWidth;
  track.classList.add("is-changing");
}

// ------------------------------------
// Spotify Web API
// ------------------------------------
async function getAccessToken(force){
  if (!force && accessToken && Date.now() < accessTokenExpiresAt) return accessToken;
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(SETTINGS.spotify_client_id + ":" + SETTINGS.spotify_client_secret)
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: SETTINGS.spotify_refresh_token })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token){
    const error = new Error("Authentification Spotify refusée (" + (data.error_description || data.error || "HTTP " + res.status) + ")");
    error.fatal = res.status === 400 || res.status === 401;
    throw error;
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
  // Images triées de la plus grande à la plus petite : la plus petite >= 120 px suffit
  const cover = [...images].reverse().find((image) => (image.width || 0) >= 120)?.url || images[0]?.url || "";
  return {
    id: item.id || item.uri || item.name,
    title: item.name || "",
    artist: isEpisode ? item.show?.name || "" : (item.artists || []).map((artist) => artist.name).filter(Boolean).join(", "),
    cover,
    isPlaying: Boolean(data.is_playing)
  };
}

async function fetchNowPlaying(retried){
  const token = await getAccessToken(false);
  const res = await fetch(SPOTIFY_PLAYER_URL, { headers: { Authorization: "Bearer " + token } });
  if (res.status === 204) return { playback: null };
  if (res.status === 401 && !retried){
    accessToken = null;
    return fetchNowPlaying(true);
  }
  if (res.status === 429) return { playback: NOW, retryAfter: num(res.headers.get("Retry-After")) || 30 };
  if (!res.ok){
    const data = await res.json().catch(() => ({}));
    const error = new Error("Spotify : " + (data?.error?.message || "HTTP " + res.status));
    error.fatal = res.status === 403;
    throw error;
  }
  return { playback: parsePlayback(await res.json().catch(() => null)) };
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
    setState("");
    NOW = result.playback;
    render();
    schedulePoll(result.retryAfter || SETTINGS.poll_interval, id);
  } catch (error){
    if (id !== bootId) return;
    console.warn("[TV - Music]", error.message);
    // Message visible dans l'éditeur seulement ; en live, le panneau reste sobre
    if (EDITOR_MODE) setState(error.message);
    NOW = null;
    render();
    schedulePoll(error.fatal ? 60 : Math.max(SETTINGS.poll_interval, 10), id);
  }
}

// Bouton « Morceau d'essai » : affiche un morceau fictif, à la demande
function showTestTrack(){
  const sample = TEST_TRACKS[nextTestTrack++ % TEST_TRACKS.length];
  NOW = { id: "essai-" + nextTestTrack, title: sample.title, artist: sample.artist, cover: "", isPlaying: true };
  setState("");
  render();
}

// ------------------------------------
// Connexion Spotify guidée, sans outil. L'aperçu de l'éditeur n'étant pas
// cliquable, tout passe par les champs : le widget écrit le lien complet au
// champ 3 (SE_API.setField), échange le code collé au champ 4 et remplit
// lui-même le refresh token (champ 5, et SE_API.store pour le live).
// L'aperçu affiche seulement l'étape en cours.
// ------------------------------------
const SPOTIFY_REDIRECT_URI = "http://127.0.0.1:8888/callback";
const SPOTIFY_AUTH_BASE = "https://accounts.spotify.com/authorize?response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A8888%2Fcallback&scope=user-read-currently-playing%20user-read-playback-state&client_id=";
const SPOTIFY_STORE_KEY = "spotifyMusicAuth";
const exchangedCodes = {};

function spotifyAuthorizeUrl(clientId){
  return SPOTIFY_AUTH_BASE + encodeURIComponent(clientId);
}

function setFieldValue(key, value){
  try {
    if (typeof window.SE_API?.setField !== "function") return false;
    window.SE_API.setField(key, value, false);
    return true;
  } catch (_){
    return false;
  }
}

// Adresse complète collée (…/callback?code=…) ou code seul
function parseAuthReturn(text){
  const value = String(text || "").trim();
  if (!value) return null;
  const query = value.includes("?") ? value.slice(value.indexOf("?") + 1) : value.includes("=") ? value : "";
  if (query){
    const params = new URLSearchParams(query.split("#")[0]);
    if (params.get("error")) return { error: params.get("error") };
    if (params.get("code")) return { code: params.get("code") };
    return { error: "invalid" };
  }
  return /^[\w-]{20,}$/.test(value) ? { code: value } : { error: "invalid" };
}

// Promesse SE_API qui peut ne jamais répondre : on n'attend pas plus de ms
function withTimeout(promise, ms){
  return Promise.race([Promise.resolve(promise), new Promise((resolve) => setTimeout(() => resolve(undefined), ms))]);
}

// Refresh token gardé par StreamElements (si le champ n'a pas été enregistré)
async function loadStoredToken(){
  if (SETTINGS.spotify_refresh_token || !SETTINGS.spotify_client_id) return;
  try {
    const saved = await withTimeout(window.SE_API?.store?.get?.(SPOTIFY_STORE_KEY), 1500);
    if (saved && saved.clientId === SETTINGS.spotify_client_id && saved.refreshToken) SETTINGS.spotify_refresh_token = String(saved.refreshToken);
  } catch (_){}
}

// Un code ne sert qu'une fois : le résultat est gardé pour les rechargements
async function exchangeAuthCode(code){
  if (exchangedCodes[code]) return exchangedCodes[code];
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(SETTINGS.spotify_client_id + ":" + SETTINGS.spotify_client_secret)
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: SPOTIFY_REDIRECT_URI })
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.refresh_token){
    exchangedCodes[code] = data.refresh_token;
    return data.refresh_token;
  }
  const detail = String(data.error_description || data.error || "HTTP " + res.status);
  if (data.error === "invalid_client") throw new Error("Client ID ou Client Secret incorrect (champs 1 et 2).");
  if (/redirect/i.test(detail)) throw new Error("La Redirect URI de l'app Spotify doit être exactement " + SPOTIFY_REDIRECT_URI + ".");
  if (data.error === "invalid_grant") throw new Error("Ce code a expiré (10 min) ou a déjà servi : rouvre le lien du champ 3 et recolle la nouvelle adresse au champ 4.");
  throw new Error("Spotify a refusé la connexion (" + detail + ").");
}

// Retourne true si le token a été rempli dans le champ 5 automatiquement
async function saveRefreshToken(token){
  SETTINGS.spotify_refresh_token = token;
  try { await withTimeout(window.SE_API?.store?.set?.(SPOTIFY_STORE_KEY, { clientId: SETTINGS.spotify_client_id, refreshToken: token }), 1500); } catch (_){}
  const filled = setFieldValue("spotify_refresh_token", token);
  if (filled) setFieldValue("spotify_auth_return", "");
  return filled;
}

// Guide affiché tant que la connexion n'est pas terminée, sans dépendre de
// la détection de l'éditeur (peu fiable) : sans identifiants complets, le
// widget n'a de toute façon rien à montrer
function setupVisible(){
  return true;
}

function setupBox(){
  let box = document.getElementById("spotifySetup");
  if (!box){
    box = document.createElement("div");
    box.id = "spotifySetup";
    box.className = "spotify-setup";
    document.body.append(box);
  }
  return box;
}

function hideSetup(){
  document.getElementById("spotifySetup")?.remove();
}

function setupLine(box, text, className){
  const p = document.createElement("p");
  if (className) p.className = className;
  p.textContent = text;
  box.append(p);
}

function renderSetup(lines){
  const box = setupBox();
  box.replaceChildren();
  setupLine(box, "Connecter Spotify", "spotify-setup-title");
  for (const line of lines) if (line) setupLine(box, line.text || line, line.className);
}

// Retourne true si le guide a pris la main (connexion pas terminée)
async function runSpotifySetup(id){
  await loadStoredToken();
  if (id !== bootId) return true;
  if (hasCredentials()){
    hideSetup();
    return false;
  }
  if (!setupVisible()) return true;
  if (!SETTINGS.spotify_client_id || !SETTINGS.spotify_client_secret){
    renderSetup([
      "1. Sur developer.spotify.com/dashboard, crée une app (coche « Web API ») avec la Redirect URI : " + SPOTIFY_REDIRECT_URI,
      "2. Colle le Client ID et le Client Secret de l'app (Settings) dans les champs 1 et 2."
    ]);
    return true;
  }
  // Lien complet écrit au champ 3, à copier dans le navigateur
  const link = spotifyAuthorizeUrl(SETTINGS.spotify_client_id);
  const linkFilled = SETTINGS.spotify_client_id_link === link || setFieldValue("spotify_client_id_link", link);
  const openStep = linkFilled
    ? "3. Copie le lien du champ 3 dans ton navigateur et accepte. La page d'arrivée ne se charge pas, c'est normal : copie son adresse dans le champ 4."
    : "3. Copie le lien du champ 3 dans ton navigateur, ajoute ton Client ID à la fin, et accepte. La page d'arrivée ne se charge pas, c'est normal : copie son adresse dans le champ 4.";
  const result = parseAuthReturn(SETTINGS.spotify_auth_return);
  if (!result){
    renderSetup([openStep]);
    return true;
  }
  if (result.error){
    renderSetup([
      { text: result.error === "access_denied" ? "Autorisation refusée sur Spotify : recommence." : "Le champ 4 ne contient pas de code : copie l'adresse complète de la page d'arrivée.", className: "spotify-setup-error" },
      openStep
    ]);
    return true;
  }
  renderSetup(["Connexion à Spotify…"]);
  try {
    const token = await exchangeAuthCode(result.code);
    if (id !== bootId) return true;
    if (await saveRefreshToken(token)){
      renderSetup([{ text: "Spotify est connecté ! Le refresh token a été rempli (champ 5). Pense à enregistrer le widget.", className: "spotify-setup-ok" }]);
      setTimeout(() => { if (id === bootId) hideSetup(); }, 6000);
      return false;
    }
    renderSetup(["Spotify est connecté. Copie ce refresh token dans le champ 5, puis vide le champ 4 :", { text: token, className: "spotify-setup-copy" }]);
    return false;
  } catch (error){
    console.warn("[TV - Music]", error.message);
    if (id === bootId) renderSetup([{ text: error.message, className: "spotify-setup-error" }, openStep]);
  }
  return true;
}

// ------------------------------------
// Init
// ------------------------------------
async function boot(fieldData){
  bootId += 1;
  const id = bootId;
  clearTimeout(pollTimer);
  const previous = SETTINGS;
  SETTINGS = normalizeFields(fieldData);
  if (previous.spotify_refresh_token !== SETTINGS.spotify_refresh_token || previous.spotify_client_secret !== SETTINGS.spotify_client_secret){
    accessToken = null;
    accessTokenExpiresAt = 0;
  }
  document.getElementById("musicTitle").textContent = SETTINGS.music_title;
  NOW = null;
  render();
  if (await runSpotifySetup(id)) return;
  poll(id);
}

window.addEventListener("onWidgetLoad", async (obj) => {
  try {
    EDITOR_MODE = Boolean((await withTimeout(window.SE_API?.getOverlayStatus?.(), 1500))?.isEditorMode);
  } catch (_){
    EDITOR_MODE = false;
  }
  boot(obj?.detail?.fieldData);
});

window.addEventListener("onWidgetUpdate", (obj) => boot(obj?.detail?.fieldData));

window.addEventListener("onEventReceived", ({ detail }) => {
  const event = detail?.event || {};
  // Sur un overlay, le clic est envoyé à tous les widgets : seulement notre champ
  if ((detail?.listener || event.listener) === "widget-button" && event.field === "test_track") showTestTrack();
});
