import { createReadStream, existsSync, readFileSync, statSync, watch } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  astroToLabEvents,
  parseEnv,
  buildStreamElementsAuthorizeUrl,
  exchangeStreamElementsCode,
  fetchStreamElementsChannel,
  fetchStreamElementsOverlays,
  fetchStreamElementsOverlay,
  extractMediaFromOverlay,
  convertOverlayWidget
} from "./lib/streamelements.mjs";
import { streamlabsEventToLabEvents } from "./lib/streamlabs.mjs";
import { parseCookies, serializeCookie } from "./lib/cookies.mjs";
import {
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  buildTwitchAuthorizeUrl,
  exchangeCodeForToken,
  fetchTwitchUser,
  requireSession,
  signSessionCookie
} from "./lib/auth.mjs";
import { store } from "./lib/db.mjs";
import { decryptIntegrationToken, disconnectIntegration, maskIntegration, saveManualToken } from "./lib/integrations.mjs";
import { saveContactMessage } from "./lib/contact.mjs";
import { deleteLocalMedia, listLocalMedia, resolveLocalMediaPath, saveLocalMedia, MAX_MEDIA_BYTES, MEDIA_URL_PREFIX } from "./lib/media.mjs";
import {
  LIBRARY_ROOT,
  categoryDirsForProject,
  categoryDirectory,
  widgetFromManifest,
  listWidgets,
  getWidgetInfo,
  bumpUpdatedAt
} from "./lib/widgets.mjs";
import {
  listOverlays,
  getOverlayInfo,
  createOverlay,
  updateOverlayMetadata,
  updateOverlaySource,
  replaceOverlayItems,
  replaceOverlayGuides,
  deleteOverlay,
  duplicateOverlay
} from "./lib/overlays.mjs";
import {
  RESERVED_PROJECT_IDS,
  listProjects,
  getProjectInfo,
  createProject,
  updateProjectMetadata,
  deleteProject,
  migrateLegacyLibrary
} from "./lib/projects.mjs";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
// Sert le build de production Vue (frontend/dist, genere par
// `npm run build` dans frontend/) au lieu de l'ancien public/ vanille,
// retire lors de la bascule vers le nouveau frontend (cf. README).
const PUBLIC_ROOT = join(ROOT, "frontend", "dist");
const DEFAULT_WIDGET_ID = "zer0oes-goal-bar";
const MOCK_SESSION_PATH = join(ROOT, "mocks", "session.json");
const ENV_PATH = join(ROOT, ".env");
const widgetPlatformFiles = {
  streamelements: {
    js: "widget.streamelements.js",
    fields: "fields.streamelements.json",
    data: "data.streamelements.json"
  },
  streamlabs: {
    js: "widget.streamlabs.js",
    fields: "fields.streamlabs.json",
    data: "data.streamlabs.json"
  }
};
const editableWidgetFiles = new Set([
  "widget.html",
  "widget.css",
  "widget.streamelements.js",
  "fields.streamelements.json",
  "widget.streamlabs.js",
  "fields.streamlabs.json",
  "data.streamelements.json",
  "data.streamlabs.json"
]);

if (existsSync(ENV_PATH)) Object.assign(process.env, parseEnv(readFileSync(ENV_PATH, "utf8")));

const port = Number(process.env.PORT) || 4173;

const config = {
  channelId: process.env.SE_CHANNEL_ID?.trim() ?? "",
  channelName: process.env.SE_CHANNEL_NAME?.trim() || "MaChaine",
  token: process.env.SE_TOKEN?.trim() ?? "",
  tokenType: process.env.SE_TOKEN_TYPE?.trim() || "jwt",
  topics: (process.env.SE_TOPICS || "channel.activities,channel.session.update,channel.session.reset,channel.chat.message")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean),
  streamlabsToken: process.env.SL_SOCKET_TOKEN?.trim() ?? "",
  twitchClientId: process.env.TWITCH_CLIENT_ID?.trim() ?? "",
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET?.trim() ?? "",
  twitchRedirectUri: process.env.TWITCH_REDIRECT_URI?.trim() || `http://localhost:${port}/auth/twitch/callback`,
  seOAuthClientId: process.env.SE_OAUTH_CLIENT_ID?.trim() ?? "",
  seOAuthClientSecret: process.env.SE_OAUTH_CLIENT_SECRET?.trim() ?? "",
  seOAuthRedirectUri: process.env.SE_OAUTH_REDIRECT_URI?.trim() || `http://localhost:${port}/auth/streamelements/callback`,
  sessionSecret: process.env.SESSION_SECRET?.trim() ?? "",
  cookieSecure: process.env.COOKIE_SECURE?.trim() === "true"
};
const authConfigured = Boolean(config.twitchClientId && config.twitchClientSecret && config.sessionSecret);
const seOAuthConfigured = Boolean(config.seOAuthClientId && config.seOAuthClientSecret && config.sessionSecret);
const SE_OAUTH_STATE_COOKIE_NAME = "swx_se_oauth_state";
// Un scan complet des overlays (liste + detail de chacun) a chaque ouverture
// du panneau Medias serait lent et user-agent-agressif envers l'API
// StreamElements : ce cache en memoire (par utilisateur) evite de re-scanner
// a chaque appel tant qu'il n'a pas expire.
const streamElementsMediaCache = new Map(); // userId -> { expiresAt, media }
const SE_MEDIA_CACHE_TTL_MS = 5 * 60 * 1000;

store.deleteExpiredSessions();
await migrateLegacyLibrary();

