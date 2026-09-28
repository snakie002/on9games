const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const site = path.join(__dirname, '..', '_site');
const html = route => fs.readFileSync(path.join(site, route, 'index.html'), 'utf8');

test('homepage has one page heading, and archive/aside/cards descend from it', () => {
  const page = html('');
  const main = page.split('<main', 2)[1].split('</main>', 1)[0];
  assert.equal((main.match(/<h1\b/g) || []).length, 1);
  assert.match(main, /<h1 class="sr-only">on9games 享受遊戲<\/h1>/);
  assert.match(main, /<h2[^>]*id="h-archive"[^>]*>全部文章<\/h2>/);
  assert.match(main, /<h2[^>]*id="category-heading"[^>]*>可能有你喜歡的目錄！<\/h2>/);
  assert.match(main, /<div class="postlist [^\"]*">[\s\S]*?<h3>/);
});

test('archive thumbnails have decorative alt text and covers reserve a responsive image box', () => {
  const page = html('');
  const archive = page.split('id="h-archive"', 2)[1].split('</main>', 1)[0];
  const imgs = archive.match(/<img\b[^>]*>/g) || [];
  assert.ok(imgs.length > 100);
  for (const image of imgs) assert.match(image, /\balt=""/);
  assert.match(archive, /<a href="[^"]+" tabindex="-1" aria-hidden="true">\s*<img src="[^"]+" alt=""/);
  const css = fs.readFileSync(path.join(site, 'assets/css/index.css'), 'utf8');
  assert.match(css, /\.article-cover\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/);
});

test('keyboard skip link, visible focus and mobile controls have usable hit areas', () => {
  const page = html('');
  assert.match(page, /<a href="#main-content" class="skip-link">跳至主要內容<\/a>/);
  assert.match(page, /<main[^>]*id="main-content"[^>]*tabindex="-1"/);
  const css = fs.readFileSync(path.join(site, 'assets/css/index.css'), 'utf8');
  assert.match(css, /\.skip-link:focus-visible\s*\{/);
  assert.match(css, /a:focus-visible[^}]*outline:/);
  assert.match(css, /\.hub-filter\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /\.article-tags a\s*\{[^}]*min-height:\s*44px/);
});

test('legacy archive script runs only on the homepage and video script only where a facade exists', () => {
  const home = html('');
  const hub = html('type/news');
  const guide = html('26/260927-Puzzle_Solutions');
  const news = html('2026/toxic-frontier-card-hex-survival-city-builder-announced');
  assert.match(home, /Postlist infinite scroll/);
  for (const page of [hub, guide, news]) assert.doesNotMatch(page, /Postlist infinite scroll/);
  for (const page of [home, hub, guide]) assert.doesNotMatch(page, /<script src="\/assets\/js\/lazy-youtube\.js"/);
  assert.match(news, /<script src="\/assets\/js\/lazy-youtube\.js" defer><\/script>/);
  const css = fs.readFileSync(path.join(site, 'assets/css/index.css'), 'utf8');
  assert.doesNotMatch(css, /\.splide__slide/);
});

test('mobile masthead and navigation use compact, consistent spacing', () => {
  assert.match(html(''), /class="site-masthead [^"]*"/);
  const css = fs.readFileSync(path.join(__dirname, '..', 'src/public/css/index.css'), 'utf8');
  assert.match(css, /@media \(max-width: 639px\) \{\s*#site \{ padding-top: \.75rem; \}/);
  assert.match(css, /\.site-masthead \{ padding-top: \.5rem; padding-bottom: \.75rem; \}/);
});

test('hub cards use h2 below the hub h1, while homepage cards remain h3 below section h2', () => {
  const hub = html('game/onimusha-way-of-the-sword');
  const home = html('');
  assert.match(hub, /<h1[^>]*>鬼武者 Way of the Sword<\/h1>/);
  assert.match(hub, /<h2 class="acard-title">/);
  assert.doesNotMatch(hub, /<h3 class="acard-title">/);
  assert.match(home, /<h3 class="acard-title">/);
});

test('hub filter script loads only when a hub has more than one populated content type', () => {
  for (const route of ['type/merch', 'game/mechabellum', 'type/news']) {
    assert.doesNotMatch(html(route), /src="\/assets\/js\/hub-filters\.js"/, route);
  }
  assert.match(html('franchise/path-of-exile'), /src="\/assets\/js\/hub-filters\.js"/);
});

test('mobile pages use device-width at 100% scale rather than shrinking the viewport', () => {
  for (const route of ['', 'type/news', '26/260927-Puzzle_Solutions']) {
    assert.match(html(route), /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  }
});
