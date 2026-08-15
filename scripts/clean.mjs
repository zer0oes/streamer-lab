import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const targets = [
  "node_modules",
  join("frontend", "node_modules"),
  join("frontend", "dist"),
  join("data", "app.sqlite"),
];

for (const target of targets) {
  rmSync(join(ROOT, target), { recursive: true, force: true });
}
