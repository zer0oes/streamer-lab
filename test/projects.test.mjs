import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createProject,
  deleteProject,
  getProjectInfo,
  listProjects,
  migrateLegacyLibrary,
  updateProjectMetadata
} from "../lib/projects.mjs";

// Comme test/widgets.test.mjs : chaque test travaille dans un dossier
// temporaire dedie, jamais dans le vrai library/ du projet.
async function createFixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "projects-lab-test-"));
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test("createProject cree le manifeste et les 3 sous-dossiers overlays/widgets/alerts", async (t) => {
  const fixture = await createFixtureRoot();
  t.after(fixture.cleanup);

  const project = await createProject({ id: "jeux", name: "Jeux", description: "Setup gaming", icon: "sports_esports" }, fixture.root);
  assert.equal(project.id, "jeux");
  assert.equal(project.name, "Jeux");
  assert.ok(existsSync(join(fixture.root, "jeux", "project.json")));
  assert.ok(existsSync(join(fixture.root, "jeux", "overlays")));
  assert.ok(existsSync(join(fixture.root, "jeux", "widgets")));
  assert.ok(existsSync(join(fixture.root, "jeux", "alerts")));

  const projects = await listProjects(fixture.root);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, "jeux");
});

test("getProjectInfo renvoie null pour un id reserve ou inconnu", async (t) => {
  const fixture = await createFixtureRoot();
  t.after(fixture.cleanup);

  assert.equal(await getProjectInfo("media", fixture.root), null);
  assert.equal(await getProjectInfo("inconnu", fixture.root), null);
});

test("updateProjectMetadata modifie nom/description/icone sans toucher au reste", async (t) => {
  const fixture = await createFixtureRoot();
  t.after(fixture.cleanup);

  await createProject({ id: "jeux", name: "Jeux", description: "", icon: "sports_esports" }, fixture.root);
  const updated = await updateProjectMetadata("jeux", { name: "Jeux FPS", description: "Setup FPS", icon: "gamepad" }, fixture.root);
  assert.equal(updated.name, "Jeux FPS");
  assert.equal(updated.description, "Setup FPS");
  assert.equal(updated.icon, "gamepad");

  const reloaded = await getProjectInfo("jeux", fixture.root);
  assert.equal(reloaded.name, "Jeux FPS");
});

test("deleteProject supprime le projet et son contenu", async (t) => {
  const fixture = await createFixtureRoot();
  t.after(fixture.cleanup);

  await createProject({ id: "jeux", name: "Jeux", description: "", icon: "sports_esports" }, fixture.root);
  assert.equal(await deleteProject("jeux", fixture.root), true);
  assert.equal(await getProjectInfo("jeux", fixture.root), null);
  assert.equal(await deleteProject("jeux", fixture.root), false);
});

test("migrateLegacyLibrary deplace l'ancien layout plat dans library/principal/ sans perte", async (t) => {
  const fixture = await createFixtureRoot();
  t.after(fixture.cleanup);

  await mkdir(join(fixture.root, "overlays", "starting-soon"), { recursive: true });
  await writeFile(join(fixture.root, "overlays", "starting-soon", "overlay.json"), JSON.stringify({ id: "starting-soon", name: "Starting soon" }), "utf8");
  await mkdir(join(fixture.root, "widgets", "goal-bar"), { recursive: true });
  await writeFile(join(fixture.root, "widgets", "goal-bar", "widget.json"), JSON.stringify({ id: "goal-bar", name: "Goal bar" }), "utf8");
  await mkdir(join(fixture.root, "alerts", "hype"), { recursive: true });
  await writeFile(join(fixture.root, "alerts", "hype", "widget.json"), JSON.stringify({ id: "hype", name: "Hype" }), "utf8");

  await migrateLegacyLibrary(fixture.root);

  assert.equal(existsSync(join(fixture.root, "overlays")), false, "l'ancien dossier overlays/ ne doit plus exister a la racine");
  assert.equal(existsSync(join(fixture.root, "widgets")), false);
  assert.equal(existsSync(join(fixture.root, "alerts")), false);

  const projects = await listProjects(fixture.root);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, "principal");

  assert.ok(existsSync(join(fixture.root, "principal", "overlays", "starting-soon", "overlay.json")));
  assert.ok(existsSync(join(fixture.root, "principal", "widgets", "goal-bar", "widget.json")));
  assert.ok(existsSync(join(fixture.root, "principal", "alerts", "hype", "widget.json")));

  // Idempotent : un second appel ne doit rien faire (pas d'erreur, pas de doublon).
  await migrateLegacyLibrary(fixture.root);
  const projectsAfterSecondRun = await listProjects(fixture.root);
  assert.equal(projectsAfterSecondRun.length, 1);
});

test("migrateLegacyLibrary ne fait rien si aucun ancien dossier n'est present", async (t) => {
  const fixture = await createFixtureRoot();
  t.after(fixture.cleanup);

  await migrateLegacyLibrary(fixture.root);
  const projects = await listProjects(fixture.root);
  assert.equal(projects.length, 0);
});
