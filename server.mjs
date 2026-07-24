import { createReadStream, existsSync, readFileSync, watch } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { astroToLabEvents, parseEnv } from "./lib/streamelements.mjs";
import { streamlabsEventToLabEvents } from "./lib/streamlabs.mjs";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_ROOT = join(ROOT, "public");
const WIDGETS_ROOT = join(ROOT, "widget");
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

const config = {
  channelId: process.env.SE_CHANNEL_ID?.trim() ?? "",
  channelName: process.env.SE_CHANNEL_NAME?.trim() || "MaChaine",
  token: process.env.SE_TOKEN?.trim() ?? "",
  tokenType: process.env.SE_TOKEN_TYPE?.trim() || "jwt",
  topics: (process.env.SE_TOPICS || "channel.activities,channel.session.update,channel.session.reset,channel.chat.message")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean),
  streamlabsToken: process.env.SL_SOCKET_TOKEN?.trim() ?? ""
};

let session = await readJson(MOCK_SESSION_PATH);
let liveStatus = config.channelId && config.token ? "connecting" : "disabled";
let liveStatusStreamlabs = config.streamlabsToken ? "connecting" : "disabled";
const sseClients = new Set();
const changedWidgetFiles = new Set();
let widgetReloadTimer;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "GET" && url.pathname === "/api/widgets") {
      return sendJson(response, 200, { widgets: await listWidgets(), defaultWidgetId: DEFAULT_WIDGET_ID });
    }

    if (request.method === "GET" && url.pathname === "/api/widget") {
      const platform = url.searchParams.get("platform") === "streamlabs" ? "streamlabs" : "streamelements";
      const widgetId = url.searchParams.get("id") || DEFAULT_WIDGET_ID;
      const widgetInfo = await getWidgetInfo(widgetId);
      if (!widgetInfo) return sendJson(response, 404, { error: "Widget introuvable" });
      return sendJson(response, 200, await loadWidget(widgetInfo, platform));
    }

    if (request.method === "PUT" && url.pathname === "/api/widget/file") {
      const body = await readRequestJson(request);
      const widgetInfo = await getWidgetInfo(body.widgetId);
      if (!widgetInfo) return sendJson(response, 404, { error: "Widget introuvable" });
      if (!editableWidgetFiles.has(body.file)) {
        return sendJson(response, 400, { error: "Fichier de widget non autorise" });
      }
      if (typeof body.content !== "string") return sendJson(response, 400, { error: "Contenu invalide" });
      if (body.content.length > 2_000_000) return sendJson(response, 413, { error: "Fichier trop volumineux" });
      if (
        body.file === "fields.streamelements.json" ||
        body.file === "fields.streamlabs.json" ||
        body.file === "data.streamelements.json" ||
        body.file === "data.streamlabs.json"
      ) {
        try {
          JSON.parse(body.content);
        } catch (error) {
          return sendJson(response, 400, { error: `JSON invalide : ${error.message}` });
        }
      }
      const path = join(widgetInfo.directory, body.file);
      await writeFile(path, body.content, "utf8");
      return sendJson(response, 200, { saved: true, widgetId: widgetInfo.id, file: body.file, at: Date.now() });
    }

    if (request.method === "POST" && url.pathname === "/api/widgets") {
      const body = await readRequestJson(request);
      let metadata;
      try {
        metadata = parseWidgetMetadataInput(body);
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }

      const widgets = await listWidgets();
      const widgetId = uniqueWidgetId(slugify(metadata.name), new Set(widgets.map((entry) => entry.id)));
      const order = widgets.reduce((max, entry) => Math.max(max, entry.order), 0) + 10;
      const manifest = { id: widgetId, ...metadata, order };

      await createWidgetFiles(join(WIDGETS_ROOT, widgetId));
      await writeFile(join(WIDGETS_ROOT, widgetId, "widget.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

      return sendJson(response, 201, { widget: widgetFromManifest(widgetId, manifest) });
    }

    if (request.method === "PUT" && url.pathname === "/api/widget/metadata") {
      const body = await readRequestJson(request);
      const widgetInfo = await getWidgetInfo(body.widgetId);
      if (!widgetInfo) return sendJson(response, 404, { error: "Widget introuvable" });

      let metadata;
      try {
        metadata = parseWidgetMetadataInput(body);
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }

      const manifestPath = join(widgetInfo.directory, "widget.json");
      const manifest = await readJson(manifestPath);
      const updatedManifest = { ...manifest, ...metadata };
      await writeFile(manifestPath, `${JSON.stringify(updatedManifest, null, 2)}\n`, "utf8");
      return sendJson(response, 200, { widget: widgetFromManifest(widgetInfo.id, updatedManifest) });
    }

    if (request.method === "DELETE" && url.pathname === "/api/widget") {
      const widgetInfo = await getWidgetInfo(url.searchParams.get("id"));
      if (!widgetInfo) return sendJson(response, 404, { error: "Widget introuvable" });
      if ((await listWidgets()).length <= 1) {
        return sendJson(response, 400, { error: "Impossible de supprimer le dernier widget" });
      }
      await rm(widgetInfo.directory, { recursive: true, force: true });
      return sendJson(response, 200, { deleted: true, widgetId: widgetInfo.id });
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

    if (request.method === "GET" && url.pathname === "/vendor/jquery.min.js") {
      const jqueryPath = join(ROOT, "node_modules", "jquery", "dist", "jquery.min.js");
      if (!existsSync(jqueryPath)) {
        response.writeHead(404, { "Content-Type": "text/javascript; charset=utf-8" });
        return response.end("/* jQuery indisponible : executez npm install. */");
      }
      return streamFile(response, jqueryPath);
    }

    if (request.method !== "GET" && request.method !== "HEAD") return sendJson(response, 405, { error: "Methode non autorisee" });
    return serveStatic(response, url.pathname);
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, { error: error.message });
  }
});

