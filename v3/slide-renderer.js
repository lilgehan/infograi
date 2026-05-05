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

function zoneStackGap(/* count */) {
  // Section 12.2 Rule 1 — diagrams sit flush. No default gaps. Space
  // between diagrams only appears when the user drags one to create it.
  return '0px';
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

  // Text blocks (free-text, no variant) — Section 12 Rule 6.
  // Always contenteditable so clicks route to caret placement. NO visible
  // placeholder text — empty text blocks collapse to zero height via CSS
  // and only show the browser's caret when focused. Text blocks have no
  // interaction UI layer (no grab bar, no resize handles, no toolbar) —
  // they are edit-only.
  if (block.type === 'text') {
    const text = (block.items && block.items[0] && block.items[0].body) || '';
    return `<div class="igs-block igs-block-wrapper igs-text-block" ` +
           `data-block-id="${esc(block.id)}" contenteditable="true">${esc(text)}</div>`;
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

  // Phase 3 Unified Interaction — Section D of SLIDE-DECK-PHASE3-UNIFIED-PROMPT.
  // The wrapper has two children, exactly:
  //   .igs-block-content — holds ONLY the diagram. Text inside here is
  //                        contenteditable. No interaction UI mixed in.
  //   .igs-block-ui      — holds ALL interaction UI (grab bar, 8 resize
  //                        handles, toolbar). Shown/hidden as a unit via
  //                        .igs-hover / .igs-selected on the wrapper. NEVER
  //                        contains contenteditable elements.
  // The toolbar lives inside the wrapper (not in document.body) so its
  // position scales with the slide and clicks on it never leave the block.
  return `<div class="igs-block igs-block-wrapper" data-block-id="${esc(block.id)}">` +
           `<div class="igs-block-content"><div class="ig-page">${inner}</div></div>` +
           `<div class="igs-block-ui" aria-hidden="true">` +
             `<div class="igs-grab-bar" title="Drag to reorder">` +
               `<div class="igs-grab-bar-line"></div>` +
               `<div class="igs-grab-bar-line"></div>` +
               `<div class="igs-grab-bar-line"></div>` +
             `</div>` +
             `<div class="igs-resize-handle" data-handle="nw"></div>` +
             `<div class="igs-resize-handle" data-handle="n"></div>` +
             `<div class="igs-resize-handle" data-handle="ne"></div>` +
             `<div class="igs-resize-handle" data-handle="e"></div>` +
             `<div class="igs-resize-handle" data-handle="se"></div>` +
             `<div class="igs-resize-handle" data-handle="s"></div>` +
             `<div class="igs-resize-handle" data-handle="sw"></div>` +
             `<div class="igs-resize-handle" data-handle="w"></div>` +
             `<div class="igs-block-toolbar">` +
               `<button type="button" data-action="replace" title="Replace with another diagram">` +
                 `<svg viewBox="0 0 24 24"><path d="M7 7h10l-3-3M17 17H7l3 3"/></svg>` +
                 `Replace` +
               `</button>` +
               `<button type="button" data-action="delete" title="Delete this diagram">` +
                 `<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/></svg>` +
                 `Delete` +
               `</button>` +
             `</div>` +
           `</div>` +
         `</div>`;
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

  // Phase 3 bug fix — slots no longer get fixed height percentages. Blocks
  // size to their natural content height (flex: 0 0 auto), so the selection
  // outline hugs the diagram tightly with no empty space below.
  const items = blocks.map((b) =>
    `<div class="igs-block-slot">${renderBlock(b, tone)}</div>`
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

  // Hero / special title blocks (A2, A3, A4, E1, E2, E6).
  // Phase 3 Unified Interaction — every text element on every template is
  // contenteditable. The hero H1, subtitle, and CTA button text all become
  // editable here. Placeholder text is rendered via CSS attr() when empty.
  // Defaults are applied only when slide.title / slide.subtitle / slide.ctaLabel
  // are not set; once the user types, the real value lives in the data model.
  const titleText    = (slide.title    !== undefined && slide.title    !== null) ? slide.title    : defaultTitleFor(zoneType);
  const subtitleText = (slide.subtitle !== undefined && slide.subtitle !== null) ? slide.subtitle : defaultSubtitleFor(zoneType);
  const titlePh      = defaultTitleFor(zoneType);
  const subtitlePh   = defaultSubtitleFor(zoneType);

  let extras = '';
  if (zoneType === 'cta-block') {
    const ctaText = (slide.ctaLabel !== undefined && slide.ctaLabel !== null) ? slide.ctaLabel : 'Get Started';
    // The <a> element keeps its visual button styling but is NOT contenteditable
    // itself (the spec says interaction UI elements must never be contenteditable).
    // The text inside is contenteditable via a span wrapper, so clicks on the
    // text place a caret while clicks on the button background still trigger
    // the default link behavior.
    extras = `<a class="igs-cta-button" href="#" onclick="return false;">` +
               `<span class="igs-cta-text" ` +
                     `contenteditable="true" ` +
                     `data-edit-role="slide-cta" ` +
                     `data-placeholder="Get Started">${esc(ctaText)}</span>` +
             `</a>`;
  }

  const titleHtml = `<h1 class="igs-slide-title" ` +
                       `contenteditable="true" ` +
                       `data-edit-role="slide-title" ` +
                       `data-placeholder="${esc(titlePh)}">${esc(titleText)}</h1>`;

  const subtitleHtml = (subtitlePh || subtitleText)
    ? `<p class="igs-slide-subtitle" ` +
          `contenteditable="true" ` +
          `data-edit-role="slide-subtitle" ` +
          `data-placeholder="${esc(subtitlePh || '')}">${esc(subtitleText)}</p>`
    : '';

  return `
    ${titleHtml}
    ${subtitleHtml}
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

/* Section 12.2 Rule 1 — flush stacking. All density tiers stack with
   zero gap by default. Gaps appear only via user drag (Phase 3.5). */
.igs-block-stack[data-density="light"]    { gap: 0; }
.igs-block-stack[data-density="standard"] { gap: 0; }
.igs-block-stack[data-density="dense"]    { gap: 0; }
.igs-block-slot {
  flex: 0 0 auto;
  min-height: 0;
  display: flex;
  /* overflow:visible so the drag handle (top:-12px) and selection outline
     (outline-offset:8px) are not clipped. The block itself owns its own
     overflow:hidden when needed. */
  overflow: visible;
}
.igs-block {
  flex: 0 0 auto;          /* hug content, no extra empty space below */
  width: 100%;
  min-width: 0;
}
.igs-block .ig-page {
  width: 100%;
}

/* ── Phase 3 Unified Interaction — block content wrapper ──
   The diagram lives inside .igs-block-content. The interaction UI lives in
   a sibling .igs-block-ui layer. This separation guarantees that every
   contenteditable element is inside .igs-block-content and every grab bar /
   resize handle / toolbar is inside .igs-block-ui — they never overlap in
   the DOM tree, so clicks unambiguously route to the right handler. ── */
.igs-block-content {
  width: 100%;
  display: block;
  min-width: 0;
  /* No padding, no margin — the diagram inside owns its own spacing. */
}

/* ── Slide boundary flash (Section 12.4 Rule 5) ──
   Triggered when an Enter keystroke would push content past the slide
   bottom edge. The handler adds .igs-boundary-flash to the slide element
   for ~400ms; this overlay paints a 3px red border along the bottom. ── */
.igs-slide.igs-boundary-flash::after {
  content: '';
  position: absolute;
  inset: 0;
  border-bottom: 3px solid rgba(220, 38, 38, 0.65);
  border-radius: 4px;
  pointer-events: none;
  animation: igs-boundary-fade 420ms ease-out forwards;
}
@keyframes igs-boundary-fade {
  0%   { opacity: 1; }
  100% { opacity: 0; }
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
