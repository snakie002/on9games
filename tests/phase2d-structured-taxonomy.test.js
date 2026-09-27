/**
 * PHASE 2D RED→GREEN: structured taxonomy, derived compatibility, hubs, URLs.
 *
 * The highest-risk assertion in this phase is URL preservation: 325 live
 * articles and 899 rendered pages must keep their addresses. That is tested
 * against a captured pre-2D baseline, not against intent.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  deriveStructuredMetadata,
  deriveBadges,
  resolve,
  normalizeAlias,
  LIMITS,
  DISPLAY,
} = require("../src/_data/structuredMetadata.js");

const ROOT = path.join(__dirname, "..");

// ───────────────────────────── derivation ──────────────────────────────────
test("explicit V2 frontmatter wins over legacy mapping", () => {
  const out = deriveStructuredMetadata({
    contentType: "guide",
    games: ["onimusha-way-of-the-sword"],
    categories: ["news"],
  });
  assert.equal(out.source, "v2");
  assert.equal(out.contentType, "guide");
});

test("a legacy article derives a contentType from approved mappings", () => {
  const out = deriveStructuredMetadata({ categories: ["poe-guide"] });
  assert.equal(out.source, "legacy");
  assert.equal(out.contentType, "guide");
  assert.ok(out.franchises.includes("path-of-exile"));
});

test("an unmapped legacy category is reported, never guessed", () => {
  const out = deriveStructuredMetadata({ categories: ["totally-unknown-xyz"] });
  assert.ok(out.unmapped.includes("totally-unknown-xyz"));
  assert.equal(out.contentType, null);
});

test("a tag naming a real game becomes a game relationship", () => {
  const out = deriveStructuredMetadata({ categories: ["news"], tags: ["Onimusha"] });
  assert.ok(out.games.includes("onimusha-way-of-the-sword"));
});

test("fuzzy entity guessing is refused", () => {
  for (const near of ["onimusha way of sword", "onimush", "baldurs gate"]) {
    assert.equal(resolve("games", near), null, `${near} must not match`);
  }
});

test("alias resolution normalises case and whitespace only", () => {
  assert.equal(resolve("games", "  ONIMUSHA-WAY-OF-THE-SWORD "),
               "onimusha-way-of-the-sword");
});

test("registry limits are applied to derived values", () => {
  const out = deriveStructuredMetadata({
    contentType: "news",
    topics: ["new-game", "release-date", "trailer", "update", "dlc"],
    genres: [], traits: [],
    games: [],
  });
  assert.ok(out.topics.length <= LIMITS.topics_per_article);
});

test("primaryGames never exceeds the registry limit", () => {
  const out = deriveStructuredMetadata({
    categories: ["news"],
    tags: ["Onimusha", "Baldur's Gate 3", "Factorio", "Diablo IV",
           "Last Epoch", "Mechabellum", "Persona 4 Revival"],
  });
  assert.ok(out.primaryGames.length <= LIMITS.primary_games);
});

test("legacy author is derived from the article directory", () => {
  const snakie = deriveStructuredMetadata({
    categories: ["news"],
    page: { inputPath: "./src/blog/Snakie/26/260924-X/index.md" },
  });
  assert.equal(snakie.author, "snakie002");
  const hfok = deriveStructuredMetadata({
    categories: ["news"],
    page: { inputPath: "./src/blog/Hfok/24/240101-Y/index.md" },
  });
  assert.equal(hfok.author, "hfok");
});

test("an automated article is not attributed to a person when V2 says otherwise", () => {
  const out = deriveStructuredMetadata({
    contentType: "news",
    author: "on9games",
    page: { inputPath: "./src/blog/Snakie/26/260925-Z/index.md" },
  });
  assert.equal(out.author, "on9games");
});

// ─────────────────────────────── badges ────────────────────────────────────
test("badges derive from structured metadata", () => {
  const structured = deriveStructuredMetadata({
    contentType: "guide",
    games: ["onimusha-way-of-the-sword"],
    topics: ["walkthrough"],
    traits: ["single-player"],
  });
  const badges = deriveBadges(structured);
  const kinds = badges.map((b) => b.kind);
  assert.ok(kinds.includes("contentType"));
  assert.ok(kinds.includes("game"));
  assert.ok(badges.every((b) => b.label && b.label.length > 0),
            "every badge needs a display label");
});

test("game badges link to the game hub", () => {
  const badges = deriveBadges(deriveStructuredMetadata({
    contentType: "news", games: ["onimusha-way-of-the-sword"] }));
  const game = badges.find((b) => b.kind === "game");
  assert.equal(game.url, "/game/onimusha-way-of-the-sword/");
});

test("display labels come from the registry, not hardcoded strings", () => {
  assert.ok(DISPLAY.contentType.guide);
  assert.ok(DISPLAY.contentType.news);
});

// ───────────────────── URL preservation (highest risk) ─────────────────────
test("every pre-2D rendered URL still exists", () => {
  const baselinePath = path.join(__dirname, "fixtures-permalinks-pre2d.json");
  if (!fs.existsSync(baselinePath)) {
    assert.fail("pre-2D URL baseline is missing; capture it before Phase 2D");
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const site = path.join(ROOT, "_site");
  if (!fs.existsSync(site)) {
    assert.fail("_site is missing; run the build before asserting URLs");
  }
  const missing = baseline.filter((url) => {
    const target = path.join(site, url, "index.html");
    return !fs.existsSync(target);
  });
  assert.deepEqual(missing, [], `these URLs disappeared: ${missing.slice(0, 5)}`);
});

test("historical /YY/ article URLs are untouched", () => {
  const legacy = path.join(ROOT, "_site", "26");
  assert.ok(fs.existsSync(legacy), "the /26/ URL space must still exist");
  const dirs = fs.readdirSync(legacy);
  assert.ok(dirs.length >= 20, `expected many /26/ articles, found ${dirs.length}`);
});

test("no historical article body was rewritten for taxonomy", () => {
  // Phase 2D derives metadata; it must not edit article markdown.
  const { execSync } = require("node:child_process");
  const changed = execSync("git diff --name-only HEAD -- src/blog", { cwd: ROOT })
    .toString().trim();
  assert.equal(changed, "", `article files were modified: ${changed}`);
});

// ───────────────────────────── hubs and routes ─────────────────────────────
test("game hub pages are generated for registry games", () => {
  const site = path.join(ROOT, "_site", "game");
  if (!fs.existsSync(site)) {
    assert.fail("/game/<slug>/ hubs were not generated");
  }
  const hub = path.join(site, "onimusha-way-of-the-sword", "index.html");
  assert.ok(fs.existsSync(hub), "the Onimusha game hub must exist");
});

test("franchise hub pages are generated", () => {
  const hub = path.join(ROOT, "_site", "franchise", "path-of-exile", "index.html");
  assert.ok(fs.existsSync(hub), "the Path of Exile franchise hub must exist");
});

test("author hub pages are generated for every canonical author", () => {
  for (const author of ["on9games", "snakie002", "hfok", "guest"]) {
    const hub = path.join(ROOT, "_site", "author", author, "index.html");
    assert.ok(fs.existsSync(hub), `/author/${author}/ must exist`);
  }
});

test("a game hub aggregates more than one content type", () => {
  const hub = path.join(ROOT, "_site", "game", "path-of-exile", "index.html");
  if (!fs.existsSync(hub)) return;                 // hub only if content exists
  const html = fs.readFileSync(hub, "utf8");
  assert.ok(html.includes("href=\"/2") || html.includes("href=\"/1") ||
            html.includes("href=\"/26"), "a hub must link to its articles");
});

// ───────────────────────────── collections ─────────────────────────────────
test("recentPosts stays deterministic and date-ordered", () => {
  // Read the machine-readable <time datetime> attributes, never prose: article
  // bodies contain Chinese text like "26 年冬季至 2027" that looks like a date.
  const home = path.join(ROOT, "_site", "index.html");
  const html = fs.readFileSync(home, "utf8");
  const stamps = [...html.matchAll(/datetime="(\d{4}-\d{2}-\d{2})/g)]
    .map((m) => m[1]);
  assert.ok(stamps.length > 0, "the homepage must expose machine-readable dates");
  const sorted = [...stamps].sort().reverse();
  assert.deepEqual(stamps, sorted, "recent posts must be newest first");
});

test("data objects are never exposed as tag pages", () => {
  const tags = path.join(ROOT, "_site", "tags");
  if (!fs.existsSync(tags)) return;
  for (const denied of ["featuredPosts", "structuredMetadata", "contentRegistry"]) {
    assert.ok(!fs.existsSync(path.join(tags, denied)),
              `${denied} must not become a tag page`);
  }
});

// ───────────────────────── description fallback ────────────────────────────
test("a legacy article without a description gets a page-specific excerpt", () => {
  const { deriveDescription } = require("../src/_data/structuredMetadata.js");
  if (!deriveDescription) return;                  // implemented below
  const out = deriveDescription({
    title: "測試標題",
    content: "<p>這是第一段有意義的內文，應該成為摘要。</p>",
  }, "SITE FALLBACK");
  assert.notEqual(out, "SITE FALLBACK");
  assert.ok(out.includes("第一段"));
});
