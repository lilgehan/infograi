/**
 * Infogr.ai v3 — Slide Page Templates (Phase 1)
 *
 * 26 page templates organized into 5 categories:
 *   A — Blank & Full-Width      (4)
 *   B — Accent Image Templates  (6)
 *   C — Column Layouts          (6)
 *   D — Mixed Image + Content   (4)
 *   E — Special Purpose         (6)
 *
 * Each template defines named zones (content, accent, header, etc.) where
 * blocks (diagrams, text, charts) get placed by slide-renderer.js.
 *
 * All CSS scoped to `.igs-slide` (independent of `.ig-page .igs-*` smart-layout CSS).
 *
 * Reference dimensions: 960 × 540 px (16:9). All zone percentages are
 * relative to the slide. Outer slide padding is handled per-template
 * (most use 5% padding on content zones, accent zones bleed to edge).
 *
 * Reference: SLIDE-DECK-PLAN.md Section 3.2
 */

/* ─────────────────────────────────────────
   TEMPLATE METADATA
   Used by the template picker and zone-aware rendering.
───────────────────────────────────────── */

export const TEMPLATES = {
  /* ── A — Blank & Full-Width ──────────────── */
  A1: { id: 'A1', name: 'Blank',           category: 'A', zones: [{ name: 'content', type: 'content' }] },
  A2: { id: 'A2', name: 'Title Slide',     category: 'A', zones: [{ name: 'content', type: 'title-block' }] },
  A3: { id: 'A3', name: 'Section Divider', category: 'A', zones: [{ name: 'content', type: 'title-block' }] },
  A4: { id: 'A4', name: 'Closing',         category: 'A', zones: [{ name: 'content', type: 'closing-block' }] },

  /* ── B — Accent Image Templates ──────────── */
  /* All B-templates carry an inline title at the top of their content zone
     (Phase 3A). The zone CSS-grid layout itself does not change — the title
     element is rendered as the first child of .igs-zone-content via the
     renderer when `inlineTitle: true`. */
  B1: { id: 'B1', name: 'Accent Left',         category: 'B', inlineTitle: true, zones: [
    { name: 'accent',  type: 'accent' },
    { name: 'content', type: 'content' },
  ]},
  B2: { id: 'B2', name: 'Accent Right',        category: 'B', inlineTitle: true, zones: [
    { name: 'content', type: 'content' },
    { name: 'accent',  type: 'accent' },
  ]},
  B3: { id: 'B3', name: 'Accent Top',          category: 'B', inlineTitle: true, zones: [
    { name: 'accent',  type: 'accent' },
    { name: 'content', type: 'content' },
  ]},
  B4: { id: 'B4', name: 'Accent Bottom',       category: 'B', inlineTitle: true, zones: [
    { name: 'content', type: 'content' },
    { name: 'accent',  type: 'accent' },
  ]},
  B5: { id: 'B5', name: 'Accent Left Narrow',  category: 'B', inlineTitle: true, zones: [
    { name: 'accent',  type: 'accent' },
    { name: 'content', type: 'content' },
  ]},
  B6: { id: 'B6', name: 'Accent Right Narrow', category: 'B', inlineTitle: true, zones: [
    { name: 'content', type: 'content' },
    { name: 'accent',  type: 'accent' },
  ]},

  /* ── C — Column Layouts ──────────────────── */
  /* C1-C4 carry a full-width title row above the columns (Phase 3A).
     C5 and C6 already had explicit `header` zones — those stay as-is. */
  C1: { id: 'C1', name: 'Two Columns Equal',     category: 'C', zones: [
    { name: 'title', type: 'title-block' },
    { name: 'left',  type: 'content' }, { name: 'right', type: 'content' },
  ]},
  C2: { id: 'C2', name: 'Two Columns Wide-Left', category: 'C', zones: [
    { name: 'title', type: 'title-block' },
    { name: 'left',  type: 'content' }, { name: 'right', type: 'content' },
  ]},
  C3: { id: 'C3', name: 'Two Columns Wide-Right', category: 'C', zones: [
    { name: 'title', type: 'title-block' },
    { name: 'left',  type: 'content' }, { name: 'right', type: 'content' },
  ]},
  C4: { id: 'C4', name: 'Three Columns',         category: 'C', zones: [
    { name: 'title', type: 'title-block' },
    { name: 'col1', type: 'content' }, { name: 'col2', type: 'content' }, { name: 'col3', type: 'content' },
  ]},
  C5: { id: 'C5', name: 'Two Columns + Header',  category: 'C', zones: [
    { name: 'header', type: 'title-block' }, { name: 'left', type: 'content' }, { name: 'right', type: 'content' },
  ]},
  C6: { id: 'C6', name: 'Three Columns + Header', category: 'C', zones: [
    { name: 'header', type: 'title-block' },
    { name: 'col1', type: 'content' }, { name: 'col2', type: 'content' }, { name: 'col3', type: 'content' },
  ]},

  /* ── D — Mixed Image + Content ───────────── */
  /* D1 and D2 carry a full-width title row above the image+columns area
     (Phase 3A). D3 and D4 already had `header` zones — those stay as-is. */
  D1: { id: 'D1', name: 'Image Left + Two Columns', category: 'D', zones: [
    { name: 'title', type: 'title-block' },
    { name: 'accent', type: 'accent' },
    { name: 'col1', type: 'content' }, { name: 'col2', type: 'content' },
  ]},
  D2: { id: 'D2', name: 'Image Right + Two Columns', category: 'D', zones: [
    { name: 'title', type: 'title-block' },
    { name: 'col1', type: 'content' }, { name: 'col2', type: 'content' },
    { name: 'accent', type: 'accent' },
  ]},
  D3: { id: 'D3', name: 'Header + Image Left + Content', category: 'D', zones: [
    { name: 'header', type: 'title-block' },
    { name: 'accent', type: 'accent' }, { name: 'content', type: 'content' },
  ]},
  D4: { id: 'D4', name: 'Header + Content Left + Image', category: 'D', zones: [
    { name: 'header', type: 'title-block' },
    { name: 'content', type: 'content' }, { name: 'accent', type: 'accent' },
  ]},

  /* ── E — Special Purpose ─────────────────── */
  E1: { id: 'E1', name: 'Quote Slide',     category: 'E', zones: [{ name: 'content', type: 'quote-block' }] },
  E2: { id: 'E2', name: 'Big Number',      category: 'E', zones: [{ name: 'content', type: 'big-number' }] },
  E3: { id: 'E3', name: 'Comparison',      category: 'E', zones: [
    { name: 'title', type: 'title-block' },
    { name: 'left',  type: 'content' }, { name: 'right', type: 'content' },
  ]},
  E4: { id: 'E4', name: 'Full-Bleed Image', category: 'E', zones: [
    { name: 'accent', type: 'accent' }, { name: 'content', type: 'overlay' },
  ]},
  E5: { id: 'E5', name: 'Agenda / TOC',    category: 'E', inlineTitle: true, zones: [
    { name: 'content', type: 'content' }, { name: 'accent', type: 'accent' },
  ]},
  E6: { id: 'E6', name: 'Call to Action',  category: 'E', zones: [{ name: 'content', type: 'cta-block' }] },
};

