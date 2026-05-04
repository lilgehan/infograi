/**
 * Infogr.ai v3 — Slide Renderer (Phase 1)
 *
 * Composes a slide template + its blocks into final HTML.
 *
 * For each block:
 *   - diagram blocks → renderSection() from smart-layouts.js (which auto-dispatches
 *     to either renderBoxes/.../renderSteps OR to renderDiagramSection for the
 *     6 diagram families).
 *   - text blocks → simple paragraph HTML (Phase 1 placeholder).
 *
 * Block stacking inside a single zone:
 *   1 block  → 100% height
 *   2 blocks → 48.5% / 3% gap / 48.5%
 *   3 blocks → 31% / 3% / 31% / 3% / 31%
 *   4+       → only the first 3 are rendered (per SLIDE-DECK-PLAN.md Section 4 Rule 4)
 *
 * Diagram blocks are wrapped in `<div class="ig-page igs-block">...</div>` so the
 * existing `.ig-page .igs-* / .igd-*` smart-layout CSS applies inside the slide.
 * Local overrides drop the .ig-page page-level rules (height:100%, flex-column).
 *
 * Reference: SLIDE-DECK-PLAN.md Sections 3 + 4
 */

import {
  renderSection,
  BOXES_CSS, BULLETS_CSS, SEQUENCE_CSS, NUMBERS_CSS,
  CIRCLES_CSS, QUOTES_CSS, STEPS_CSS,
} from './smart-layouts.js';
import { DIAGRAM_CSS } from './smart-diagrams.js';
import { GRID_CSS } from './grid.js';
import { TEMPLATES, TEMPLATE_CSS, getTemplateZones } from './slide-templates.js';
import { blocksInZone } from './slide-deck.js';

/* ─────────────────────────────────────────
   ESCAPE HELPER
───────────────────────────────────────── */

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────────
   ZONE RENDERING
───────────────────────────────────────── */

/**
 * Compute the height percentage and stack-gap CSS for a zone given how many
 * blocks it contains. Returns the CSS for the zone's flex layout.
 */
function zoneStackHeights(count) {
  if (count <= 1) return ['100%'];
  if (count === 2) return ['48.5%', '48.5%'];
  // 3 blocks (max enforced)
  return ['31%', '31%', '31%'];
}

function zoneStackGap(count) {
  if (count <= 1) return '0px';
  return '3%';
}

/**
 * Render a single block as HTML. Diagram blocks go through the existing
 * renderSection() dispatch (which handles both layout variants and diagram
 * variants). Text blocks render as a simple paragraph.
 *
 * @param {object} block
 * @param {string} tone
 * @returns {string}
 */
function renderBlock(block, tone) {
  if (!block || !block.variant) return '';

  if (block.type === 'text') {
    const text = (block.items && block.items[0] && block.items[0].body) || '';
    return `<div class="igs-block igs-text-block">${esc(text)}</div>`;
  }

  // Diagram / chart blocks: use renderSection from smart-layouts.js.
  // It accepts a "section" object — same shape as content-v1 sections.
  const section = {
    archetype: block.archetype || 'catalog',
    variant:   block.variant,
    items:     Array.isArray(block.items) ? block.items : [],
    columns:   block.columns || 3,
    density:   block.density || 'standard',
    style:     block.style   || block.density || 'standard',
  };

  const inner = renderSection(section, tone);
  // Wrap in .ig-page so existing `.ig-page .igs-* / .igd-*` CSS applies.
  // Outer .igs-block carries the height assignment.
  return `<div class="igs-block"><div class="ig-page">${inner}</div></div>`;
}

/**
 * Render a content zone — fills it with stacked blocks per position.order.
 * Capped at 3 blocks visible (extras are dropped silently in Phase 1+2).
 */
function renderContentZone(slide, zoneName, tone) {
  const blocks = blocksInZone(slide, zoneName).slice(0, 3);
  if (blocks.length === 0) return '';

  const heights = zoneStackHeights(blocks.length);
  const gap     = zoneStackGap(blocks.length);

  const items = blocks.map((b, i) =>
    `<div class="igs-block-slot" style="height:${heights[i]};">${renderBlock(b, tone)}</div>`
  ).join('');

  return `<div class="igs-block-stack" style="gap:${gap};">${items}</div>`;
}

/**
 * Render a title-block zone (A2 / A3 / A4 / E1 / E2 / E6 / C5+C6+D3+D4 headers).
 * Pulls slide.title and slide.subtitle. Each zone-type can layer in extras.
 */
function renderTitleBlock(slide, zoneType) {
  const title    = slide.title    || defaultTitleFor(zoneType);
  const subtitle = slide.subtitle || defaultSubtitleFor(zoneType);

  let extras = '';
  if (zoneType === 'cta-block') {
    const cta = slide.ctaLabel || 'Get Started';
    extras = `<a class="igs-cta-button" href="#" onclick="return false;">${esc(cta)}</a>`;
  }

  return `
    <h1 class="igs-slide-title">${esc(title)}</h1>
    ${subtitle ? `<p class="igs-slide-subtitle">${esc(subtitle)}</p>` : ''}
    ${extras}
  `;
}

function defaultTitleFor(zoneType) {
  switch (zoneType) {
    case 'big-number':    return '90%';
    case 'quote-block':   return 'Your quote here.';
    case 'cta-block':     return 'Ready to get started?';
    case 'closing-block': return 'Thank You';
    default:              return 'Your Title Here';
  }
}