let session = await readJson(MOCK_SESSION_PATH);
let liveStatus = config.channelId && config.token ? "connecting" : "disabled";
let liveStatusStreamlabs = config.streamlabsToken ? "connecting" : "disabled";
const sseClients = new Set();
const changedWidgetFiles = new Set();
let widgetReloadTimer;
let publicReloadTimer;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".woff2": "font/woff2"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "GET" && url.pathname === "/api/projects") {
      return sendJson(response, 200, { projects: await listProjects() });
    }

    if (request.method === "POST" && url.pathname === "/api/projects") {
      const body = await readRequestJson(request);
      let metadata;
      try {
        metadata = parseProjectMetadataInput(body);
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
      const existingIds = new Set([...(await listProjects()).map((entry) => entry.id), ...RESERVED_PROJECT_IDS]);
      const projectId = uniqueWidgetId(slugify(metadata.name), existingIds);
      const project = await createProject({ id: projectId, ...metadata });
      return sendJson(response, 201, { project });
    }

    if (request.method === "PUT" && url.pathname === "/api/project/metadata") {
      const body = await readRequestJson(request);
      let metadata;
      try {
        metadata = parseProjectMetadataInput(body);
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
      const project = await updateProjectMetadata(body.projectId, metadata);
      if (!project) return sendJson(response, 404, { error: "Projet introuvable" });
      return sendJson(response, 200, { project });
    }

    if (request.method === "DELETE" && url.pathname === "/api/project") {
      const projectId = url.searchParams.get("id");
      const projectInfo = await getProjectInfo(projectId);
      if (!projectInfo) return sendJson(response, 404, { error: "Projet introuvable" });
      if ((await listProjects()).length <= 1) {
        return sendJson(response, 400, { error: "Impossible de supprimer le dernier projet" });
      }
      await deleteProject(projectId);
      return sendJson(response, 200, { deleted: true, projectId });
    }

    // Deplace un widget/alerte vers un autre projet (glisser-deposer ou
    // dialogue de modification cote client) : les ids restent uniques sur
    // toute la bibliotheque (cf. allWidgetIds), donc un simple renommage de
    // dossier suffit, jamais besoin de recalculer l'id.
    if (request.method === "PUT" && url.pathname === "/api/widget/project") {
      const body = await readRequestJson(request);
      const found = await findWidgetInfo(body.widgetId);
      if (!found) return sendJson(response, 404, { error: "Widget introuvable" });
      const targetProject = await getProjectInfo(body.projectId);
      if (!targetProject) return sendJson(response, 404, { error: "Projet introuvable" });

      await moveWidgetDirectory(found, targetProject.id);

      const { directory, ...widget } = await getWidgetInfo(body.widgetId, categoryDirsForProject(targetProject.id));
      return sendJson(response, 200, { widget: { ...widget, projectId: targetProject.id } });
    }

    if (request.method === "PUT" && url.pathname === "/api/overlay/project") {
      const body = await readRequestJson(request);
      const found = await findOverlayInfo(body.overlayId);
      if (!found) return sendJson(response, 404, { error: "Overlay introuvable" });
      const targetProject = await getProjectInfo(body.projectId);
      if (!targetProject) return sendJson(response, 404, { error: "Projet introuvable" });

      let movedWidgetIds = [];
      if (found.projectId !== targetProject.id) {
        const targetDirectory = join(LIBRARY_ROOT, targetProject.id, "overlays", body.overlayId);
        await mkdir(dirname(targetDirectory), { recursive: true });
        await rename(found.overlayInfo.directory, targetDirectory);

        // Un overlay ne propose que les widgets/alertes de son PROPRE projet
        // (cf. openOverlayItemPicker cote client) : on emmene avec lui tout
        // widget/alerte qu'il reference et qui vivrait encore dans l'ancien
        // projet, sinon ces references pointeraient dans le vide une fois
        // l'overlay deplace.
        const referencedWidgetIds = [...new Set(
          (found.overlayInfo.items || [])
            .filter((item) => (item.type === "widget" || item.type === "alert") && item.widgetId)
            .map((item) => item.widgetId)
        )];
        for (const widgetId of referencedWidgetIds) {
          const referencedWidget = await findWidgetInfo(widgetId);
          if (referencedWidget && referencedWidget.projectId !== targetProject.id) {
            await moveWidgetDirectory(referencedWidget, targetProject.id);
            movedWidgetIds.push(widgetId);
          }
        }
      }

      const { directory, ...overlay } = await getOverlayInfo(targetProject.id, body.overlayId);
      return sendJson(response, 200, { overlay: { ...overlay, projectId: targetProject.id }, movedWidgetIds });
    }

    if (request.method === "GET" && url.pathname === "/api/widgets") {
      return sendJson(response, 200, { widgets: await listAllWidgets(), defaultWidgetId: DEFAULT_WIDGET_ID });
    }

    if (request.method === "GET" && url.pathname === "/api/widget") {
      const platform = url.searchParams.get("platform") === "streamlabs" ? "streamlabs" : "streamelements";
      const widgetId = url.searchParams.get("id") || DEFAULT_WIDGET_ID;
      const found = await findWidgetInfo(widgetId);
      if (!found) return sendJson(response, 404, { error: "Widget introuvable" });
      const loaded = await loadWidget(found.widgetInfo, platform);
      loaded.widgetMeta.projectId = found.projectId;
      return sendJson(response, 200, loaded);
    }

    if (request.method === "PUT" && url.pathname === "/api/widget/file") {
      const body = await readRequestJson(request);
      const found = await findWidgetInfo(body.widgetId);
      if (!found) return sendJson(response, 404, { error: "Widget introuvable" });
      if (!editableWidgetFiles.has(body.file)) {
        return sendJson(response, 400, { error: "Fichier de widget non autorise" });
      }
      try {
        assertValidWidgetFileContent(body.file, body.content);
      } catch (error) {
        return sendJson(response, error.status || 400, { error: error.message });
      }
      const path = join(found.widgetInfo.directory, body.file);
      await writeFile(path, body.content, "utf8");
      await bumpUpdatedAt(found.widgetInfo.directory);
      return sendJson(response, 200, { saved: true, widgetId: found.widgetInfo.id, file: body.file, at: Date.now() });
    }

    if (request.method === "POST" && url.pathname === "/api/widgets") {
      const body = await readRequestJson(request);
      let metadata;
      try {
        metadata = parseWidgetMetadataInput(body);
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
      const type = body.type === "alert" ? "alert" : "widget";
      const projectInfo = await getProjectInfo(body.projectId);
      if (!projectInfo) return sendJson(response, 404, { error: "Projet introuvable" });

      const widgets = await listWidgets(categoryDirsForProject(projectInfo.id));
      const widgetId = uniqueWidgetId(slugify(metadata.name), await allWidgetIds());
      const order = widgets.reduce((max, entry) => Math.max(max, entry.order), 0) + 10;
      const now = Date.now();
      const manifest = { id: widgetId, ...metadata, order, createdAt: now, updatedAt: now };
      const directory = join(categoryDirectory(projectInfo.id, type), widgetId);

      await createWidgetFiles(directory);
      await writeFile(join(directory, "widget.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

      return sendJson(response, 201, { widget: { ...widgetFromManifest(widgetId, manifest, type), projectId: projectInfo.id } });
    }

    if (request.method === "PUT" && url.pathname === "/api/widget/metadata") {
      const body = await readRequestJson(request);
      const found = await findWidgetInfo(body.widgetId);
      if (!found) return sendJson(response, 404, { error: "Widget introuvable" });
      const { projectId, widgetInfo } = found;

      let metadata;
      try {
        metadata = parseWidgetMetadataInput(body);
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
      const type = body.type === "alert" ? "alert" : "widget";

      const manifestPath = join(widgetInfo.directory, "widget.json");
      const manifest = await readJson(manifestPath);
      const updatedManifest = { ...manifest, ...metadata, updatedAt: Date.now() };

      let targetDirectory = widgetInfo.directory;
      if (type !== widgetInfo.type) {
        targetDirectory = join(categoryDirectory(projectId, type), widgetInfo.id);
        await mkdir(dirname(targetDirectory), { recursive: true });
        await rename(widgetInfo.directory, targetDirectory);
      }

      await writeFile(join(targetDirectory, "widget.json"), `${JSON.stringify(updatedManifest, null, 2)}\n`, "utf8");
      return sendJson(response, 200, { widget: { ...widgetFromManifest(widgetInfo.id, updatedManifest, type), projectId } });
    }

    if (request.method === "DELETE" && url.pathname === "/api/widget") {
      const found = await findWidgetInfo(url.searchParams.get("id"));
      if (!found) return sendJson(response, 404, { error: "Widget introuvable" });
      await rm(found.widgetInfo.directory, { recursive: true, force: true });
      return sendJson(response, 200, { deleted: true, widgetId: found.widgetInfo.id });
    }

    if (request.method === "GET" && url.pathname === "/api/overlays") {
      return sendJson(response, 200, { overlays: await listAllOverlays() });
    }

    if (request.method === "GET" && url.pathname === "/api/overlay") {
      const found = await findOverlayInfo(url.searchParams.get("id"));
      if (!found) return sendJson(response, 404, { error: "Overlay introuvable" });
      return sendJson(response, 200, { overlay: { ...found.overlayInfo, projectId: found.projectId } });
    }

    if (request.method === "POST" && url.pathname === "/api/overlays") {
      const body = await readRequestJson(request);
      let metadata;
      try {
        metadata = parseWidgetMetadataInput(body);
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
      const projectInfo = await getProjectInfo(body.projectId);
      if (!projectInfo) return sendJson(response, 404, { error: "Projet introuvable" });

      const overlayId = uniqueWidgetId(slugify(metadata.name), await allOverlayIds());
      const overlay = await createOverlay(projectInfo.id, { id: overlayId, ...metadata, canvas: { width: body.width, height: body.height } });
      return sendJson(response, 201, { overlay: { ...overlay, projectId: projectInfo.id } });
    }

    if (request.method === "PUT" && url.pathname === "/api/overlay/metadata") {
      const body = await readRequestJson(request);
      let metadata;
      try {
        metadata = parseWidgetMetadataInput(body);
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
      const found = await findOverlayInfo(body.overlayId);
      if (!found) return sendJson(response, 404, { error: "Overlay introuvable" });
      const overlay = await updateOverlayMetadata(found.projectId, body.overlayId, { ...metadata, canvas: { width: body.width, height: body.height } });
      return sendJson(response, 200, { overlay: { ...overlay, projectId: found.projectId } });
    }

    if (request.method === "PUT" && url.pathname === "/api/overlay/source") {
      const body = await readRequestJson(request);
      const sourcePlatform = ["streamelements", "streamlabs"].includes(body.sourcePlatform) ? body.sourcePlatform : null;
      // Dissocier (sourcePlatform null) efface aussi sourceOverlayId : les
      // deux champs vivent ou meurent ensemble, jamais l'un sans l'autre.
      const sourceOverlayId = sourcePlatform && typeof body.sourceOverlayId === "string" && body.sourceOverlayId
        ? body.sourceOverlayId
        : null;
      if (sourcePlatform && !sourceOverlayId) {
        return sendJson(response, 400, { error: "sourceOverlayId manquant" });
      }

      if (sourcePlatform) {
        const overlays = await listAllOverlays();
        const conflict = overlays.find(
          (entry) => entry.id !== body.overlayId && entry.sourcePlatform === sourcePlatform && entry.sourceOverlayId === sourceOverlayId
        );
        if (conflict) {
          return sendJson(response, 409, { error: `Deja associe a l'overlay local "${conflict.name}"` });
        }
      }

      const found = await findOverlayInfo(body.overlayId);
      if (!found) return sendJson(response, 404, { error: "Overlay introuvable" });
      const overlay = await updateOverlaySource(found.projectId, body.overlayId, { sourcePlatform, sourceOverlayId });
      return sendJson(response, 200, { overlay: { ...overlay, projectId: found.projectId } });
    }

    if (request.method === "PUT" && url.pathname === "/api/overlay/items") {
      const body = await readRequestJson(request);
      if (!Array.isArray(body.items)) return sendJson(response, 400, { error: "Items invalides" });
      const found = await findOverlayInfo(body.overlayId);
      if (!found) return sendJson(response, 404, { error: "Overlay introuvable" });
      const overlay = await replaceOverlayItems(found.projectId, body.overlayId, body.items);
      return sendJson(response, 200, { saved: true, overlayId: overlay.id, at: Date.now() });
    }

    if (request.method === "PUT" && url.pathname === "/api/overlay/guides") {
      const body = await readRequestJson(request);
      if (!body.guides || typeof body.guides !== "object") return sendJson(response, 400, { error: "Repères invalides" });
      const found = await findOverlayInfo(body.overlayId);
      if (!found) return sendJson(response, 404, { error: "Overlay introuvable" });
      const overlay = await replaceOverlayGuides(found.projectId, body.overlayId, body.guides);
      return sendJson(response, 200, { saved: true, overlayId: overlay.id, at: Date.now() });
    }

    if (request.method === "DELETE" && url.pathname === "/api/overlay") {
      const overlayId = url.searchParams.get("id");
      const found = await findOverlayInfo(overlayId);
      if (!found) return sendJson(response, 404, { error: "Overlay introuvable" });
      await deleteOverlay(found.projectId, overlayId);
      return sendJson(response, 200, { deleted: true, overlayId });
    }

    if (request.method === "POST" && url.pathname === "/api/overlay/duplicate") {
      const body = await readRequestJson(request);
      const found = await findOverlayInfo(body.overlayId);
      if (!found) return sendJson(response, 404, { error: "Overlay introuvable" });
      const newName = `${found.overlayInfo.name} (copie)`;
      const newId = uniqueWidgetId(slugify(newName), await allOverlayIds());
      const overlay = await duplicateOverlay(found.projectId, body.overlayId, newId, newName);
      if (!overlay) return sendJson(response, 404, { error: "Overlay introuvable" });
      return sendJson(response, 201, { overlay: { ...overlay, projectId: found.projectId } });
    }

    if (request.method === "GET" && url.pathname === "/api/state") {
      return sendJson(response, 200, {
        session,
        channel: { id: config.channelId || "local-channel", username: config.channelName },
        live: { streamelements: liveStatus, streamlabs: liveStatusStreamlabs }
      });
    }

    if (request.method === "GET" && url.pathname === "/api/stream") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*"
      });
      response.write(`event: status\ndata: ${JSON.stringify({ status: liveStatus })}\n\n`);
      sseClients.add(response);
      request.on("close", () => sseClients.delete(response));
      return;
    }

    // --- Comptes & integrations ---

    if (request.method === "GET" && url.pathname === "/auth/twitch/start") {
      if (!authConfigured) {
        response.writeHead(302, { Location: "/?account=open&error=twitch_not_configured" });
        return response.end();
      }
      const state = randomUUID();
      response.setHeader("Set-Cookie", serializeCookie(OAUTH_STATE_COOKIE_NAME, state, { maxAgeSeconds: 600, secure: config.cookieSecure }));
      const authorizeUrl = buildTwitchAuthorizeUrl({
        clientId: config.twitchClientId,
        redirectUri: config.twitchRedirectUri,
        state
      });
      response.writeHead(302, { Location: authorizeUrl });
      return response.end();
    }

    if (request.method === "GET" && url.pathname === "/auth/twitch/callback") {
      const cookies = parseCookies(request.headers.cookie);
      const expectedState = cookies[OAUTH_STATE_COOKIE_NAME];
      const returnedState = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      const clearStateCookie = serializeCookie(OAUTH_STATE_COOKIE_NAME, "", { maxAgeSeconds: 0, secure: config.cookieSecure });

      if (url.searchParams.get("error") || !code || !expectedState || expectedState !== returnedState) {
        response.setHeader("Set-Cookie", clearStateCookie);
        response.writeHead(302, { Location: "/?account=open&login=cancelled" });
        return response.end();
      }

      try {
        const tokenResponse = await exchangeCodeForToken({
          code,
          clientId: config.twitchClientId,
          clientSecret: config.twitchClientSecret,
          redirectUri: config.twitchRedirectUri
        });
        const twitchUser = await fetchTwitchUser(tokenResponse.access_token, config.twitchClientId);
        const user = store.upsertUserFromTwitch(twitchUser);
        const newSession = store.createSession(user.id);
        const sessionCookie = serializeCookie(SESSION_COOKIE_NAME, signSessionCookie(newSession.id, config.sessionSecret), {
          maxAgeSeconds: Math.floor((newSession.expiresAt - Date.now()) / 1000),
          secure: config.cookieSecure
        });
        response.setHeader("Set-Cookie", [clearStateCookie, sessionCookie]);
        response.writeHead(302, { Location: "/?account=open" });
        return response.end();
      } catch (error) {
        console.error(error);
        response.setHeader("Set-Cookie", clearStateCookie);
        response.writeHead(302, { Location: "/?account=open&login=failed" });
        return response.end();
      }
    }

    if (request.method === "GET" && url.pathname === "/auth/streamelements/start") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      if (!auth) {
        response.writeHead(302, { Location: "/?account=open&error=login_required" });
        return response.end();
      }
      if (!seOAuthConfigured) {
        response.writeHead(302, { Location: "/?account=open&error=streamelements_not_configured" });
        return response.end();
      }
      const state = randomUUID();
      response.setHeader("Set-Cookie", serializeCookie(SE_OAUTH_STATE_COOKIE_NAME, state, { maxAgeSeconds: 600, secure: config.cookieSecure }));
      const authorizeUrl = buildStreamElementsAuthorizeUrl({
        clientId: config.seOAuthClientId,
        redirectUri: config.seOAuthRedirectUri,
        state
      });
      response.writeHead(302, { Location: authorizeUrl });
      return response.end();
    }

    if (request.method === "GET" && url.pathname === "/auth/streamelements/callback") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      const cookies = parseCookies(request.headers.cookie);
      const expectedState = cookies[SE_OAUTH_STATE_COOKIE_NAME];
      const returnedState = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      const clearStateCookie = serializeCookie(SE_OAUTH_STATE_COOKIE_NAME, "", { maxAgeSeconds: 0, secure: config.cookieSecure });

      if (!auth || url.searchParams.get("error") || !code || !expectedState || expectedState !== returnedState) {
        response.setHeader("Set-Cookie", clearStateCookie);
        response.writeHead(302, { Location: "/?account=open&streamelements=cancelled" });
        return response.end();
      }

      try {
        const tokenResponse = await exchangeStreamElementsCode({
          code,
          clientId: config.seOAuthClientId,
          clientSecret: config.seOAuthClientSecret,
          redirectUri: config.seOAuthRedirectUri
        });
        const channel = await fetchStreamElementsChannel(tokenResponse.access_token, "oauth2");
        saveManualToken({
          userId: auth.user.id,
          provider: "streamelements",
          channelId: channel._id,
          channelName: channel.displayName || channel.username || null,
          token: JSON.stringify({ accessToken: tokenResponse.access_token, refreshToken: tokenResponse.refresh_token || null }),
          tokenType: "oauth2",
          topics: null
        }, store);
        streamElementsMediaCache.delete(auth.user.id);
        response.setHeader("Set-Cookie", clearStateCookie);
        response.writeHead(302, { Location: "/?account=open&streamelements=connected" });
        return response.end();
      } catch (error) {
        console.error(error);
        response.setHeader("Set-Cookie", clearStateCookie);
        response.writeHead(302, { Location: "/?account=open&streamelements=failed" });
        return response.end();
      }
    }

    if (request.method === "GET" && url.pathname === "/api/integrations/streamelements/media") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      if (!auth) return sendJson(response, 401, { error: "Non authentifie" });

      const cached = streamElementsMediaCache.get(auth.user.id);
      if (cached && cached.expiresAt > Date.now()) {
        return sendJson(response, 200, { media: cached.media, cached: true });
      }

      const credentials = resolveStreamElementsCredentials(auth);
      if (!credentials) return sendJson(response, 404, { error: "StreamElements non connecte" });

      try {
        const { token, tokenType, channelId } = credentials;
        const overlays = await fetchStreamElementsOverlays(token, channelId, tokenType);
        const media = [];
        const seen = new Set();
        for (const summary of overlays) {
          const overlayId = summary._id || summary.id;
          if (!overlayId) continue;
          const detail = await fetchStreamElementsOverlay(token, channelId, overlayId, tokenType);
          for (const item of extractMediaFromOverlay(detail, summary.name)) {
            if (seen.has(item.url)) continue;
            seen.add(item.url);
            media.push(item);
          }
        }
        streamElementsMediaCache.set(auth.user.id, { media, expiresAt: Date.now() + SE_MEDIA_CACHE_TTL_MS });
        return sendJson(response, 200, { media, cached: false });
      } catch (error) {
        return sendJson(response, 502, { error: `Recuperation des medias StreamElements impossible : ${error.message}` });
      }
    }

    if (request.method === "GET" && url.pathname === "/api/integrations/streamelements/overlays") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      if (!auth) return sendJson(response, 401, { error: "Non authentifie" });

      const credentials = resolveStreamElementsCredentials(auth);
      if (!credentials) return sendJson(response, 404, { error: "StreamElements non connecte" });

      try {
        const { token, tokenType, channelId } = credentials;
        const overlays = await fetchStreamElementsOverlays(token, channelId, tokenType);
        return sendJson(response, 200, {
          overlays: overlays.map((summary) => ({
            id: summary._id || summary.id,
            name: summary.name || "Overlay",
            preview: summary.preview || null,
            widgetCount: Array.isArray(summary.widgets) ? summary.widgets.length : null
          })).filter((entry) => entry.id)
        });
      } catch (error) {
        return sendJson(response, 502, { error: `Recuperation des overlays StreamElements impossible : ${error.message}` });
      }
    }

    if (request.method === "POST" && url.pathname === "/api/integrations/streamelements/overlays/import") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      if (!auth) return sendJson(response, 401, { error: "Non authentifie" });

      const credentials = resolveStreamElementsCredentials(auth);
      if (!credentials) return sendJson(response, 404, { error: "StreamElements non connecte" });

      const body = await readRequestJson(request);
      if (typeof body.overlayId !== "string" || !body.overlayId) {
        return sendJson(response, 400, { error: "overlayId manquant" });
      }

      try {
        const { token, tokenType, channelId } = credentials;
        const detail = await fetchStreamElementsOverlay(token, channelId, body.overlayId, tokenType);
        const overlayName = detail.name || "Overlay StreamElements";
        const canvas = { width: detail.settings?.width, height: detail.settings?.height };

        // Un meme overlay StreamElements deja importe est retrouve via
        // sourcePlatform+sourceOverlayId et mis a jour sur place (dans son
        // projet d'origine) plutot que recree, pour ne jamais accumuler de
        // doublons a chaque reimport.
        const existingOverlays = await listAllOverlays();
        const alreadyImported = existingOverlays.find(
          (entry) => entry.sourcePlatform === "streamelements" && entry.sourceOverlayId === body.overlayId
        );

        let overlay;
        let projectId;
        if (alreadyImported) {
          projectId = alreadyImported.projectId;
          overlay = await updateOverlayMetadata(projectId, alreadyImported.id, {
            name: overlayName,
            description: alreadyImported.description,
            icon: alreadyImported.icon,
            canvas
          });
        } else {
          const projectInfo = await getProjectInfo(body.projectId);
          if (!projectInfo) return sendJson(response, 404, { error: "Projet introuvable" });
          projectId = projectInfo.id;
          const overlayId = uniqueWidgetId(slugify(overlayName), await allOverlayIds());
          overlay = await createOverlay(projectId, {
            id: overlayId,
            name: overlayName,
            description: "",
            icon: "desktop_landscape",
            canvas,
            sourcePlatform: "streamelements",
            sourceOverlayId: body.overlayId
          });
        }

        // Le Lab ne cree plus de widget dans la bibliotheque a l'import : un
        // overlay StreamElements est reproduit uniquement comme mise en page
        // (position/taille de chaque element), tous en reperes non editables
        // - y compris les anciens Custom Widgets - pour eviter les doublons
        // dans la bibliotheque a chaque import/reimport.
        const items = detail.widgets?.map((rawWidget, index) => {
          const converted = convertOverlayWidget(rawWidget);
          const sourceType = converted.kind === "custom" ? "native" : converted.sourceType;
          return {
            id: `se-placeholder-${index + 1}-${randomUUID().slice(0, 8)}`,
            type: "placeholder",
            name: placeholderLabel(sourceType, converted.name),
            x: converted.x, y: converted.y, w: converted.w, h: converted.h, z: converted.z,
            props: { sourceType }
          };
        }) || [];

        const savedOverlay = await replaceOverlayItems(projectId, overlay.id, items);
        return sendJson(response, 201, { overlay: { ...savedOverlay, projectId }, placeholders: items.length, updated: Boolean(alreadyImported) });
      } catch (error) {
        return sendJson(response, 502, { error: `Import de l'overlay StreamElements impossible : ${error.message}` });
      }
    }

    // Bibliotheque de medias LOCALE (images/videos uploadees dans le Lab) :
    // en attendant que les medias StreamElements/Streamlabs soient
    // recuperables (cf. la section ci-dessus, qui ne lit que ceux deja
    // references dans un overlay existant), un utilisateur peut stocker ses
    // propres fichiers ici. Pas d'authentification requise, comme le reste de
    // la bibliotheque (widgets/overlays) : outil local mono-utilisateur.
    if (request.method === "GET" && url.pathname === "/api/media") {
      return sendJson(response, 200, { media: await listLocalMedia() });
    }

    if (request.method === "POST" && url.pathname === "/api/media") {
      const filename = url.searchParams.get("filename") || "media";
      // Rejet base sur Content-Length AVANT de lire le moindre octet du
      // corps : essentiel pour les gros fichiers (videos notamment). Sans ca,
      // readRequestBuffer ci-dessous doit interrompre la lecture en cours de
      // route en depassant MAX_MEDIA_BYTES, ce qui casse la connexion
      // partagee requete/reponse HTTP en plein milieu — le fetch() du client
      // reste alors en attente indefiniment (ni reponse ni erreur reseau),
      // au lieu d'afficher une erreur claire. fetch() avec un File/Blob en
      // corps envoie toujours Content-Length, donc ce garde-fou couvre le
      // cas reel ; readRequestBuffer reste en filet de securite pour un
      // corps chunked sans longueur annoncee.
      const contentLength = Number(request.headers["content-length"]);
      if (Number.isFinite(contentLength) && contentLength > MAX_MEDIA_BYTES) {
        return sendJson(response, 413, { error: "Fichier trop volumineux (25 Mo max)" });
      }
      try {
        const buffer = await readRequestBuffer(request, MAX_MEDIA_BYTES);
        const entry = await saveLocalMedia(filename, buffer);
        return sendJson(response, 201, { media: entry });
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }

    if (request.method === "DELETE" && url.pathname === "/api/media") {
      const deleted = await deleteLocalMedia(url.searchParams.get("id"));
      return sendJson(response, 200, { deleted });
    }

    if (request.method === "GET" && url.pathname.startsWith(MEDIA_URL_PREFIX)) {
      const id = decodeURIComponent(url.pathname.slice(MEDIA_URL_PREFIX.length));
      const filePath = resolveLocalMediaPath(id);
      if (!filePath) return sendJson(response, 404, { error: "Media introuvable" });
      return streamFile(request, response, filePath);
    }

    if (request.method === "POST" && url.pathname === "/api/auth/dev-login") {
      if (process.env.ENABLE_DEV_LOGIN !== "true") return sendJson(response, 404, { error: "Introuvable" });
      if (!config.sessionSecret) return sendJson(response, 500, { error: "SESSION_SECRET manquant" });
      const body = await readRequestJson(request);
      const twitchLogin = typeof body.twitchLogin === "string" && body.twitchLogin.trim() ? body.twitchLogin.trim() : "dev-user";
      const displayName = typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim() : twitchLogin;
      const user = store.upsertUserFromTwitch({ twitchId: `dev-${twitchLogin}`, twitchLogin, displayName, avatarUrl: null });
      const newSession = store.createSession(user.id);
      response.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE_NAME, signSessionCookie(newSession.id, config.sessionSecret), {
        maxAgeSeconds: Math.floor((newSession.expiresAt - Date.now()) / 1000),
        secure: config.cookieSecure
      }));
      return sendJson(response, 200, { loggedIn: true });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      if (auth) store.deleteSession(auth.session.id);
      response.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE_NAME, "", { maxAgeSeconds: 0, secure: config.cookieSecure }));
      return sendJson(response, 200, { loggedOut: true });
    }

    if (request.method === "GET" && url.pathname === "/api/auth/me") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      if (!auth) return sendJson(response, 200, { authenticated: false });
      return sendJson(response, 200, {
        authenticated: true,
        user: {
          id: auth.user.id,
          twitchLogin: auth.user.twitch_login,
          displayName: auth.user.display_name,
          avatarUrl: auth.user.avatar_url,
          lastLoginAt: auth.user.last_login_at
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/api/integrations") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      if (!auth) return sendJson(response, 401, { error: "Non authentifie" });
      return sendJson(response, 200, { integrations: store.listIntegrationsForUser(auth.user.id).map(maskIntegration) });
    }

    if (
      request.method === "POST" &&
      (url.pathname === "/api/integrations/streamelements" || url.pathname === "/api/integrations/streamlabs")
    ) {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      if (!auth) return sendJson(response, 401, { error: "Non authentifie" });
      const provider = url.pathname.endsWith("streamlabs") ? "streamlabs" : "streamelements";
      const body = await readRequestJson(request);
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (!token) return sendJson(response, 400, { error: "Token requis" });
      if (provider === "streamelements" && !["jwt", "apikey", "oauth2"].includes(body.tokenType)) {
        return sendJson(response, 400, { error: "tokenType invalide" });
      }
      try {
        const integration = saveManualToken({
          userId: auth.user.id,
          provider,
          channelId: typeof body.channelId === "string" ? body.channelId.trim() || null : null,
          channelName: typeof body.channelName === "string" ? body.channelName.trim() || null : null,
          token,
          tokenType: provider === "streamelements" ? body.tokenType : null,
          topics: null
        }, store);
        return sendJson(response, 200, { integration });
      } catch (error) {
        return sendJson(response, 500, { error: error.message });
      }
    }

    if (request.method === "POST" && url.pathname === "/api/contact") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      const body = await readRequestJson(request);
      try {
        const saved = saveContactMessage({
          userId: auth?.user.id,
          firstName: typeof body.firstName === "string" ? body.firstName : "",
          lastName: typeof body.lastName === "string" ? body.lastName : "",
          nickname: typeof body.nickname === "string" ? body.nickname : "",
          email: typeof body.email === "string" ? body.email : "",
          subject: typeof body.subject === "string" ? body.subject : "",
          message: typeof body.message === "string" ? body.message : ""
        }, store);
        return sendJson(response, 200, { id: saved.id, createdAt: saved.created_at });
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }

    if (request.method === "DELETE" && url.pathname === "/api/integration") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      if (!auth) return sendJson(response, 401, { error: "Non authentifie" });
      const provider = url.searchParams.get("provider");
      if (provider !== "streamelements" && provider !== "streamlabs") {
        return sendJson(response, 400, { error: "provider invalide" });
      }
      const deleted = disconnectIntegration(auth.user.id, provider, store);
      return sendJson(response, 200, { deleted, provider });
    }

    if (request.method === "GET" && url.pathname === "/api/integrations/env-defaults") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      if (!auth) return sendJson(response, 401, { error: "Non authentifie" });
      return sendJson(response, 200, {
        streamelements: { channelId: config.channelId || null, tokenType: config.tokenType, hasToken: Boolean(config.token) },
        streamlabs: { hasToken: Boolean(config.streamlabsToken) }
      });
    }

    if (request.method === "GET" && url.pathname === "/api/integrations/env-defaults/reveal") {
      const auth = requireSession({ cookieHeader: request.headers.cookie, secret: config.sessionSecret, store });
      if (!auth) return sendJson(response, 401, { error: "Non authentifie" });
      const provider = url.searchParams.get("provider");
      if (provider !== "streamelements" && provider !== "streamlabs") {
        return sendJson(response, 400, { error: "provider invalide" });
      }
      if (provider === "streamelements") {
        if (!config.token) return sendJson(response, 404, { error: "Aucun token .env pour ce fournisseur" });
        return sendJson(response, 200, { channelId: config.channelId || null, channelName: config.channelName || null, tokenType: config.tokenType, token: config.token });
      }
      if (!config.streamlabsToken) return sendJson(response, 404, { error: "Aucun token .env pour ce fournisseur" });
      return sendJson(response, 200, { token: config.streamlabsToken });
    }

    if (request.method === "GET" && url.pathname === "/vendor/jquery.min.js") {
      const jqueryPath = join(ROOT, "node_modules", "jquery", "dist", "jquery.min.js");
      if (!existsSync(jqueryPath)) {
        response.writeHead(404, { "Content-Type": "text/javascript; charset=utf-8" });
        return response.end("/* jQuery indisponible : executez npm install. */");
      }
      return streamFile(request, response, jqueryPath);
    }

    if (request.method !== "GET" && request.method !== "HEAD") return sendJson(response, 405, { error: "Methode non autorisee" });
    return await serveStatic(request, response, url.pathname);
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, { error: error.message });
  }
});

