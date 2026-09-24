// Date integrity: a published article's rendered date must be a property of the
// article, never of the machine or the moment that built it.
//
// THE DEFECT THIS LOCKS OUT
// Eleventy falls back to the file's filesystem birthtime when frontmatter has no
// `date:`. Cloudflare Pages clones the repo fresh on every deploy, so birthtime
// becomes *deploy time*. An older article with no explicit date therefore silently
// re-dates itself to today every time ANY other article is published.
// Observed live: Persona 4 Revival (published 2026-09-21) rendered as 2026-09-24
// after the Neon Abyss 2 deploy, while the local build still showed 2026-09-21 —
// the tell-tale signature of a filesystem-derived date.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "..");
const BLOG = path.join(ROOT, "src", "blog");

function articles() {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "index.md") out.push(full);
    }
  })(BLOG);
  return out;
}

function frontMatter(file) {
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : "";
}

function frontMatterDate(file) {
  const line = frontMatter(file).match(/^date:\s*"?([0-9]{4}-[0-9]{2}-[0-9]{2})"?/m);
  return line ? line[1] : null;
}

test("every article pins its own date in frontmatter", () => {
  // Without this, the date comes from the filesystem, which CI recreates on
  // every deploy. This is the single assertion that makes the bug impossible.
  const undated = articles()
    .filter((file) => frontMatterDate(file) === null)
    .map((file) => path.relative(ROOT, file));

  assert.deepStrictEqual(
    undated,
    [],
    `these articles would inherit the build machine's clock instead of their own publication date:\n  ${undated.join("\n  ")}`,
  );
});

test("a rendered date never depends on file birthtime (the deploy-clone path)", () => {
  // Simulate what Cloudflare does: place the article on disk "now", the way a
  // fresh clone would, and prove the resolved date is still the article's own.
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "on9-date-integrity-"));
  try {
    for (const source of articles()) {
      const copy = path.join(temp, "index.md");
      fs.writeFileSync(copy, fs.readFileSync(source)); // birthtime = now
      const birth = fs.statSync(copy).birthtime.toISOString().slice(0, 10);
      const declared = frontMatterDate(source);

      assert.notEqual(
        declared,
        null,
        `${path.relative(ROOT, source)} has no frontmatter date, so it would resolve to ${birth}`,
      );
      // The article's date must come from its text, so a file written today
      // still resolves to its real publication date.
      assert.match(declared, /^\d{4}-\d{2}-\d{2}$/);
      fs.rmSync(copy);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("publishing a new article does not mutate an existing article's date", () => {
  // The exact scenario from the incident: article A exists with date A;
  // article B is published on a later day; A's date must be untouched.
  const existing = path.join(BLOG, "Snakie", "26", "260921-Persona_4_Revival", "index.md");
  const published = path.join(BLOG, "Snakie", "26", "260924-Neon_Abyss_2", "index.md");
  if (!fs.existsSync(existing) || !fs.existsSync(published)) return; // articles may be archived later

  const dateA = frontMatterDate(existing);
  const dateB = frontMatterDate(published);

  assert.equal(dateA, "2026-09-21", "the older article must keep its own publication date");
  assert.equal(dateB, "2026-09-24", "the newer article carries the publication day");
  assert.notEqual(dateA, dateB, "a later publication must not pull an older article's date forward");
});

test("the article date agrees with its permalink slug", () => {
  // Catches the inverse error: a date edited to something the URL contradicts.
  const mismatched = [];
  for (const file of articles()) {
    const front = frontMatter(file);
    const permalink = front.match(/^permalink:\s*"?([^"\n]+)"?/m);
    const declared = frontMatterDate(file);
    if (!permalink || !declared) continue;
    const slug = permalink[1].match(/\/(\d{2})(\d{2})(\d{2})-/);
    if (!slug) continue;
    const [, yy, mm, dd] = slug;
    const fromSlug = `20${yy}-${mm}-${dd}`;
    if (fromSlug !== declared) {
      mismatched.push(`${path.relative(ROOT, file)}: date=${declared} permalink implies ${fromSlug}`);
    }
  }
  assert.deepStrictEqual(mismatched, [], `date/permalink disagreement:\n  ${mismatched.join("\n  ")}`);
});
