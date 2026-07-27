import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const targets = [
  "node_modules",
  join("public", "styles.css"),
  join("public", "styles.css.map"),
  join("data", "app.sqlite"),
];

for (const target of targets) {
  rmSync(join(ROOT, target), { recursive: true, force: true });
}