watch(LIBRARY_ROOT, { persistent: true, recursive: true }, (_eventType, filename) => {
  const file = filename ? String(filename) : "";
  if (!/[.](html|css|js|json)$/i.test(file)) return;

  changedWidgetFiles.add(file);
  clearTimeout(widgetReloadTimer);
  widgetReloadTimer = setTimeout(() => {
    const changes = [...changedWidgetFiles];
    changedWidgetFiles.clear();
    broadcast("reload", { changes, at: Date.now() });
  }, 120);
});

// Recharge la page entiere quand le build frontend/dist change (regenere par
// `npm run build --watch` en dev, cf. package.json) : sert le meme role que
// l'ancien watcher sur public/ du temps de l'app vanille. Garde existsSync :
// frontend/dist n'existe qu'apres un premier build (absent juste apres un
// clone tant que `npm run build` n'a pas tourne), et fs.watch leve une
// erreur synchrone sur un dossier inexistant.
if (existsSync(PUBLIC_ROOT)) watch(PUBLIC_ROOT, { persistent: true, recursive: true }, (_eventType, filename) => {
  const file = filename ? String(filename) : "";
  if (!/[.](html|js|css)$/i.test(file)) return;

  clearTimeout(publicReloadTimer);
  publicReloadTimer = setTimeout(() => broadcast("full-reload", { at: Date.now() }), 150);
});

