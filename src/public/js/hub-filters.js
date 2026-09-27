// Progressive enhancement: without JS, all hub articles remain visible.
(() => {
  const filters = document.querySelector('.hub-filters');
  const grid = document.querySelector('.hub-card-grid');
  if (!filters || !grid) return;
  const cards = [...grid.querySelectorAll('.acard')];
  filters.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-filter]');
    if (!button || !filters.contains(button)) return;
    const selected = button.dataset.filter;
    for (const chip of filters.querySelectorAll('button[data-filter]')) {
      chip.setAttribute('aria-pressed', String(chip === button));
    }
    for (const card of cards) {
      card.hidden = selected !== 'all' && card.dataset.type !== selected;
    }
  });
})();
