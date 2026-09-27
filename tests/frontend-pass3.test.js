const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const site = path.join(root, '_site');
const html = (route) => fs.readFileSync(path.join(site, route, 'index.html'), 'utf8');
const samples = [
  '26/260927-Puzzle_Solutions',
  '2026/toxic-frontier-card-hex-survival-city-builder-announced',
  '23/230929-POE_Timeless_Jewel_Guide',
];

test('related articles rank game, franchise, type, recency and exclude duplicates/self', () => {
  const select = require('../lib/related-articles.js');
  const current = { url:'/current/', date:new Date('2026-09-28') };
  const posts = [current,
    {url:'/older-game/',date:new Date('2024-01-01')}, {url:'/franchise/',date:new Date('2025-01-01')},
    {url:'/type/',date:new Date('2026-01-01')}, {url:'/fallback/',date:new Date('2026-09-27')},
    {url:'/older-game/',date:new Date('2024-01-01')}];
  const meta = new Map([['/current/',{primaryGames:['game'],games:['game'],franchises:['series'],contentType:'guide'}],
    ['/older-game/',{primaryGames:['game'],games:['game'],franchises:['series'],contentType:'news'}],
    ['/franchise/',{primaryGames:['another'],games:['another'],franchises:['series'],contentType:'news'}],
    ['/type/',{primaryGames:[],games:[],franchises:[],contentType:'guide'}],
    ['/fallback/',{primaryGames:[],games:[],franchises:[],contentType:'news'}]]);
  assert.deepEqual(select(posts,current,p=>meta.get(p.url),4).map(p=>p.url),
    ['/older-game/','/franchise/','/type/','/fallback/']);
  assert.deepEqual(select(posts,{url:'/unknown/'},p=>meta.get(p.url),2).map(p=>p.url),
    ['/current/','/fallback/']);
});

test('synthetic Contract V2 Guide keeps explicit taxonomy and game-first recommendations', () => {
  const structured = require('../src/_data/structuredMetadata.js');
  const guide = { url:'/2026/test-guide/', date:new Date('2026-09-26'), data:{contentType:'guide',games:['onimusha-way-of-the-sword'],primaryGames:['onimusha-way-of-the-sword'],franchises:[],author:'snakie002',categories:['news']} };
  const game = { url:'/26/game/', date:new Date('2026-09-24'), data:{categories:['guide'],tags:['onimusha-wots']} };
  const other = { url:'/26/other/', date:new Date('2026-09-25'), data:{categories:['guide']} };
  const metadata = p => structured.deriveStructuredMetadata({...p.data,page:{inputPath:p.url}});
  assert.equal(metadata(guide).source,'v2');
  assert.equal(metadata(guide).contentType,'guide');
  assert.equal(metadata(guide).primaryGames[0],'onimusha-way-of-the-sword');
  assert.deepEqual(require('../lib/related-articles.js')([guide,other,game],guide,metadata,2).map(p=>p.url),['/26/game/','/26/other/']);
});

test('legacy and V2 article layouts share structured header, canonical cover, reading body and related cards', () => {
  for (const route of samples) {
    const page = html(route);
    assert.match(page, /<article class="article-layout"/);
    assert.match(page, /<header class="article-header"/);
    assert.match(page, /class="article-title"/);
    assert.match(page, /class="article-byline"/);
    assert.match(page, /class="article-cover"/);
    assert.match(page, /class="article-body post-content"/);
    assert.match(page, /class="article-related"/);
    assert.doesNotMatch(page, /side-postslist|<div class="min-w-\[350px\]/);
    const links = [...page.matchAll(/<section class="article-related"[\s\S]*?<\/section>/g)][0]?.[0] || '';
    const related = [...links.matchAll(/<h3 class="acard-title"><a href="([^"]+)"/g)].map(m=>m[1]);
    assert.ok(related.length>=3 && related.length<=6, `${route}: related count ${related.length}`);
    assert.equal(new Set(related).size,related.length);
    assert.ok(!related.includes('/'+route+'/'), 'current article cannot relate to itself');
  }
});

test('article metadata links resolve to existing structured hubs, and canonical cover stays unchanged', () => {
  for (const route of samples) {
    const page = html(route);
    const header = page.match(/<header class="article-header"[\s\S]*?<\/header>/)?.[0] || '';
    for (const href of [...header.matchAll(/href="(\/(?:type|game|franchise|author)\/[^"?]+)"/g)].map(m=>m[1])) {
      assert.ok(fs.existsSync(path.join(site,href,'index.html')),`missing ${href}`);
    }
    const cover = page.match(/<img class="article-cover" src="([^"]+)"/);
    assert.ok(cover,`${route} missing cover`);
    assert.match(cover[1],/\/post_assets\/[^/]+\.(?:jpe?g|png|webp)/i);
  }
});

test('obsolete Embla resources and old article sidebar are not loaded', () => {
  const base=fs.readFileSync(path.join(root,'src/_includes/layouts/base.njk'),'utf8');
  assert.doesNotMatch(base,/unpkg\.com\/embla-carousel/);
  for(const name of ['post.njk','post-hfok.njk','post-others.njk']) {
    const layout=fs.readFileSync(path.join(root,'src/_includes/layouts',name),'utf8');
    assert.doesNotMatch(layout,/side-postslist|category-list/);
  }
  assert.match(html(samples[1]),/\/assets\/js\/lazy-youtube\.js/);
  assert.match(html(samples[1]),/class="lazy-yt"/);
});