function openBrowser(url) {
  if (process.platform === "win32") spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
  else if (process.platform === "darwin") spawn("open", [url], { stdio: "ignore", detached: true }).unref();
  else spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
}

setInterval(() => {
  for (const client of sseClients) client.write(": keep-alive\n\n");
}, 20_000).unref();

server.listen(port, "127.0.0.1", () => {
  console.log(`Streamer Lab : http://localhost:${port}`);
  if (!config.channelId || !config.token) console.log("Mode simulation. Configurez .env pour activer les evenements reels.");
  if (!authConfigured) console.log("Connexion Twitch desactivee. Renseignez TWITCH_CLIENT_ID/SECRET et SESSION_SECRET dans .env pour l'activer.");
  if (!seOAuthConfigured) console.log("Section Medias (StreamElements OAuth2) desactivee. Renseignez SE_OAUTH_CLIENT_ID/SECRET dans .env pour l'activer.");
  if (process.argv.includes("--open")) openBrowser(`http://localhost:${port}`);
});

if (config.channelId && config.token) connectAstro();
if (config.streamlabsToken) connectStreamlabs();

const WIDGET_TEMPLATE_FIELDS = [
  { name: "message", type: "textfield", label: "Message", value: "Nouveau widget" },
  { name: "textColor", type: "colorpicker", label: "Couleur du texte", value: "#FFFFFF" },
  { name: "fontSize", type: "number", label: "Taille du texte (px)", value: "28" }
];

