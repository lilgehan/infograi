/**
 * Infogr.ai v3 — Grid & Composition System (Layer 3)
 *
 * Arranges rendered blocks into a page-level column/row layout.
 * Handles equal columns, asymmetric splits, and multi-row flow.
 *
 * Reference: ENGINE-SPEC.md — Layer 3 → Grid & Composition
 *
 * Usage:
 *   import { renderGrid, GRID_CSS } from './grid.js';
 *   const html = renderGrid(blocks, 3, '16:9');
 */

/* ─────────────────────────────────────────
   GRID CSS
   Scoped to .ig-page .igs-grid-* so it never leaks into the app shell.
───────────────────────────────────────── */

export const GRID_CSS = `
/* ── Page-level grid system ── */
.ig-page .igs-page-grid {
  display: grid;
  gap: 18px;
  width: 100%;
  box-sizing: border-box;
}

/* Equal column presets */
.ig-page .igs-page-grid--1 { grid-template-columns: 1fr; }
.ig-page .igs-page-grid--2 { grid-template-columns: repeat(2, 1fr); }
.ig-page .igs-page-grid--3 { grid-template-columns: repeat(3, 1fr); }
.ig-page .igs-page-grid--4 { grid-template-columns: repeat(4, 1fr); }

/* Asymmetric presets */
.ig-page .igs-page-grid--60-40 { grid-template-columns: 3fr 2fr; }
.ig-page .igs-page-grid--40-60 { grid-template-columns: 2fr 3fr; }
.ig-page .igs-page-grid--70-30 { grid-template-columns: 7fr 3fr; }
.ig-page .igs-page-grid--30-70 { grid-template-columns: 3fr 7fr; }

/* Cells */
.ig-page .igs-page-cell {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0; /* prevent overflow in grid cells */
  overflow: hidden;
}
.ig-page .igs-page-cell--full {
  grid-column: 1 / -1;
}
`;

/* ─────────────────────────────────────────
   COLUMN PRESETS
   Maps column count + aspect ratio to grid class name.
───────────────────────────────────────── */

/** Largest safe column count for each document size. */
const MAX_COLUMNS = {
  '16:9': 4,
  '1:1':  3,
  '9:16': 2,
  'a4':   3,
  'default': 3,
};

/**
 * Clamp column count to the max allowed for the given document size.
 *
 * @param {number} requested
 * @param {string} aspectRatio — '16:9' | '1:1' | '9:16' | 'a4'
 * @returns {number}
 */
export function clampColumns(requested, aspectRatio = '16:9') {
  const key = (aspectRatio || '').toLowerCase();
  const max = MAX_COLUMNS[key] ?? MAX_COLUMNS.default;
  return Math.min(Math.max(Number(requested) || 1, 1), max);
}

/**
 * Map a column count to the CSS grid class suffix.
 * Also supports asymmetric ratios like '60-40'.
 *
 * @param {number|string} columns — e.g. 3 or '60-40'
 * @returns {string} CSS class suffix
 */
function gridClass(columns) {
  if (typeof columns === 'string' && columns.includes('-')) {
    // Asymmetric: '60-40', '40-60', '70-30', '30-70'
    const normalized = columns.replace('/', '-').replace(':', '-');
    if (['60-40', '40-60', '70-30', '30-70'].includes(normalized)) {
      return normalized;
    }
  }
  const n = Math.min(Math.max(Number(columns) || 1, 1), 4);
  return String(n);
}

/* ─────────────────────────────────────────
   renderGrid — main export
   Wraps an array of rendered HTML blocks in the appropriate
   page-level grid. Blocks flow into cells automatically.
───────────────────────────────────────── */

/**
 * Arrange rendered HTML blocks into a page-level column grid.
 *
 * @param {string[]} blocks       — array of HTML strings (one per content section)
 * @param {number|string} columns — 1 | 2 | 3 | 4 | '60-40' | '40-60' | ...
 * @param {string} aspectRatio    — document size hint for column clamping
 * @returns {string} HTML string
 */
export function renderGrid(blocks, columns = 3, aspectRatio = '16:9') {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';

  // For asymmetric ratios, don't clamp (they're always 2-col)
  const isAsymmetric = typeof columns === 'string' && columns.includes('-');
  const resolvedCols = isAsymmetric
    ? columns
    : clampColumns(columns, aspectRatio);

  const cls = gridClass(resolvedCols);
  const numCols = isAsymmetric ? 2 : Number(resolvedCols);

  // Single block — full width, no grid wrapper needed
  if (blocks.length === 1) {
    return `<div class="igs-page-cell">${blocks[0]}</div>`;
  }

  // Multiple blocks: each block gets its own cell.
  // If there's only one column, stack them vertically without a grid.
  if (numCols === 1 || resolvedCols === 1) {
    const cells = blocks.map(b => `<div class="igs-page-cell">${b}</div>`).join('');
    return `<div class="igs-page-grid igs-page-grid--1">${cells}</div>`;
  }

  // Standard multi-column grid: distribute blocks across cells.
  // Extra blocks after filling columns get their own full-width row.
  const cells = blocks.map((b, i) => {
    const isExtra = !isAsymmetric && i >= numCols;
    const fullClass = isExtra ? ' igs-page-cell--full' : '';
    return `<div class="igs-page-cell${fullClass}">${b}</div>`;
  }).join('');

  return `<div class="igs-page-grid igs-page-grid--${cls}">${cells}</div>`;
}

/* ─────────────────────────────────────────
   renderSections
   Higher-level helper: takes an array of rendered section HTML strings
   and composes them into a full page layout based on column settings.

   For a content-v1 document with multiple sections:
   - Single section → full width
   - Two sections → 2-col or 60/40 split
   - Three+ sections → 3-col or stacked rows
───────────────────────────────────────── */

/**
 * Compose multiple rendered sections into a page layout.
 *
 * @param {string[]} sectionHtmls — array of rendered section HTML strings
 * @param {number}   columns      — desired column count for the page layout
 * @param {string}   aspectRatio  — document aspect ratio
 * @returns {string} HTML string
 */
export function renderSections(sectionHtmls, columns = 3, aspectRatio = '16:9') {
  if (!sectionHtmls || sectionHtmls.length === 0) return '';
  if (sectionHtmls.length === 1) return sectionHtmls[0];

  // Use renderGrid to compose sections into the page layout
  return renderGrid(sectionHtmls, columns, aspectRatio);
}

/* ─────────────────────────────────────────
   Utility: auto-pick column count
   Mirrors the content-schema.js validateGroup() logic but
   for page-level layout (number of sections, not items).
───────────────────────────────────────── */

/**
 * Pick a sensible default column count for a given number of sections
 * and document aspect ratio.
 *
 * @param {number} sectionCount
 * @param {string} aspectRatio
 * @returns {number}
 */
export function autoColumns(sectionCount, aspectRatio = '16:9') {
  const max = MAX_COLUMNS[(aspectRatio || '').toLowerCase()] ?? 3;
  if (sectionCount <= 1) return 1;
  if (sectionCount === 2) return Math.min(2, max);
  if (sectionCount === 4) return Math.min(2, max); // 2×2 preferred over 4×1
  return Math.min(3, max);
}
