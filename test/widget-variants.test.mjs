import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { findWidgetDirectory } from "./helpers/library-paths.mjs";

test("conserve des variantes JS et Fields distinctes pour les deux plateformes", async () => {
  const directory = await findWidgetDirectory("zer0oes-goal-bar");
  const [streamElementsJs, streamlabsJs, streamElementsFieldsSource, streamlabsFieldsSource] =
    await Promise.all([
      readFile(join(directory, "widget.streamelements.js"), "utf8"),
      readFile(join(directory, "widget.streamlabs.js"), "utf8"),
      readFile(join(directory, "fields.streamelements.json"), "utf8"),
      readFile(join(directory, "fields.streamlabs.json"), "utf8")
    ]);

  const streamElementsFields = JSON.parse(streamElementsFieldsSource);
  const streamlabsFields = JSON.parse(streamlabsFieldsSource);

  assert.notEqual(streamElementsJs, streamlabsJs);
  assert.match(streamElementsJs, /onWidgetLoad/);
  assert.match(streamlabsJs, /onLoad/);
  assert.doesNotThrow(() => new Function(streamElementsJs));
  assert.doesNotThrow(() => new Function(streamlabsJs));
  assert.equal(streamElementsFields.title.type, "text");
  assert.equal(streamlabsFields.title.type, "textfield");
});