const WIDGET_TEMPLATE_FILES = {
  "widget.html": '<div id="widget-message" class="widget-message">{{message}}</div>\n',
  "widget.css": [
    ".widget-message {",
    "  display: flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  height: 100%;",
    "  margin: 0;",
    "  color: {{textColor}};",
    '  font-family: "Inter", sans-serif;',
    "  font-size: {{fontSize}}px;",
    "  font-weight: 600;",
    "  text-align: center;",
    "}",
    ""
  ].join("\n"),
  "widget.streamelements.js": [
    'window.addEventListener("onWidgetLoad", (obj) => {',
    '  console.log("Widget charge", obj.detail.fieldData);',
    "});",
    "",
    'window.addEventListener("onEventReceived", (obj) => {',
    '  console.log("Evenement recu", obj.detail.listener, obj.detail.event);',
    "});",
    ""
  ].join("\n"),
  "fields.streamelements.json": `${JSON.stringify(WIDGET_TEMPLATE_FIELDS, null, 2)}\n`,
  "widget.streamlabs.js": [
    'document.addEventListener("onLoad", (obj) => {',
    '  console.log("Widget charge", obj.detail.fieldData);',
    "});",
    "",
    'document.addEventListener("onEventReceived", (obj) => {',
    '  console.log("Evenement recu", obj.detail);',
    "});",
    ""
  ].join("\n"),
  "fields.streamlabs.json": `${JSON.stringify(
    Object.fromEntries(WIDGET_TEMPLATE_FIELDS.map(({ name, ...definition }) => [name, definition])),
    null,
    2
  )}\n`,
  "data.streamelements.json": "{}\n",
  "data.streamlabs.json": "{}\n"
};

