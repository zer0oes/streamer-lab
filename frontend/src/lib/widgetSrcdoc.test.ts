import { describe, expect, it } from "vitest";
import { buildWidgetSrcdoc, substituteFields } from "./widgetSrcdoc";

describe("substituteFields", () => {
  it("remplace les gabarits {{champ}} et {champ}", () => {
    expect(substituteFields("Bonjour {{name}} alias {name}", { name: "Nova" })).toBe("Bonjour Nova alias Nova");
  });

  it("tolère les espaces dans {{ champ }}", () => {
    expect(substituteFields("{{  name  }}", { name: "Nova" })).toBe("Nova");
  });

  it("échappe les caractères spéciaux regex dans la clé", () => {
    expect(substituteFields("{{a.b}}", { "a.b": "X" })).toBe("X");
  });

  it("ne touche pas au texte sans gabarit correspondant", () => {
    expect(substituteFields("{{unknown}}", { name: "Nova" })).toBe("{{unknown}}");
  });
});

describe("buildWidgetSrcdoc", () => {
  const bundle = { html: "<div>{{title}}</div>", css: "body { color: red; }", js: "console.log('hi');" };

  it("substitue les champs dans html/css/js et embarque le JS exécutable", () => {
    const srcdoc = buildWidgetSrcdoc(bundle, { title: "Salut" });
    expect(srcdoc).toContain("<div>Salut</div>");
    expect(srcdoc).toContain("console.log");
  });

  it("échappe les balises < dans le JS injecté pour éviter de casser le </script> englobant", () => {
    const withScriptClose = { ...bundle, js: "const x = '</script>';" };
    const srcdoc = buildWidgetSrcdoc(withScriptClose, {});
    expect(srcdoc).not.toContain("</script>';");
  });

  it("expose la plateforme choisie et le shim SE_API seulement pour StreamElements", () => {
    const se = buildWidgetSrcdoc(bundle, {}, { platform: "streamelements" });
    expect(se).toContain('window.__WIDGET_PLATFORM__ = "streamelements"');
    expect(se).toContain("window.SE_API");

    const streamlabs = buildWidgetSrcdoc(bundle, {}, { platform: "streamlabs" });
    expect(streamlabs).toContain('window.__WIDGET_PLATFORM__ = "streamlabs"');
  });

  it("applique un fond transparent sur le canevas d'overlay (mode transparent)", () => {
    const srcdoc = buildWidgetSrcdoc(bundle, {}, { transparent: true });
    expect(srcdoc).toContain("background: transparent !important;");
    expect(srcdoc).not.toContain("se-lab-checker");
  });

  it("applique les classes damier/thème quand non transparent", () => {
    const srcdoc = buildWidgetSrcdoc(bundle, {}, { checkerClass: " se-lab-checker", themeClass: " se-lab-light" });
    expect(srcdoc).toContain('class="se-lab-preview se-lab-checker se-lab-light"');
  });
});
