// 2026-10-01 incident: tag "Queen's Domain" rendered href="/tags/Queen&amp;#39;s Domain/".
// Root cause: `{% set tagUrl %}...{{ tag | tagPath }}...{% endset %}` autoescaped the
// segment once (' -> &#39;) inside the block-set, then `href="{{ tagUrl }}"` escaped
// that already-escaped string again (& -> &amp;). The URL must be built as a plain
// string and HTML-escaped exactly once, at output.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const nunjucks = require("nunjucks");
const { tagPathSegment } = require("../lib/tag-path.js");

const ROOT = path.resolve(__dirname, "..");
const TEMPLATES = [
	"src/_includes/layouts/post.njk",
	"src/_includes/layouts/post-hfok.njk",
	"src/_includes/layouts/post-others.njk",
	"src/_includes/components/tags-list.njk",
];

function tagLoop(file) {
	const src = fs.readFileSync(path.join(ROOT, file), "utf8");
	const m = src.match(/\{%-?\s*for tag in [^%]*%\}[\s\S]*?\{%-?\s*endfor\s*-?%\}/);
	assert.ok(m, `tag loop not found in ${file}`);
	return m[0];
}

function render(file, tags) {
	const env = new nunjucks.Environment(null, { autoescape: true });
	env.addFilter("tagPath", (t) => tagPathSegment(t));
	env.addFilter("filterTagList", (ts) => ts);
	env.addFilter("getAllTags", (ts) => ts);
	env.addFilter("sortByDateDesc", (ts) => ts);
	return env.renderString(tagLoop(file), { tags, collections: { all: tags, tagList: tags } });
}

function anchors(html) {
	const out = [];
	const re = /<a href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
	let m;
	while ((m = re.exec(html))) out.push({ href: m[1], text: m[2] });
	return out;
}

// Decode exactly one level of HTML escaping, as a browser does for attributes/text.
const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

const CASES = ["Queen's Domain", "Dungeons & Dragons", "Back 4 Blood", "流亡黯道", "ARPG", "Ved: Recure"];

for (const file of TEMPLATES) {
	test(`${file}: tag href and text are escaped exactly once`, () => {
		const html = render(file, CASES);
		const found = anchors(html);
		assert.equal(found.length, CASES.length, html);
		for (let i = 0; i < CASES.length; i++) {
			const tag = CASES[i];
			const { href, text } = found[i];
			assert.equal(decode(href), `/tags/${tagPathSegment(tag)}/`, tag);
			assert.equal(decode(text), tag, tag);
			assert.doesNotMatch(href, /&amp;#|&amp;amp;|&amp;quot;/, `double escape in ${tag}`);
		}
		assert.doesNotMatch(html, /&amp;#39;/);
	});
}

test("simple tags render byte-identical hrefs (no existing URL changes)", () => {
	const html = render(TEMPLATES[0], ["ARPG", "Back 4 Blood", "流亡黯道"]);
	assert.deepEqual(anchors(html).map((a) => a.href), ["/tags/ARPG/", "/tags/Back 4 Blood/", "/tags/流亡黯道/"]);
});

// The tag PAGE path must equal the decoded link target, or the link 404s.
// A permalink is a filesystem path, not HTML, so it must not be HTML-escaped at all.
test("src/tags.njk permalink is never HTML-escaped and matches the link target", () => {
	const src = fs.readFileSync(path.join(ROOT, "src/tags.njk"), "utf8");
	const m = src.match(/^permalink:\s*(.+)$/m);
	assert.ok(m, "tags.njk permalink missing");
	const env = new nunjucks.Environment(null, { autoescape: true });
	env.addFilter("tagPath", (t) => tagPathSegment(t));
	for (const tag of CASES) {
		const page = env.renderString(m[1].trim(), { tag });
		assert.equal(page, `/tags/${tagPathSegment(tag)}/`, tag);
		assert.doesNotMatch(page, /&#39;|&amp;/, tag);
		const href = decode(anchors(render(TEMPLATES[0], [tag]))[0].href);
		assert.equal(href, page, `link target != tag page for ${tag}`);
	}
});
