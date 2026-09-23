/* ==========================================================================
   Campus Clash 2D — campus-clash-select.js
   Builds the 10-card character select + detail panel (see reference sheet).
   Needs: campus-clash-visuals.js (data) + campus-clash-ui.css (styles).

   Usage:
     CampusSelect.build(document.getElementById('select-root'), {
       base: 'assets/characters',
       onPreview: (id) => {},          // hover / focus / arrow keys
       onSelect:  (id) => startFight(id), // click or Enter
       selected: 'topper',
     });
   Portraits load from <base>/<id>/portrait.png; cards fall back to a gradient if missing.
   ========================================================================== */
(() => {
  'use strict';
  const V = window.CampusVisuals || {};
  const STAT_LABELS = ['Power', 'Speed', 'Range', 'Control', 'Difficulty'];

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function build(root, opts = {}) {
    const V = window.CampusVisuals;
    if (!V || !V.CHARACTERS) return null;
    const base = opts.base || 'assets/characters';
    const ids = Object.keys(V.CHARACTERS);
    let current = opts.selected && V.CHARACTERS[opts.selected] ? opts.selected : ids[0];

    root.classList.add('cc-select');
    root.textContent = '';

    const grid = el('div', 'cc-grid');
    grid.setAttribute('role', 'listbox');
    grid.setAttribute('aria-label', 'Choose your fighter');
    const detail = el('section', 'cc-detail');
    detail.setAttribute('aria-live', 'polite');
    root.append(grid, detail);

    const cards = ids.map((id) => {
      const c = V.CHARACTERS[id];
      const card = el('button', 'cc-card');
      card.type = 'button';
      card.setAttribute('role', 'option');
      card.dataset.id = id;
      card.style.setProperty('--a', c.accent);

      const body = el('div', 'cc-card__body');
      const top = el('div', 'cc-card__top');
      top.append(el('span', '', String(c.index).padStart(2, '0')), el('span', 'cc-card__icon', c.icon));

      const art = el('div', 'cc-card__art');
      const img = new Image();
      img.alt = '';
      img.src = `${base}/${id}/portrait.png`;
      img.onerror = () => img.remove();
      art.append(img);

      const label = el('div', 'cc-card__label');
      const dots = el('div', 'cc-card__dots');
      c.palette.forEach((p) => { const d = document.createElement('i'); d.style.background = p; dots.append(d); });
      label.append(el('div', 'cc-card__name', c.name), el('div', 'cc-card__role', c.role), dots);

      body.append(top, art, label);
      card.append(body);
      card.addEventListener('mouseenter', () => preview(id));
      card.addEventListener('focus', () => preview(id));
      card.addEventListener('click', () => choose(id));
      grid.append(card);
      return card;
    });

    function preview(id) {
      current = id;
      const c = V.CHARACTERS[id];
      cards.forEach((k) => k.setAttribute('aria-selected', String(k.dataset.id === id)));
      detail.style.setProperty('--a', c.accent);
      detail.textContent = '';

      const art = el('div', 'cc-detail__art');
      const img = new Image();
      img.alt = `${c.name}, ${c.role}`;
      img.src = `${base}/${id}/portrait.png`;
      img.onerror = () => img.remove();
      art.append(img);

      const info = el('div');
      info.append(el('h2', 'cc-detail__name', `${String(c.index).padStart(2, '0')}. ${c.name}`),
                  el('div', 'cc-detail__role', c.role),
                  el('p', 'cc-detail__quote', `“${c.quote}”`));
      const stats = el('div', 'cc-stats');
      STAT_LABELS.forEach((label, i) => {
        const bar = el('div', 'cc-stats__bar');
        const fill = document.createElement('b');
        fill.style.width = `${(c.stats[i] / 5) * 100}%`;
        bar.append(fill);
        stats.append(el('span', '', label), bar);
      });
      info.append(stats);
      detail.append(art, info);
      if (opts.onPreview) opts.onPreview(id);
    }

    function choose(id) { preview(id); if (opts.onSelect) opts.onSelect(id); }

    // Arrow-key navigation across the grid
    grid.addEventListener('keydown', (e) => {
      const i = ids.indexOf(current);
      const perRow = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
      let n = i;
      if (e.key === 'ArrowRight') n = Math.min(ids.length - 1, i + 1);
      else if (e.key === 'ArrowLeft') n = Math.max(0, i - 1);
      else if (e.key === 'ArrowDown') n = Math.min(ids.length - 1, i + perRow);
      else if (e.key === 'ArrowUp') n = Math.max(0, i - perRow);
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(current); return; }
      else return;
      e.preventDefault();
      cards[n].focus();
    });

    preview(current);
    return { select: preview, get current() { return current; } };
  }

  window.CampusSelect = { build };
})();

export const CampusSelect = window.CampusSelect;