function parseProjectMetadataInput(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const icon = typeof body.icon === "string" ? body.icon.trim() : "";
  if (!name || name.length > 60) throw new Error("Le nom doit contenir entre 1 et 60 caracteres");
  if (description.length > 140) throw new Error("La description est limitee a 140 caracteres");
  if (!/^[a-z0-9_]{1,40}$/.test(icon)) throw new Error("Icone Material invalide");
  return { name, description, icon };
}

// Les ids de widget/overlay restent uniques sur TOUTE la bibliotheque (pas
// seulement au sein d'un projet) : ca permet de retrouver un widget/overlay
// par son id sans connaitre son projet a l'avance (cf. findWidgetInfo /
// findOverlayInfo ci-dessous), donc aucune route existante n'a besoin de
// recevoir un projectId pour editer/supprimer/dupliquer un item deja cree -
// seule sa creation (qui n'a pas encore d'emplacement) en a besoin.
async function listAllWidgets() {
  const widgets = [];
  for (const project of await listProjects()) {
    for (const entry of await listWidgets(categoryDirsForProject(project.id))) {
      widgets.push({ ...entry, projectId: project.id });
    }
  }
  return widgets;
}

async function listAllOverlays() {
  const overlays = [];
  for (const project of await listProjects()) {
    for (const entry of await listOverlays(project.id)) {
      overlays.push({ ...entry, projectId: project.id });
    }
  }
  return overlays;
}

