/**
 * PHASE 2D: structured metadata derived deterministically for every article.
 *
 * WHY THIS EXISTS
 * Phase 2C made Contract V2 enforceable in Python for NEW articles. The site,
 * however, still renders 325 articles that carry only legacy `categories` and
 * `tags` — zero have `contentType`. Phase 2D makes structured metadata the site's
 * truth WITHOUT rewriting a single historical file: this module derives it.
 *
 * PRECEDENCE (one rule, applied per article)
 *   1. explicit V2 frontmatter, when present — the article says what it is;
 *   2. otherwise the approved legacy mapping from contentRegistry.legacyMappings;
 *   3. otherwise nothing. An unmapped legacy term is REPORTED in `unmapped`,
 *      never guessed, because inventing taxonomy for 325 articles is worse than
 *      admitting a gap.
 *
 * This mirrors `shared/article_contract_v2.py` deliberately: same registry file,
 * same precedence, same refusal to guess. Python enforces what NEW articles must
 * supply; this derives what the SITE should render today.
 */
const registry = require("./contentRegistry.json");

const CONTENT_TYPES = new Set(registry.contentTypes.map((c) => c.id));
const GAME_IDS = new Set(registry.games.map((g) => g.id));
const FRANCHISE_IDS = new Set(registry.franchises.map((f) => f.id));
const TOPIC_IDS = new Set(registry.topics.map((t) => t.id));
const GENRE_IDS = new Set(registry.genres.map((g) => g.id));
const TRAIT_IDS = new Set(registry.traits.map((t) => t.id));
const AUTHOR_IDS = new Set(registry.authors.map((a) => a.id));

/** Display names, so templates never hardcode a label. */
const DISPLAY = {
  contentType: Object.fromEntries(
    registry.contentTypes.map((c) => [c.id, c.display_zh_tw || c.id])),
  game: Object.fromEntries(
    registry.games.map((g) => [g.id, g.display_zh_tw || g.name_en || g.id])),
  franchise: Object.fromEntries(
    registry.franchises.map((f) => [f.id, f.display_zh_tw || f.display_en || f.id])),
  topic: Object.fromEntries(
    registry.topics.map((t) => [t.id, t.display_zh_tw || t.id])),
  genre: Object.fromEntries(
    registry.genres.map((g) => [g.id, g.display_zh_tw || g.id])),
  trait: Object.fromEntries(
    registry.traits.map((t) => [t.id, t.display_zh_tw || t.id])),
  author: Object.fromEntries(
    registry.authors.map((a) => [a.id, a.display_zh_tw || a.display || a.id])),
};

