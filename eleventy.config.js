require("dotenv").config();
const { DateTime } = require("luxon");
const path = require("path");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItEleventyImg = require("markdown-it-eleventy-img");

const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginBundle = require("@11ty/eleventy-plugin-bundle");
const pluginNavigation = require("@11ty/eleventy-navigation");
const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");

const pluginDrafts = require("./eleventy.config.drafts.js");
const pluginImages = require("./eleventy.config.images.js");
const categories = require("./src/_data/categories.js");
const featuredPosts = require("./src/_data/featuredPosts.js");

module.exports = function (eleventyConfig) {
	// The Cloudflare Pages env var can carry surrounding whitespace/newlines; trim it once so no
	// generated URL (img src, og:image, ...) contains a stray newline.
	const MEDIA_SERVER = String(process.env.MEDIA_SERVER || "").trim().replace(/\/+$/, "");

	// Copy the contents of the `public` folder to the output folder
	// For example, `./public/css/` ends up in `_site/css/`
	eleventyConfig.addPassthroughCopy({
		"./src/public/img": "/assets/img",
		"./src/public/js": "/assets/js",
	});
	eleventyConfig.addPassthroughCopy("./src/_redirects");

	// eleventyConfig.addPassthroughCopy("./src/blog/**/*.{svg,webp,png,jpg,jpeg}");

	// Run Eleventy when these files change:
	// https://www.11ty.dev/docs/watch-serve/#add-your-own-watch-targets

	// Watch content images for the image pipeline.
	eleventyConfig.addWatchTarget("src/blog/**/*.{svg,webp,png,jpg,jpeg}");

	// App plugins
	eleventyConfig.addPlugin(pluginDrafts);
	eleventyConfig.addPlugin(pluginImages);

	// Official plugins
	eleventyConfig.addPlugin(pluginRss);
	eleventyConfig.addPlugin(pluginSyntaxHighlight, {
		preAttributes: { tabindex: 0 },
	});
	eleventyConfig.addPlugin(pluginNavigation);
	eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
	eleventyConfig.addPlugin(pluginBundle);

	// Lazy YouTube facade (Phase 4B): {% lazyYouTube "VIDEO_ID", "Title" %}
	// Renders a poster + play button; the real youtube-nocookie iframe is created client-side on click
	// by /assets/js/lazy-youtube.js. Template: src/_includes/components/lazy-youtube.njk
	eleventyConfig.addShortcode("lazyYouTube", function (id, title) {
		const safeId = String(id || "").replace(/[^A-Za-z0-9_-]/g, "");
		if (safeId.length !== 11) {
			throw new Error(`lazyYouTube: invalid YouTube id "${id}"`);
		}
		const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		const t = esc(title || "YouTube video");
		return (
			`<div class="lazy-yt" data-yt-id="${safeId}" data-yt-title="${t}">` +
			`<img class="lazy-yt__poster" loading="lazy" decoding="async" width="480" height="360" src="https://i.ytimg.com/vi/${safeId}/hqdefault.jpg" alt="">` +
			`<span class="lazy-yt__play" aria-hidden="true"></span>` +
			`<span class="lazy-yt__label">▶ ${t}</span>` +
			`<a class="lazy-yt__fallback" href="https://www.youtube.com/watch?v=${safeId}" target="_blank" rel="noopener noreferrer">在 YouTube 觀看：${t}</a>` +
			`</div>`
		);
	});

	// Official game image with optional caption (Phase 4B-3): {% gameImage "file.webp", "alt", w, h, "caption" %}
	// Resolves the URL the same way `coverimage` does (MEDIA_SERVER + post path), so it works with the
	// existing S3/local media convention without changing the markdown image pipeline.
	eleventyConfig.addShortcode("gameImage", function (file, alt, width, height, caption) {
		const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		const safeFile = String(file || "").replace(/[^A-Za-z0-9_.-]/g, "");
		const postPath = this.page.filePathStem.replace("/blog/", "").replace("/index", "");
		const src = `${MEDIA_SERVER}/${path.posix.join(postPath, "post_assets", safeFile)}`;
		const dims = width && height ? ` width="${parseInt(width, 10)}" height="${parseInt(height, 10)}"` : "";
		const img = `<img src="${src}" alt="${esc(alt)}"${dims} loading="lazy" decoding="async">`;
		return caption
			? `<figure class="game-shot">${img}<figcaption>${esc(caption)}</figcaption></figure>`
			: `<figure class="game-cover">${img}</figure>`;
	});

	// Absolute production URL for a post asset (e.g. the article thumbnail), resolved through the same
	// MEDIA_SERVER architecture as `coverimage`. Returns "" when the post has no coverImage, so the
	// layout can fall back to a site-level image. Used for og:image / twitter:image.
	// Filter form so it is callable inside a Nunjucks expression: {{ coverImage | assetUrl(page.filePathStem) }}
	eleventyConfig.addFilter("assetUrl", function (file, filePathStem) {
		if (!file || !filePathStem) return "";
		const postPath = String(filePathStem).replace("/blog/", "").replace("/index", "");
		return `${MEDIA_SERVER}/${path.posix.join(postPath, String(file).replace(/\\/g, "/"))}`;
	});

	// Filters
	eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
		// Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
		return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(
			format || "dd LLLL yyyy"
		);
	});

	eleventyConfig.addFilter("timeAgo", (dateObj, format, zone) => {
		// Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
		return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat("yyyy-MM-dd");
	  });

	eleventyConfig.addFilter("htmlDateString", (dateObj) => {
		// dateObj input: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
		return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");
	});

	// Get the first `n` elements of a collection.
	eleventyConfig.addFilter("head", (array, n) => {
		if (!Array.isArray(array) || array.length === 0) {
			return [];
		}
		if (n < 0) {
			return array.slice(n);
		}

		return array.slice(0, n);
	});

	// Return the smallest number argument
	eleventyConfig.addFilter("min", (...numbers) => {
		return Math.min.apply(null, numbers);
	});

	// Return all the tags used in a collection
	eleventyConfig.addFilter("getAllTags", (collection) => {
		let tagSet = new Set();
		for (let item of collection) {
			(item.data.tags || []).forEach((tag) => tagSet.add(tag));
		}
		return Array.from(tagSet);
	});

	eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
		return (tags || []).filter(
			(tag) => ["all", "nav", "post", "posts"].indexOf(tag) === -1
		);
	});

	// Summary of the post
	eleventyConfig.addFilter("excerpt", (post) => {
		const content = post.replace(/(<([^>]+)>)/gi, "");
		return content.substr(0, content.lastIndexOf(" ", 100)) + "...";
	});

	eleventyConfig.addFilter("indexNav", (hrefs) => {
		const navs = hrefs.map((href) => ({
			url: href,
			page: href === "/" ? 1 : Number(href.split("/")[2]),
		}));
		return navs;
	});

	eleventyConfig.addFilter("currentPage", (url) => {
		return url === "/" ? 1 : url.split("/")[2];
	});

	eleventyConfig.addFilter("postCoverImage", (post) => {
		if (!post.data.coverImage) {
			return "";
		}
		return `${path.join(
			`${post.page.inputPath}`.replace("/index.md", ""),
			post.data.coverImage
		)}`;
	});

	eleventyConfig.addFilter("filterCategory", (category) => {
		if (!category) {
			return undefined;
		}
		const cat = categories.find((cat) => cat.slug === category);
		return cat;
	});

	eleventyConfig.addFilter("translateCategory", (category) => {
		if (!category) {
			return undefined;
		}
		const cat = categories.find((cat) => cat.slug === category);
		return cat ? cat.name : category;
	});

	eleventyConfig.addFilter("sortByDateDesc", (arr) => {
		arr.sort((a, b) => new Date(b.date) - new Date(a.date)); // Ensure dates are compared as Date objects
		return arr;
	});

	function renderCaption(md) {
		md.core.ruler.at("replacements", function replace(state) {
			state.tokens.forEach((block, i) => {
				if (block.type !== "inline") {
					return;
				}

				if (block.content.indexOf("[caption") > -1) {
					let isStarted = false;
					let txt = "";
					block.children.forEach((child, idx) => {
						if (!isStarted) {
							if (child.content.startsWith("[")) {
								// Remove the content inside caption
								child.content = "";
								isStarted = true;
							} else {
								txt += child.content;
								child.content = "";
							}
						} else {
							// Remove the content inside caption
							if (child.content.includes("]")) {
								isStarted = false;
							}
							child.content = "";
						}
					});

					// Warp with <caption></caption>
					block.children[0].content = '<div class="image-with-caption">';
					block.children[0].type = "html_inline";
					// block.children[block.children.length - 1].content = "</div>";
					// block.children[block.children.length - 1].type = "html_inline";
					block.children.push({
						content: `<span class="caption">${txt}</span>`,
						type: "html_inline",
					});
					block.children.push({
						content: "</div>",
						type: "html_inline",
					});
				}
			});
		});
	}

	let options = {
		html: true,
		breaks: true,
		linkify: true,
	};

	const mdLib = markdownIt(options);

	mdLib.use(markdownItAnchor, {
		permalink: markdownItAnchor.permalink.ariaHidden({
			placement: "after",
			class: "header-anchor",
			symbol: "#",
			ariaHidden: false,
		}),
		level: [1, 2, 3, 4],
		slugify: eleventyConfig.getFilter("slugify"),
	});

	// Handle ![](image)
	mdLib.use(require("./lib/markdown-it-replace-link.js"), {
		processHTML: false,
		replaceLink: function (link, env, token, htmlToken) {
			if (link.startsWith("post_assets/")) {
				const imgPath = `${MEDIA_SERVER}/${path.join(
					env.page.filePathStem.replace("/blog/", "").replace("/index", ""),
					link
				)}`;
				return imgPath;
			}
			return link;
			// return link + "?c=" + Date.now();
		},
	});
	// mdLib.use(markdownItEleventyImg, {
	// 	resolvePath: (filepath, env) => {
	// 		if (filepath.startsWith("WordPress")) {
	// 			const imgPath = path.join(
	// 				process.env.MEDIA_DIR,
	// 				"WordPress",
	// 				env.page.url,
	// 				decodeURI(filepath.replace("WordPress", ""))
	// 			);
	// 			return imgPath;
	// 		} else {
	// 			return path.join(path.dirname(env.page.inputPath), decodeURI(filepath));
	// 		}
	// 	},
	// 	imgOptions: {
	// 		urlPath: "/images/",
	// 		outputDir: path.join("_site", "img"),
	// 	},
	// });

	mdLib.use(renderCaption);

	eleventyConfig.setLibrary("md", mdLib);

	// Customize Markdown library settings:
	// eleventyConfig.amendLibrary("md", (mdLib) => {
	// 	mdLib.use(markdownItAnchor, {
	// 		permalink: markdownItAnchor.permalink.ariaHidden({
	// 			placement: "after",
	// 			class: "header-anchor",
	// 			symbol: "#",
	// 			ariaHidden: false,
	// 		}),
	// 		level: [1, 2, 3, 4],
	// 		slugify: eleventyConfig.getFilter("slugify"),
	// 	});

	// 	// Handle ![](image)
	// 	mdLib.use(markdownItEleventyImg, {
	// 		resolvePath: (filepath, env) =>
	// 			path.join(path.dirname(env.page.inputPath), decodeURI(filepath)),
	// 		imgOptions: {
	// 			outputDir: path.join("_site", "img"),
	// 		},
	// 	});

	// 	mdLib.use(renderCaption);
	// });

	// Categories collection
	eleventyConfig.addCollection("categories", function (collection) {
        const translatedCategories = JSON.parse(JSON.stringify(categories)); // Clone cateogires object
        const cats = {};

        collection
            .getAll()
            .reverse()
            .forEach((item) => {
                item.data.categories?.forEach((category, i) => {
                    if (typeof category !== "string") {
                        return;
                    }
                    if (!cats[category]) {
                        cats[category] = [];
                    }
                    cats[category].push(item);
                });
            });

        translatedCategories.sort((a, b) => {
            return ('' + a.name).localeCompare(b.name);
        });
		let logged = false;
		if(!logged) {
			console.log(categories);
		}

		logged = true;
        let sortedCategories = {};
        translatedCategories.forEach((category) => {
            sortedCategories[category.slug] = cats[category.slug] || [];
        });

        return sortedCategories;
    });

	eleventyConfig.addCollection("recentPosts", function (collectionApi) {
		const posts = collectionApi
			.getFilteredByTag("posts")
			.reverse()
			.splice(0, 10);
		return posts;
	});

	eleventyConfig.addCollection("featuredPosts", function (collectionApi) {
		const posts = collectionApi
			.getFilteredByTag("posts")
			.filter((post) =>
				featuredPosts.posts.some((p) => p.slug === post.fileSlug)
			);

		return posts;
	});

	// ── PHASE 2D: structured taxonomy collections ───────────────────────────
	// Structured metadata is the site's truth. Every article gets it derived
	// once here (explicit V2 frontmatter, else the approved legacy mapping),
	// so templates and hubs read one consistent source instead of
	// re-deriving — and no historical file has to be rewritten.
	const structured = require("./src/_data/structuredMetadata.js");

	function structuredFor(post) {
		if (!post.data.__structured) {
			post.data.__structured = structured.deriveStructuredMetadata({
				...post.data,
				page: post.data.page || { inputPath: post.inputPath },
			});
		}
		return post.data.__structured;
	}
	eleventyConfig.addFilter("structuredMeta", structuredFor);
	eleventyConfig.addFilter("derivedBadges", (post) =>
		structured.deriveBadges(structuredFor(post))
	);
	eleventyConfig.addFilter("articleDescription", (post) =>
		structured.deriveDescription(post.data || post, metadata.description)
	);

	/** posts grouped by a derived structured field, newest first. */
	function groupByStructured(collectionApi, field) {
		const groups = new Map();
		for (const post of collectionApi.getFilteredByTag("posts")) {
			const meta = structuredFor(post);
			// Scalar fields (author, contentType) are single values; iterating
			// a string would group by its characters. contentTypeHubs was
			// silently empty until 2CDE Pass 1 first rendered it.
			const raw = field === "author" ? meta.author : meta[field];
			const values = Array.isArray(raw) ? raw : [raw].filter(Boolean);
			for (const value of values) {
				if (!groups.has(value)) groups.set(value, []);
				groups.get(value).push(post);
			}
		}
		for (const posts of groups.values()) {
			posts.sort((a, b) => b.date - a.date);
		}
		return groups;
	}

	eleventyConfig.addCollection("gameHubs", (api) => {
		const groups = groupByStructured(api, "games");
		return structured.registry.games
			.filter((game) => groups.has(game.id))
			.map((game) => ({
				id: game.id,
				label: structured.DISPLAY.game[game.id],
				posts: groups.get(game.id),
			}));
	});

	eleventyConfig.addCollection("franchiseHubs", (api) => {
		const groups = groupByStructured(api, "franchises");
		return structured.registry.franchises
			.filter((f) => groups.has(f.id))
			.map((f) => ({
				id: f.id,
				label: structured.DISPLAY.franchise[f.id],
				posts: groups.get(f.id),
			}));
	});

	eleventyConfig.addCollection("authorHubs", (api) => {
		const groups = groupByStructured(api, "author");
		// Every canonical author gets a hub, even with no articles yet, so the
		// route exists the moment the first article is attributed.
		return structured.registry.authors.map((author) => ({
			id: author.id,
			label: structured.DISPLAY.author[author.id],
			posts: groups.get(author.id) || [],
		}));
	});

	eleventyConfig.addCollection("contentTypeHubs", (api) => {
		const groups = groupByStructured(api, "contentType");
		return structured.registry.contentTypes.map((type) => ({
			id: type.id,
			label: structured.DISPLAY.contentType[type.id],
			posts: groups.get(type.id) || [],
		}));
	});

	/** Unmapped legacy categories, surfaced rather than silently guessed. */
	eleventyConfig.addCollection("unmappedLegacyTerms", (api) => {
		const unmapped = new Set();
		for (const post of api.getFilteredByTag("posts")) {
			for (const term of structuredFor(post).unmapped) unmapped.add(term);
		}
		return [...unmapped].sort();
	});

	// ── 2CDE FRONTEND PASS 1: one card view-model + homepage sections ────────
	// Presentation only. Every value is derived from existing metadata
	// (structured metadata, coverImage, description, date); nothing is
	// fabricated and no article file is touched. Filters, not collections, so
	// tags.njk pagination is unaffected.
	const TYPE_IDS = structured.registry.contentTypes.map((t) => t.id);

	function coverUrlFor(post) {
		const file = post.data && post.data.coverImage;
		const stem = post.filePathStem || (post.page && post.page.filePathStem);
		if (!file || !stem) return null;
		const postPath = String(stem).replace("/blog/", "").replace("/index", "");
		return `${MEDIA_SERVER}/${path.posix.join(postPath, String(file).replace(/\\/g, "/"))}`;
	}

	function articleCard(post) {
		const meta = structuredFor(post);
		const data = post.data || {};
		const gameId = meta.primaryGames[0] || meta.games[0] || null;
		const franchiseId = gameId ? null : meta.franchises[0] || null;
		const date = post.date instanceof Date ? post.date : new Date(post.date);
		return {
			url: post.url,
			title: data.title || "",
			cover: coverUrlFor(post),
			description: structured.deriveDescription(
				{ description: data.description, templateContent: post.templateContent }, ""),
			dateIso: DateTime.fromJSDate(date, { zone: "utc" }).toFormat("yyyy-LL-dd"),
			dateText: DateTime.fromJSDate(date, { zone: "utc" }).toFormat("yyyy-LL-dd"),
			contentType: meta.contentType ? {
				id: meta.contentType,
				label: structured.DISPLAY.contentType[meta.contentType],
				url: `/type/${meta.contentType}/`,
			} : null,
			subject: gameId ? { label: structured.DISPLAY.game[gameId], url: `/game/${gameId}/` }
				: franchiseId ? { label: structured.DISPLAY.franchise[franchiseId],
				                  url: `/franchise/${franchiseId}/` }
				: null,
			author: meta.author ? { label: structured.DISPLAY.author[meta.author],
			                        url: `/author/${meta.author}/` } : null,
		};
	}
	eleventyConfig.addFilter("articleCard", articleCard);

	/**
	 * Homepage information architecture. Each article appears at most once:
	 * featured (editor-curated, featuredPosts.js order) -> latest -> one
	 * section per content type that actually has further articles. Empty
	 * content types produce no section.
	 */
	eleventyConfig.addFilter("homeSections", (posts, sizes = {}) => {
		const seen = new Set();
		const newest = [...(posts || [])].sort((a, b) => b.date - a.date);
		const take = (list, n) => {
			const out = [];
			for (const post of list) {
				if (out.length >= n) break;
				if (seen.has(post.url)) continue;
				seen.add(post.url);
				out.push(post);
			}
			return out;
		};
		const bySlug = new Map(newest.map((p) => [p.fileSlug, p]));
		const curated = featuredPosts.posts.map((f) => bySlug.get(f.slug))
			.filter((p) => p && p.data.coverImage);
		const featured = take(curated, sizes.featured || 5);
		const latest = take(newest, sizes.latest || 6);
		const types = TYPE_IDS.map((id) => ({
			id,
			label: structured.DISPLAY.contentType[id],
			url: `/type/${id}/`,
			posts: take(newest.filter((p) => structuredFor(p).contentType === id),
			            sizes.perType || 6),
		})).filter((section) => section.posts.length > 0);
		return { featured, latest, types };
	});

	/** Game hubs by article count, excluding ids already pinned in the nav. */
	eleventyConfig.addFilter("topGameHubs", (hubs, exclude = [], n = 6) =>
		[...(hubs || [])]
			.filter((hub) => !exclude.includes(hub.id))
			.sort((a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label))
			.slice(0, n));

	// Features to make your build faster (when you need them)

	// If your passthrough copy gets heavy and cumbersome, add this line
	// to emulate the file copy on the dev server. Learn more:
	// https://www.11ty.dev/docs/copy/#emulate-passthrough-copy-during-serve

	// eleventyConfig.setServerPassthroughCopyBehavior("passthrough");

	return {
		// Control which files Eleventy will process
		// e.g.: *.md, *.njk, *.html, *.liquid
		templateFormats: ["md", "njk", "html", "liquid"],

		// Pre-process *.md files with: (default: `liquid`)
		markdownTemplateEngine: "njk",

		// Pre-process *.html files with: (default: `liquid`)
		htmlTemplateEngine: "njk",

		// These are all optional:
		dir: {
			input: "src", // default: "."
			// includes: "../_includes", // default: "_includes"
			// data: "../_data", // default: "_data"
			output: "_site",
		},

		// -----------------------------------------------------------------
		// Optional items:
		// -----------------------------------------------------------------

		// If your site deploys to a subdirectory, change `pathPrefix`.
		// Read more: https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory-with-a-path-prefix

		// When paired with the HTML <base> plugin https://www.11ty.dev/docs/plugins/html-base/
		// it will transform any absolute URLs in your HTML to include this
		// folder name and does **not** affect where things go in the output folder.
		pathPrefix: "/",
	};
};
