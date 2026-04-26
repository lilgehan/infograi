/**
 * Infogr.ai v3 — Smart Layout Render Functions (Layer 2, Boxes Family)
 *
 * Transforms semantic content items into visual box representations.
 * Each of the 12 box variants takes the same items array and draws differently.
 * Same content → different visuals, no data change required.
 *
 * Reference: ENGINE-SPEC.md — Layer 2.3 → Boxes
 *
 * Usage:
 *   import { renderBoxes, BOXES_CSS } from './smart-layouts.js';
 *   const html = renderBoxes(items, 'solid-boxes-icons', 'professional', 3, 'standard');
 */

/* ─────────────────────────────────────────
   ICON HELPER
   Local proxy — keeps smart-layouts.js free of renderer.js dependency.
───────────────────────────────────────── */

const ICON_BASE = 'https://img.icons8.com/3d-fluency/94';

function boxIconUrl(name) {
  if (!name || typeof name !== 'string') return '';
  const safe = encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'));
  return `${ICON_BASE}/${safe}.png`;
}

/* ─────────────────────────────────────────
   TEXT DENSITY HELPERS
   ENGINE-SPEC.md Layer 5 — Adaptive Text Engine
───────────────────────────────────────── */

/**
 * Truncate body text to fit the target density.
 *   compact  → no body (title-only display)
 *   standard → ~20 words
 *   detailed → ~40 words
 */
function truncateBody(body, density) {
  if (!body || density === 'compact') return '';
  const words = body.trim().split(/\s+/);
  const limit = density === 'detailed' ? 40 : 20;
  if (words.length <= limit) return body;
  return words.slice(0, limit).join(' ') + '…';
}

/**
 * Truncate title to 7 words in compact mode.
 */
function truncateTitle(title, density) {
  if (!title) return '';
  if (density !== 'compact') return title;
  const words = title.trim().split(/\s+/);
  if (words.length <= 7) return title;
  return words.slice(0, 7).join(' ') + '…';
}

/**
 * Escape HTML special chars.
 */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Chunk an array into groups of size n.
 */
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/* ─────────────────────────────────────────
   BOXES CSS
   Scoped to .ig-page .igs-* to prevent leaking into the app shell.
   Exported for use by renderFromContent() in renderer.js.
───────────────────────────────────────── */

