const ACTIVITY_LISTENERS = {
  follow: "follower-latest",
  follower: "follower-latest",
  subscriber: "subscriber-latest",
  sponsor: "subscriber-latest",
  supporter: "subscriber-latest",
  sponsorship: "subscriber-latest",
  sponsorshipPassive: "subscriber-latest",
  communityGiftPurchase: "subscriber-latest",
  tip: "tip-latest",
  superchat: "tip-latest",
  cheer: "cheer-latest",
  cheerPurchase: "cheer-latest",
  stars: "cheer-latest",
  raid: "raid-latest",
  host: "host-latest"
};

/** Convertit une activite Astro vers la forme recue par un Custom Widget. */
export function activityToWidgetEvent(activity) {
  if (!activity || typeof activity !== "object") return null;

  const listener = ACTIVITY_LISTENERS[activity.type];
  if (!listener) return null;

  const source = activity.data && typeof activity.data === "object" ? activity.data : {};
  const name = source.displayName ?? source.username ?? source.name ?? "Anonyme";

  return {
    listener,
    event: {
      ...source,
      name,
      amount: source.amount ?? activity.amount ?? 0,
      message: source.message ?? activity.message ?? "",
      provider: activity.provider,
      activityId: activity.activityId ?? activity._id,
      _raw: activity
    }
  };
}

/** Ramene les payloads Twitch, YouTube et Kick d'Astro vers event.data du widget. */
export function chatMessageToWidgetData(raw) {
  if (!raw || typeof raw !== "object") return raw;

  if (raw.chatter_user_id || raw.broadcaster_user_id) {
    return {
      time: Date.now(),
      nick: raw.chatter_user_login,
      userId: raw.chatter_user_id,
      displayName: raw.chatter_user_name ?? raw.chatter_user_login,
      displayColor: raw.color || "",
      badges: (raw.badges || []).map((badge) => ({
        type: badge.set_id,
        version: badge.id,
        info: badge.info
      })),
      text: raw.message?.text ?? "",
      isAction: raw.message_type === "action",
      emotes: raw.message?.fragments?.filter((fragment) => fragment.type === "emote") ?? [],
      _raw: raw
    };
  }

  if (raw.authorDetails || raw.snippet) {
    return {
      time: Date.parse(raw.snippet?.publishedAt) || Date.now(),
      nick: raw.authorDetails?.displayName,
      userId: raw.authorDetails?.channelId ?? raw.snippet?.authorChannelId,
      displayName: raw.authorDetails?.displayName,
      displayColor: "",
      badges: [],
      text: raw.snippet?.displayMessage ?? raw.snippet?.textMessageDetails?.messageText ?? "",
      isAction: false,
      emotes: [],
      _raw: raw
    };
  }

  if (raw.sender || raw.content) {
    return {
      time: Date.now(),
      nick: raw.sender?.username,
      userId: raw.sender?.user_id,
      displayName: raw.sender?.username,
      displayColor: "",
      badges: [],
      text: raw.content ?? "",
      isAction: false,
      emotes: raw.emotes ?? [],
      _raw: raw
    };
  }

  return raw;
}

/** Convertit les sujets Astro connus en evenements du simulateur. */
export function astroToLabEvents(message, currentSession = {}) {
  if (!message || message.type !== "message") return [];

  if (message.topic === "channel.activities") {
    const widgetEvent = activityToWidgetEvent(message.data);
    return widgetEvent
      ? [{ type: "onEventReceived", detail: widgetEvent }]
      : [];
  }

  if (message.topic === "channel.chat.message") {
    return [{
      type: "onEventReceived",
      detail: { listener: "message", event: { data: chatMessageToWidgetData(message.data) } }
    }];
  }

  if (message.topic === "channel.session.update") {
    const update = message.data ?? {};
    const key = update.key ?? update.name;
    if (!key) return [];
    const session = { ...currentSession, [key]: update.data };
    return [{ type: "onSessionUpdate", detail: { session }, session }];
  }

  if (message.topic === "channel.session.reset") {
    const session = message.data && typeof message.data === "object" ? message.data : {};
    return [{ type: "onSessionUpdate", detail: { session }, session }];
  }

  if (message.topic === "channel.kvstore.update") {
    return [{
      type: "onEventReceived",
      detail: { listener: "kvstore:update", event: { data: message.data } }
    }];
  }

  if (message.topic === "channel.overlay.broadcast") {
    return [{
      type: "onEventReceived",
      detail: {
        listener: message.data?.event ?? "event",
        event: message.data?.data ?? message.data
      }
    }];
  }

  return [];
}

// --- OAuth2 + section "Medias" (images/videos deja utilisees dans les
// overlays StreamElements existants) ---
//
// StreamElements ne documente aucun endpoint pour lister les fichiers
// uploades sur un compte (seuls un POST d'ajout et un DELETE par id existent,
// cf. recherche prealable) : la seule facon de retrouver des medias deja en
// place est de parcourir les overlays existants (scope overlays:read) et d'en
// extraire les URLs d'image/video referencees dans leurs widgets.
const SE_OAUTH_AUTHORIZE_URL = "https://api.streamelements.com/oauth2/authorize";
const SE_OAUTH_TOKEN_URL = "https://api.streamelements.com/oauth2/token";
const SE_API_BASE = "https://api.streamelements.com/kappa/v2";
// channel:read est necessaire pour resoudre l'id du salon (GET /channels/me)
// avant de pouvoir lister ses overlays.
const SE_OAUTH_SCOPES = "channel:read overlays:read";

