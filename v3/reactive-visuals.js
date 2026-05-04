/**
 * Infogr.ai v3 — Reactive Visual Updates
 *
 * Shared logic for data-driven number ↔ visual binding.
 * When a user edits a number (e.g. "50%" → "75%"), the associated
 * visual shape updates immediately: SVG arc fill, bar width, star
 * count, dot pattern.
 *
 * Used by:
 *   - v3/editor.js        (main tool — exitEdit hook)
 *   - gallery-editor.html  (gallery — blur/finish hook)
 *
 * Load via <script src="v3/reactive-visuals.js"></script> BEFORE
 * the consumer script. Exposes window.IgReactiveVisuals.
 */
(function () {
  'use strict';

  // ── Parsers ──────────────────────────────────────────────

  /**
   * Parse a string for percentage/fill value.
   *   "70%"   → 70
   *   "70"    → 70  (plain number treated as percent)
   *   "$2.4M" → null (non-numeric → no fill)
   */
  function parsePctFill(str) {
    if (!str) return null;
    var s = str.trim();
    var m = s.match(/^(\d+(?:\.\d+)?)\s*%/);
    if (m) return parseFloat(m[1]);
    var p = s.match(/^(\d+(?:\.\d+)?)$/);
    if (p) return Math.min(100, parseFloat(p[1]));
    return null;
  }

  /**
   * Parse star rating: extract number 0–5 from string.
   *   "4.5" → 4.5,  "3/5" → 3,  "" → 0
   */
  function parseStars(str) {
    if (!str) return 0;
    var m = String(str).match(/(\d+(?:\.\d+)?)/);
    return m ? Math.min(5, parseFloat(m[1])) : 0;
  }

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  // ── Visual updaters ──────────────────────────────────────

  /** Dot-grid: rebuild 100-dot grid based on percentage */
  function updateDotGrid(el) {
    var card = el.closest('.igs-dotgrid-card');
    if (!card) return false;
    var grid = card.querySelector('.igs-dotgrid-grid');
    if (!grid) return false;
    var pct = parsePctFill(el.textContent);
    var TOTAL = 100;
    var filled = pct !== null ? Math.round((pct / 100) * TOTAL) : 0;
    var html = '';
    for (var d = 0; d < TOTAL; d++) {
      html += '<div class="igs-dg-dot ' + (d < filled ? 'filled' : 'empty') + '"></div>';
    }
    grid.innerHTML = html;
    return true;
  }

  /** Dot-line: rebuild 10-dot row based on percentage */
  function updateDotLine(el) {
    var row = el.closest('.igs-dotline-row');
    if (!row) return false;
    var track = row.querySelector('.igs-dotline-track');
    if (!track) return false;
    var pct = parsePctFill(el.textContent);
    var DOT_COUNT = 10;
    var exactFill = pct !== null ? (pct / 100) * DOT_COUNT : 0;
    var fullFill = Math.floor(exactFill);
    var fracPart = exactFill - fullFill;
    var hasFrac = fracPart >= 0.2 && fracPart < 0.8;
    var html = '';
    for (var d = 0; d < DOT_COUNT; d++) {
      if (d < fullFill)                  html += '<div class="igs-dl-dot filled"></div>';
      else if (d === fullFill && hasFrac) html += '<div class="igs-dl-dot half"></div>';
      else                               html += '<div class="igs-dl-dot empty"></div>';
    }
    track.innerHTML = html;
    return true;
  }

  /** Bar-stats: update bar fill width (or create/remove track) */
  function updateBarStat(el) {
    var item = el.closest('.igs-barstat-item');
    if (!item) return false;
    var pct = parsePctFill(el.textContent);
    var bTrack = item.querySelector('.igs-barstat-track');
    if (pct !== null) {
      var fillW = Math.min(100, Math.max(0, pct));
      if (!bTrack) {
        var header = item.querySelector('.igs-barstat-header');
        bTrack = document.createElement('div');
        bTrack.className = 'igs-barstat-track';
        bTrack.innerHTML = '<div class="igs-barstat-fill" style="width:' + fillW + '%"></div>';
        if (header && header.nextSibling) item.insertBefore(bTrack, header.nextSibling);
        else item.appendChild(bTrack);
      } else {
        var fill = bTrack.querySelector('.igs-barstat-fill');
        if (fill) fill.style.width = fillW + '%';
      }
    } else if (bTrack) {
      bTrack.parentNode.removeChild(bTrack);
    }
    return true;
  }

  /** Star-rating: rebuild star HTML from score */
  function updateStarRating(el) {
    var item = el.closest('.igs-starrating-item');
    if (!item) return false;
    var container = item.querySelector('.igs-starrating-stars');
    if (!container) return false;
    var score = parseStars(el.textContent);
    var html = '';
    for (var i = 1; i <= 5; i++) {
      if (score >= i) {
        html += '<span class="igs-star-full">★</span>';
      } else {
        var frac = score - (i - 1);
        if (frac > 0.05 && frac < 0.95) {
          var pctVal = Math.round(frac * 100);
          html += '<span class="igs-star-partial">★<span class="igs-star-partial-fg" style="width:' + pctVal + '%">★</span></span>';
        } else {
          html += '<span class="igs-star-empty">★</span>';
        }
      }
    }
    container.innerHTML = html;
    return true;
  }

  /**
   * Circle-stats / circle-bold-line / circle-external-line:
   * Rebuild SVG donut arc based on the number.
   *
   * @param {Element} svg  - The .igs-circstat-svg element
   * @param {string} numStr - The new number text
   */
  function rebuildCircleSvg(svg, numStr) {
    var circles = svg.querySelectorAll('circle');
    var sw = 8, r = 40;
    var isExt = circles.length >= 3;
    for (var ci = 0; ci < circles.length; ci++) {
      var cSw = parseFloat(circles[ci].getAttribute('stroke-width'));
      if (cSw >= 10) { sw = 12; r = 38; }
    }
    var circ = +(2 * Math.PI * r).toFixed(2);
    var pct = parsePctFill(numStr);
    var showFill = pct !== null;
    var fillLen = showFill ? +((pct / 100) * circ).toFixed(2) : 0;
    var numEsc = escHtml(numStr);
    var fontSize = numEsc.length <= 3 ? 22 : numEsc.length <= 5 ? 17 : 13;

    var outerRing = isExt
      ? '<circle cx="50" cy="50" r="46" fill="none" stroke="var(--accent-soft)" stroke-width="2"/>'
      : '';
    var trackRing = '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--accent-soft)" stroke-width="' + sw + '"/>';
    var fillRing = showFill
      ? '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="' + sw
        + '" stroke-dasharray="' + fillLen + ' ' + circ + '" stroke-linecap="round" transform="rotate(-90 50 50)"/>'
      : '';

    // Keep <text> with visibility:hidden so SVG text overlays still work
    svg.innerHTML = outerRing + trackRing + fillRing
      + '<text x="50" y="50" text-anchor="middle" dominant-baseline="central"'
      + ' fill="var(--accent)" font-weight="bold" font-family="var(--font-heading)"'
      + ' font-size="' + fontSize + '" visibility="hidden">' + numEsc + '</text>';
  }

  /**
   * Try to update the circle-stat SVG from el.
   * Handles two cases:
   *   1. el is inside .igs-circstat-col (direct child or descendant)
   *   2. el is an SVG text overlay linked via data-linked-svg / data-rv-id
   *
   * @param {Element} el         - The edited element
   * @param {Element} searchRoot - Root element to search for [data-rv-id] (for overlay lookup)
   * @returns {boolean} true if a circle-stat was found and updated
   */
  function updateCircleStat(el, searchRoot) {
    var svg = null;
    var numStr = (el.textContent || '').trim();

    // Case 1: el is inside a circstat-col
    if (el.closest) {
      var col = el.closest('.igs-circstat-col');
      if (col) svg = col.querySelector('.igs-circstat-svg');
    }

    // Case 2: SVG text overlay linked to circle-stat via data attribute
    if (!svg && el.dataset && el.dataset.linkedSvg) {
      var root = searchRoot || document;
      svg = root.querySelector('.igs-circstat-svg[data-rv-id="' + el.dataset.linkedSvg + '"]');
    }

    if (!svg) return false;
    rebuildCircleSvg(svg, numStr);
    return true;
  }

  // ── Main entry point ─────────────────────────────────────

  /**
   * Update the visual linked to an edited element.
   * Call this on blur / exitEdit after the user finishes editing a number.
   *
   * @param {Element} el         - The element whose text was edited
   * @param {Element} searchRoot - (optional) Root for spatial SVG overlay matching.
   *                               Pass renderTarget in gallery-editor, omit in main tool.
   */
  function updateVisualAfterEdit(el, searchRoot) {
    if (!el) return;
    var cls = el.className || '';

    // Circle-stats (check first — overlay has no igs- class, uses data-linked-svg)
    if (updateCircleStat(el, searchRoot || document)) return;

    // Bar-stats
    if (cls.indexOf('igs-barstat-num') !== -1) { updateBarStat(el); return; }

    // Star-rating
    if (cls.indexOf('igs-starrating-score') !== -1) { updateStarRating(el); return; }

    // Dot-grid
    if (cls.indexOf('igs-dotgrid-num') !== -1) { updateDotGrid(el); return; }

    // Dot-line
    if (cls.indexOf('igs-dotline-val') !== -1) { updateDotLine(el); return; }
  }

  // ── Public API ───────────────────────────────────────────

  window.IgReactiveVisuals = {
    parsePctFill:          parsePctFill,
    parseStars:            parseStars,
    updateVisualAfterEdit: updateVisualAfterEdit,
    updateBarStat:         updateBarStat,
    updateStarRating:      updateStarRating,
    updateCircleStat:      updateCircleStat,
    rebuildCircleSvg:      rebuildCircleSvg,
    updateDotGrid:         updateDotGrid,
    updateDotLine:         updateDotLine
  };

})();