/**
 * Returns the zone metadata array for a template id. Read-only.
 */
export function getTemplateZones(templateId) {
  const tpl = TEMPLATES[templateId];
  return tpl ? tpl.zones.slice() : [];
}

/* ─────────────────────────────────────────
   SLIDE TEMPLATE RENDERER
   Returns the empty skeleton HTML for a template.
   slide-renderer.js fills the zones with block HTML.
───────────────────────────────────────── */

const PLACEHOLDER_HTML =
  `<div class="igs-accent-placeholder">Image will appear here</div>`;

/**
 * Render the empty slide skeleton for a given template id.
 * Each zone is left empty — the slide-renderer fills them.
 *
 * @param {string} templateId
 * @param {string} [theme]   — currently unused; reserved for theme-specific variants
 * @returns {string} HTML
 */
export function renderSlideTemplate(templateId, theme) {
  const tpl = TEMPLATES[templateId];
  if (!tpl) return renderSlideTemplate('A1', theme);

  // Build inner zones HTML matching the template-specific zone names
  const zones = tpl.zones
    .map(z => {
      const isAccent = z.type === 'accent';
      const inner = isAccent ? PLACEHOLDER_HTML : '';
      const cls   = isAccent ? 'igs-zone igs-zone-accent' : 'igs-zone igs-zone-content';
      return `<div class="${cls}" data-zone="${z.name}" data-zone-type="${z.type}">${inner}</div>`;
    })
    .join('');

  return `<div class="igs-slide" data-template="${templateId}">${zones}</div>`;
}

/* ─────────────────────────────────────────
   TEMPLATE CSS
   Single string — injected once into the deck-mode container by
   slide-renderer.js (DECK_MODE_CSS bundle).
───────────────────────────────────────── */