export function buildStreamElementsAuthorizeUrl({ clientId, redirectUri, state }) {
  const url = new URL(SE_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SE_OAUTH_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

// Deux sources officielles StreamElements se contredisent sur le transport
// des paramètres ici : leur doc OAuth2.md montre un curl avec des -d (donc
// en corps x-www-form-urlencoded), mais leur propre exemple Node.js
// (authentication-samples/nodejs/index.js) les passe en query string sur le
// POST, avec un corps vide. Faute de compte réel pour trancher, on envoie
// les deux à la fois — sans coût, et ça couvre les deux implémentations
// possibles côté serveur StreamElements.
export async function exchangeStreamElementsCode({ code, clientId, clientSecret, redirectUri }, fetchImpl = fetch) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri
  });
  const response = await fetchImpl(`${SE_OAUTH_TOKEN_URL}?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
  if (!response.ok) throw new Error(`Echange du code StreamElements echoue (${response.status})`);
  return response.json();
}

// Prefixe d'Authorization selon le type de jeton : les endpoints
// /channels/me et /overlays/* acceptent indifferemment un jeton JWT "perso"
// (Chaines > JWT Token), une cle apikey (Chaines > Overlay Token) ou un
// access_token OAuth2 - chacun avec son propre prefixe, aucun scope
// particulier requis pour du JWT/apikey (contrairement a OAuth2 qui exige
// overlays:read). D'apres leur schema de securite officiel + l'exemple curl
// concret de leur doc OAuth2.md ("oAuth", pas "Bearer" ni "oauth2").
const SE_AUTH_PREFIXES = { jwt: "bearer", apikey: "apikey", oauth2: "oAuth" };

function streamElementsAuthHeader(token, tokenType = "oauth2") {
  const prefix = SE_AUTH_PREFIXES[tokenType] || SE_AUTH_PREFIXES.oauth2;
  return { Authorization: `${prefix} ${token}` };
}

/** GET /channels/me - identifie le salon lie au token (necessaire : les endpoints overlays prennent un id de salon, jamais juste "me"). */
export async function fetchStreamElementsChannel(token, tokenType = "oauth2", fetchImpl = fetch) {
  const response = await fetchImpl(`${SE_API_BASE}/channels/me`, { headers: streamElementsAuthHeader(token, tokenType) });
  if (!response.ok) throw new Error(`Recuperation du salon StreamElements echouee (${response.status})`);
  return response.json();
}

export async function fetchStreamElementsOverlays(token, channelId, tokenType = "oauth2", fetchImpl = fetch) {
  const response = await fetchImpl(`${SE_API_BASE}/overlays/${encodeURIComponent(channelId)}`, {
    headers: streamElementsAuthHeader(token, tokenType)
  });
  if (!response.ok) throw new Error(`Recuperation des overlays StreamElements echouee (${response.status})`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload : payload.docs || [];
}

export async function fetchStreamElementsOverlay(token, channelId, overlayId, tokenType = "oauth2", fetchImpl = fetch) {
  const response = await fetchImpl(
    `${SE_API_BASE}/overlays/${encodeURIComponent(channelId)}/${encodeURIComponent(overlayId)}`,
    { headers: streamElementsAuthHeader(token, tokenType) }
  );
  if (!response.ok) throw new Error(`Recuperation de l'overlay StreamElements ${overlayId} echouee (${response.status})`);
  return response.json();
}

const MEDIA_URL_PATTERN = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|mp4|webm|mov)(\?\S*)?$/i;
const VIDEO_EXTENSION_PATTERN = /\.(mp4|webm|mov)(\?\S*)?$/i;

/**
 * Parcourt recursivement le JSON d'un overlay (widgets, css, texte...) et
 * retient toute chaine ressemblant a une URL d'image/video. Volontairement
 * generique (pas un chemin fige par type de widget) : le schema d'un widget
 * StreamElements varie enormement selon son type (image/video/texte/alert...)
 * et un simple scan par motif est plus robuste qu'une liste de champs a jour.
 */
export function extractMediaFromOverlay(overlay, overlayName) {
  const found = new Map();
  const visit = (value) => {
    if (typeof value === "string") {
      if (MEDIA_URL_PATTERN.test(value) && !found.has(value)) {
        found.set(value, {
          url: value,
          type: VIDEO_EXTENSION_PATTERN.test(value) ? "video" : "image",
          overlayName: overlayName || overlay?.name || null
        });
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    if (value && typeof value === "object") {
      for (const entry of Object.values(value)) visit(entry);
    }
  };
  visit(overlay?.widgets ?? overlay);
  return [...found.values()];
}

export function parseEnv(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}
