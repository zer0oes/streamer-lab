// Garde-fou contre la fuite de clés API dans git.
//
//   node scripts/check-secrets.mjs --staged   fichiers indexés (hook pre-commit)
//   node scripts/check-secrets.mjs --all      tous les fichiers suivis (npm test)
//
// Signale toute valeur non vide affectée à un champ sensible (secret, token,
// password, api_key, client_id…) sous la forme "clé": "valeur" ou clé = "valeur".
// Une ligne peut être exemptée avec le commentaire « check-secrets: ignore ».
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Même règle que lib/secrets.mjs (clé de champ sensible)
const SECRET_KEY = "[\\w-]*(?:secret|token|password|passwd|api[_-]?key|client[_-]?id)[\\w-]*"; // check-secrets: ignore
const ASSIGNMENT = new RegExp(`["']?(${SECRET_KEY})["']?\\s*[:=]\\s*["']([^"'\\s]{8,})["']`, "gi");
const SKIPPED_FILES = /(^|\/)(package-lock\.json|.*\.(png|jpe?g|gif|webp|svg|mp3|ogg|wav|m4a|mp4|webm|mov|woff2?|zip|sqlite))$/i;
// Jeux d'essai des tests : valeurs factices par construction
const TEST_FILES = /(^|\/)test\/|\.test\.(m?js|ts)$/;
// Valeurs manifestement factices (exemples, tests)
const PLACEHOLDER = /^(x+|\*+|\.{3,}|le_jeton|your[_-].*|example.*|changeme|<.*>|\$\{.*\}|dummy.*|test.*|fake.*)$/i;

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function findSecrets(path, content) {
  const findings = [];
  content.split(/\r?\n/).forEach((line, index) => {
    if (line.includes("check-secrets: ignore")) return;
    for (const match of line.matchAll(ASSIGNMENT)) {
      const [, key, value] = match;
      // Adresse d'un service (SPOTIFY_TOKEN_URL = "https://…"), pas une clé
      if (PLACEHOLDER.test(value) || /^https?:\/\//i.test(value) || /_url$/i.test(key)) continue;
      findings.push({ path, line: index + 1, key, preview: `${value.slice(0, 4)}…` });
    }
  });
  return findings;
}

function listFiles(mode) {
  const output = mode === "--staged" ? git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]) : git(["ls-files"]);
  return output.split("\n").filter((path) => path && !SKIPPED_FILES.test(path) && !TEST_FILES.test(path));
}

// --staged : contenu indexé (ce qui sera commité) ; --all : copie de travail
// des fichiers suivis (ce qui partira au prochain commit si on les ajoute).
function readContent(mode, path) {
  return mode === "--staged" ? git(["show", `:${path}`]) : readFileSync(path, "utf8");
}

export function checkSecrets(mode = "--all") {
  const findings = [];
  for (const path of listFiles(mode)) {
    let content;
    try {
      content = readContent(mode, path);
    } catch {
      continue;
    }
    findings.push(...findSecrets(path, content));
  }
  return findings;
}

export { findSecrets };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv.includes("--staged") ? "--staged" : "--all";
  const findings = checkSecrets(mode);
  if (findings.length) {
    console.error("\nClés API ou secrets détectés — commit bloqué :\n");
    for (const finding of findings) console.error(`  ${finding.path}:${finding.line}  ${finding.key} = ${finding.preview}`);
    console.error(
      "\nCes valeurs ne doivent pas être versionnées (le dépôt peut être public)." +
        "\nPour un item d'overlay, le labo les range automatiquement dans data/secrets.json." +
        "\nFaux positif ? Ajoutez « check-secrets: ignore » en commentaire sur la ligne.\n"
    );
    process.exit(1);
  }
  if (mode === "--all") console.log("Aucun secret détecté dans les fichiers suivis.");
}