watch(WIDGETS_ROOT, { persistent: true, recursive: true }, (_eventType, filename) => {
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

setInterval(() => {
  for (const client of sseClients) client.write(": keep-alive\n\n");
}, 20_000).unref();

const port = Number(process.env.PORT) || 4173;
server.listen(port, "127.0.0.1", () => {
  console.log(`StreamElements Widget Lab : http://localhost:${port}`);
  if (!config.channelId || !config.token) console.log("Mode simulation. Configurez .env pour activer les evenements reels.");
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

function parseWidgetMetadataInput(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const icon = typeof body.icon === "string" ? body.icon.trim() : "";
  if (!name || name.length > 60) throw new Error("Le nom doit contenir entre 1 et 60 caracteres");
  if (description.length > 140) throw new Error("La description est limitee a 140 caracteres");
  if (!/^[a-z0-9_]{1,40}$/.test(icon)) throw new Error("Icone Material invalide");
  return { name, description, icon };
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
  await mkdir(directory);
  await Promise.all(
    Object.entries(WIDGET_TEMPLATE_FILES).map(([file, content]) => writeFile(join(directory, file), content, "utf8"))
  );
}

function widgetFromManifest(id, manifest) {
  return {
    id,
    name: manifest.name || id,
    description: manifest.description || "",
    icon: manifest.icon || "widgets",
    archived: Boolean(manifest.archived),
    order: Number(manifest.order) || 100
  };
}

async function listWidgets() {
  const directories = await readdir(WIDGETS_ROOT, { withFileTypes: true });
  const widgets = [];

  for (const directory of directories) {
    if (!directory.isDirectory()) continue;
    const manifestPath = join(WIDGETS_ROOT, directory.name, "widget.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = await readJson(manifestPath);
    widgets.push(widgetFromManifest(directory.name, manifest));
  }

  return widgets.sort((left, right) =>
    left.order - right.order || left.name.localeCompare(right.name, "fr")
  );
}

async function getWidgetInfo(widgetId) {
  if (typeof widgetId !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(widgetId)) return null;
  const directory = join(WIDGETS_ROOT, widgetId);
  const manifestPath = join(directory, "widget.json");
  if (!existsSync(manifestPath)) return null;
  const manifest = await readJson(manifestPath);
  return { ...widgetFromManifest(widgetId, manifest), directory };
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
      archived: widgetInfo.archived
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

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) client.write(payload);
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function serveStatic(response, requestPath) {
  const relative = requestPath === "/" ? "index.html" : decodeURIComponent(requestPath.slice(1));
  const normalized = normalize(relative).replace(/^([.][.][/\\])+/, "");
  const path = resolve(PUBLIC_ROOT, normalized);
  if (!path.startsWith(resolve(PUBLIC_ROOT))) return sendJson(response, 403, { error: "Chemin interdit" });
  if (!existsSync(path)) return sendJson(response, 404, { error: "Introuvable" });
  return streamFile(response, path);
}

function streamFile(response, path) {
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(path).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(path).pipe(response);
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