export const BOXES_CSS = `
/* ── Smart Layout: grid system ── */
.ig-page .igs-grid {
  display: grid;
  gap: 14px;
  width: 100%;
}
.ig-page .igs-grid--1 { grid-template-columns: 1fr; }
.ig-page .igs-grid--2 { grid-template-columns: repeat(2, 1fr); }
.ig-page .igs-grid--3 { grid-template-columns: repeat(3, 1fr); }
.ig-page .igs-grid--4 { grid-template-columns: repeat(4, 1fr); }

/* ── Solid Boxes ── */
.ig-page .igs-solid {
  background: var(--accent);
  border-radius: var(--radius-card, 10px);
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-solid .igs-icon {
  width: 32px; height: 32px;
  object-fit: contain;
  margin-bottom: 4px;
  filter: brightness(0) invert(1);
  flex-shrink: 0;
}
.ig-page .igs-solid .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.94em; font-weight: 700;
  color: #fff; margin: 0; line-height: 1.3;
}
.ig-page .igs-solid .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.77em; color: rgba(255,255,255,0.88);
  margin: 0; line-height: 1.45;
}

/* ── Outline Boxes ── */
.ig-page .igs-outline {
  background: var(--card-bg, #fff);
  border: 2px solid var(--accent);
  border-radius: var(--radius-card, 10px);
  padding: 18px 16px;
  display: flex; flex-direction: column; gap: 6px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-outline .igs-icon {
  width: 28px; height: 28px; object-fit: contain; margin-bottom: 4px; flex-shrink: 0;
}
.ig-page .igs-outline .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.94em; font-weight: 700;
  color: var(--accent); margin: 0; line-height: 1.3;
}
.ig-page .igs-outline .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.77em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Side Line (card with left accent bar) ── */
.ig-page .igs-sideline {
  background: var(--card-bg, #fff);
  border-left: 4px solid var(--accent);
  border-radius: 0 var(--radius-card, 10px) var(--radius-card, 10px) 0;
  padding: 14px 16px;
  display: flex; flex-direction: column; gap: 5px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-sideline .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.94em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0; line-height: 1.3;
}
.ig-page .igs-sideline .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.77em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Side Line Text (minimal, no card bg) ── */
.ig-page .igs-sidelinetext {
  border-left: 3px solid var(--accent);
  padding: 5px 14px;
  display: flex; flex-direction: column; gap: 4px;
  overflow: hidden;
}
.ig-page .igs-sidelinetext .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.94em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0;
}
.ig-page .igs-sidelinetext .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.77em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Top Line Text (top accent bar, minimal) ── */
.ig-page .igs-topline {
  border-top: 3px solid var(--accent);
  padding: 12px 4px 6px;
  display: flex; flex-direction: column; gap: 5px;
  overflow: hidden;
}
.ig-page .igs-topline .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.94em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0;
}
.ig-page .igs-topline .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.77em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Top Circle ── */
.ig-page .igs-topcircle {
  background: var(--card-bg, #fff);
  border-radius: var(--radius-card, 10px);
  padding: 18px 14px 14px;
  display: flex; flex-direction: column;
  align-items: center; text-align: center; gap: 8px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-topcircle .igs-circle {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ig-page .igs-topcircle .igs-circle img {
  width: 24px; height: 24px; object-fit: contain;
  filter: brightness(0) invert(1);
}
.ig-page .igs-topcircle .igs-circle-num {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 1em; font-weight: 700; color: #fff;
}
.ig-page .igs-topcircle .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.9em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0; line-height: 1.3;
}
.ig-page .igs-topcircle .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.75em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Joined Boxes ── */
.ig-page .igs-joined-row {
  display: flex; width: 100%; overflow: hidden;
  border-radius: var(--radius-card, 10px);
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  border: 1px solid var(--card-border, #e5e7eb);
  margin-bottom: 10px;
}
.ig-page .igs-joined-row:last-child { margin-bottom: 0; }
.ig-page .igs-joined {
  flex: 1;
  background: var(--card-bg, #fff);
  border-right: 1px solid var(--card-border, #e5e7eb);
  padding: 14px 13px;
  display: flex; flex-direction: column; gap: 5px;
  overflow: hidden;
}
.ig-page .igs-joined:last-child { border-right: none; }
.ig-page .igs-joined-row.igs-has-icons .igs-joined {
  align-items: center; text-align: center;
}
.ig-page .igs-joined .igs-icon {
  width: 28px; height: 28px; object-fit: contain; margin-bottom: 5px; flex-shrink: 0;
}
.ig-page .igs-joined .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.87em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0; line-height: 1.3;
}
.ig-page .igs-joined .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.74em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Leaf Boxes ── */
.ig-page .igs-leaf {
  background: var(--accent-soft, rgba(37,99,235,.1));
  border-radius: 0 38% 0 38%;
  padding: 20px 18px;
  display: flex; flex-direction: column; gap: 6px;
  min-height: 80px;
  overflow: hidden;
}
.ig-page .igs-leaf .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.92em; font-weight: 700;
  color: var(--accent); margin: 0; line-height: 1.3;
}
.ig-page .igs-leaf .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.76em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Labeled Boxes ── */
.ig-page .igs-labeled-wrap {
  position: relative; padding-top: 14px;
  overflow: visible;
}
.ig-page .igs-labeled {
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: 0 var(--radius-card, 10px) var(--radius-card, 10px) var(--radius-card, 10px);
  padding: 12px 14px 14px;
  display: flex; flex-direction: column; gap: 5px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-labeled-tag {
  position: absolute; top: 0; left: 0;
  background: var(--accent); color: #fff;
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.68em; font-weight: 700;
  padding: 2px 10px 2px 8px;
  border-radius: 4px 4px 4px 0;
  white-space: nowrap; max-width: 80%;
  overflow: hidden; text-overflow: ellipsis;
}
.ig-page .igs-labeled .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.92em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0; line-height: 1.3;
}
.ig-page .igs-labeled .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.76em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Alternating Boxes ── */
.ig-page .igs-alt {
  border-radius: var(--radius-card, 10px);
  padding: 16px;
  display: flex; flex-direction: column; gap: 6px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-alt--primary {
  background: var(--accent);
}
.ig-page .igs-alt--secondary {
  background: var(--accent-soft, rgba(37,99,235,.1));
  border: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igs-alt--primary .igs-title { color: #fff; }
.ig-page .igs-alt--primary .igs-body  { color: rgba(255,255,255,.85); }
.ig-page .igs-alt--secondary .igs-title { color: var(--accent); }
.ig-page .igs-alt--secondary .igs-body  { color: var(--text-secondary, #6b7280); }
.ig-page .igs-alt .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.92em; font-weight: 700; margin: 0; line-height: 1.3;
}
.ig-page .igs-alt .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.76em; margin: 0; line-height: 1.45;
}
`;

