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
   ZONE RENDERING + ADAPTIVE SPACING (Section 6.5)
───────────────────────────────────────── */

/**
 * Compute the height percentage and stack-gap CSS for a zone given how many
 * blocks it contains. Returns the CSS for the zone's flex layout.
 *
 * Heights are tighter at higher densities to leave more breathing room when
 * a zone is light, per Section 6.5. The gap is also density-aware.
 */
function zoneStackHeights(count) {
  if (count <= 1) return ['100%'];
  if (count === 2) return ['48.5%', '48.5%'];
  // 3 blocks (max enforced)
  return ['31%', '31%', '31%'];
}

function zoneStackGap(count) {
  if (count <= 1) return '0px';
  if (count === 2) return '16px';   // standard
  return '12px';                    // dense
}

/**
 * Phase 6.5 — Density tier per zone. Drives padding/gap/font-size adaptation.
 *   0 blocks → 'empty'
 *   1 block  → 'light'
 *   2 blocks → 'standard'
 *   3 blocks → 'dense'
 */
function zoneDensity(count) {
  if (count <= 0) return 'empty';
  if (count === 1) return 'light';
  if (count === 2) return 'standard';
  return 'dense';
}

/**
 * Phase 6.5 — Auto-balance hint. When one content zone in a multi-column
 * template carries fewer blocks than its sibling, the lighter zone gets
 * `data-balance="center"` so its block stack vertically centers. This
 * creates visual balance instead of top-aligning a single diagram against
 * a stack of two.
 *
 * @param {object} slide
 * @param {string} zoneName
 * @param {Array}  contentZoneNames — every content-typed zone on the template
 * @returns {'top'|'center'}
 */
function zoneBalance(slide, zoneName, contentZoneNames) {
  if (!contentZoneNames || contentZoneNames.length < 2) return 'top';
  const myCount = blocksInZone(slide, zoneName).length;
  if (myCount === 0) return 'top';
  // Find max sibling count (not including this zone)
  let maxOther = 0;
  for (const other of contentZoneNames) {
    if (other === zoneName) continue;
    const c = blocksInZone(slide, other).length;
    if (c > maxOther) maxOther = c;
  }
  // Center if this zone has strictly fewer blocks than a sibling
  return (myCount < maxOther) ? 'center' : 'top';
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
  if (!block) return '';

  // Text blocks (free-text, no variant) — Phase 3C
  if (block.type === 'text') {
    const text = (block.items && block.items[0] && block.items[0].body) || '';
    return `<div class="igs-block igs-text-block" data-block-id="${esc(block.id)}">${esc(text)}</div>`;
  }

  // Diagrams without a variant can't render
  if (!block.variant) return '';

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
  // Outer .igs-block carries the height assignment + the block id used by
  // the Phase 3C cursor system to map text edits back to the data model.
  return `<div class="igs-block" data-block-id="${esc(block.id)}"><div class="ig-page">${inner}</div></div>`;
}

/**
 * Render a content zone — fills it with stacked blocks per position.order.
 * Capped at 3 blocks visible (extras are dropped silently in Phase 1+2).
 *
 * The block stack carries `data-density` (light/standard/dense) so CSS in
 * DECK_LAYOUT_CSS can tighten the gap, padding, and font sizes per
 * Section 6.5.
 */
function renderContentZone(slide, zoneName, tone) {
  const blocks = blocksInZone(slide, zoneName).slice(0, 3);
  if (blocks.length === 0) return '';

  const heights = zoneStackHeights(blocks.length);
  const gap     = zoneStackGap(blocks.length);
  const density = zoneDensity(blocks.length);

  const items = blocks.map((b, i) =>
    `<div class="igs-block-slot" style="height:${heights[i]};">${renderBlock(b, tone)}</div>`
  ).join('');

  return `<div class="igs-block-stack" data-density="${density}" style="gap:${gap};">${items}</div>`;
}

/**
 * Render a title-block zone (A2 / A3 / A4 / E1 / E2 / E6 / C5+C6+D3+D4 headers,
 * plus the new Phase 3A title rows on C1-C4, D1, D2, E3).
 * Pulls slide.title and slide.subtitle.
 *
 * For the new compact title zones (full-width row above column templates,
 * zone names "title" or "header" with type "title-block"), we render an
 * H2 with `.is-placeholder` class when the title is empty, so the cursor
 * system can detect placeholder vs. real content on click.
 */
