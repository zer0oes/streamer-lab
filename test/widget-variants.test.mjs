import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("conserve des variantes JS et Fields distinctes pour les deux plateformes", async () => {
  const [streamElementsJs, streamlabsJs, streamElementsFieldsSource, streamlabsFieldsSource] =
    await Promise.all([
      readFile(new URL("../widget/zer0oes-goal-bar/widget.streamelements.js", import.meta.url), "utf8"),
      readFile(new URL("../widget/zer0oes-goal-bar/widget.streamlabs.js", import.meta.url), "utf8"),
      readFile(new URL("../widget/zer0oes-goal-bar/fields.streamelements.json", import.meta.url), "utf8"),
      readFile(new URL("../widget/zer0oes-goal-bar/fields.streamlabs.json", import.meta.url), "utf8")
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
