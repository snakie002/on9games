// Phase 2A RED: src/tags.njk paginates EVERY collection.
// Adding an object collection (games/franchises/topics/authors) without
// denylisting it generates a bogus /tags/<collection>/ page and crashes
// sortByDateDesc, which calls .sort() on an object.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const TAGS_NJK = path.join(ROOT, "src", "tags.njk");

// Collections that are site machinery, not reader-facing tags.
const SYSTEM_COLLECTIONS = [
	"all",
	"post",
	"posts",
	"tagList",
	"recentPosts",
	"featuredPosts",
	"categories",
	"games",
	"franchises",
	"topics",
	"authors",
];

function tagsFrontMatter() {
	const raw = fs.readFileSync(TAGS_NJK, "utf8");
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	assert.ok(match, "src/tags.njk must have YAML front matter");
	return match[1];
}

function denylistedCollections() {
	const front = tagsFrontMatter();
	const lines = front.split(/\r?\n/);
	const start = lines.findIndex((line) => /^\s*filter:\s*$/.test(line));
	assert.ok(start >= 0, "src/tags.njk pagination must declare a filter list");
	const items = [];
	for (const line of lines.slice(start + 1)) {
		const trimmed = line.trim();
		if (trimmed.startsWith("#") || trimmed === "") continue; // YAML comment / blank
		if (trimmed.startsWith("- ")) {
			items.push(trimmed.slice(2).trim());
			continue;
		}
		break; // next key ends the list
	}
	assert.ok(items.length > 0, "src/tags.njk filter list must not be empty");
	return items;
}

test("tags.njk denylists every system/object collection", () => {
	const denied = denylistedCollections();
	for (const name of SYSTEM_COLLECTIONS) {
		assert.ok(
			denied.includes(name),
			`collection "${name}" is not denylisted in src/tags.njk — it would be rendered as a tag page`
		);
	}
});

test("every addCollection in eleventy.config.js is either a tag-safe array or denylisted", () => {
	const config = fs.readFileSync(path.join(ROOT, "eleventy.config.js"), "utf8");
	const declared = [...config.matchAll(/addCollection\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
	assert.ok(declared.length > 0, "expected at least one addCollection() in eleventy.config.js");
	const denied = denylistedCollections();
	const leaked = declared.filter((name) => !denied.includes(name));
	assert.deepStrictEqual(
		leaked,
		[],
		`these collections would be paginated as tag pages by src/tags.njk: ${leaked.join(", ")}`
	);
});

test("sortByDateDesc is never handed a non-array (the crash path)", () => {
	// Documents WHY the denylist matters: the filter mutates via arr.sort(),
	// which throws on an object collection such as collections.categories.
	const config = fs.readFileSync(path.join(ROOT, "eleventy.config.js"), "utf8");
	assert.match(
		config,
		/addFilter\(\s*["'`]sortByDateDesc["'`]/,
		"sortByDateDesc filter must exist"
	);
	const objectCollections = ["categories", "games", "franchises", "topics", "authors"];
	const denied = denylistedCollections();
	for (const name of objectCollections) {
		assert.ok(
			denied.includes(name),
			`object collection "${name}" must be denylisted or sortByDateDesc will throw on it`
		);
	}
});