function renderTitleBlock(slide, zoneType, zoneName) {
  // Compact / standard title row (C1-C4, D1, D2, E3, C5, C6, D3, D4 headers)
  const isCompact = (zoneType === 'title-block') &&
                    (zoneName === 'title' || zoneName === 'header');
  if (isCompact) {
    // Phase 3C — Invisible editing. The H2 is always contenteditable; the
    // placeholder is rendered via CSS attr() when the H2 is empty. No mode
    // toggle, no JS placeholder management.
    const titleText = (slide.title || '').trim();
    return `
      <div class="igs-zone-title" data-zone="title">
        <h2 class="igs-slide-title"
            contenteditable="true"
            data-edit-role="slide-title"
            data-placeholder="Click to add title">${esc(titleText)}</h2>
      </div>
    `;
  }

  // Hero / special title blocks (A2, A3, A4, E1, E2, E6, A4 closing, etc.)
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

/**
 * Render the inline title element for B1-B6 / E5 (templates with
 * inlineTitle: true). This is prepended inside the content zone before
 * the block stack. Uses the same compact title styling as full-width
 * title rows.
 */
function renderInlineTitle(slide) {
  // Phase 3C — Invisible editing. Always contenteditable, CSS handles placeholder.
  const titleText = (slide.title || '').trim();
  return `
    <div class="igs-zone-title" data-zone="title">
      <h2 class="igs-slide-title"
          contenteditable="true"
          data-edit-role="slide-title"
          data-placeholder="Click to add title">${esc(titleText)}</h2>
    </div>
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

  // For inline-title templates (B1-B6, E5), the title element is prepended
  // inside the FIRST content-typed zone. Track which zone gets it.
  const inlineTitle = !!tpl.inlineTitle;
  const firstContentZoneName = inlineTitle
    ? (tpl.zones.find(z => z.type === 'content') || {}).name
    : null;

  // Phase 6.5 — Auto-balance: collect every content-typed zone name so the
  // balance helper can compare block counts across siblings.
  const contentZoneNames = tpl.zones
    .filter(z => z.type === 'content')
    .map(z => z.name);

  const zonesHtml = tpl.zones.map(zoneMeta => {
    const isAccent = zoneMeta.type === 'accent';
    const cls = isAccent ? 'igs-zone igs-zone-accent' : 'igs-zone igs-zone-content';

    // Phase 6.5 — density + balance attributes. Drive padding/gap/centering
    // via CSS rather than computing pixels per template.
    let densityAttr = '';
    let balanceAttr = '';
    if (zoneMeta.type === 'content') {
      const count   = blocksInZone(slide, zoneMeta.name).length;
      const density = zoneDensity(count);
      const balance = zoneBalance(slide, zoneMeta.name, contentZoneNames);
      densityAttr = ` data-density="${density}"`;
      balanceAttr = ` data-balance="${balance}"`;
    }

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
      inner = renderTitleBlock(slide, zoneMeta.type, zoneMeta.name);
    } else {
      // Plain content zone — render any blocks placed here.
      // For inline-title templates, prepend the title element to the first content zone.
      const stackHtml = renderContentZone(slide, zoneMeta.name, tone);
      if (inlineTitle && zoneMeta.name === firstContentZoneName) {
        inner = renderInlineTitle(slide) + stackHtml;
      } else {
        inner = stackHtml;
      }
    }

    return `<div class="${cls}" data-zone="${esc(zoneMeta.name)}" data-zone-type="${esc(zoneMeta.type)}"${densityAttr}${balanceAttr}>${inner}</div>`;
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

/* ── Block stack: vertical flex with computed gap ──
   flex: 1 1 auto so it fills the remaining height after any inline title
   above it (Phase 3A). Falls back to filling the whole content zone when
   there's no title. ── */
.igs-block-stack {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
}

/* ── Phase 6.5 — Adaptive Spacing ──
   Density attributes set on .igs-zone-content drive padding and font scale.
   Density attributes on .igs-block-stack drive the gap between stacked
   diagrams. Light = 1 diagram, generous; standard = 2 diagrams; dense =
   3 diagrams. ── */
.igs-zone-content[data-density="light"] {
  padding: 6% 8%;
}
.igs-zone-content[data-density="standard"] {
  padding: 5% 5%;
}
.igs-zone-content[data-density="dense"] {
  padding: 3% 3%;
}
.igs-zone-content[data-density="empty"] {
  /* keep default 27px 48px so an empty zone still looks like a real zone */
}
/* Light density: bump diagram font scale up 2px via CSS variable.
   Standard: baseline. Dense: -1px. Smart-layouts read no such variable, but
   we apply font-size scaling to common text classes used by all variants
   so the visual breathes appropriately. */
.igs-zone-content[data-density="light"] .ig-page {
  font-size: calc(1em + 2px);
}
.igs-zone-content[data-density="dense"] .ig-page {
  font-size: calc(1em - 1px);
}

/* Auto-balance: when one zone in a multi-column template has a single
   diagram and a sibling has more, vertically center the lighter zone's
   stack so the slide doesn't look top-heavy. */
.igs-zone-content[data-balance="center"] > .igs-block-stack {
  justify-content: center;
}

/* Block stack gap by density (overrides the inline `gap` style only when
   the inline value matches — kept on the element for SSR safety). */
.igs-block-stack[data-density="light"]    { gap: 24px; }
.igs-block-stack[data-density="standard"] { gap: 16px; }
.igs-block-stack[data-density="dense"]    { gap: 12px; }
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
/* ── Thumbnail panel cells (slim — sized for ~60px panel) ── */
.igs-thumb-wrap {
  width: 50px;
  height: 28px;
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 3px;
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
  transform: scale(0.052);   /* 50 / 960 */
  transform-origin: top left;
  pointer-events: none;
}
.igs-thumb-wrap .igs-slide {
  pointer-events: none;
}
.igs-thumb-label {
  position: absolute;
  left: 2px;
  top: 2px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 8px;
  padding: 0 4px;
  border-radius: 2px;
  font-weight: 600;
  pointer-events: none;
  line-height: 1.4;
}

/* ── Slide canvas wrapper + stage ──
   .igs-canvas-wrap fills the entire #outputWrap area and centers the stage.
   .igs-slide-stage has its width/height set in JS to match the available
   canvas at 16:9. The slide inside is at native 960×540 and is visually
   scaled via CSS transform to fit the stage exactly. ── */
.igs-canvas-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #E6E9EF;
  box-sizing: border-box;
  overflow: hidden;
}
.igs-slide-stage {
  position: relative;
  flex-shrink: 0;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
  /* width / height are set inline by fitSlideStage() in slide-deck-ui.js */
}
.igs-canvas-wrap .igs-slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 960px;   /* native — JS sets transform: scale(...) on this element */
  height: 540px;
  transform-origin: top left;
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
