// Obtient un refresh token Spotify pour le widget « zer0oes - Music player ».
//
// 1. Créer une app sur https://developer.spotify.com/dashboard (API : Web API)
//    avec la Redirect URI : http://127.0.0.1:8888/callback
// 2. npm run spotify:token -- <client_id> <client_secret>
//    (ou variables SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET)
// 3. Autoriser l'accès dans le navigateur, puis copier le refresh token affiché
//    dans le champ « Refresh token » du widget.

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { exec } from "node:child_process";

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = "user-read-currently-playing user-read-playback-state";

const clientId = process.argv[2] || process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.argv[3] || process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Usage : npm run spotify:token -- <client_id> <client_secret>");
  process.exit(1);
}

const state = randomBytes(16).toString("hex");
const authorizeUrl = "https://accounts.spotify.com/authorize?" + new URLSearchParams({
  response_type: "code",
  client_id: clientId,
  scope: SCOPES,
  redirect_uri: REDIRECT_URI,
  state
});

function page(res, status, message) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta charset="utf-8"><title>Spotify</title><body style="font-family:system-ui;padding:40px">${message}</body>`);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== "/callback") return page(res, 404, "Introuvable");

  if (url.searchParams.get("state") !== state) return page(res, 400, "State invalide, relancez le script.");
  const error = url.searchParams.get("error");
  if (error) {
    page(res, 400, `Autorisation refusée : ${error}`);
    console.error(`Autorisation refusée : ${error}`);
    return shutdown(1);
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: url.searchParams.get("code") || "",
        redirect_uri: REDIRECT_URI
      })
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok || !data.refresh_token) throw new Error(data.error_description || data.error || `HTTP ${tokenRes.status}`);

    page(res, 200, "C'est bon ! Le refresh token est affiché dans le terminal, vous pouvez fermer cet onglet.");
    console.log("\nRefresh token (à coller dans le champ « Refresh token » du widget) :\n");
    console.log(data.refresh_token + "\n");
    shutdown(0);
  } catch (err) {
    page(res, 500, `Échec de l'échange du code : ${err.message}`);
    console.error(`Échec de l'échange du code : ${err.message}`);
    shutdown(1);
  }
});

function shutdown(code) {
  setTimeout(() => server.close(() => process.exit(code)), 200);
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Ouvrez cette adresse pour autoriser l'accès (Redirect URI attendue : ${REDIRECT_URI}) :\n\n${authorizeUrl}\n`);
  const opener = process.platform === "win32" ? `start "" "${authorizeUrl}"`
    : process.platform === "darwin" ? `open "${authorizeUrl}"`
    : `xdg-open "${authorizeUrl}"`;
  exec(opener, () => {});
});
