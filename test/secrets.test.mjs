import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSecretsStore, isSecretFieldKey, mergeOverlaySecrets, splitOverlaySecrets } from "../lib/secrets.mjs";
import { checkSecrets, findSecrets } from "../scripts/check-secrets.mjs";

const items = [
  {
    id: "player",
    type: "widget",
    props: { fieldData: { spotify_client_id: "id-123", spotify_client_secret: "secret-456", spotify_refresh_token: "", text_size: 14 } }
  },
  { id: "text", type: "text", props: { content: "Bonjour" } }
];

test("isSecretFieldKey reconnaît les champs sensibles", () => {
  for (const key of ["spotify_client_secret", "spotify_refresh_token", "api_key", "apiKey", "client_id", "password"]) {
    assert.equal(isSecretFieldKey(key), true, key);
  }
  for (const key of ["text_size", "title", "border_color", "accent_color"]) assert.equal(isSecretFieldKey(key), false, key);
});

test("splitOverlaySecrets retire les valeurs sensibles des items", () => {
  const { items: cleaned, secrets } = splitOverlaySecrets(items);
  assert.deepEqual(cleaned[0].props.fieldData, { text_size: 14 });
  assert.deepEqual(secrets, { player: { spotify_client_id: "id-123", spotify_client_secret: "secret-456" } });
  assert.deepEqual(cleaned[1], items[1]);
  assert.ok(!JSON.stringify(cleaned).includes("secret-456"));
});

test("mergeOverlaySecrets réinjecte les valeurs à la lecture", () => {
  const { items: cleaned, secrets } = splitOverlaySecrets(items);
  const merged = mergeOverlaySecrets(cleaned, secrets);
  assert.equal(merged[0].props.fieldData.spotify_client_secret, "secret-456");
  assert.equal(merged[0].props.fieldData.text_size, 14);
});

test("createSecretsStore garde les secrets par overlay, hors de la bibliothèque", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "secrets-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = createSecretsStore(join(dir, "data", "secrets.json"));

  await store.setOverlaySecrets("live", { player: { api_key: "abc" } });
  assert.deepEqual(await store.getOverlaySecrets("live"), { player: { api_key: "abc" } });

  await store.copyOverlaySecrets("live", "live-copie");
  assert.deepEqual(await store.getOverlaySecrets("live-copie"), { player: { api_key: "abc" } });

  // Un overlay sans secret (champ vidé) disparaît du fichier
  await store.setOverlaySecrets("live", {});
  assert.deepEqual(await store.getOverlaySecrets("live"), {});
  await store.deleteOverlaySecrets("live-copie");
  assert.deepEqual(await store.getOverlaySecrets("live-copie"), {});
});

test("findSecrets signale une clé versionnée mais pas une URL ni un exemple", () => {
  const content = [
    '"spotify_client_secret": "d64f2f9cc52443e0b0c75e2e47d656eb",',
    'const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";',
    'SE_TOKEN = "le_jeton"',
    '"spotify_client_secret": "",',
    '"api_key": "abcdefghijkl" // check-secrets: ignore'
  ].join("\n");
  const findings = findSecrets("overlay.json", content);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].key, "spotify_client_secret");
  assert.equal(findings[0].line, 1);
});

test("aucun fichier suivi par git ne contient de clé API", () => {
  const findings = checkSecrets("--all");
  assert.deepEqual(
    findings.map((finding) => `${finding.path}:${finding.line} ${finding.key}`),
    [],
    "Des secrets sont versionnés : lancer le serveur (migration vers data/secrets.json) ou retirer la valeur."
  );
});

test("splitOverlaySecrets / mergeOverlaySecrets couvrent l'apercu d'un repere importe", () => {
  const placeholder = {
    id: "se-placeholder-1",
    type: "placeholder",
    props: { sourceType: "native", preview: { kind: "code", html: "", css: "", js: "", fieldData: { spotify_client_secret: "valeur-sensible-123", color: "#fff" } } }
  };
  const { items: cleaned, secrets } = splitOverlaySecrets([placeholder]);
  assert.deepEqual(cleaned[0].props.preview.fieldData, { color: "#fff" });
  assert.equal(cleaned[0].props.preview.kind, "code");
  assert.deepEqual(secrets, { "se-placeholder-1": { spotify_client_secret: "valeur-sensible-123" } });
  assert.deepEqual(mergeOverlaySecrets(cleaned, secrets)[0].props.preview.fieldData, { color: "#fff", spotify_client_secret: "valeur-sensible-123" });
  // Repere sans apercu : rien a nettoyer ni a reinjecter.
  const bare = { id: "p2", type: "placeholder", props: { sourceType: "video", preview: null } };
  assert.deepEqual(splitOverlaySecrets([bare]).items[0], bare);
  assert.deepEqual(mergeOverlaySecrets([bare], { p2: { token: "x" } })[0], bare);
});
