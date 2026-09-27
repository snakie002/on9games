const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const site = path.join(root, '_site');
const samples = ['type/news', 'game/onimusha-way-of-the-sword',
  'franchise/path-of-exile', 'author/snakie002', 'category/news', 'tags/Roguelike'];
const read = (route) => fs.readFileSync(path.join(site, route, 'index.html'), 'utf8');
const cards = (html) => [...html.matchAll(/<article class="acard acard-tile"[^>]*>/g)];

test('all six hub kinds show unified header, count and real article cards', () => {
  for (const route of samples) {
    const html = read(route);
    assert.match(html, /<header class="hub-header"/, route);
    const count = Number(html.match(/class="hub-count"[^>]*>(\d+)</)?.[1]);
    assert.ok(Number.isInteger(count) && count > 0, route);
    assert.equal(cards(html).length, count, `${route} must render every article exactly once`);
    assert.doesNotMatch(html, /class="postlist/, route);
  }
});

test('filter chips list only populated content types and partition the rendered cards', () => {
  for (const route of samples) {
    const html = read(route);
    const types = [...new Set(cards(html).map(([tag]) => tag.match(/data-type="([^"]+)"/)?.[1]).filter(Boolean))];
    const chips = [...html.matchAll(/<button class="hub-filter" data-filter="([^"]+)"[^>]*>([^<]+)<\/button>/g)];
    if (types.length > 1) {
      assert.deepEqual(chips.map((m) => m[1]), ['all', ...['news','guide','analysis','chit-chat','merch'].filter((id) => types.includes(id))], route);
      assert.match(html, /src="\/assets\/js\/hub-filters\.js"/);
    } else {
      assert.equal(chips.length, 0, `single-type hub ${route} needs no filter`);
    }
  }
});

test('hub cards retain cover, type, subject, date and author for legacy and V2', () => {
  for (const route of samples) {
    const html = read(route);
    assert.match(html, /class="acard-media"/);
    assert.match(html, /\/post_assets\/[^"<>]+\.(?:jpg|jpeg|png|webp)/i);
    assert.match(html, /class="ct-badge"/);
    assert.match(html, /<time datetime="\d{4}-\d\d-\d\d"/);
  }
  // Relationships are optional for legacy posts; assert them only in hubs
  // whose corpus actually has canonical game/franchise and author metadata.
  const game = read('game/onimusha-way-of-the-sword');
  assert.match(game, /class="acard-subject"/);
  assert.match(game, /class="acard-author"/);
  const news = read('type/news');
  assert.match(news, /href="\/2026\/toxic-frontier-card-hex-survival-city-builder-announced\/"/);
  assert.match(news, /href="\/2[0-5]\//, 'legacy URL must appear alongside V2');
});

test('empty hub remains reachable with an honest count', () => {
  const html = read('type/merch');
  assert.match(html, /class="hub-count"[^>]*>0</);
  assert.match(html, /暫時未有文章/);
  assert.equal(cards(html).length, 0);
});

test('hub templates use the unified listing, leaving the homepage archive intact', () => {
  for (const name of ['type','game','franchise','author','category','tags']) {
    const source = fs.readFileSync(path.join(root,'src',`${name}.njk`),'utf8');
    assert.match(source, /components\/hub-listing\.njk/, name);
    assert.doesNotMatch(source, /components\/postslist\.njk/, name);
  }
  assert.match(fs.readFileSync(path.join(root,'src','index.njk'),'utf8'), /components\/postslist\.njk/);
});
