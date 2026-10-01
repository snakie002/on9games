// 2026-09-28 incident: tag "Ved: Recure" produced /tags/Ved: Recure/, which
// Windows cannot create. Display names must stay intact; only the filesystem /
// URL segment may change, and only for tags that are unsafe today.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { tagPathSegment, assertUniqueTagPaths } = require("../lib/tag-path.js");

const ROOT = path.resolve(__dirname, "..");
const WINDOWS_UNSAFE = /[<>:"/\\|?*\x00-\x1f]/;

test("Ved: Recure keeps its display name and gets a deterministic safe segment", () => {
	const name = "Ved: Recure";
	const seg = tagPathSegment(name);
	assert.equal(name, "Ved: Recure");
	assert.equal(seg, "Ved-Recure");
	assert.equal(tagPathSegment(name), seg, "deterministic");
	assert.doesNotMatch(seg, WINDOWS_UNSAFE);
});

test("every Windows-reserved character is replaced, never emitted", () => {
	const cases = {
		"A:B": "A-B",
		"A/B": "A-B",
		"A\\B": "A-B",
		"Why?": "Why",
		"x*y": "x-y",
		'"Quoted" Game': "Quoted-Game",
		"<Angle>": "Angle",
		"p|q": "p-q",
		"鬼武者: Way of the Sword": "鬼武者-Way of the Sword",
		"流亡黯道：測試": "流亡黯道：測試", // full-width colon is a legal path char
		"新作情報": "新作情報",
		"Onimusha: Way of the Sword": "Onimusha-Way of the Sword",
	};
	for (const [input, expected] of Object.entries(cases)) {
		const seg = tagPathSegment(input);
		assert.equal(seg, expected, input);
		assert.doesNotMatch(seg, WINDOWS_UNSAFE, input);
		assert.ok(seg.length > 0, input);
	}
});

test("a tag made only of reserved characters still yields a non-empty stable segment", () => {
	const seg = tagPathSegment("???");
	assert.match(seg, /^tag-[0-9a-f]{10}$/);
	assert.equal(tagPathSegment("???"), seg);
});

test("safe tags are returned byte-for-byte, so existing URLs cannot change", () => {
	for (const t of ["ARPG", "4X", "anno-1800", "Path of Exile", "POE 攻略", "流氓黯道 2 ", "新作情報"]) {
		assert.equal(tagPathSegment(t), t);
	}
});

test("two different tags may not collapse to the same path", () => {
	assert.throws(() => assertUniqueTagPaths(["A:B", "A-B"]), /collision/);
	assert.doesNotThrow(() => assertUniqueTagPaths(["Ved: Recure", "ARPG", "新作情報"]));
});

test("every tag page and tag link goes through tagPath", () => {
	const files = [
		"src/tags.njk",
		"src/_includes/layouts/post.njk",
		"src/_includes/layouts/post-others.njk",
		"src/_includes/layouts/post-hfok.njk",
		"src/_includes/components/tags-list.njk",
	];
	for (const f of files) {
		const src = fs.readFileSync(path.join(ROOT, f), "utf8");
		const uses = [
			...(src.match(/\/tags\/\{\{[^}]*\}\}/g) || []),
			...(src.match(/"\/tags\/"\s*\+\s*\([^)]*\)/g) || []),
		];
		assert.ok(uses.length > 0, `${f} has no tag path`);
		for (const u of uses) assert.match(u, /\|\s*tagPath\s*(\|\s*safe\s*)?(\}\}|\))/, `${f}: ${u}`);
	}
});

test("game, franchise and author hubs use registry ids that are already safe slugs", () => {
	const reg = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/contentRegistry.json"), "utf8"));
	for (const key of ["games", "franchises", "authors"]) {
		for (const rec of reg[key]) assert.match(rec.id, /^[a-z0-9][a-z0-9-]*$/, `${key}:${rec.id}`);
	}
});
