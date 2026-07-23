import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const supportedFieldTypes = new Set([
  "button",
  "checkbox",
  "colorpicker",
  "dropdown",
  "googleFont",
  "hidden",
  "image-input",
  "number",
  "slider",
  "sound-input",
  "text",
  "video-input"
]);

test("utilise le format Fields officiel de StreamElements", async () => {
  const source = await readFile(new URL("../widget/zer0oes-goal-bar/fields.streamelements.json", import.meta.url), "utf8");
  const fields = JSON.parse(source);

  assert.equal(Array.isArray(fields), false);
  assert.equal(typeof fields, "object");
  assert.ok(Object.keys(fields).length > 0);

  for (const [name, definition] of Object.entries(fields)) {
    assert.ok(supportedFieldTypes.has(definition.type), `${name}: type ${definition.type} non pris en charge`);
    assert.equal("name" in definition, false, `${name}: le nom doit être la clé de l’objet`);
  }
});

test("écoute les trois événements natifs utiles au goal StreamElements", async () => {
  const source = await readFile(new URL("../widget/zer0oes-goal-bar/widget.streamelements.js", import.meta.url), "utf8");

  assert.match(source, /addEventListener\(["']onWidgetLoad["']/);
  assert.match(source, /addEventListener\(["']onEventReceived["']/);
  assert.match(source, /addEventListener\(["']onSessionUpdate["']/);
  assert.match(source, /detail\?\.session/);
  assert.match(source, /detail\?\.fieldData/);
  assert.match(source, /SE_API\.store\.get/);
  assert.match(source, /SE_API\.store\.set/);
});

test("démarre avec un payload StreamElements et réconcilie un follow", async () => {
  const source = await readFile(new URL("../widget/zer0oes-goal-bar/widget.streamelements.js", import.meta.url), "utf8");
  const listeners = {};
  const cssVariables = {};
  const makeElement = () => ({ style: {}, textContent: "", clientWidth: 260 });
  const elements = Object.fromEntries([
    "googleFontLink",
    "fill",
    "goal",
    "goalIcon",
    "title",
    "current",
    "target"
  ].map(id => [id, makeElement()]));
  const left = makeElement();
  elements.goal.querySelector = selector => selector === ".goal-left" ? left : null;

  const context = vm.createContext({
    window: { addEventListener: (name, handler) => { listeners[name] = handler; } },
    document: {
      documentElement: { style: { setProperty: (key, value) => { cssVariables[key] = value; } } },
      getElementById: id => elements[id] || null
    },
    localStorage: { getItem: () => null, setItem: () => {} },
    SE_API: { store: { get: async () => ({}), set: async () => {} } },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame: callback => callback(),
    setTimeout,
    clearTimeout,
    console
  });

  vm.runInContext(source, context);
  listeners.onWidgetLoad({
    detail: {
      fieldData: { goal_type: "follows", goal_total: 1000, title: "Follow goal" },
      session: { data: { "follower-total": { count: 942 } } }
    }
  });

  assert.equal(elements.current.textContent, "942");
  assert.equal(elements.target.textContent, "1000");
  assert.equal(elements.title.textContent, "Follow goal");

  listeners.onEventReceived({
    detail: { listener: "follower-latest", event: { id: "follow-1", name: "NovaViewer" } }
  });
  assert.equal(elements.current.textContent, "943");

  listeners.onSessionUpdate({ detail: { session: { "follower-total": { count: 943 } } } });
  assert.equal(elements.current.textContent, "943");
  assert.equal(cssVariables["--w"], "402px");
});