export const TEMPLATE_CSS = `
/* ── Slide root + shared zone styles ─────────────────────── */
.igs-slide {
  position: relative;
  box-sizing: border-box;
  width: 960px;
  height: 540px;
  overflow: hidden;
  background: var(--card-bg, #ffffff);
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  color: var(--text-primary, #1A1A2E);
  line-height: 1.5;
}
.igs-zone {
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  min-width: 0;
  min-height: 0;
}
.igs-zone-content {
  padding: 27px 48px;
  display: flex;
  flex-direction: column;
}
.igs-zone-accent {
  background:
    linear-gradient(135deg, var(--accent-soft, rgba(37,99,235,0.10)) 0%, rgba(0,0,0,0.04) 100%),
    repeating-linear-gradient(45deg, rgba(0,0,0,0.02) 0 8px, transparent 8px 16px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.igs-accent-placeholder {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  font-style: italic;
  text-align: center;
  opacity: 0.65;
  letter-spacing: 0.02em;
  user-select: none;
  pointer-events: none;
}

/* ── Title-block zones (A2, A3, A4, C5, C6, D3, D4 headers) ── */
.igs-slide-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-weight: 700;
  font-size: 44px;
  line-height: 1.15;
  margin: 0 0 12px 0;
  color: var(--text-primary, #1A1A2E);
}
.igs-slide-subtitle {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-weight: 400;
  font-size: 20px;
  line-height: 1.4;
  margin: 0;
  color: var(--text-secondary, #6b7280);
}

/* ── Phase 3A — Title zones on B/C/D/E templates ──
   .igs-zone-title is the wrapper rendered either inline at the top of a
   content zone (B1-B6, E5) or as the standalone full-width title row
   (C1-C4, D1, D2, E3). It carries an H2 inside. The size is smaller
   than the special A2/A3 hero titles (28-32px range). */
.igs-zone-title {
  flex: 0 0 auto;
  width: 100%;
  /* Section 12.2 Rule 1 — the only default gap on a slide is the 16px
     below the title zone. Diagrams below stack flush against this. */
  margin-bottom: 16px;
}
.igs-zone .igs-slide-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
  outline: none;
  color: var(--text-primary, #1A1A2E);
  cursor: text;
}
/* Phase 3C — Invisible editing: placeholder via CSS attr(). The H2 is always
   contenteditable; when empty, this :empty::before injects the placeholder
   text. Disappears the moment the user types, with no JS bookkeeping.
   Slide titles SHOW the placeholder always (encourages interaction). */
.igs-slide-title[data-placeholder]:empty::before {
  content: attr(data-placeholder);
  color: #9aa3ad;
  font-style: italic;
  font-weight: 600;
  opacity: 0.75;
  pointer-events: none;
}
/* Section 12 Rule 6 + Fix 1 — Free-text and text blocks have NO visible
   placeholder text. When empty AND unfocused: zero-height, takes no
   space. When empty AND focused: just enough height to show the caret.
   When non-empty: natural content height. The user sees their typing
   appear directly with no "Type here" widget. */
.igs-slide .igs-free-text-temp:empty:not(:focus),
.igs-slide .igs-text-block:empty:not(:focus) {
  height: 0;
  padding: 0;
  margin: 0;
  overflow: hidden;
}
.igs-slide .igs-free-text-temp:empty:focus,
.igs-slide .igs-text-block:empty:focus {
  min-height: 1.5em;
}
/* Diagram-internal editable text (igs-* / igd-* classes inside .ig-page)
   uses the placeholder pattern when AI-generated content is missing. */
.igs-slide .ig-page [data-placeholder]:empty::before {
  content: attr(data-placeholder);
  color: #9aa3ad;
  font-style: italic;
  opacity: 0.65;
  pointer-events: none;
}
/* No focus ring on text edit — invisible editing means no "selected" affordance.
   The browser's native caret indicates editing position. */
.igs-slide-title[contenteditable="true"]:focus,
.igs-slide [contenteditable="true"]:focus {
  outline: none;
}
/* Ensure full-width title rows at top of column templates align nicely */
.igs-zone-content[data-zone="title"],
.igs-zone-content[data-zone="header"] {
  padding: 22px 48px 14px;
}
.igs-zone-content[data-zone="title"] .igs-zone-title,
.igs-zone-content[data-zone="header"] .igs-zone-title {
  margin-bottom: 0;
}

/* ══════════════════════════════════════════════════════════
   PHASE 8 WAVE 1 — EDITORIAL DESIGN SYSTEM
   Foundation primitives for premium deck templates: editorial-dark theme,
   eyebrow pills, corner brackets, numbered indices, background decoration.
   These are opt-in and additive — slides without data-tone="editorial-dark"
   render exactly as before.
   ══════════════════════════════════════════════════════════ */

/* ── Editorial-dark theme ──
   Dark navy canvas, warm cream text, accent stays user-controlled.
   Sets CSS variables on the slide root so all descendants (zones,
   blocks, diagrams, text) inherit the dark palette automatically.
   Accent color is whatever the user picked (default teal #14B8A6 in
   TONE_ACCENT_DEFAULTS in renderer.js). */
.igs-slide[data-tone="editorial-dark"] {
  background: #0E1620;
  color: #F4F1E8;
  --bg-page:       #0E1620;
  --text-primary:  #F4F1E8;
  --text-secondary: rgba(244, 241, 232, 0.65);
  --card-bg:       #14202B;
  --card-border:   rgba(244, 241, 232, 0.10);
  --divider:       rgba(244, 241, 232, 0.16);
}
/* Editorial-dark hero titles use a tighter editorial display weight. */
.igs-slide[data-tone="editorial-dark"] .igs-slide-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #F4F1E8;
}
.igs-slide[data-tone="editorial-dark"] .igs-slide-subtitle {
  color: rgba(244, 241, 232, 0.72);
  font-weight: 400;
}
/* Diagram text inside editorial-dark slides inherits the cream palette
   automatically because smart-layouts.js + smart-diagrams.js use the
   --text-primary CSS variable. Card backgrounds dim against the navy. */
.igs-slide[data-tone="editorial-dark"] .igs-card,
.igs-slide[data-tone="editorial-dark"] .ig-page .igs-card {
  background: var(--card-bg);
  border-color: var(--card-border);
  color: var(--text-primary);
}

/* ── Eyebrow pill ──
   Small rounded label that sits above the slide title. Used for
   editorial section indicators ("THE CHALLENGE", "CORE CAPABILITIES",
   "CLIENT TESTIMONIALS"). Renders only when slide.eyebrow is set. */
.igs-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--accent, #2563EB);
  border-radius: 999px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent, #2563EB);
  background: transparent;
  margin-bottom: 14px;
  line-height: 1;
  vertical-align: middle;
}
.igs-eyebrow[data-variant="hero"] {
  font-size: 11px;
  padding: 5px 12px;
  margin-bottom: 18px;
}
.igs-eyebrow-icon {
  font-size: 12px;
  line-height: 1;
  display: inline-flex;
  outline: none;
}
.igs-eyebrow-label {
  outline: none;
}
.igs-eyebrow-label[data-placeholder]:empty::before {
  content: attr(data-placeholder);
  opacity: 0.55;
}

/* ── Corner-bracket frame ──
   Editorial decoration applied to a block via the .igs-bracket-frame
   class. Renders teal (or accent) L-shaped corners on top-left and
   bottom-right of the wrapper. Used for testimonial cards and pull
   quotes in the editorial deck templates. */
.igs-bracket-frame {
  position: relative;
}
.igs-bracket-frame::before,
.igs-bracket-frame::after {
  content: '';
  position: absolute;
  width: 28px;
  height: 28px;
  border: 2px solid var(--accent, #2563EB);
  pointer-events: none;
}
.igs-bracket-frame::before {
  top: -6px;
  left: -6px;
  border-right: 0;
  border-bottom: 0;
}
.igs-bracket-frame::after {
  bottom: -6px;
  right: -6px;
  border-left: 0;
  border-top: 0;
}

/* ── Numbered index ──
   Large editorial section/step label ("01", "02") with thin colored
   divider below. Used by templates that walk through ordered lists. */
.igs-num-index {
  display: block;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent, #2563EB);
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--accent, #2563EB);
  width: 100%;
  line-height: 1;
}

/* ── Background decoration layer ──
   Optional per-slide visual accent. Activated via slide.decor on the
   slide root. Each variant is a CSS-only pattern (no images) using
   radial gradients or SVG masks. These are subtle by design — they
   add depth without overwhelming the content. */

/* "subtle-gradient" — faint radial glow in the top-right corner,
   tinted with the accent color. Adds atmosphere to dark slides. */
.igs-slide[data-decor="subtle-gradient"]::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 60% 50% at 80% 0%,
    var(--accent-soft, rgba(37, 99, 235, 0.10)) 0%,
    transparent 60%
  );
  z-index: 0;
}
.igs-slide[data-decor="subtle-gradient"] > * {
  position: relative;
  z-index: 1;
}

/* "corner-orb" — soft accent orb in the bottom-right corner. Editorial
   atmospheric without being distracting. */
.igs-slide[data-decor="corner-orb"]::before {
  content: '';
  position: absolute;
  width: 320px;
  height: 320px;
  bottom: -120px;
  right: -120px;
  pointer-events: none;
  background: radial-gradient(
    circle,
    var(--accent-soft, rgba(37, 99, 235, 0.18)) 0%,
    transparent 70%
  );
  z-index: 0;
  border-radius: 50%;
}
.igs-slide[data-decor="corner-orb"] > * {
  position: relative;
  z-index: 1;
}

/* "editorial-rule" — single thin accent line stretched horizontally
   across the slide near the top. Adds a magazine-like rhythm. */
.igs-slide[data-decor="editorial-rule"]::before {
  content: '';
  position: absolute;
  top: 64px;
  left: 5%;
  right: 5%;
  height: 1px;
  background: var(--divider, rgba(0, 0, 0, 0.12));
  pointer-events: none;
  z-index: 0;
}
.igs-slide[data-decor="editorial-rule"] > * {
  position: relative;
  z-index: 1;
}

/* ── Editorial spacing density ──
   Apply to .igs-zone-content[data-density="editorial"] for generous
   magazine-style padding + larger title scale. Wider whitespace + a
   single hero focal point per slide. */
.igs-zone-content[data-density="editorial"] {
  padding: 48px 64px;
}
.igs-zone-content[data-density="editorial"] .igs-slide-title {
  font-size: 38px;
  line-height: 1.15;
}

/* ══════════════════════════════════════════════════════════
   PHASE 8 WAVE 2 — EDITORIAL COMPOSITION PASS
   Adds visual hierarchy + vertical rhythm to editorial-dark slides.
   The Wave 1 work shipped the *theme*; Wave 2 ships the *composition*.
   - Display titles render markedly larger to create typographic contrast.
   - Zone content gets generous editorial padding and centers vertically
     so KPI/tile rows stop hugging the top of the canvas with empty
     space below.
   - A quiet always-on base ornament (hairline + corner micro-orb) shows
     on every editorial-dark slide so dead space reads as composed.
   These rules are scoped to data-tone="editorial-dark", so light tones
   are unchanged.
   ══════════════════════════════════════════════════════════ */

/* Larger display title scale on editorial-dark inline + zone titles. */
.igs-slide[data-tone="editorial-dark"] .igs-zone-content .igs-slide-title,
.igs-slide[data-tone="editorial-dark"] .igs-zone .igs-slide-title,
.igs-slide[data-tone="editorial-dark"] .igs-zone-title .igs-slide-title {
  font-size: 48px;
  line-height: 1.1;
  letter-spacing: -0.015em;
}

/* Hero titles on editorial dark go bigger than the inline ones to act
   as actual focal points (Gamma's "70% typography" rule). A2 is the
   opening title slide, so it gets the largest scale. */
.igs-slide[data-tone="editorial-dark"][data-template="A2"] .igs-slide-title {
  font-size: 72px;
  line-height: 1.05;
}
.igs-slide[data-tone="editorial-dark"][data-template="A4"] .igs-slide-title,
.igs-slide[data-tone="editorial-dark"][data-template="E6"] .igs-slide-title {
  font-size: 56px;
  line-height: 1.08;
}

/* More breathing room around the slide edge and a stronger title→content
   rhythm. */
.igs-slide[data-tone="editorial-dark"] .igs-zone-content {
  padding: 56px 72px;
}
.igs-slide[data-tone="editorial-dark"] .igs-zone-title {
  margin-bottom: 28px;
}

/* Editorial-dark A1 slides (KPI grids, priority tiles, bullet lists)
   anchor the title at the top and let the diagram stack expand to fill
   the remaining vertical space. The diagram centers itself within that
   space — eliminating the "widgets clustered at top with dead air below"
   problem that made the slides feel empty. */
.igs-slide[data-tone="editorial-dark"][data-template="A1"] > .igs-zone-content {
  justify-content: flex-start;
  gap: 0;
}
.igs-slide[data-tone="editorial-dark"][data-template="A1"] > .igs-zone-content > *:not(.igs-zone-title) {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

/* Always-on quiet ornament for editorial-dark slides — single ::after
   layer composes a horizontal hairline near the bottom AND a faint
   corner micro-orb. Per-slide data-decor variants use ::before, so they
   coexist (the gradient on slide 1, the orb on slide 7, etc.). A2 hero
   gradient + A3 accent block opt out so they don't fight the ornament. */
.igs-slide[data-tone="editorial-dark"]:not([data-template="A2"]):not([data-template="A3"])::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    /* horizontal hairline rule, indented 7% on each edge */
    linear-gradient(
      to right,
      transparent 7%,
      rgba(244, 241, 232, 0.10) 7%,
      rgba(244, 241, 232, 0.10) 93%,
      transparent 93%
    ),
    /* corner micro-orb in the bottom-right */
    radial-gradient(
      140px 140px at 96% 96%,
      rgba(20, 184, 166, 0.12) 0%,
      transparent 70%
    );
  background-size: 100% 1px, 100% 100%;
  background-position: 0 calc(100% - 32px), 0 0;
  background-repeat: no-repeat, no-repeat;
  z-index: 0;
}
/* Keep zones (and free blocks) above the base ornament. */
.igs-slide[data-tone="editorial-dark"] > .igs-zone,
.igs-slide[data-tone="editorial-dark"] > [data-block-id] {
  position: relative;
  z-index: 1;
}

/* ══════════════════════════════════════════════════════════
   PHASE 8 WAVE 3 — COMPOSITION VARIATION
   Wave 1 shipped the theme. Wave 2 shipped the visual hierarchy.
   Wave 3 introduces composition asymmetry on editorial-dark slides
   so the deck stops looking like the same layout repeated 8 times.
   - Hero-stat: 3-item circle-stats reorganizes as 1 dominant left
     stat + 2 supporting right stats (no new diagram variant —
     pure CSS rearrangement of existing markup).
   - Gutter: A1 inline titles cap at 75% width so the right side
     reads as deliberate negative space.
   - Tile polish: A1 priority tile rows fill more vertical space
     with taller, denser cards.
   ══════════════════════════════════════════════════════════ */

/* ── Editorial gutter on A1 hero titles ──
   The eyebrow + display title get a 75% max width so the right
   third of the slide reads as intentional negative space. */
.igs-slide[data-tone="editorial-dark"][data-template="A1"] > .igs-zone-content > .igs-zone-title {
  max-width: 78%;
}

/* ── Hero-stat asymmetric on 3-item circle-stats ──
   A 3-item circle-stats grid in editorial-dark reflows as 1 hero
   stat (left half, large ring + large number, label below) plus
   2 supporting stats (right half, small inline rings with labels
   to their right). All from the same items array — the CSS just
   re-grids the existing columns. */
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  grid-template-rows: 1fr 1fr;
  column-gap: 64px;
  row-gap: 24px;
  align-items: center;
  justify-items: stretch;
  max-width: 100%;
  padding: 0 8px;
}

/* Hero (first item) — big ring, big number, label + body left-aligned. */
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(1) {
  grid-column: 1;
  grid-row: 1 / span 2;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  max-width: 100%;
  flex: none;
}
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(1) .igs-circstat-wrap {
  width: 100%;
  max-width: 220px;
}
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(1) .igs-circstat-num {
  font-size: 56px !important;
  font-weight: 700;
}
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(1) .igs-circstat-title {
  font-size: 1.05em;
  font-weight: 700;
  margin-top: 1.1rem;
  line-height: 1.2;
}
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(1) .igs-circstat-desc {
  font-size: 0.78em;
  margin-top: 0.5rem;
  max-width: 280px;
}

/* Supporting (items 2 and 3) — small inline rings with labels to the right. */
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(2),
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(3) {
  grid-column: 2;
  flex-direction: row;
  align-items: center;
  text-align: left;
  max-width: 100%;
  gap: 18px;
  min-width: 0;
}
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(2) { grid-row: 1; }
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(3) { grid-row: 2; }

.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(2) .igs-circstat-wrap,
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(3) .igs-circstat-wrap {
  flex: 0 0 80px;
  width: 80px;
}
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(2) .igs-circstat-num,
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(3) .igs-circstat-num {
  font-size: 18px !important;
}
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(2) .igs-circstat-title,
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(3) .igs-circstat-title {
  margin-top: 0;
  font-size: 0.95em;
  font-weight: 700;
}
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(2) .igs-circstat-desc,
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(3) .igs-circstat-desc {
  font-size: 0.74em;
  margin-top: 0.25rem;
}
/* Wrap the title + desc in a flexible column inside the inline row. */
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(2) > *:not(.igs-circstat-wrap),
.igs-slide[data-tone="editorial-dark"] .igs-circstat-row:has(> .igs-circstat-col:nth-child(3):last-child) > .igs-circstat-col:nth-child(3) > *:not(.igs-circstat-wrap) {
  flex: 1 1 auto;
  min-width: 0;
}

/* ── A1 priority tile polish ──
   solid-boxes / solid-boxes-icons cards on editorial-dark get taller
   min-heights and tighter typography so the row of 4 tiles reads
   with editorial weight rather than as small floating chips. */
.igs-slide[data-tone="editorial-dark"][data-template="A1"] .igs-solid {
  min-height: 200px;
  padding: 24px 22px;
}
.igs-slide[data-tone="editorial-dark"][data-template="A1"] .igs-solid .igs-title {
  font-size: 1.05em;
  line-height: 1.2;
}
.igs-slide[data-tone="editorial-dark"][data-template="A1"] .igs-solid .igs-body {
  font-size: 0.85em;
  line-height: 1.45;
  margin-top: 0.6rem;
}

/* ══════════════════════════════════════════════════════════
   CATEGORY A — Blank & Full-Width
   ══════════════════════════════════════════════════════════ */

/* A1 — Blank: single full-bleed content zone */
.igs-slide[data-template="A1"] {
  display: block;
}
.igs-slide[data-template="A1"] > .igs-zone-content {
  width: 100%;
  height: 100%;
}

/* A2 — Title Slide: centered title block on accent gradient background */
.igs-slide[data-template="A2"] {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    var(--accent, #2563EB) 0%,
    color-mix(in srgb, var(--accent, #2563EB) 70%, #000) 100%);
  color: #ffffff;
}
.igs-slide[data-template="A2"] > .igs-zone-content {
  width: 80%;
  align-items: center;
  text-align: center;
  padding: 0;
}
.igs-slide[data-template="A2"] .igs-slide-title {
  font-size: 56px;
  color: #ffffff;
  margin-bottom: 16px;
}
.igs-slide[data-template="A2"] .igs-slide-subtitle {
  font-size: 22px;
  color: rgba(255,255,255,0.85);
}

/* A3 — Section Divider: bold heading, left-aligned, accent background */
.igs-slide[data-template="A3"] {
  display: flex;
  align-items: center;
  background: var(--accent, #2563EB);
  color: #ffffff;
}
.igs-slide[data-template="A3"] > .igs-zone-content {
  width: 100%;
  padding: 27px 64px;
  align-items: flex-start;
}
.igs-slide[data-template="A3"] .igs-slide-title {
  font-size: 64px;
  color: #ffffff;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.igs-slide[data-template="A3"] .igs-slide-subtitle {
  font-size: 22px;
  color: rgba(255,255,255,0.85);
}

/* A4 — Closing / Thank You: centered message + contact info at bottom */
.igs-slide[data-template="A4"] {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.igs-slide[data-template="A4"] > .igs-zone-content {
  width: 80%;
  align-items: center;
  text-align: center;
}
.igs-slide[data-template="A4"] .igs-slide-title {
  font-size: 60px;
  color: var(--accent, #2563EB);
  margin-bottom: 24px;
}
.igs-slide[data-template="A4"] .igs-slide-subtitle {
  font-size: 18px;
  color: var(--text-secondary, #6b7280);
  position: absolute;
  bottom: 32px;
  left: 0;
  right: 0;
}

/* ══════════════════════════════════════════════════════════
   CATEGORY B — Accent Image Templates
   Numbers from SLIDE-DECK-PLAN.md Section 3.2.
   Accent zones bleed to slide edges; content zones own their padding.
   ══════════════════════════════════════════════════════════ */

/* B1 — Accent Left 40 + 3 + 57 */
.igs-slide[data-template="B1"] {
  display: grid;
  grid-template-columns: 40% 3% 57%;
  grid-template-rows: 100%;
}
.igs-slide[data-template="B1"] > .igs-zone-accent  { grid-column: 1; }
.igs-slide[data-template="B1"] > .igs-zone-content { grid-column: 3; }

/* B2 — Accent Right 57 + 3 + 40 */
.igs-slide[data-template="B2"] {
  display: grid;
  grid-template-columns: 57% 3% 40%;
}
.igs-slide[data-template="B2"] > .igs-zone-content { grid-column: 1; }
.igs-slide[data-template="B2"] > .igs-zone-accent  { grid-column: 3; }

/* B3 — Accent Top 100 × 40 + 3 + 57 */
.igs-slide[data-template="B3"] {
  display: grid;
  grid-template-columns: 100%;
  grid-template-rows: 40% 3% 57%;
}
.igs-slide[data-template="B3"] > .igs-zone-accent  { grid-row: 1; }
.igs-slide[data-template="B3"] > .igs-zone-content { grid-row: 3; }

/* B4 — Accent Bottom: top 62% content, bottom 35% accent (3% gap) */
.igs-slide[data-template="B4"] {
  display: grid;
  grid-template-columns: 100%;
  grid-template-rows: 62% 3% 35%;
}
.igs-slide[data-template="B4"] > .igs-zone-content { grid-row: 1; }
.igs-slide[data-template="B4"] > .igs-zone-accent  { grid-row: 3; }

/* B5 — Accent Left Narrow 30 + 3 + 67 */
.igs-slide[data-template="B5"] {
  display: grid;
  grid-template-columns: 30% 3% 67%;
}
.igs-slide[data-template="B5"] > .igs-zone-accent  { grid-column: 1; }
.igs-slide[data-template="B5"] > .igs-zone-content { grid-column: 3; }

/* B6 — Accent Right Narrow 67 + 3 + 30 */
.igs-slide[data-template="B6"] {
  display: grid;
  grid-template-columns: 67% 3% 30%;
}
.igs-slide[data-template="B6"] > .igs-zone-content { grid-column: 1; }
.igs-slide[data-template="B6"] > .igs-zone-accent  { grid-column: 3; }

/* ══════════════════════════════════════════════════════════
   CATEGORY C — Column Layouts (no accent image)
   ══════════════════════════════════════════════════════════ */

/* C1 — Two Columns Equal 50 / 3 / 50 (with 15% title row) */
.igs-slide[data-template="C1"] {
  display: grid;
  grid-template-columns: 48.5% 3% 48.5%;
  grid-template-rows: auto 16px 1fr;
}
.igs-slide[data-template="C1"] > .igs-zone-content[data-zone="title"] {
  grid-column: 1 / span 3;
  grid-row: 1;
  align-items: flex-start;
  justify-content: center;
}
.igs-slide[data-template="C1"] > .igs-zone-content[data-zone="left"]  { grid-column: 1; grid-row: 3; }
.igs-slide[data-template="C1"] > .igs-zone-content[data-zone="right"] { grid-column: 3; grid-row: 3; }

/* C2 — Wide-Left 60 / 3 / 37 (with 15% title row) */
.igs-slide[data-template="C2"] {
  display: grid;
  grid-template-columns: 60% 3% 37%;
  grid-template-rows: auto 16px 1fr;
}
.igs-slide[data-template="C2"] > .igs-zone-content[data-zone="title"] {
  grid-column: 1 / span 3;
  grid-row: 1;
  align-items: flex-start;
  justify-content: center;
}
.igs-slide[data-template="C2"] > .igs-zone-content[data-zone="left"]  { grid-column: 1; grid-row: 3; }
.igs-slide[data-template="C2"] > .igs-zone-content[data-zone="right"] { grid-column: 3; grid-row: 3; }

/* C3 — Wide-Right 37 / 3 / 60 (with 15% title row) */
.igs-slide[data-template="C3"] {
  display: grid;
  grid-template-columns: 37% 3% 60%;
  grid-template-rows: auto 16px 1fr;
}
.igs-slide[data-template="C3"] > .igs-zone-content[data-zone="title"] {
  grid-column: 1 / span 3;
  grid-row: 1;
  align-items: flex-start;
  justify-content: center;
}
.igs-slide[data-template="C3"] > .igs-zone-content[data-zone="left"]  { grid-column: 1; grid-row: 3; }
.igs-slide[data-template="C3"] > .igs-zone-content[data-zone="right"] { grid-column: 3; grid-row: 3; }

/* C4 — Three Columns Equal 31 / 3 / 31 / 3 / 31 (with 15% title row) */
.igs-slide[data-template="C4"] {
  display: grid;
  grid-template-columns: 31% 3% 31% 3% 31%;
  grid-template-rows: auto 16px 1fr;
}
.igs-slide[data-template="C4"] > .igs-zone-content[data-zone="title"] {
  grid-column: 1 / span 5;
  grid-row: 1;
  align-items: flex-start;
  justify-content: center;
}
.igs-slide[data-template="C4"] > .igs-zone-content[data-zone="col1"] { grid-column: 1; grid-row: 3; }
.igs-slide[data-template="C4"] > .igs-zone-content[data-zone="col2"] { grid-column: 3; grid-row: 3; }
.igs-slide[data-template="C4"] > .igs-zone-content[data-zone="col3"] { grid-column: 5; grid-row: 3; }

/* C5 — Two Columns + Header (header 25%, columns 70% with 5% gap row) */
.igs-slide[data-template="C5"] {
  display: grid;
  grid-template-columns: 48.5% 3% 48.5%;
  grid-template-rows: auto 16px 1fr;
}
.igs-slide[data-template="C5"] > .igs-zone-content[data-zone="header"] {
  grid-column: 1 / span 3;
  grid-row: 1;
  align-items: flex-start;
  justify-content: center;
}
.igs-slide[data-template="C5"] > .igs-zone-content[data-zone="left"]  { grid-column: 1; grid-row: 3; }
.igs-slide[data-template="C5"] > .igs-zone-content[data-zone="right"] { grid-column: 3; grid-row: 3; }

/* C6 — Three Columns + Header */
.igs-slide[data-template="C6"] {
  display: grid;
  grid-template-columns: 31% 3% 31% 3% 31%;
  grid-template-rows: auto 16px 1fr;
}
.igs-slide[data-template="C6"] > .igs-zone-content[data-zone="header"] {
  grid-column: 1 / span 5;
  grid-row: 1;
}
.igs-slide[data-template="C6"] > .igs-zone-content[data-zone="col1"] { grid-column: 1; grid-row: 3; }
.igs-slide[data-template="C6"] > .igs-zone-content[data-zone="col2"] { grid-column: 3; grid-row: 3; }
.igs-slide[data-template="C6"] > .igs-zone-content[data-zone="col3"] { grid-column: 5; grid-row: 3; }

/* ══════════════════════════════════════════════════════════
   CATEGORY D — Mixed Image + Content Columns
   ══════════════════════════════════════════════════════════ */

/* D1 — Image Left 35 + 3 + (col1 30 + 2 + col2 30) (with 15% title row) */
.igs-slide[data-template="D1"] {
  display: grid;
  grid-template-columns: 35% 3% 30% 2% 30%;
  grid-template-rows: auto 16px 1fr;
}
.igs-slide[data-template="D1"] > .igs-zone-content[data-zone="title"] {
  grid-column: 1 / span 5;
  grid-row: 1;
  align-items: flex-start;
  justify-content: center;
}
.igs-slide[data-template="D1"] > .igs-zone-accent              { grid-column: 1; grid-row: 3; }
.igs-slide[data-template="D1"] > .igs-zone-content[data-zone="col1"] { grid-column: 3; grid-row: 3; }
.igs-slide[data-template="D1"] > .igs-zone-content[data-zone="col2"] { grid-column: 5; grid-row: 3; }

/* D2 — Image Right (col1 30 + 2 + col2 30) + 3 + 35 (with 15% title row) */
.igs-slide[data-template="D2"] {
  display: grid;
  grid-template-columns: 30% 2% 30% 3% 35%;
  grid-template-rows: auto 16px 1fr;
}
.igs-slide[data-template="D2"] > .igs-zone-content[data-zone="title"] {
  grid-column: 1 / span 5;
  grid-row: 1;
  align-items: flex-start;
  justify-content: center;
}
.igs-slide[data-template="D2"] > .igs-zone-content[data-zone="col1"] { grid-column: 1; grid-row: 3; }
.igs-slide[data-template="D2"] > .igs-zone-content[data-zone="col2"] { grid-column: 3; grid-row: 3; }
.igs-slide[data-template="D2"] > .igs-zone-accent              { grid-column: 5; grid-row: 3; }

/* D3 — Header + Image Left + Content Right */
.igs-slide[data-template="D3"] {
  display: grid;
  grid-template-columns: 40% 3% 57%;
  grid-template-rows: auto 16px 1fr;
}
.igs-slide[data-template="D3"] > .igs-zone-content[data-zone="header"] {
  grid-column: 1 / span 3; grid-row: 1; align-items: flex-start;
}
.igs-slide[data-template="D3"] > .igs-zone-accent  { grid-column: 1; grid-row: 3; }
.igs-slide[data-template="D3"] > .igs-zone-content[data-zone="content"] { grid-column: 3; grid-row: 3; }

/* D4 — Header + Content Left + Image Right */
.igs-slide[data-template="D4"] {
  display: grid;
  grid-template-columns: 57% 3% 40%;
  grid-template-rows: auto 16px 1fr;
}
.igs-slide[data-template="D4"] > .igs-zone-content[data-zone="header"] {
  grid-column: 1 / span 3; grid-row: 1; align-items: flex-start;
}
.igs-slide[data-template="D4"] > .igs-zone-content[data-zone="content"] { grid-column: 1; grid-row: 3; }
.igs-slide[data-template="D4"] > .igs-zone-accent  { grid-column: 3; grid-row: 3; }

/* ══════════════════════════════════════════════════════════
   CATEGORY E — Special Purpose
   ══════════════════════════════════════════════════════════ */

/* E1 — Quote Slide */
.igs-slide[data-template="E1"] {
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 30% 20%, var(--accent-soft, rgba(37,99,235,0.08)) 0%, transparent 60%),
    var(--card-bg, #ffffff);
}
.igs-slide[data-template="E1"] > .igs-zone-content {
  width: 70%;
  align-items: center;
  text-align: center;
}
.igs-slide[data-template="E1"] .igs-slide-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 36px;
  font-weight: 500;
  font-style: italic;
  line-height: 1.35;
  color: var(--text-primary, #1A1A2E);
  position: relative;
  padding: 0 40px;
}
.igs-slide[data-template="E1"] .igs-slide-title::before {
  content: '\\201C';
  position: absolute;
  left: 0;
  top: -20px;
  font-size: 80px;
  color: var(--accent, #2563EB);
  opacity: 0.4;
  line-height: 1;
}
.igs-slide[data-template="E1"] .igs-slide-subtitle {
  margin-top: 24px;
  font-size: 16px;
  color: var(--accent, #2563EB);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* E2 — Big Number / Stat */
.igs-slide[data-template="E2"] {
  display: flex;
  align-items: center;
  justify-content: center;
}
.igs-slide[data-template="E2"] > .igs-zone-content {
  align-items: center;
  text-align: center;
  width: 80%;
}
.igs-slide[data-template="E2"] .igs-slide-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 180px;
  font-weight: 800;
  line-height: 1;
  color: var(--accent, #2563EB);
  letter-spacing: -0.04em;
}
.igs-slide[data-template="E2"] .igs-slide-subtitle {
  font-size: 26px;
  color: var(--text-secondary, #6b7280);
  margin-top: 12px;
}

/* E3 — Comparison (Side-by-Side) (with 15% title row) */
.igs-slide[data-template="E3"] {
  display: grid;
  grid-template-columns: 48.5% 3% 48.5%;
  grid-template-rows: auto 16px 1fr;
  background:
    linear-gradient(to right, transparent 49.95%, var(--card-border, #e5e7eb) 49.95%, var(--card-border, #e5e7eb) 50.05%, transparent 50.05%);
}
.igs-slide[data-template="E3"] > .igs-zone-content[data-zone="title"] {
  grid-column: 1 / span 3;
  grid-row: 1;
  background: var(--card-bg, #fff);
  align-items: flex-start;
  justify-content: center;
}
.igs-slide[data-template="E3"] > .igs-zone-content[data-zone="left"]  { grid-column: 1; grid-row: 3; }
.igs-slide[data-template="E3"] > .igs-zone-content[data-zone="right"] { grid-column: 3; grid-row: 3; }

/* E4 — Full-Bleed Image with overlay text band */
.igs-slide[data-template="E4"] {
  display: block;
  position: relative;
}
.igs-slide[data-template="E4"] > .igs-zone-accent {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.igs-slide[data-template="E4"] > .igs-zone-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20%;
  padding: 18px 48px;
  background: rgba(0,0,0,0.55);
  color: #ffffff;
  justify-content: center;
}
.igs-slide[data-template="E4"] .igs-slide-title {
  color: #ffffff;
  font-size: 28px;
  margin: 0;
}
.igs-slide[data-template="E4"] .igs-slide-subtitle {
  color: rgba(255,255,255,0.85);
  font-size: 15px;
  margin-top: 4px;
}

/* E5 — Agenda / Table of Contents */
.igs-slide[data-template="E5"] {
  display: grid;
  grid-template-columns: 60% 5% 35%;
}
.igs-slide[data-template="E5"] > .igs-zone-content { grid-column: 1; }
.igs-slide[data-template="E5"] > .igs-zone-accent  { grid-column: 3; }

/* E6 — Call to Action.
   Uses background-image (not the background shorthand) so the underlying
   background-color set by the tone (e.g. #0E1620 on editorial-dark) is
   preserved. The radial gradient composites on top as an accent glow. */
.igs-slide[data-template="E6"] {
  display: flex;
  align-items: center;
  justify-content: center;
  background-image:
    radial-gradient(circle at 50% 100%, var(--accent-soft, rgba(37,99,235,0.10)) 0%, transparent 70%);
}
/* Editorial-dark CTA: stronger glow + remove the legacy white fallback so
   the navy canvas stays intact. */
.igs-slide[data-tone="editorial-dark"][data-template="E6"] {
  background-color: #0E1620;
  background-image:
    radial-gradient(circle at 50% 100%, var(--accent-soft, rgba(20,184,166,0.20)) 0%, transparent 70%);
}
.igs-slide[data-template="E6"] > .igs-zone-content {
  width: 75%;
  align-items: center;
  text-align: center;
}
.igs-slide[data-template="E6"] .igs-slide-title {
  font-size: 48px;
  margin-bottom: 18px;
}
.igs-slide[data-template="E6"] .igs-slide-subtitle {
  font-size: 18px;
  margin-bottom: 28px;
  max-width: 520px;
}
.igs-slide[data-template="E6"] .igs-cta-button {
  display: inline-block;
  padding: 16px 40px;
  background: var(--accent, #2563EB);
  color: #ffffff;
  border-radius: 8px;
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  box-shadow: 0 8px 20px var(--accent-soft, rgba(37,99,235,0.30));
}
`;
