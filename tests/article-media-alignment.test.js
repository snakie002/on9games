const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const sourceCssPath = path.join(__dirname, "..", "src", "public", "css", "index.css");

function cssRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "gm"))];
  assert.ok(matches.length, `Expected CSS rule for ${selector}`);
  return matches.at(-1)[1];
}

function declarations(rule) {
  return Object.fromEntries(
    rule
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const colon = entry.indexOf(":");
        return [entry.slice(0, colon).trim(), entry.slice(colon + 1).trim()];
      }),
  );
}

function assertLeftFlow(css, selector) {
  const rule = declarations(cssRule(css, selector));
  assert.equal(rule["margin-left"], "0", `${selector} must start at the article's left edge`);
  assert.equal(rule["margin-right"], "auto", `${selector} may keep unused responsive space on the right`);
}

test("article media and captions use left-aligned body flow", () => {
  const css = fs.readFileSync(sourceCssPath, "utf8");

  for (const selector of [
    ".post-content figure",
    ".post-content .image-with-caption",
    ".post-content p > img",
    ".post-content .lazy-yt",
    '.post-content iframe[src*="store.steampowered.com/widget/"]',
  ]) {
    assertLeftFlow(css, selector);
  }

  for (const selector of [
    ".post-content figure figcaption",
    ".post-content .image-with-caption .caption",
  ]) {
    const rule = declarations(cssRule(css, selector));
    assert.equal(rule["text-align"], "left", `${selector} must align with article text`);
  }
});

test("article-media rules contain no centering declarations", () => {
  const css = fs.readFileSync(sourceCssPath, "utf8");
  const mediaSection = css.slice(
    css.indexOf("/* ---- lazy YouTube facade"),
    css.indexOf("/* ---- heading permalink marker"),
  );

  assert.doesNotMatch(mediaSection, /text-align\s*:\s*center/i);
  assert.doesNotMatch(mediaSection, /margin(?:-left|-right)?\s*:\s*[^;\n]*\bauto\b[^;\n]*\bauto\b/i);
});