async function allWidgetIds() {
  return new Set((await listAllWidgets()).map((entry) => entry.id));
}

async function allOverlayIds() {
  return new Set((await listAllOverlays()).map((entry) => entry.id));
}

async function findWidgetInfo(widgetId) {
  if (typeof widgetId !== "string" || !widgetId) return null;
  for (const project of await listProjects()) {
    const widgetInfo = await getWidgetInfo(widgetId, categoryDirsForProject(project.id));
    if (widgetInfo) return { projectId: project.id, widgetInfo };
  }
  return null;
}

async function findOverlayInfo(overlayId) {
  if (typeof overlayId !== "string" || !overlayId) return null;
  for (const project of await listProjects()) {
    const overlayInfo = await getOverlayInfo(project.id, overlayId);
    if (overlayInfo) return { projectId: project.id, overlayInfo };
  }
  return null;
}

// Renomme le dossier d'un widget/alerte deja localise (via findWidgetInfo)
// vers un autre projet ; no-op si deja dans ce projet.
async function moveWidgetDirectory(found, targetProjectId) {
  if (found.projectId === targetProjectId) return;
  const targetDirectory = join(categoryDirectory(targetProjectId, found.widgetInfo.type), found.widgetInfo.id);
  await mkdir(dirname(targetDirectory), { recursive: true });
  await rename(found.widgetInfo.directory, targetDirectory);
}

function parseWidgetMetadataInput(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const icon = typeof body.icon === "string" ? body.icon.trim() : "";
  if (!name || name.length > 60) throw new Error("Le nom doit contenir entre 1 et 60 caracteres");
  if (description.length > 140) throw new Error("La description est limitee a 140 caracteres");
  if (!/^[a-z0-9_]{1,40}$/.test(icon)) throw new Error("Icone Material invalide");
  const width = parseWidgetDimension(body.width, 320);
  const height = parseWidgetDimension(body.height, 180);
  return { name, description, icon, width, height };
}

function parseWidgetDimension(value, fallback) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(4096, Math.max(8, number)) : fallback;
}

function slugify(value) {
  const slug = value
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "widget";
}

function uniqueWidgetId(base, existingIds) {
  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function createWidgetFiles(directory) {
  await mkdir(directory, { recursive: true });
  await Promise.all(
    Object.entries(WIDGET_TEMPLATE_FILES).map(([file, content]) => writeFile(join(directory, file), content, "utf8"))
  );
}

// Memes garde-fous que PUT /api/widget/file (taille, JSON valide pour les
// fichiers fields.*/data.*), reutilises pour tout endroit qui ecrit du
// contenu de widget arbitraire (import StreamElements notamment).
function assertValidWidgetFileContent(file, content) {
  if (typeof content !== "string") throw Object.assign(new Error("Contenu invalide"), { status: 400 });
  if (content.length > 2_000_000) throw Object.assign(new Error("Fichier trop volumineux"), { status: 413 });
  if (
    file === "fields.streamelements.json" ||
    file === "fields.streamlabs.json" ||
    file === "data.streamelements.json" ||
    file === "data.streamlabs.json"
  ) {
    try {
      JSON.parse(content);
    } catch (error) {
      throw Object.assign(new Error(`JSON invalide : ${error.message}`), { status: 400 });
    }
  }
}

// /channels/me et /overlays/* acceptent aussi bien un jeton JWT/apikey
// (formulaire de connexion manuel existant) qu'OAuth2 - jamais besoin
// d'exiger specifiquement OAuth2 ici. On tente d'abord l'integration liee a
// cet utilisateur, puis on retombe sur le SE_TOKEN/SE_CHANNEL_ID du .env
// (simulation) s'il n'y en a pas.
function resolveStreamElementsCredentials(auth) {
  const integrationRow = store.getIntegration(auth.user.id, "streamelements");
  if (integrationRow) {
    const tokenType = ["jwt", "apikey", "oauth2"].includes(integrationRow.token_type) ? integrationRow.token_type : "jwt";
    const decrypted = decryptIntegrationToken(integrationRow);
    const token = tokenType === "oauth2" ? JSON.parse(decrypted).accessToken : decrypted;
    return { token, tokenType, channelId: integrationRow.channel_id };
  }
  if (config.token && config.channelId) {
    const tokenType = ["jwt", "apikey", "oauth2"].includes(config.tokenType) ? config.tokenType : "jwt";
    return { token: config.token, tokenType, channelId: config.channelId };
  }
  return null;
}

const PLACEHOLDER_LABELS = {
  video: "Vidéo StreamElements",
  group: "Groupe StreamElements",
  "alert-box": "Alert Box StreamElements",
  native: "Widget StreamElements natif"
};

function placeholderLabel(sourceType, name) {
  return name && name !== "Widget StreamElements" ? name : (PLACEHOLDER_LABELS[sourceType] || PLACEHOLDER_LABELS.native);
}

async function loadWidget(widgetInfo, platform = "streamelements") {
  const platformFiles = widgetPlatformFiles[platform] || widgetPlatformFiles.streamelements;
  const [html, css, js, fieldsSource, dataSource] = await Promise.all([
    readFile(join(widgetInfo.directory, "widget.html"), "utf8"),
    readFile(join(widgetInfo.directory, "widget.css"), "utf8"),
    readFile(join(widgetInfo.directory, platformFiles.js), "utf8"),
    readFile(join(widgetInfo.directory, platformFiles.fields), "utf8"),
    readOptionalFile(join(widgetInfo.directory, platformFiles.data), "{}\n")
  ]);
  return {
    html,
    css,
    js,
    fields: JSON.parse(fieldsSource),
    fieldsSource,
    dataSource,
    platform,
    widgetId: widgetInfo.id,
    widgetMeta: {
      name: widgetInfo.name,
      description: widgetInfo.description,
      icon: widgetInfo.icon,
      archived: widgetInfo.archived,
      width: widgetInfo.width,
      height: widgetInfo.height
    },
    files: {
      html: "widget.html",
      css: "widget.css",
      js: platformFiles.js,
      fields: platformFiles.fields,
      data: platformFiles.data
    }
  };
}

async function readOptionalFile(path, fallback) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readRequestJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2_100_000) throw new Error("Requete trop volumineuse");
    chunks.push(chunk);
  }
  const source = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(source || "{}");
  } catch (error) {
    throw new Error(`JSON de requete invalide : ${error.message}`);
  }
}

