// Deterministic, bounded article recommendations; input collection is never mutated.
// getMeta is the site's existing structured-metadata derivation function.
module.exports = function relatedArticles(posts, current, getMeta, limit = 4) {
  if (!current || !current.url) return [];
  const origin = getMeta(current) || {};
  const primary = origin.primaryGames?.[0] || origin.games?.[0] || null;
  const series = new Set(origin.franchises || []);
  const seen = new Set([current.url]);
  const matches = [];
  for (const post of posts || []) {
    if (!post.url || seen.has(post.url)) continue;
    seen.add(post.url);
    const meta = getMeta(post) || {};
    const candidatePrimary = meta.primaryGames?.[0] || meta.games?.[0] || null;
    const tier = primary && candidatePrimary === primary ? 0
      : (meta.franchises || []).some((id) => series.has(id)) && series.size ? 1
      : origin.contentType && meta.contentType === origin.contentType ? 2 : 3;
    matches.push({ post, tier });
  }
  return matches.sort((a, b) => a.tier - b.tier
    || new Date(b.post.date) - new Date(a.post.date)
    || a.post.url.localeCompare(b.post.url))
    .slice(0, Math.max(0, limit)).map((entry) => entry.post);
};
