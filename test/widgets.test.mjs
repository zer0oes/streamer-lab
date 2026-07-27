import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bumpUpdatedAt, ensureManifestDates, getWidgetInfo, listWidgets, widgetFromManifest } from "../lib/widgets.mjs";

// These tests never touch the real library/widgets|alerts directories —
// every fixture lives under a fresh os.tmpdir() subdirectory, removed after
// each test, so running `npm test` never mutates the project's real
// widget library.
async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "widget-lab-test-"));
  const categoryDirs = {
    widget: join(root, "widgets"),
    alert: join(root, "alerts")
  };
  await mkdir(categoryDirs.widget, { recursive: true });
  await mkdir(categoryDirs.alert, { recursive: true });
  return {
    root,
    categoryDirs,
    cleanup: () => rm(root, { recursive: true, force: true })
  };
}

async function writeManifest(directory, manifest) {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "widget.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

test("listWidgets renvoie createdAt/updatedAt deja presents sans les modifier", async (t) => {
  const fixture = await createFixture();
  t.after(fixture.cleanup);

  const directory = join(fixture.categoryDirs.widget, "already-dated");
  await writeManifest(directory, { id: "already-dated", name: "Deja date", order: 10, createdAt: 111, updatedAt: 222 });

  const widgets = await listWidgets(fixture.categoryDirs);
  assert.equal(widgets.length, 1);
  assert.equal(widgets[0].createdAt, 111);
  assert.equal(widgets[0].updatedAt, 222);

  const manifestOnDisk = JSON.parse(await readFile(join(directory, "widget.json"), "utf8"));
  assert.equal(manifestOnDisk.createdAt, 111);
  assert.equal(manifestOnDisk.updatedAt, 222);
});

test("listWidgets retro-comble createdAt/updatedAt pour un widget existant sans ces champs, et persiste le resultat", async (t) => {
  const fixture = await createFixture();
  t.after(fixture.cleanup);

  const directory = join(fixture.categoryDirs.widget, "legacy-widget");
  await writeManifest(directory, { id: "legacy-widget", name: "Widget historique", order: 10 });

  const widgets = await listWidgets(fixture.categoryDirs);
  assert.equal(widgets.length, 1);
  assert.ok(Number.isFinite(widgets[0].createdAt), "createdAt doit etre un nombre");
  assert.ok(Number.isFinite(widgets[0].updatedAt), "updatedAt doit etre un nombre");

  const manifestOnDisk = JSON.parse(await readFile(join(directory, "widget.json"), "utf8"));
  assert.ok(Number.isFinite(manifestOnDisk.createdAt), "le retro-comblage doit etre persiste sur le manifeste");
  assert.ok(Number.isFinite(manifestOnDisk.updatedAt));

  // Un second appel ne doit pas recalculer/reecrire les dates (elles sont deja presentes).
  const secondPass = await listWidgets(fixture.categoryDirs);
  assert.equal(secondPass[0].createdAt, widgets[0].createdAt);
  assert.equal(secondPass[0].updatedAt, widgets[0].updatedAt);
});

test("getWidgetInfo retro-comble aussi les dates pour un widget resolu individuellement", async (t) => {
  const fixture = await createFixture();
  t.after(fixture.cleanup);

  const directory = join(fixture.categoryDirs.widget, "legacy-single");
  await writeManifest(directory, { id: "legacy-single", name: "Widget seul", order: 10 });

  const info = await getWidgetInfo("legacy-single", fixture.categoryDirs);
  assert.ok(info, "le widget doit etre trouve");
  assert.ok(Number.isFinite(info.createdAt));
  assert.ok(Number.isFinite(info.updatedAt));
});

test("bumpUpdatedAt met a jour updatedAt sans toucher au reste du manifeste", async (t) => {
  const fixture = await createFixture();
  t.after(fixture.cleanup);

  const directory = join(fixture.categoryDirs.widget, "editable-widget");
  await writeManifest(directory, {
    id: "editable-widget",
    name: "Widget editable",
    description: "Une description",
    icon: "widgets",
    order: 30,
    createdAt: 1000,
    updatedAt: 1000
  });

  const updated = await bumpUpdatedAt(directory);
  assert.equal(updated.createdAt, 1000, "createdAt ne doit jamais etre modifie par bumpUpdatedAt");
  assert.notEqual(updated.updatedAt, 1000, "updatedAt doit changer");
  assert.equal(updated.name, "Widget editable");
  assert.equal(updated.description, "Une description");

  const manifestOnDisk = JSON.parse(await readFile(join(directory, "widget.json"), "utf8"));
  assert.equal(manifestOnDisk.updatedAt, updated.updatedAt);
});

test("ensureManifestDates ne touche pas au disque quand les deux dates sont deja presentes", async (t) => {
  const fixture = await createFixture();
  t.after(fixture.cleanup);

  const directory = join(fixture.categoryDirs.widget, "no-touch");
  const manifestPath = join(directory, "widget.json");
  await writeManifest(directory, { id: "no-touch", name: "N", order: 10, createdAt: 5, updatedAt: 6 });

  const result = await ensureManifestDates(directory, manifestPath, { id: "no-touch", name: "N", order: 10, createdAt: 5, updatedAt: 6 });
  assert.equal(result.createdAt, 5);
  assert.equal(result.updatedAt, 6);
});

test("widgetFromManifest renvoie null pour createdAt/updatedAt manquants (defensif, avant retro-comblage)", () => {
  const entry = widgetFromManifest("raw", { name: "Brut" }, "widget");
  assert.equal(entry.createdAt, null);
  assert.equal(entry.updatedAt, null);
});
