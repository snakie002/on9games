// Filesystem/URL segment for a tag page. The DISPLAY name is never changed.
//
// Windows cannot create a directory whose name contains < > : " / \ | ? * or
// control characters, so Eleventy fails with ENOENT when a tag such as
// "Ved: Recure" is written to _site/tags/Ved: Recure/. Every tag that is
// already safe is returned byte-for-byte, so no existing URL changes.
//
// Mirror: C:\HermesProjects\on9games\shared\article_taxonomy.py tag_path_segment()
// (the publisher's rendered-tag check must compute the identical segment).
const crypto = require("node:crypto");

const UNSAFE = /[<>:"/\\|?*\x00-\x1f]/;
const UNSAFE_RUN = /\s*[<>:"/\\|?*\x00-\x1f]+\s*/g;

function tagPathSegment(tag) {
	const name = String(tag);
	if (!UNSAFE.test(name)) return name;
	const seg = name.replace(UNSAFE_RUN, "-").replace(/^-+|-+$/g, "");
	if (seg) return seg;
	return "tag-" + crypto.createHash("sha256").update(name, "utf8").digest("hex").slice(0, 10);
}

function assertUniqueTagPaths(tags) {
	const seen = new Map();
	for (const tag of tags) {
		const seg = tagPathSegment(tag).toLowerCase();
		const prior = seen.get(seg);
		if (prior !== undefined && prior !== tag) {
			throw new Error(`tag path collision: ${JSON.stringify(prior)} and ${JSON.stringify(tag)} -> /tags/${seg}/`);
		}
		seen.set(seg, tag);
	}
}

module.exports = { tagPathSegment, assertUniqueTagPaths };
