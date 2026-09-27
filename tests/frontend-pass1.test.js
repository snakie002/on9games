/**
 * 2CDE FRONTEND PASS 1: navigation, homepage information architecture, cards.
 * Asserts against the BUILT site (run `npm run build` first), like the Phase 2D
 * URL tests. Presentation only: no article file may change.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SITE = path.join(ROOT, "_site");
const read = (...p) => fs.readFileSync(path.join(SITE, ...p), "utf8");
const registry = require("../src/_data/contentRegistry.json");
const TYPES = registry.contentTypes.map((t) => t.id);

function homeSections(html) {
  return Object.fromEntries(
    [...html.matchAll(/<section class="home-section[^"]*"[^>]*aria-labelledby="h-([a-z-]+)"[\s\S]*?<\/section>/g)]
      .map((m) => [m[1], m[0]]));
}
const cardUrls = (chunk) => [...chunk.matchAll(/<h3 class="acard-title"><a href="([^"]+)"/g)].map((m) => m[1]);

test("primary nav exposes all five content types with registry labels", () => {
  const html = read("index.html");
  const nav = html.slice(html.indexOf('<nav class="site-nav'), html.indexOf("</nav>"));
  for (const t of registry.contentTypes) {
    assert.ok(nav.includes(`href="/type/${t.id}/"`), `nav must link /type/${t.id}/`);
    assert.ok(nav.includes(t.display_zh_tw), `nav must use the registry label ${t.display_zh_tw}`);
  }
});

test("primary nav keeps every legacy category shortcut the old bar had", () => {
  const html = read("index.html");
  const nav = html.slice(html.indexOf('<nav class="site-nav'), html.indexOf("</nav>"));
  for (const slug of ["poe", "poe-guide", "poe-news", "poe-ls", "poe2", "poe2-guide",
                      "poe2-news", "tli", "le", "sp", "multi"]) {
    assert.ok(nav.includes(`href="/category/${slug}/"`), `nav lost /category/${slug}/`);
  }
});

test("every nav link resolves to a built page (no 404 in the menu)", () => {
  const html = read("index.html");
  const nav = html.slice(html.indexOf('<nav class="site-nav'), html.indexOf("</nav>"));
  const hrefs = [...new Set([...nav.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]))];
  const missing = hrefs.filter((h) => !fs.existsSync(path.join(SITE, h, "index.html")));
  assert.deepEqual(missing, [], `nav links with no page: ${missing}`);
});

test("mobile nav exists and does not depend on hover", () => {
  const html = read("index.html");
  assert.match(html, /<details class="nav-mobile/);
  assert.match(html, /<details class="nav-group/);
});

test("a /type/<id>/ page exists for every content type", () => {
  for (const id of TYPES) {
    assert.ok(fs.existsSync(path.join(SITE, "type", id, "index.html")), `/type/${id}/ missing`);
  }
});

test("/type/<id>/ lists that type's articles (contentTypeHubs is populated)", () => {
  // Regression: groupByStructured iterated the contentType STRING, grouping by
  // characters, so every type hub was empty.
  for (const id of ["news", "guide"]) {
    const html = read("type", id, "index.html");
    const rows = (html.match(/class="postlist/g) || []).length;
    assert.ok(rows > 10, `/type/${id}/ lists only ${rows} articles`);
  }
});

test("homepage: featured, latest, then only non-empty content-type sections", () => {
  const sections = homeSections(read("index.html"));
  const order = Object.keys(sections);
  assert.equal(order[0], "featured");
  assert.equal(order[1], "latest");
  for (const id of order.slice(2).filter((id) => id !== "archive")) {
    assert.ok(TYPES.includes(id), `unexpected section ${id}`);
    assert.ok(cardUrls(sections[id]).length > 0, `section ${id} must not be empty`);
  }
});

test("homepage cards never repeat an article across sections", () => {
  const sections = homeSections(read("index.html"));
  const urls = Object.entries(sections).filter(([id]) => id !== "archive")
    .flatMap(([, chunk]) => cardUrls(chunk));
  assert.equal(new Set(urls).size, urls.length, "an article appeared in two homepage sections");
});

test("cards use the article's own published cover, never an invented image", () => {
  const html = read("index.html");
  const imgs = [...html.matchAll(/<a class="acard-media"[^>]*>\s*<img src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(imgs.length > 0);
  for (const src of imgs) {
    assert.match(src, /\/post_assets\/[^/]+\.(jpe?g|png|webp)$/i, `unexpected card image ${src}`);
    assert.ok(!src.includes("\\"), `card image URL must use forward slashes: ${src}`);
  }
});

test("content-type badges come from metadata and link to the type page", () => {
  const html = read("index.html");
  const badges = [...html.matchAll(/<a class="ct-badge" data-type="([a-z-]+)" href="([^"]+)">([^<]+)<\/a>/g)];
  assert.ok(badges.length > 0, "cards must show content-type badges");
  for (const [, id, href, label] of badges) {
    assert.ok(TYPES.includes(id));
    assert.equal(href, `/type/${id}/`);
    assert.equal(label, registry.contentTypes.find((t) => t.id === id).display_zh_tw);
  }
});

test("a legacy article, a V2 news article and a guide render as cards", () => {
  const html = read("index.html");
  // guide (Contract V2 Guide pipeline output, legacy URL form)
  assert.ok(html.includes('href="/26/260927-Puzzle_Solutions/"'), "Guide card missing");
  // V2-URL news article
  assert.ok(html.includes('href="/2026/toxic-frontier-card-hex-survival-city-builder-announced/"'),
            "V2 /2026/ news card missing");
  // an old legacy article is still reachable from the homepage (archive list)
  assert.ok(/href="\/2[0-4]\/[^"]+"/.test(html) || /href="\/1\d\/[^"]+"/.test(html),
            "legacy archive articles must remain linked from the homepage");
});

test("pass 1 changed no article source", () => {
  const { execSync } = require("node:child_process");
  const changed = execSync("git diff --name-only HEAD -- src/blog", { cwd: ROOT }).toString().trim();
  assert.equal(changed, "", `article files were modified: ${changed}`);
});
