/**
 * Infogr.ai v3 — Page Composition Patterns (Layer 3.5)
 *
 * Defines CSS grid templates for page-level section arrangement.
 * Each composition is a named pattern with CSS and a placement function.
 *
 * These are document-level layouts — they control HOW sections are arranged
 * on the page. They are separate from smart-layouts.js, which controls how
 * content ITEMS are displayed within a single section.
 *
 * Reference: ENGINE-SPEC.md — Layer 3.5 → Page Composition Patterns
 *
 * Usage:
 *   import { COMPOSITIONS, COMPOSITION_CSS, applyComposition } from './compositions.js';
 *   const html = applyComposition(sectionsHtml, 'dashboard');
 */

/* ─────────────────────────────────────────
   INDIVIDUAL COMPOSITION CSS STRINGS
   All scoped to .ig-page .ig-comp-* to avoid leaking into app shell.
───────────────────────────────────────── */

const STACK_CSS = `
/* ── stack — sections stacked vertically (default behavior) ── */
.ig-page .ig-comp-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
}`;

const TWO_COL_EQUAL_CSS = `
/* ── two-col-equal — two equal columns, sections alternate left/right ── */
.ig-page .ig-comp-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
  align-items: start;
}`;

const HERO_GRID_CSS = `
/* ── hero-grid — first section full-width, remaining in 2×2 grid ── */
.ig-page .ig-comp-hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
  align-items: start;
}
.ig-page .ig-comp-hero-grid > .ig-comp-hero-first {
  grid-column: 1 / -1;
}`;

const DASHBOARD_CSS = `
/* ── dashboard — full-width KPI strip + 2-col body + full-width bottom ── */
.ig-page .ig-comp-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  box-sizing: border-box;
}
.ig-page .ig-comp-dashboard-top {
  width: 100%;
}
.ig-page .ig-comp-dashboard-middle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}
.ig-page .ig-comp-dashboard-bottom {
  width: 100%;
}`;

const QUADRANT_CSS = `
/* ── quadrant — exactly 4 sections in a 2×2 grid with distinct background tints ── */
.ig-page .ig-comp-quadrant {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 16px;
  width: 100%;
  box-sizing: border-box;
}
.ig-page .ig-comp-quadrant > .ig-comp-q0 {
  border-radius: 10px;
  padding: 4px;
}
.ig-page .ig-comp-quadrant > .ig-comp-q1 {
  border-radius: 10px;
  padding: 4px;
}
.ig-page .ig-comp-quadrant > .ig-comp-q2 {
  border-radius: 10px;
  padding: 4px;
}
.ig-page .ig-comp-quadrant > .ig-comp-q3 {
  border-radius: 10px;
  padding: 4px;
}`;

const SIDEBAR_CSS = `
/* ── asymmetric-sidebar — 70% main column + 30% sidebar column ── */
.ig-page .ig-comp-sidebar {
  display: grid;
  grid-template-columns: 7fr 3fr;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
  align-items: start;
}
.ig-page .ig-comp-sidebar > .ig-comp-sidebar-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ig-page .ig-comp-sidebar > .ig-comp-sidebar-rail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}`;

/* ─────────────────────────────────────────
   COMBINED CSS EXPORT
───────────────────────────────────────── */

export const COMPOSITION_CSS = [
  STACK_CSS,
  TWO_COL_EQUAL_CSS,
  HERO_GRID_CSS,
  DASHBOARD_CSS,
  QUADRANT_CSS,
  SIDEBAR_CSS,
].join('\n');

/* ─────────────────────────────────────────
   HELPER — extract r,g,b from a hex color
───────────────────────────────────────── */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/* ─────────────────────────────────────────
   INDIVIDUAL APPLY FUNCTIONS
───────────────────────────────────────── */

/** stack — vertical flex column */
function applyStack(sections) {
  const cells = sections.join('\n');
  return `<div class="ig-comp-stack">${cells}</div>`;
}

/** two-col-equal — CSS grid 1fr 1fr */
function applyTwoColEqual(sections) {
  const cells = sections.join('\n');
  return `<div class="ig-comp-two-col">${cells}</div>`;
}

/**
 * hero-grid — first section spans full width, remainder in a 2-col grid.
 * Works with any number of sections (≥1).
 */
function applyHeroGrid(sections) {
  const [first, ...rest] = sections;
  const heroCell = `<div class="ig-comp-hero-first">${first}</div>`;
  const restCells = rest.join('\n');
  return `<div class="ig-comp-hero-grid">${heroCell}${restCells}</div>`;
}

/**
 * dashboard — first section → full-width top, last section → full-width bottom,
 * all middle sections → 2-col grid.
 *
 * With 1 section: just top.
 * With 2 sections: top + bottom (no middle).
 * With 3+ sections: top + middle-grid + bottom.
 */
function applyDashboard(sections) {
  if (sections.length === 0) return '';
  if (sections.length === 1) {
    return `<div class="ig-comp-dashboard">
      <div class="ig-comp-dashboard-top">${sections[0]}</div>
    </div>`;
  }
  if (sections.length === 2) {
    return `<div class="ig-comp-dashboard">
      <div class="ig-comp-dashboard-top">${sections[0]}</div>
      <div class="ig-comp-dashboard-bottom">${sections[1]}</div>
    </div>`;
  }
  // 3+: first → top, last → bottom, middle → 2-col grid
  const top    = sections[0];
  const bottom = sections[sections.length - 1];
  const middles = sections.slice(1, sections.length - 1).join('\n');
  return `<div class="ig-comp-dashboard">
    <div class="ig-comp-dashboard-top">${top}</div>
    <div class="ig-comp-dashboard-middle">${middles}</div>
    <div class="ig-comp-dashboard-bottom">${bottom}</div>
  </div>`;
}