/** Unicode + case + whitespace only. No fuzzy matching, ever. */
function normalizeAlias(value) {
  return String(value == null ? "" : value)
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Alias -> canonical id, built once per registry name. */
function aliasIndex(recordsName) {
  const index = new Map();
  for (const record of registry[recordsName] || []) {
    index.set(normalizeAlias(record.id), record.id);
    if (record.slug) index.set(normalizeAlias(record.slug), record.id);
    for (const alias of record.aliases || []) {
      index.set(normalizeAlias(alias), record.id);
    }
  }
  return index;
}

const ALIASES = {
  games: aliasIndex("games"),
  franchises: aliasIndex("franchises"),
  topics: aliasIndex("topics"),
  genres: aliasIndex("genres"),
  traits: aliasIndex("traits"),
};

function resolve(name, value) {
  const found = ALIASES[name].get(normalizeAlias(value));
  return found === undefined ? null : found;
}

/** Legacy category/tag -> partial structured metadata, approved table only. */
function mapLegacyTerm(term) {
  const key = normalizeAlias(term).replace(/^"|"$/g, "");
  const mapping = registry.legacyMappings[key];
  return mapping || null;
}

const LIMITS = registry.limits;

function capped(values, limit) {
  return values.slice(0, limit);
}

/**
 * Derive structured metadata for one article's frontmatter.
 * Pure: same input always yields the same output.
 */
function deriveStructuredMetadata(data) {
  const out = {
    contentType: null,
    games: [],
    primaryGames: [],
    franchises: [],
    topics: [],
    genres: [],
    traits: [],
    author: null,
    unmapped: [],
    source: "legacy",
  };

  // 1 ── explicit V2 frontmatter wins outright.
  if (data.contentType && CONTENT_TYPES.has(String(data.contentType))) {
    out.source = "v2";
    out.contentType = String(data.contentType);
    for (const [field, valid] of [["games", GAME_IDS], ["primaryGames", GAME_IDS],
                                  ["franchises", FRANCHISE_IDS], ["topics", TOPIC_IDS],
                                  ["genres", GENRE_IDS], ["traits", TRAIT_IDS]]) {
      for (const value of data[field] || []) {
        const id = valid.has(String(value)) ? String(value) : null;
        if (id && !out[field].includes(id)) out[field].push(id);
      }
    }
    if (data.author && AUTHOR_IDS.has(String(data.author))) {
      out.author = String(data.author);
    }
  }

  // 2 ── otherwise derive from approved legacy mappings.
  if (out.source === "legacy") {
    const terms = [...(data.categories || []), ...(data.tags || [])];
    for (const term of terms) {
      const mapping = mapLegacyTerm(term);
      if (!mapping) {
        // Tags are free-form editorial labels; only unmapped CATEGORIES are a
        // taxonomy gap worth reporting.
        if ((data.categories || []).includes(term)) {
          const key = String(term).replace(/^"|"$/g, "");
          if (!out.unmapped.includes(key)) out.unmapped.push(key);
        }
        continue;
      }
      if (mapping.contentType && !out.contentType) {
        out.contentType = mapping.contentType;
      }
      for (const field of ["games", "franchises", "topics", "genres", "traits"]) {
        for (const value of mapping[field] || []) {
          if (!out[field].includes(value)) out[field].push(value);
        }
      }
    }
    // A tag naming a real game/franchise is a legitimate entity signal.
    for (const tag of data.tags || []) {
      const game = resolve("games", tag);
      if (game && !out.games.includes(game)) out.games.push(game);
      const franchise = resolve("franchises", tag);
      if (franchise && !out.franchises.includes(franchise)) {
        out.franchises.push(franchise);
      }
    }
  }

  // 3 ── registry limits apply to derived values too.
  out.topics = capped(out.topics, LIMITS.topics_per_article);
  out.genres = capped(out.genres, LIMITS.genres_per_article);
  out.traits = capped(out.traits, LIMITS.traits_per_article);
  out.primaryGames = capped(
    out.primaryGames.length ? out.primaryGames : out.games,
    LIMITS.primary_games);

  // 4 ── author: legacy articles live under an author directory.
  if (!out.author) {
    const path = String(data.page?.inputPath || "");
    if (/\/Snakie\//i.test(path)) out.author = "snakie002";
    else if (/\/Hfok\//i.test(path)) out.author = "hfok";
    else if (/\/Others\//i.test(path)) out.author = "guest";
  }

  return out;
}

/** Reader-facing badges, derived — never hand-maintained. */
function deriveBadges(structured) {
  const badges = [];
  if (structured.contentType) {
    badges.push({ kind: "contentType", id: structured.contentType,
                  label: DISPLAY.contentType[structured.contentType] });
  }
  for (const id of structured.primaryGames) {
    badges.push({ kind: "game", id, label: DISPLAY.game[id],
                  url: `/game/${id}/` });
  }
  for (const id of structured.franchises) {
    badges.push({ kind: "franchise", id, label: DISPLAY.franchise[id],
                  url: `/franchise/${id}/` });
  }
  for (const id of structured.topics) {
    badges.push({ kind: "topic", id, label: DISPLAY.topic[id] });
  }
  for (const id of structured.traits) {
    badges.push({ kind: "trait", id, label: DISPLAY.trait[id] });
  }
  return badges;
}

/**
 * PHASE 2D §34: a page-specific description for legacy articles.
 *
 * Every article previously fell back to the single global site description,
 * which is bad for both readers and search. This derives an excerpt from the
 * article's own first meaningful paragraph, stripping markup and shortcodes.
 * The global description remains the LAST resort, not the default.
 */
function deriveDescription(data, siteFallback) {
  const explicit = String(data.description || "").trim();
  if (explicit) return explicit;

  const raw = String(data.content || data.templateContent || "");
  const text = raw
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/\{%[\s\S]*?%\}/g, " ")          // Eleventy shortcodes
    .replace(/<[^>]+>/g, " ")                    // HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")     // markdown images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")   // markdown links -> text
    .replace(/[#*`>_|]/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // CJK is information-dense: 20 characters is already a full sentence, so a
  // Latin-tuned 40-char floor would reject perfectly good Chinese excerpts.
  const hasCJK = /[\u3400-\u9fff]/.test(text);
  if (text.length >= (hasCJK ? 12 : 40)) {
    const cut = text.slice(0, 150);
    return cut.length < text.length ? `${cut.trim()}…` : cut.trim();
  }
  const title = String(data.title || "").trim();
  if (title) return title;
  return siteFallback;
}

module.exports = {
  deriveDescription,
  registry,
  DISPLAY,
  LIMITS,
  normalizeAlias,
  resolve,
  mapLegacyTerm,
  deriveStructuredMetadata,
  deriveBadges,
};
