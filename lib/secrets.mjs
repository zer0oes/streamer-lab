import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Valeurs sensibles des champs de widget (clé API, secret, token…) : elles ne
// doivent jamais être écrites dans library/, suivi par git (et potentiellement
// public). Les surcharges d'un item d'overlay (props.fieldData) qui portent
// un tel champ sont donc stockées à part, dans data/secrets.json (data/ est
// ignoré par git), et réinjectées à la lecture de l'overlay.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_SECRETS_PATH = join(ROOT, "data", "secrets.json");

// Même règle côté client (frontend/src/lib/secretFields.ts) et dans le
// garde-fou de commit (scripts/check-secrets.mjs).
const SECRET_FIELD_PATTERN = /(secret|token|password|passwd|api[_-]?key|client[_-]?id)/i;

function isSecretFieldKey(key) {
  return typeof key === "string" && SECRET_FIELD_PATTERN.test(key);
}

function isFilled(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

/**
 * Sépare les valeurs sensibles des items d'un overlay.
 * @returns {{ items: object[], secrets: Record<string, Record<string, unknown>> }}
 *   items sans aucune valeur sensible, et secrets[itemId][champ] = valeur.
 */
function splitOverlaySecrets(items) {
  const secrets = {};
  const cleaned = (Array.isArray(items) ? items : []).map((item) => {
    const fieldData = item?.props?.fieldData;
    if (!fieldData || typeof fieldData !== "object") return item;
    const kept = {};
    for (const [key, value] of Object.entries(fieldData)) {
      if (!isSecretFieldKey(key)) {
        kept[key] = value;
      } else if (isFilled(value) && item.id) {
        secrets[item.id] = { ...secrets[item.id], [key]: value };
      }
    }
    return { ...item, props: { ...item.props, fieldData: kept } };
  });
  return { items: cleaned, secrets };
}

/** Réinjecte dans les items les valeurs sensibles stockées à part. */
function mergeOverlaySecrets(items, secrets) {
  if (!secrets || !Object.keys(secrets).length) return items;
  return (Array.isArray(items) ? items : []).map((item) => {
    const values = secrets[item?.id];
    if (!values) return item;
    return { ...item, props: { ...item.props, fieldData: { ...item.props?.fieldData, ...values } } };
  });
}

function createSecretsStore(path = DEFAULT_SECRETS_PATH) {
  async function read() {
    if (!existsSync(path)) return { overlays: {} };
    try {
      const parsed = JSON.parse(await readFile(path, "utf8"));
      return { overlays: parsed?.overlays && typeof parsed.overlays === "object" ? parsed.overlays : {} };
    } catch {
      return { overlays: {} };
    }
  }

  async function write(data) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }

  return {
    path,
    async getOverlaySecrets(overlayId) {
      return (await read()).overlays[overlayId] || {};
    },
    // Remplace entièrement les secrets d'un overlay (un champ vidé disparaît)
    async setOverlaySecrets(overlayId, secrets) {
      const data = await read();
      if (Object.keys(secrets).length) data.overlays[overlayId] = secrets;
      else delete data.overlays[overlayId];
      await write(data);
    },
    async copyOverlaySecrets(fromId, toId) {
      const data = await read();
      if (!data.overlays[fromId]) return;
      data.overlays[toId] = structuredClone(data.overlays[fromId]);
      await write(data);
    },
    async deleteOverlaySecrets(overlayId) {
      const data = await read();
      if (!data.overlays[overlayId]) return;
      delete data.overlays[overlayId];
      await write(data);
    }
  };
}

export { SECRET_FIELD_PATTERN, isSecretFieldKey, splitOverlaySecrets, mergeOverlaySecrets, createSecretsStore };