/* ─────────────────────────────────────────
   VARIANT RENDERERS (internal)
   Each returns an HTML string for one item.
───────────────────────────────────────── */

/** solid-boxes / solid-boxes-icons */
function renderSolidItem(item, idx, withIcons, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  const iconHtml = withIcons && item.icon
    ? `<img class="igs-icon" src="${esc(boxIconUrl(item.icon))}" alt="" loading="lazy">`
    : '';
  return `<div class="igs-solid">${iconHtml}<p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** outline-boxes */
function renderOutlineItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  const iconHtml = item.icon
    ? `<img class="igs-icon" src="${esc(boxIconUrl(item.icon))}" alt="" loading="lazy">`
    : '';
  return `<div class="igs-outline">${iconHtml}<p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** side-line */
function renderSidelineItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  return `<div class="igs-sideline"><p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** side-line-text */
function renderSidelineTextItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  return `<div class="igs-sidelinetext"><p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** top-line-text */
function renderToplineItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  return `<div class="igs-topline"><p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** top-circle */
function renderTopCircleItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  const circleContent = item.icon
    ? `<img src="${esc(boxIconUrl(item.icon))}" alt="" loading="lazy">`
    : `<span class="igs-circle-num">${idx + 1}</span>`;
  return `<div class="igs-topcircle">
  <div class="igs-circle">${circleContent}</div>
  <p class="igs-title">${title}</p>
  ${body ? `<p class="igs-body">${body}</p>` : ''}
</div>`;
}

/** leaf-boxes */
function renderLeafItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  return `<div class="igs-leaf"><p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** labeled-boxes */
function renderLabeledItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  const tag   = esc(`0${idx + 1}`.slice(-2)); // "01", "02" etc.
  return `<div class="igs-labeled-wrap">
  <span class="igs-labeled-tag">${tag}</span>
  <div class="igs-labeled">
    <p class="igs-title">${title}</p>
    ${body ? `<p class="igs-body">${body}</p>` : ''}
  </div>
</div>`;
}

/** alternating-boxes */
function renderAltItem(item, idx, density) {
  const title     = esc(truncateTitle(item.title, density));
  const body      = esc(truncateBody(item.body, density));
  const altClass  = idx % 2 === 0 ? 'igs-alt--primary' : 'igs-alt--secondary';
  return `<div class="igs-alt ${altClass}"><p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/* ─────────────────────────────────────────
   JOINED BOXES BUILDER
   Joined boxes break the standard grid: they form horizontal
   strips of N items per row with no gaps between siblings.
───────────────────────────────────────── */

function renderJoinedBoxes(items, withIcons, columns, density) {
  const rows = chunk(items, columns);
  const rowsHtml = rows.map(rowItems => {
    const cells = rowItems.map(item => {
      const title = esc(truncateTitle(item.title, density));
      const body  = esc(truncateBody(item.body, density));
      const iconHtml = withIcons && item.icon
        ? `<img class="igs-icon" src="${esc(boxIconUrl(item.icon))}" alt="" loading="lazy">`
        : '';
      return `<div class="igs-joined">${iconHtml}<p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
    }).join('');
    const hasIconsClass = withIcons ? ' igs-has-icons' : '';
    return `<div class="igs-joined-row${hasIconsClass}">${cells}</div>`;
  }).join('');
  return rowsHtml;
}

/* ─────────────────────────────────────────
   STANDARD GRID WRAPPER
   Used by all non-joined variants.
───────────────────────────────────────── */

