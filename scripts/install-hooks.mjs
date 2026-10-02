// Active les hooks git du dépôt (.githooks/) : notamment le pre-commit qui
// bloque les clés API. Lancé par « npm install » (script prepare) ; sans
// effet hors d'un dépôt git.
import { execFileSync } from "node:child_process";

try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "ignore" });
  console.log("Hooks git activés (.githooks/) : les commits contenant une clé API seront bloqués.");
} catch {
  // Pas de dépôt git (archive, CI sans .git) : rien à faire
}