/**
 * quadrant — up to 4 sections in a 2×2 grid.
 * Each cell gets a distinct background tint computed from the accent color.
 * The accent color is encoded into inline styles so it works without CSS vars.
 *
 * If fewer than 4 sections, remaining cells are empty.
 * If more than 4, extras are appended below.
 */
function applyQuadrant(sections, accentColor) {
  // Compute tints from accent color (fallback to blue)
  let r = 37, g = 99, b = 235;
  if (accentColor) {
    try {
      const rgb = hexToRgb(accentColor);
      r = rgb.r; g = rgb.g; b = rgb.b;
    } catch (_) { /* use defaults */ }
  }
  const opacities = [0.08, 0.12, 0.16, 0.20];
  const quadClasses = ['ig-comp-q0', 'ig-comp-q1', 'ig-comp-q2', 'ig-comp-q3'];

  const first4 = sections.slice(0, 4);
  const extras = sections.slice(4);

  const cells = first4.map((s, i) => {
    const opacity = opacities[i] ?? 0.08;
    const bg = `rgba(${r},${g},${b},${opacity})`;
    return `<div class="${quadClasses[i]}" style="background:${bg};">${s}</div>`;
  }).join('\n');

  // Pad to 4 if fewer sections provided
  const padding = Array.from({ length: Math.max(0, 4 - first4.length) }, (_, i) =>
    `<div class="${quadClasses[first4.length + i]}"></div>`
  ).join('');

  const extraHtml = extras.length > 0
    ? `<div style="grid-column:1/-1;display:flex;flex-direction:column;gap:16px;">${extras.join('')}</div>`
    : '';

  return `<div class="ig-comp-quadrant">${cells}${padding}${extraHtml}</div>`;
}

/**
 * asymmetric-sidebar — first section → main column (70%),
 * remaining sections → sidebar column (30%).
 *
 * If only 1 section: full-width main, no sidebar.
 * If 2+ sections: first → main, rest → sidebar (stacked).
 */
function applyAsymmetricSidebar(sections) {
  if (sections.length === 0) return '';
  if (sections.length === 1) {
    return `<div class="ig-comp-sidebar-main">${sections[0]}</div>`;
  }
  const mainSection  = sections[0];
  const railSections = sections.slice(1).join('\n');
  return `<div class="ig-comp-sidebar">
    <div class="ig-comp-sidebar-main">${mainSection}</div>
    <div class="ig-comp-sidebar-rail">${railSections}</div>
  </div>`;
}

/* ─────────────────────────────────────────
   MAIN EXPORT — applyComposition
───────────────────────────────────────── */

/**
 * Apply a named composition pattern to an array of rendered section HTML strings.
 *
 * @param {string[]} sectionsHtml  — array of rendered section HTML strings
 * @param {string}   compositionId — 'stack' | 'two-col-equal' | 'hero-grid' | 'dashboard' | 'quadrant' | 'asymmetric-sidebar'
 * @param {object}  [opts]         — optional: { accentColor } for tint computation
 * @returns {string} HTML string
 */
export function applyComposition(sectionsHtml, compositionId, opts = {}) {
  if (!Array.isArray(sectionsHtml) || sectionsHtml.length === 0) return '';

  switch (compositionId) {
    case 'two-col-equal':
      return applyTwoColEqual(sectionsHtml);
    case 'hero-grid':
      return applyHeroGrid(sectionsHtml);
    case 'dashboard':
      return applyDashboard(sectionsHtml);
    case 'quadrant':
      return applyQuadrant(sectionsHtml, opts.accentColor);
    case 'asymmetric-sidebar':
      return applyAsymmetricSidebar(sectionsHtml);
    case 'stack':
    default:
      return applyStack(sectionsHtml);
  }
}

/* ─────────────────────────────────────────
   COMPOSITIONS MAP (metadata only)
   For introspection / UI rendering. CSS is in COMPOSITION_CSS above.
───────────────────────────────────────── */

export const COMPOSITIONS = {
  'stack': {
    id:   'stack',
    name: 'Stack (Vertical)',
    description: 'Sections stacked vertically — the default layout.',
  },
  'two-col-equal': {
    id:   'two-col-equal',
    name: 'Two Equal Columns',
    description: 'Two equal columns; sections alternate left and right.',
  },
  'hero-grid': {
    id:   'hero-grid',
    name: 'Hero + Grid',
    description: 'First section spans full width; remaining sections in a 2-column grid.',
  },
  'dashboard': {
    id:   'dashboard',
    name: 'Dashboard',
    description: 'Full-width KPI strip on top, 2-col body in the middle, full-width insight at the bottom.',
  },
  'quadrant': {
    id:   'quadrant',
    name: 'Quadrant',
    description: 'Four sections in a 2×2 grid, each with a distinct tinted background.',
  },
  'asymmetric-sidebar': {
    id:   'asymmetric-sidebar',
    name: 'Main + Sidebar',
    description: '70% main column on the left, 30% sidebar on the right.',
  },
};