function wrapGrid(itemsHtml, columns) {
  const colClass = `igs-grid--${Math.min(Math.max(columns, 1), 4)}`;
  return `<div class="igs-grid ${colClass}">${itemsHtml}</div>`;
}

/* ─────────────────────────────────────────
   renderBoxes — main export
   Returns a complete HTML string (no wrapping div needed).
───────────────────────────────────────── */

/**
 * Render an array of content items as one of the 12 box variants.
 *
 * @param {Array}  items    — content items: [{ title, body?, icon?, image?, data? }]
 * @param {string} variant  — one of BOX_VARIANTS
 * @param {string} tone     — 'professional' | 'bold' | 'minimal' | 'playful' (for future use)
 * @param {number} columns  — 1 | 2 | 3 | 4
 * @param {string} density  — 'compact' | 'standard' | 'detailed'
 * @returns {string} HTML string
 */
export function renderBoxes(items, variant = 'solid-boxes', tone = 'professional', columns = 3, density = 'standard') {
  if (!Array.isArray(items) || items.length === 0) {
    return '<div class="igs-grid igs-grid--1"><p style="color:var(--text-secondary)">No content items.</p></div>';
  }

  // Clamp columns
  const cols = Math.min(Math.max(Number(columns) || 3, 1), 4);

  switch (variant) {

    case 'solid-boxes': {
      const html = items.map((item, i) => renderSolidItem(item, i, false, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'solid-boxes-icons': {
      const html = items.map((item, i) => renderSolidItem(item, i, true, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'outline-boxes': {
      const html = items.map((item, i) => renderOutlineItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'side-line': {
      const html = items.map((item, i) => renderSidelineItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'side-line-text': {
      const html = items.map((item, i) => renderSidelineTextItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'top-line-text': {
      const html = items.map((item, i) => renderToplineItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'top-circle': {
      const html = items.map((item, i) => renderTopCircleItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'joined-boxes': {
      // Joined boxes form rows; column count = items per row
      return renderJoinedBoxes(items, false, cols, density);
    }

    case 'joined-boxes-icons': {
      return renderJoinedBoxes(items, true, cols, density);
    }

    case 'leaf-boxes': {
      const html = items.map((item, i) => renderLeafItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'labeled-boxes': {
      const html = items.map((item, i) => renderLabeledItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'alternating-boxes': {
      const html = items.map((item, i) => renderAltItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    default: {
      // Unknown variant — fall back to solid-boxes
      console.warn(`[smart-layouts] Unknown variant "${variant}" — falling back to solid-boxes`);
      const html = items.map((item, i) => renderSolidItem(item, i, false, density)).join('');
      return wrapGrid(html, cols);
    }
  }
}

/* ─────────────────────────────────────────
   LAYOUT FAMILIES REGISTRY
   Maps family name → render function.
   Used by renderer.js to dispatch renderFromContent() calls.
───────────────────────────────────────── */

export const LAYOUT_FAMILIES = {
  boxes: renderBoxes,
  // Future families wired in Phase 3:
  // bullets:  renderBullets,
  // sequence: renderSequence,
  // numbers:  renderNumbers,
  // circles:  renderCircles,
  // quotes:   renderQuotes,
  // steps:    renderSteps,
};

/**
 * Render a section using the appropriate family render function.
 * Falls back to solid-boxes if the family is not yet implemented.
 *
 * @param {object} section — content group from content-v1 JSON
 *   { archetype, items, variant?, columns?, style? }
 * @param {string} tone
 * @returns {string} HTML string
 */
export function renderSection(section, tone = 'professional') {
  const { items = [], variant = 'solid-boxes', columns = 3, style: density = 'standard' } = section;

  // Determine which family to use based on variant name prefix
  // Boxes family handles all igs-box variants
  const isBoxesVariant = [
    'solid-boxes', 'solid-boxes-icons', 'outline-boxes', 'side-line',
    'side-line-text', 'top-line-text', 'top-circle', 'joined-boxes',
    'joined-boxes-icons', 'leaf-boxes', 'labeled-boxes', 'alternating-boxes',
  ].includes(variant);

  if (isBoxesVariant) {
    return renderBoxes(items, variant, tone, columns, density);
  }

  // Default — boxes until more families land in Phase 3
  return renderBoxes(items, 'solid-boxes', tone, columns, density);
}