function defaultSubtitleFor(zoneType) {
  switch (zoneType) {
    case 'big-number':    return 'Improvement metric';
    case 'quote-block':   return 'Source / Attribution';
    case 'cta-block':     return '';
    case 'closing-block': return 'Questions? lily@gehantech.com';
    default:              return '';
  }
}

/* ─────────────────────────────────────────
   SLIDE RENDERING
───────────────────────────────────────── */

/**
 * Render a single slide as an HTML fragment. Note: this is a fragment, not a
 * full HTML document — the deck-mode container injects DECK_MODE_CSS once
 * for the entire deck.
 *
 * @param {object} slide
 * @param {string} [theme]
 * @param {string} [accentColor]
 * @returns {string} HTML fragment
 */
export function renderSlide(slide, theme, accentColor) {
  const tone = theme || 'professional';
  const tpl  = TEMPLATES[slide.templateId] || TEMPLATES.A1;

  const zonesHtml = tpl.zones.map(zoneMeta => {
    const isAccent = zoneMeta.type === 'accent';
    const cls = isAccent ? 'igs-zone igs-zone-accent' : 'igs-zone igs-zone-content';

    let inner;
    if (isAccent) {
      inner = `<div class="igs-accent-placeholder">Image will appear here</div>`;
    } else if (
      zoneMeta.type === 'title-block'    ||
      zoneMeta.type === 'closing-block'  ||
      zoneMeta.type === 'big-number'     ||
      zoneMeta.type === 'quote-block'    ||
      zoneMeta.type === 'cta-block'      ||
      zoneMeta.type === 'overlay'
    ) {
      inner = renderTitleBlock(slide, zoneMeta.type);
    } else {
      // Plain content zone — render any blocks placed here
      inner = renderContentZone(slide, zoneMeta.name, tone);
    }

    return `<div class="${cls}" data-zone="${esc(zoneMeta.name)}" data-zone-type="${esc(zoneMeta.type)}">${inner}</div>`;
  }).join('');

  return `<div class="igs-slide" data-template="${esc(slide.templateId)}" data-slide-id="${esc(slide.id)}">${zonesHtml}</div>`;
}

/**
 * Render every slide in a deck. Returns an array of HTML fragments —
 * the UI shell decides whether to display one at a time (canvas) or all
 * at once (thumbnail panel).
 *
 * @param {object} deck
 * @returns {string[]}
 */
export function renderDeck(deck) {
  if (!deck || !Array.isArray(deck.slides)) return [];
  return deck.slides.map(s => renderSlide(s, deck.theme, deck.accentColor));
}

/* ─────────────────────────────────────────
   DECK-MODE CSS
   Injected once into the deck-mode container.
   Bundles every layout / diagram / grid CSS so diagrams render correctly
   inside slide content zones, plus deck-specific layout overrides.
───────────────────────────────────────── */

const DECK_LAYOUT_CSS = `
/* ── .ig-page used as a scoping wrapper inside a slide zone:
   drop the page-level layout rules (height:100%, flex-column, etc.)
   that come from the single-page renderer's CONTENT_LAYOUT_CSS. ── */
.igs-zone .ig-page {
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  display: block !important;
  overflow: visible !important;
  padding: 0 !important;
  margin: 0 !important;
  background: transparent;
}
.igs-zone .ig-page > .ig-content-section,
.igs-zone .ig-content-section {
  padding: 0 !important;
  margin: 0 !important;
}

/* ── Block stack: vertical flex with computed gap ── */
.igs-block-stack {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}
.igs-block-slot {
  flex: 0 0 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
}
.igs-block {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.igs-block .ig-page {
  width: 100%;
}

/* ── Text block ── */
.igs-text-block {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 16px;
  line-height: 1.55;
  color: var(--text-primary, #1A1A2E);
  white-space: pre-wrap;
}

/* ── Thumbnail container & gallery panel base styles ──
   These belong in styles.css too, but live here as a single source of truth
   for the deck mode visual contract. ── */
.igs-thumb-wrap {
  width: 120px;
  height: 67.5px;
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 4px;
  background: #ffffff;
  cursor: pointer;
  flex-shrink: 0;
}
.igs-thumb-wrap.is-active {
  border-color: var(--accent, #2563EB);
  box-shadow: 0 0 0 2px var(--accent-soft, rgba(37,99,235,0.20));
}
.igs-thumb-inner {
  position: absolute;
  top: 0;
  left: 0;
  width: 960px;
  height: 540px;
  transform: scale(0.125);
  transform-origin: top left;
  pointer-events: none;
}
.igs-thumb-wrap .igs-slide {
  pointer-events: none;
}
.igs-thumb-label {
  position: absolute;
  left: 4px;
  top: 4px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 600;
  pointer-events: none;
}

/* ── Slide canvas wrapper (centers the slide in #editCanvas) ── */
.igs-canvas-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #E6E9EF;
  padding: 32px;
  box-sizing: border-box;
}
.igs-canvas-wrap .igs-slide {
  box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
  border-radius: 4px;
}
`;

export const DECK_MODE_CSS = [
  TEMPLATE_CSS,
  BOXES_CSS,
  BULLETS_CSS,
  SEQUENCE_CSS,
  NUMBERS_CSS,
  CIRCLES_CSS,
  QUOTES_CSS,
  STEPS_CSS,
  DIAGRAM_CSS,
  GRID_CSS,
  DECK_LAYOUT_CSS,
].join('\n');

/**
 * Convenience: returns the full HTML head <style> block needed to render
 * any deck slide. Useful for previewing or testing.
 */
export function getDeckModeStyleTag() {
  return `<style data-deck-mode-css="true">${DECK_MODE_CSS}</style>`;
}
