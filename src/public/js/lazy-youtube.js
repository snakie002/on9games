/* lazy-youtube.js — on9.games lazy YouTube facade
 * ~1.1 KB minified. No dependencies. Progressive enhancement:
 * without JS the <a> fallback link inside the facade still works.
 *
 * Behaviour:
 *  - Nothing from youtube.com / ytimg.com is requested until the user clicks.
 *    (The poster is a normal <img loading="lazy"> from i.ytimg.com — see README for the
 *     zero-third-party variant that uses a local poster instead.)
 *  - On click/Enter/Space: replace facade content with a privacy-enhanced iframe
 *    (youtube-nocookie.com) and autoplay=1 ONLY because the click is an explicit user gesture.
 *  - Aspect ratio is fixed by CSS (16/9) so swapping poster -> iframe causes no layout shift.
 */
(function () {
  'use strict';
  var SEL = '.lazy-yt[data-yt-id]';

  function activate(el) {
    if (el.dataset.ytActive) return;
    el.dataset.ytActive = '1';
    var id = el.dataset.ytId;
    var title = el.dataset.ytTitle || 'YouTube video';
    var start = parseInt(el.dataset.ytStart || '0', 10) || 0;
    var params = 'autoplay=1&rel=0&modestbranding=1&playsinline=1' + (start ? '&start=' + start : '');
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?' + params;
    iframe.title = title;
    iframe.allow = 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.setAttribute('loading', 'eager');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    el.replaceChildren(iframe);
    el.classList.add('lazy-yt--active');
    iframe.focus();
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(e.currentTarget); }
  }

  function init(root) {
    var nodes = (root || document).querySelectorAll(SEL);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.dataset.ytBound) continue;
      el.dataset.ytBound = '1';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', '播放影片：' + (el.dataset.ytTitle || 'YouTube'));
      el.addEventListener('click', function (e) { e.preventDefault(); activate(e.currentTarget); });
      el.addEventListener('keydown', onKey);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
  window.lazyYouTubeInit = init; // for content injected later (e.g. infinite-scroll postlists)
})();
