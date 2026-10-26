// Lint src/_redirects: exactly "source destination 301", no duplicate sources,
// no chains (destination is never a source) and no loops; sitemap never lists a redirect source.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const lines = fs.readFileSync(path.join(root, "src/_redirects"), "utf8").split(/\r?\n/);
const rules = [];
lines.forEach((raw, i) => {
	const line = raw.trim();
	if (!line || line.startsWith("#")) return;
	rules.push({ parts: line.split(/\s+/), n: i + 1 });
});

test("every redirect rule is source destination 301", () => {
	for (const r of rules) {
		assert.strictEqual(r.parts.length, 3, `line ${r.n}`);
		assert.strictEqual(r.parts[2], "301", `line ${r.n}`);
		assert.ok(r.parts[0].startsWith("/") && r.parts[1].startsWith("/"), `line ${r.n}`);
	}
});

test("no duplicate sources, no chains, no loops", () => {
	const map = new Map();
	for (const r of rules) {
		assert.ok(!map.has(r.parts[0]), `duplicate source ${r.parts[0]} line ${r.n}`);
		map.set(r.parts[0], r.parts[1]);
	}
	for (const [src, dst] of map) {
		assert.notStrictEqual(src, dst, `self loop ${src}`);
		const norm = (u) => u.replace(/\/$/, "");
		assert.ok(!map.has(dst) && !map.has(norm(dst)) && !map.has(norm(dst) + "/"), `chain ${src} -> ${dst}`);
	}
});

test("built sitemap lists no redirect source", { skip: !fs.existsSync(path.join(root, "_site/sitemap.xml")) }, () => {
	const sm = fs.readFileSync(path.join(root, "_site/sitemap.xml"), "utf8");
	const locs = new Set([...sm.matchAll(/<loc>https:\/\/on9\.games([^<]*)<\/loc>/g)].map((m) => decodeURI(m[1])));
	for (const r of rules) {
		if (!r.parts[0].includes("resonance-topic-")) continue; // non-legacy sources are decoded paths
		assert.ok(!locs.has(r.parts[0]), `sitemap lists redirect source ${r.parts[0]}`);
	}
});