// Corps brut (pas du JSON) pour l'upload de medias : le client poste
// directement les octets du fichier (fetch(url, {body: file})), sans
// multipart - plus simple qu'un vrai parseur multipart/form-data pour un
// seul fichier a la fois.
async function readRequestBuffer(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Fichier trop volumineux");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) client.write(payload);
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

// Routes gerees cote client par le frontend Vue (pas de vrai routeur, juste
// ces 3 prefixes synchronises avec l'URL, cf. useRouteSync.ts) : un GET
// direct dessus (chargement initial, rechargement de page) doit renvoyer le
// meme index.html que "/", pour que le JS puisse lire l'URL et rouvrir le
// bon widget/alerte/overlay - sinon ce serait une 404, le serveur n'ayant
// aucune ressource reelle a cet emplacement.
const CLIENT_ROUTE_PREFIXES = ["/widget/", "/alerte/", "/overlay/"];

function isClientRoute(requestPath) {
  return CLIENT_ROUTE_PREFIXES.some((prefix) => requestPath.startsWith(prefix));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function serveStatic(request, response, requestPath) {
  const isEntry = requestPath === "/" || isClientRoute(requestPath);
  const relative = isEntry ? "index.html" : decodeURIComponent(requestPath.slice(1));
  const normalized = normalize(relative).replace(/^([.][.][/\\])+/, "");
  const path = resolve(PUBLIC_ROOT, normalized);
  if (!path.startsWith(resolve(PUBLIC_ROOT))) return sendJson(response, 403, { error: "Chemin interdit" });

  if (isEntry) {
    // dist/index.html peut manquer transitoirement juste apres `npm run dev`
    // (concurrently demarre "vite build --watch" et "node server.mjs --open"
    // en parallele - son tout premier passage peut retrouver le fichier en
    // cours de reecriture) : quelques tentatives espacees avant d'abandonner,
    // plutot qu'un 404 immediat sur ce qui est presque toujours une
    // compilation encore en cours. N'ajoute aucun delai une fois le fichier
    // present (boucle sautee des le premier essai).
    for (let attempt = 0; attempt < 10 && !existsSync(path); attempt++) {
      await wait(150);
    }
    if (!existsSync(path)) {
      response.writeHead(503, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "1" });
      response.end(
        '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="1">' +
          "<title>Compilation…</title></head>" +
          '<body style="font:14px system-ui;color:#ccc;background:#111;display:grid;place-items:center;height:100vh;margin:0">' +
          "<p>Compilation en cours, rechargement automatique…</p></body></html>"
      );
      return;
    }
    return streamFile(request, response, path);
  }

  if (!existsSync(path)) return sendJson(response, 404, { error: "Introuvable" });
  return streamFile(request, response, path);
}

// Le support des requetes Range (+ Content-Length) est indispensable pour la
// video/audio : sans lui, le navigateur ne connait ni la duree totale ni la
// possibilite de seeker, et certains (Chrome inclus, au-dela d'un fichier
// minuscule) refusent d'afficher la premiere frame ou de lire le fichier.
function streamFile(request, response, path) {
  const contentType = mimeTypes[extname(path).toLowerCase()] || "application/octet-stream";
  const { size } = statSync(path);
  const range = request.headers.range;

  if (!range) {
    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store"
    });
    createReadStream(path).pipe(response);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) {
    response.writeHead(416, { "Content-Range": `bytes */${size}` });
    return response.end();
  }
  const start = match[1] ? Number(match[1]) : size - Number(match[2]);
  const end = match[1] && match[2] ? Number(match[2]) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    response.writeHead(416, { "Content-Range": `bytes */${size}` });
    return response.end();
  }
  const clampedEnd = Math.min(end, size - 1);

  response.writeHead(206, {
    "Content-Type": contentType,
    "Content-Length": clampedEnd - start + 1,
    "Content-Range": `bytes ${start}-${clampedEnd}/${size}`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store"
  });
  createReadStream(path, { start, end: clampedEnd }).pipe(response);
}

async function connectAstro(reconnectToken = "") {
  let WebSocket;
  try {
    ({ default: WebSocket } = await import("ws"));
  } catch {
    liveStatus = "error: dependance ws absente (npm install)";
    broadcast("status", { streamelements: liveStatus, streamlabs: liveStatusStreamlabs });
    return;
  }

  const endpoint = reconnectToken
    ? `wss://astro.streamelements.com/?reconnect_token=${encodeURIComponent(reconnectToken)}`
    : "wss://astro.streamelements.com/";
  const socket = new WebSocket(endpoint);

  socket.on("open", () => {
    liveStatus = "connected";
    broadcast("status", { streamelements: liveStatus, streamlabs: liveStatusStreamlabs });
  });

  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === "welcome" && !reconnectToken) {
      for (const topic of config.topics) {
        socket.send(JSON.stringify({
          type: "subscribe",
          nonce: randomUUID(),
          data: {
            topic,
            room: config.channelId,
            token: config.token,
            token_type: config.tokenType
          }
        }));
      }
      return;
    }

    if (message.type === "response") {
      if (message.error) {
        liveStatus = `error: ${message.error} - ${message.data?.message ?? "abonnement refuse"}`;
        broadcast("status", { streamelements: liveStatus, streamlabs: liveStatusStreamlabs });
      }
      return;
    }

    if (message.type === "reconnect") {
      socket.removeAllListeners();
      socket.close();
      connectAstro(message.data?.reconnect_token ?? "");
      return;
    }

    if (message.type !== "message") return;
    broadcast("astro", message);
    for (const event of astroToLabEvents(message, session)) {
      if (event.session) session = event.session;
      broadcast("widget-event", { type: event.type, detail: event.detail, source: "live" });
    }
  });

  socket.on("error", (error) => {
    liveStatus = `error: ${error.message}`;
    broadcast("status", { streamelements: liveStatus, streamlabs: liveStatusStreamlabs });
  });

  socket.on("close", () => {
    if (liveStatus.startsWith("error")) return;
    liveStatus = "reconnecting";
    broadcast("status", { streamelements: liveStatus, streamlabs: liveStatusStreamlabs });
    setTimeout(() => connectAstro(), 2_000).unref();
  });
}

async function connectStreamlabs() {
  let io;
  try {
    ({ default: io } = await import("socket.io-client"));
  } catch {
    liveStatusStreamlabs = "error: dependance socket.io-client absente (npm install)";
    broadcast("status", { streamelements: liveStatus, streamlabs: liveStatusStreamlabs });
    return;
  }

  const socket = io(`https://sockets.streamlabs.com?token=${encodeURIComponent(config.streamlabsToken)}`, {
    transports: ["websocket"]
  });

  socket.on("connect", () => {
    liveStatusStreamlabs = "connected";
    broadcast("status", { streamelements: liveStatus, streamlabs: liveStatusStreamlabs });
  });

  socket.on("event", (eventData) => {
    for (const event of streamlabsEventToLabEvents(eventData)) {
      broadcast("widget-event", { type: event.type, detail: event.detail, source: "live-streamlabs" });
    }
  });

  socket.on("connect_error", (error) => {
    liveStatusStreamlabs = `error: ${error.message}`;
    broadcast("status", { streamelements: liveStatus, streamlabs: liveStatusStreamlabs });
  });

  socket.on("disconnect", () => {
    if (liveStatusStreamlabs.startsWith("error")) return;
    liveStatusStreamlabs = "reconnecting";
    broadcast("status", { streamelements: liveStatus, streamlabs: liveStatusStreamlabs });
  });
}
