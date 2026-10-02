// Legacy meta-refresh fallback pages. Kept only as a safety net in case a _redirects rule
// is not applied by Cloudflare Pages; _redirects rules take precedence over assets when they match.
// Excluded from all collections so they never appear in sitemap.xml, feeds or listings.
module.exports = {
	eleventyExcludeFromCollections: true,
};
