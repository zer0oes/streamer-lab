import { describe, expect, it } from "vitest";
import { escapeHtml, highlightSource } from "./syntaxHighlight";

describe("escapeHtml", () => {
  it("échappe les caractères HTML spéciaux", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#039;&amp;&#039;&lt;/a&gt;");
  });
});

describe("highlightSource", () => {
  it("surligne les balises et attributs HTML", () => {
    const html = highlightSource("html", '<div class="x">');
    expect(html).toContain('<span class="tok-tag">&lt;div</span>');
    expect(html).toContain('<span class="tok-attr">class</span>');
    expect(html).toContain('<span class="tok-string">&quot;x&quot;</span>');
  });

  it("surligne les commentaires CSS et les couleurs hexadécimales", () => {
    const css = highlightSource("css", "/* note */ .x { color: #fff; }");
    expect(css).toContain('<span class="tok-comment">/* note */</span>');
    expect(css).toContain('<span class="tok-number">#fff</span>');
  });

  it("surligne les mots-clés et chaînes JS", () => {
    const js = highlightSource("js", 'const x = "hello";');
    expect(js).toContain('<span class="tok-keyword">const</span>');
    expect(js).toContain('<span class="tok-string">&quot;hello&quot;</span>');
  });

  it("surligne les clés JSON dans fields/data", () => {
    const fields = highlightSource("fields", '{"title": "Défaut", "count": 5}');
    expect(fields).toContain('<span class="tok-key">&quot;title&quot;</span>');
    expect(fields).toContain('<span class="tok-number">5</span>');
    // "data" doit utiliser le même surligneur que "fields".
    expect(highlightSource("data", '{"a": 1}')).toBe(highlightSource("fields", '{"a": 1}'));
  });

  it("préserve les gabarits {{champ}} intacts (non re-découpés)", () => {
    const html = highlightSource("html", "<span>{{message}}</span>");
    expect(html).toContain('<span class="tok-template">{{message}}</span>');
  });

  it("n'échappe pas deux fois le texte hors correspondance", () => {
    const html = highlightSource("html", "juste du texte & rien d'autre");
    expect(html).toBe("juste du texte &amp; rien d&#039;autre");
  });
});
