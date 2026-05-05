/**
 * Infogr.ai v3 — Slide Deck UI Controller (Phase 2)
 *
 * Owns the deck state in slide-deck mode, renders the three panels
 * (left thumbnails, canvas, right gallery), and wires every interaction.
 *
 * Public API:
 *   enterSlideDeckMode(initialTopic, tone, accentColor)
 *   exitSlideDeckMode()
 *   getDeck()
 *   applyToneToDeck(tone, accentColor)
 *
 * State machine:
 *   inactive  → enterSlideDeckMode() → active
 *   active    → exitSlideDeckMode() → inactive
 *
 * The DOM elements #igsThumbPanel, #igsGalleryPanel, #igsSlideNav are
 * declared in index.html and styled via styles.css. This module manages
 * their inner HTML and event handlers.
 *
 * Reference: SLIDE-DECK-PLAN.md Sections 2 + 4 + 8
 */

import {
  createDeck, addSlide, removeSlide, duplicateSlide,
  addBlock, removeBlock, updateBlock, getSlide, blocksInZone, withSlide,
  changeSlideTemplate, updateSlide,
} from './slide-deck.js';
import { renderSlide, DECK_MODE_CSS } from './slide-renderer.js';
import { TEMPLATES, getTemplateZones, renderSlideTemplate } from './slide-templates.js';

/* ─────────────────────────────────────────
   GALLERY METADATA — diagram catalog grouped by category.
   Each entry's id is the variant id used by the engine.
───────────────────────────────────────── */

const GALLERY = [
  { id: 'boxes',     label: 'Boxes',                variants: [
    'solid-boxes', 'solid-boxes-icons', 'outline-boxes', 'side-line', 'side-line-text',
    'top-line-text', 'top-circle', 'joined-boxes', 'joined-boxes-icons',
    'leaf-boxes', 'labeled-boxes', 'alternating-boxes',
  ]},
  { id: 'bullets',   label: 'Bullets',              variants: [
    'large-bullets', 'small-bullets', 'arrow-bullets', 'process-steps', 'solid-box-small-bullets',
  ]},
  { id: 'sequence',  label: 'Sequence',             variants: [
    'timeline', 'minimal-timeline', 'minimal-timeline-boxes', 'arrows', 'pills', 'slanted-labels',
  ]},
  { id: 'numbers',   label: 'Numbers / Stats',      variants: [
    'stats', 'circle-stats', 'bar-stats', 'star-rating', 'dot-grid', 'dot-line',
    'circle-bold-line', 'circle-external-line',
  ]},
  { id: 'circles',   label: 'Circles',              variants: [
    'cycle', 'flower', 'circle', 'ring', 'semi-circle',
  ]},
  { id: 'quotes',    label: 'Quotes',               variants: [
    'quote-boxes', 'speech-bubbles',
  ]},
  { id: 'steps',     label: 'Steps',                variants: [
    'staircase', 'steps', 'box-steps', 'arrow-steps', 'steps-with-icons', 'pyramid', 'vertical-funnel',
  ]},
  { id: 'road',      label: 'Road / Journey',       variants: [
    'road-horizontal', 'road-vertical', 'journey-map', 'experience-map',
  ]},
  { id: 'target',    label: 'Target / Radial',      variants: [
    'bullseye', 'radial', 'orbit', 'sunburst',
  ]},
  { id: 'hierarchy', label: 'Hierarchy / Funnel',   variants: [
    'org-chart', 'tree-horizontal', 'pyramid-diagram', 'nested-boxes',
  ]},
  { id: 'venn',      label: 'Venn / Relationship',  variants: [
    'venn-2', 'venn-3', 'overlapping-sets', 'matrix-2x2',
  ]},
  { id: 'process',   label: 'Process / Motion',     variants: [
    'circular-flow', 'swimlane', 'branching', 'infinity-loop',
  ]},
  { id: 'business',  label: 'Business / Analysis',  variants: [
    'swot', 'competitive-map', 'value-chain', 'bmc',
  ]},
];

/* Variant id → family id (the gallery section it appears in). */
const VARIANT_FAMILY = (() => {
  const m = {};
  GALLERY.forEach(g => g.variants.forEach(v => { m[v] = g.id; }));
  return m;
})();

/* Display label for a variant id ("solid-boxes" → "Solid Boxes"). */
function variantLabel(variant) {
  return variant
    .split('-')
    .map(w => w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/* ─────────────────────────────────────────
   DEFAULT ITEM COUNTS + PLACEHOLDER CONTENT
   Honors fixed-slot constraints from slot-rules.js.
───────────────────────────────────────── */

const FIXED_SLOT_COUNT = {
  'venn-2': 2, 'venn-3': 3, 'swot': 4, 'matrix-2x2': 4, 'bmc': 8,
};

function defaultItemCount(variant) {
  if (FIXED_SLOT_COUNT[variant] !== undefined) return FIXED_SLOT_COUNT[variant];
  return 3;
}

const NUMBER_FAMILY_VARIANTS = new Set([
  'stats', 'circle-stats', 'bar-stats', 'star-rating', 'dot-grid', 'dot-line',
  'circle-bold-line', 'circle-external-line',
]);
const QUOTE_VARIANTS = new Set(['quote-boxes', 'speech-bubbles']);
const DEFAULT_ICONS = ['target', 'rocket', 'idea', 'shield', 'star', 'chart-increasing', 'briefcase', 'gear'];

function placeholderItems(variant) {
  const n = defaultItemCount(variant);

  // Fixed-slot diagrams with semantic content
  if (variant === 'swot') return [
    { title: 'Strengths',     body: 'Internal advantages we can build on.' },
    { title: 'Weaknesses',    body: 'Internal limitations to address.' },
    { title: 'Opportunities', body: 'External openings to capture.' },
    { title: 'Threats',       body: 'External risks to mitigate.' },
  ];
  if (variant === 'venn-2') return [
    { title: 'Set A', body: 'First domain or category.' },
    { title: 'Set B', body: 'Second domain or category.' },
  ];
  if (variant === 'venn-3') return [
    { title: 'Set A', body: 'First.' },
    { title: 'Set B', body: 'Second.' },
    { title: 'Set C', body: 'Third.' },
  ];
  if (variant === 'matrix-2x2') return [
    { title: 'High Impact / High Effort', body: 'Strategic priorities.' },
    { title: 'High Impact / Low Effort',  body: 'Quick wins.' },
    { title: 'Low Impact / Low Effort',   body: 'Fill-ins.' },
    { title: 'Low Impact / High Effort',  body: 'Avoid.' },
  ];
  if (variant === 'bmc') return [
    { title: 'Key Partners',           body: 'Strategic partners and suppliers.' },
    { title: 'Key Activities',         body: 'Core activities required.' },
    { title: 'Key Resources',          body: 'Critical assets and capabilities.' },
    { title: 'Value Proposition',      body: 'The value delivered to customers.' },
    { title: 'Customer Relationships', body: 'How customers are engaged.' },
    { title: 'Channels',               body: 'How value reaches customers.' },
    { title: 'Customer Segments',      body: 'Who the customers are.' },
    { title: 'Cost Structure',         body: 'Major cost drivers.' },
  ];

  // Numbers family — title is the metric, body is the label
  if (NUMBER_FAMILY_VARIANTS.has(variant)) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const num = (i + 1) * 25;
      out.push({ title: `${num}%`, body: `Metric ${i + 1}` });
    }
    return out;
  }

  // Quotes — title is attribution, body is the quote text
  if (QUOTE_VARIANTS.has(variant)) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        title: `Source ${i + 1}`,
        body:  'Replace this placeholder with a real quote that captures the point.',
      });
    }
    return out;
  }

  // Default: title + body + icon
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      title: `Item ${i + 1}`,
      body:  `Brief description for item ${i + 1}.`,
      icon:  DEFAULT_ICONS[i % DEFAULT_ICONS.length],
    });
  }
  return out;
}

/* ─────────────────────────────────────────
   MODULE STATE
───────────────────────────────────────── */

let _state = null;
/* shape:
   {
     deck: { ... },
     activeSlideId: 'slide_xx',
     tone: 'professional',
     accentColor: '#2563EB',
     openSections: { boxes: true, bullets: false, ... },   // gallery accordion state
     popover: null | HTMLElement,
     contextMenu: null | HTMLElement,
     // Phase 3C — Cursor system
     editing: null | {
       element: HTMLElement,
       kind: 'title' | 'diagram-text' | 'free-text-new' | 'free-text-existing',
       slideId: string,
       blockId?: string,
       itemIndex?: number,
       fieldName?: 'title' | 'body',
       zoneName?: string,
       originalText?: string,
     },
     // Phase 3D — Selection
     selected: null | { blockId: string, slideId: string },
     // Phase 3D — Replace flow
     replaceMode: null | { blockId: string, slideId: string },
   }
*/

/* ─────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────── */

/**
 * Enter slide deck mode. Builds the initial deck (title slide A2 + blank A1),
 * injects deck-mode CSS, renders all three panels, wires events.
 *
 * @param {string} initialTopic   — text from the prompt textarea (used as title slide text if non-empty)
 * @param {string} tone           — 'professional' | 'bold' | 'minimal' | 'playful'
 * @param {string} accentColor    — hex
 */
export function enterSlideDeckMode(initialTopic, tone, accentColor) {
  if (_state) return; // already active

  const titleText = (initialTopic && initialTopic.trim()) || 'Your Title Here';
  const deck = buildInitialDeck(titleText, tone || 'professional', accentColor || '#2563EB');

  _state = {
    deck,
    activeSlideId: deck.slides[0].id,
    tone:          deck.theme,
    accentColor:   deck.accentColor,
    // Diagram-section accordion: open the first three categories by default
    openSections:  GALLERY.reduce((m, g, i) => { m[g.id] = i < 3; return m; }, {}),
    // Template-section accordion: keys are 'tpl_A' / 'tpl_B' / etc.
    openTemplateCats: { tpl_A: true, tpl_B: true, tpl_C: false, tpl_D: false, tpl_E: false },
    // Top-level Templates / Diagrams toggles
    templatesOpen: true,
    diagramsOpen:  true,
    popover:       null,
    contextMenu:   null,
  };

  injectDeckModeCSS();
  renderThumbnailPanel();
  renderGalleryPanel();
  renderActiveSlide();

  // Show panels and slide nav
  const tp = byId('igsThumbPanel');     if (tp) tp.style.display = '';
  const gp = byId('igsGalleryPanel');   if (gp) gp.style.display = '';
  const sn = byId('igsSlideNav');       if (sn) sn.style.display = '';
  const gt = byId('igsGalleryToggles'); if (gt) gt.style.display = 'flex';

  // Wire gallery toggle buttons (one-time per session)
  if (gt && !gt.dataset.wired) {
    gt.dataset.wired = '1';
    gt.querySelectorAll('.igs-gallery-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleGalleryOverlay(btn.dataset.show);
      });
    });
  }

  document.addEventListener('keydown', _onKeyDown);
  document.addEventListener('click',   _onDocumentClick, true);
}

/**
 * Exit slide deck mode. Clears the panels, removes CSS, releases handlers.
 * The single-page mode UI takes over again.
 */
export function exitSlideDeckMode() {
  if (!_state) return;

  document.removeEventListener('keydown', _onKeyDown);
  document.removeEventListener('click',   _onDocumentClick, true);

  hidePopover();
  hideContextMenu();
  closeGalleryOverlay();
  teardownCanvasResizeObserver();

  const tp = byId('igsThumbPanel');   if (tp) { tp.innerHTML = ''; tp.style.display = 'none'; }
  const gp = byId('igsGalleryPanel');
  if (gp) { gp.innerHTML = ''; gp.style.display = 'none'; gp.classList.remove('is-open'); }
  const sn = byId('igsSlideNav');     if (sn) sn.style.display = 'none';
  const gt = byId('igsGalleryToggles'); if (gt) gt.style.display = 'none';

  // Reset the output wrap so app.js can put the empty state or single-page render back
  const wrap = byId('outputWrap');
  if (wrap) {
    wrap.style.cssText = '';
    wrap.innerHTML = '';
  }

  removeDeckModeCSS();
  _state = null;
}

/** Read-only access to the current deck. */
export function getDeck() {
  return _state ? _state.deck : null;
}

/** Apply a tone change to the entire deck and re-render. */
export function applyToneToDeck(tone, accentColor) {
  if (!_state) return;
  _state.tone        = tone        || _state.tone;
  _state.accentColor = accentColor || _state.accentColor;
  _state.deck = { ..._state.deck, theme: _state.tone, accentColor: _state.accentColor };
  applyAccentVars();
  rerenderEverything();
}

/**
 * Generate a hardcoded 6-slide demo deck for a given topic. No AI / no API
 * required — proves the full data-model → template → diagram → canvas pipeline
 * works end-to-end. The Phase 4 AI pipeline will replace this with a real
 * deck generator that calls the Anthropic API.
 *
 * @param {string} topic         — used as title slide text
 * @param {string} [tone]        — overrides current tone
 * @param {string} [accentColor] — overrides current accent
 * @returns {object} the new deck (also installed as the active deck)
 */
export function generateDemoDeck(topic, tone, accentColor) {
  if (!_state) {
    // Caller hasn't entered deck mode yet — bring it in
    enterSlideDeckMode(topic, tone, accentColor);
  }

  const title = (topic && topic.trim()) || 'Untitled Deck';
  const t   = tone        || _state.tone;
  const acc = accentColor || _state.accentColor;

  let deck = createDeck(title, t, acc);

  /* ── Slide 1: A2 Title ── */
  deck = addSlide(deck, 'A2', null, {
    title:    title,
    subtitle: 'Generated by Infogr.ai',
  });
  const s1id = deck.slides[deck.slides.length - 1].id;

  /* ── Slide 2: A1 Blank with solid-boxes (3 items) ── */
  deck = addSlide(deck, 'A1', s1id);
  const s2id = deck.slides[deck.slides.length - 1].id;
  /* A1 has no title zone (per spec). No title set. */
  deck = withSlide(deck, s2id, s => addBlock(s, {
    type:    'diagram',
    family:  'boxes',
    variant: 'solid-boxes',
    items: [
      { title: 'Foundation',     body: `Define the core principles and target outcomes for ${title}.` },
      { title: 'Implementation', body: 'Execute with clear milestones, owners, and measurable deliverables.' },
      { title: 'Optimization',   body: 'Iterate, measure impact, and refine for sustained results.' },
    ],
    columns: 3,
    density: 'standard',
    position: { zone: 'content' },
  }));

  /* ── Slide 3: B1 Accent Left with arrow-bullets (4 items) ── */
  deck = addSlide(deck, 'B1', s2id, { title: 'Our Approach' });
  const s3id = deck.slides[deck.slides.length - 1].id;
  deck = withSlide(deck, s3id, s => addBlock(s, {
    type:    'diagram',
    family:  'bullets',
    variant: 'arrow-bullets',
    items: [
      { title: 'Discover', body: 'Map the current state and identify friction points.' },
      { title: 'Design',   body: 'Define the target state and design the transition.' },
      { title: 'Build',    body: 'Execute the transformation in deliverable phases.' },
      { title: 'Measure',  body: 'Track outcomes and feed learnings back into the loop.' },
    ],
    columns: 1,
    density: 'standard',
    position: { zone: 'content' },
  }));

  /* ── Slide 4: C1 Two Columns — circle-stats left, bar-stats right ── */
  deck = addSlide(deck, 'C1', s3id, { title: 'Key Performance Metrics' });
  const s4id = deck.slides[deck.slides.length - 1].id;
  deck = withSlide(deck, s4id, s => addBlock(s, {
    type:    'diagram',
    family:  'numbers',
    variant: 'circle-stats',
    items: [
      { title: '90%', body: 'Cycle time reduction' },
      { title: '$1.6M', body: 'Annual savings' },
      { title: '3.2x', body: 'Throughput uplift' },
    ],
    columns: 1,
    density: 'standard',
    position: { zone: 'left' },
  }));
  deck = withSlide(deck, s4id, s => addBlock(s, {
    type:    'diagram',
    family:  'numbers',
    variant: 'bar-stats',
    items: [
      { title: 'Q1', body: '42%' },
      { title: 'Q2', body: '67%' },
      { title: 'Q3', body: '85%' },
      { title: 'Q4', body: '94%' },
    ],
    columns: 1,
    density: 'standard',
    position: { zone: 'right' },
  }));

  /* ── Slide 5: B2 Accent Right with timeline (4 items) ── */
  deck = addSlide(deck, 'B2', s4id, { title: 'Implementation Roadmap' });
  const s5id = deck.slides[deck.slides.length - 1].id;
  deck = withSlide(deck, s5id, s => addBlock(s, {
    type:    'diagram',
    family:  'sequence',
    variant: 'timeline',
    items: [
      { title: 'Phase 1', body: 'Discovery & current state assessment.' },
      { title: 'Phase 2', body: 'Solution design & stakeholder alignment.' },
      { title: 'Phase 3', body: 'Implementation & change rollout.' },
      { title: 'Phase 4', body: 'Optimization & continuous improvement.' },
    ],
    columns: 4,
    density: 'standard',
    position: { zone: 'content' },
  }));

  /* ── Slide 6: A4 Closing ── */
  deck = addSlide(deck, 'A4', s5id, {
    title:    'Thank You',
    subtitle: title + ' · Questions? lily@gehantech.com',
  });

  // Install the new deck and re-render
  _state.deck = deck;
  _state.activeSlideId = deck.slides[0].id;
  _state.tone = t;
  _state.accentColor = acc;
  applyAccentVars();
  rerenderEverything();

  return deck;
}

/* ─────────────────────────────────────────
   INITIAL DECK
───────────────────────────────────────── */

function buildInitialDeck(titleText, tone, accentColor) {
  let deck = createDeck(titleText, tone, accentColor);
  // Slide 1: Title (A2)
  deck = addSlide(deck, 'A2', null, { title: titleText, subtitle: 'Subtitle or tagline' });
  // Slide 2: Blank (A1)
  deck = addSlide(deck, 'A1', deck.slides[0].id);
  return deck;
}

/* ─────────────────────────────────────────
   CSS INJECTION
───────────────────────────────────────── */

function injectDeckModeCSS() {
  if (document.getElementById('igs-deck-mode-css')) return;
  const style = document.createElement('style');
  style.id = 'igs-deck-mode-css';
  style.textContent = DECK_MODE_CSS + GALLERY_PANEL_CSS;
  document.head.appendChild(style);

  // Apply current accent variables to the document root (so slides pick them up)
  applyAccentVars();
}

function removeDeckModeCSS() {
  const style = document.getElementById('igs-deck-mode-css');
  if (style) style.remove();
  const accentStyle = document.getElementById('igs-deck-accent-vars');
  if (accentStyle) accentStyle.remove();
}

function applyAccentVars() {
  if (!_state) return;
  let style = document.getElementById('igs-deck-accent-vars');
  if (!style) {
    style = document.createElement('style');
    style.id = 'igs-deck-accent-vars';
    document.head.appendChild(style);
  }
  const { r, g, b } = hexToRgb(_state.accentColor);
  style.textContent = `
    :root {
      --accent: ${_state.accentColor};
      --accent-soft: rgba(${r},${g},${b},0.10);
      --accent-rgb: ${r},${g},${b};
    }
  `;
}

function hexToRgb(hex) {
  const h = (hex || '').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return { r, g, b };
}

/* ─────────────────────────────────────────
   THUMBNAIL PANEL
───────────────────────────────────────── */

function renderThumbnailPanel() {
  const panel = byId('igsThumbPanel');
  if (!panel || !_state) return;

  const items = [];
  // Insert "+" before every slide (none before slide 0 — only between/after)
  _state.deck.slides.forEach((slide, idx) => {
    items.push(renderThumb(slide, idx));
    items.push(`<div class="igs-add-slide-bar" data-after-slide-id="${slide.id}" title="Insert slide after">+</div>`);
  });

  panel.innerHTML = items.join('');

  // Wire thumbnail clicks
  panel.querySelectorAll('.igs-thumb-wrap').forEach(el => {
    el.addEventListener('click', () => setActiveSlide(el.dataset.slideId));
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showSlideContextMenu(el.dataset.slideId, e.clientX, e.clientY);
    });
  });

  panel.querySelectorAll('.igs-add-slide-bar').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      showTemplatePicker(el, el.dataset.afterSlideId || null);
    });
  });
}

function renderThumb(slide, idx) {
  const isActive = slide.id === _state.activeSlideId;
  const inner = renderSlide(slide, _state.tone, _state.accentColor);
  return `
    <div class="igs-thumb-wrap ${isActive ? 'is-active' : ''}" data-slide-id="${slide.id}" title="Slide ${idx + 1}">
      <div class="igs-thumb-label">${idx + 1}</div>
      <div class="igs-thumb-inner">${inner}</div>
    </div>
  `;
}

/* ─────────────────────────────────────────
   GALLERY PANEL
───────────────────────────────────────── */

function renderGalleryPanel() {
  const panel = byId('igsGalleryPanel');
  if (!panel || !_state) return;

  panel.innerHTML = renderTemplatesSection() + renderDiagramsSection();

  // ── Templates section handlers ───────────────────────────
  panel.querySelectorAll('.igs-gallery-major[data-major="templates"]').forEach(el => {
    el.addEventListener('click', () => {
      _state.templatesOpen = !_state.templatesOpen;
      renderGalleryPanel();
    });
  });
  panel.querySelectorAll('.igs-tpl-cat-header').forEach(el => {
    el.addEventListener('click', () => {
      const cat = el.dataset.cat;
      const key = `tpl_${cat}`;
      _state.openTemplateCats[key] = !_state.openTemplateCats[key];
      renderGalleryPanel();
    });
  });
  panel.querySelectorAll('.igs-tpl-thumb-card').forEach(el => {
    el.addEventListener('click', () => {
      applyTemplateToActiveSlide(el.dataset.tplId);
    });
  });

  // ── Diagrams section handlers ────────────────────────────
  panel.querySelectorAll('.igs-gallery-major[data-major="diagrams"]').forEach(el => {
    el.addEventListener('click', () => {
      _state.diagramsOpen = !_state.diagramsOpen;
      renderGalleryPanel();
    });
  });
  panel.querySelectorAll('.igs-gallery-header').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.section;
      _state.openSections[id] = !_state.openSections[id];
      renderGalleryPanel();
    });
  });
  panel.querySelectorAll('.igs-gallery-item').forEach(el => {
    el.addEventListener('click', () => {
      insertBlockOnActiveSlide(el.dataset.variant, el.dataset.family);
    });
  });
}

/* ── Templates section (above Diagrams) ──────────────────── */

const TEMPLATE_CATEGORIES = [
  { id: 'A', label: 'Blank' },
  { id: 'B', label: 'Accent Image' },
  { id: 'C', label: 'Columns' },
  { id: 'D', label: 'Mixed' },
  { id: 'E', label: 'Special' },
];

function renderTemplatesSection() {
  const open = _state.templatesOpen;
  const body = TEMPLATE_CATEGORIES.map(cat => {
    const tpls = Object.values(TEMPLATES).filter(t => t.category === cat.id);
    const catOpen = !!_state.openTemplateCats[`tpl_${cat.id}`];
    const grid = tpls.map(t => `
      <button class="igs-tpl-thumb-card" data-tpl-id="${t.id}" title="Apply ${t.name}">
        <div class="igs-tpl-thumb-wrap">
          <div class="igs-tpl-thumb-inner">${renderSlideTemplate(t.id)}</div>
        </div>
        <div class="igs-tpl-thumb-meta">
          <span class="igs-tpl-thumb-id">${t.id}</span>
          <span class="igs-tpl-thumb-name">${t.name}</span>
        </div>
      </button>
    `).join('');

    return `
      <div class="igs-tpl-cat ${catOpen ? 'is-open' : ''}" data-cat="${cat.id}">
        <button class="igs-tpl-cat-header" data-cat="${cat.id}">
          <span>${cat.id} · ${cat.label}</span>
          <span class="igs-gallery-toggle">${catOpen ? '▾' : '▸'}</span>
        </button>
        <div class="igs-tpl-cat-grid">${grid}</div>
      </div>
    `;
  }).join('');

  return `
    <button class="igs-gallery-major" data-major="templates">
      <span class="igs-gallery-major-label">Templates</span>
      <span class="igs-gallery-toggle">${open ? '▾' : '▸'}</span>
    </button>
    <div class="igs-gallery-major-body" data-show="${open ? 'true' : 'false'}">
      ${body}
    </div>
  `;
}

function renderDiagramsSection() {
  const open = _state.diagramsOpen;
  const sections = GALLERY.map(group => {
    const isOpen = !!_state.openSections[group.id];
    const items = group.variants.map(v => `
      <button class="igs-gallery-item" data-variant="${v}" data-family="${group.id}" title="Insert ${variantLabel(v)}">
        <span class="igs-gallery-icon" data-family="${group.id}"></span>
        <span class="igs-gallery-name">${variantLabel(v)}</span>
      </button>
    `).join('');

    return `
      <div class="igs-gallery-section ${isOpen ? 'is-open' : ''}" data-section="${group.id}">
        <button class="igs-gallery-header" data-section="${group.id}">
          <span class="igs-gallery-section-label">${group.label}</span>
          <span class="igs-gallery-toggle">${isOpen ? '▾' : '▸'}</span>
        </button>
        <div class="igs-gallery-items">${items}</div>
      </div>
    `;
  }).join('');

  return `
    <button class="igs-gallery-major" data-major="diagrams">
      <span class="igs-gallery-major-label">Diagrams</span>
      <span class="igs-gallery-toggle">${open ? '▾' : '▸'}</span>
    </button>
    <div class="igs-gallery-major-body" data-show="${open ? 'true' : 'false'}">
      ${sections}
    </div>
  `;
}

/* ── Gallery overlay open/close ──
   Opens the right-side gallery panel as a sliding overlay. `which` controls
   which major section ('templates' or 'diagrams') is opened and scrolled into
   view. Clicking the same toggle a second time closes the overlay. ── */

function toggleGalleryOverlay(which) {
  if (!_state) return;
  const gp = byId('igsGalleryPanel');
  const gt = byId('igsGalleryToggles');
  if (!gp || !gt) return;

  const allBtns   = gt.querySelectorAll('.igs-gallery-toggle-btn');
  const targetBtn = gt.querySelector(`.igs-gallery-toggle-btn[data-show="${which}"]`);

  const alreadyOpen = gp.classList.contains('is-open');
  const sameButton  = targetBtn && targetBtn.classList.contains('is-active');

  if (alreadyOpen && sameButton) {
    // Same button clicked twice → close
    closeGalleryOverlay();
    return;
  }

  // Open + activate target button + open the matching major section
  gp.classList.add('is-open');
  document.body.dataset.deckOverlay = 'open';
  allBtns.forEach(b => b.classList.toggle('is-active', b === targetBtn));

  if (which === 'templates') {
    _state.templatesOpen = true;
    _state.diagramsOpen  = false;
  } else if (which === 'diagrams') {
    _state.templatesOpen = false;
    _state.diagramsOpen  = true;
  }
  renderGalleryPanel();
  gp.scrollTop = 0;
}

function closeGalleryOverlay() {
  const gp = byId('igsGalleryPanel');
  const gt = byId('igsGalleryToggles');
  if (gp) gp.classList.remove('is-open');
  if (gt) gt.querySelectorAll('.igs-gallery-toggle-btn').forEach(b => b.classList.remove('is-active'));
  delete document.body.dataset.deckOverlay;
}

/* ── Apply a template to the current slide ───────────────── */

function applyTemplateToActiveSlide(templateId) {
  if (!_state || !templateId) return;
  if (!TEMPLATES[templateId]) return;
  _state.deck = changeSlideTemplate(
    _state.deck,
    _state.activeSlideId,
    templateId,
    getTemplateZones,
  );
  rerenderEverything();
}

/* ─────────────────────────────────────────
   ACTIVE SLIDE (canvas)
───────────────────────────────────────── */

function renderActiveSlide() {
  // Use #outputWrap (which always exists in index.html) instead of #editCanvas
  // (which is created by app.js renderHTML() only after a single-page generation).
  // This is what the user sees in the canvas area in deck mode.
  const wrap = byId('outputWrap');
  if (!wrap || !_state) return;

  // Clear any inline sizing from single-page mode
  wrap.style.cssText = 'width:100%;height:100%;background:transparent;overflow:hidden;';

  const slide = getSlide(_state.deck, _state.activeSlideId);
  if (!slide) {
    wrap.innerHTML = '<div style="padding:40px;color:#999;">No active slide.</div>';
    return;
  }

  // Wrap the slide in a .igs-slide-stage. The stage's width/height are sized
  // to fit the canvas while preserving 16:9; the slide inside is rendered at
  // native 960×540 (so all internal pixel CSS works) but visually scaled via
  // CSS transform to fill the stage exactly.
  const slideHtml = renderSlide(slide, _state.tone, _state.accentColor);
  wrap.innerHTML = `<div class="igs-canvas-wrap"><div class="igs-slide-stage">${slideHtml}</div></div>`;

  fitSlideStage();
  ensureCanvasResizeObserver();

  // Phase 3C — invisible editing: every text node is contenteditable from
  // render time, and the canvas-level input handler is wired exactly once.
  wireCanvasEditingOnce();
  makeSlideTextEditable();
  // Drop any block selection from a prior render
  _hideBlockToolbar();
  if (_state) _state.selected = null;

  updateSlideNav();
}

/* ─────────────────────────────────────────
   CANVAS FIT — keep slide at 16:9, scale to available space
───────────────────────────────────────── */

const SLIDE_W = 960;
const SLIDE_H = 540;
const STAGE_PADDING = 24;  // breathing room around the slide
let _canvasResizeObserver = null;

function fitSlideStage() {
  const wrap  = byId('outputWrap');
  if (!wrap) return;
  const stage = wrap.querySelector('.igs-slide-stage');
  const slide = wrap.querySelector('.igs-canvas-wrap .igs-slide');
  if (!stage || !slide) return;

  const availW = Math.max(0, wrap.clientWidth  - STAGE_PADDING * 2);
  const availH = Math.max(0, wrap.clientHeight - STAGE_PADDING * 2);
  if (availW === 0 || availH === 0) return;

  const scale = Math.min(availW / SLIDE_W, availH / SLIDE_H);
  const w = SLIDE_W * scale;
  const h = SLIDE_H * scale;

  stage.style.width  = w + 'px';
  stage.style.height = h + 'px';
  slide.style.transform = `scale(${scale})`;
  slide.style.transformOrigin = 'top left';
}

function ensureCanvasResizeObserver() {
  if (_canvasResizeObserver) return;
  if (typeof ResizeObserver === 'undefined') return;
  const wrap = byId('outputWrap');
  if (!wrap) return;
  _canvasResizeObserver = new ResizeObserver(() => fitSlideStage());
  _canvasResizeObserver.observe(wrap);
  // Also re-fit on window resize (covers some edge cases)
  window.addEventListener('resize', fitSlideStage);
}

function teardownCanvasResizeObserver() {
  if (_canvasResizeObserver) {
    _canvasResizeObserver.disconnect();
    _canvasResizeObserver = null;
  }
  window.removeEventListener('resize', fitSlideStage);
}

function updateSlideNav() {
  const nav = byId('igsSlideNav');
  if (!nav || !_state) return;
  const idx = _state.deck.slides.findIndex(s => s.id === _state.activeSlideId);
  const total = _state.deck.slides.length;
  const counter = nav.querySelector('.igs-nav-counter');
  if (counter) counter.textContent = `Slide ${idx + 1} of ${total}`;

  const prev = nav.querySelector('.igs-nav-prev');
  const next = nav.querySelector('.igs-nav-next');
  if (prev) prev.disabled = idx <= 0;
  if (next) next.disabled = idx >= total - 1;

  // Wire up once
  if (prev && !prev.dataset.wired) {
    prev.dataset.wired = '1';
    prev.addEventListener('click', () => navigateSlide(-1));
  }
  if (next && !next.dataset.wired) {
    next.dataset.wired = '1';
    next.addEventListener('click', () => navigateSlide(+1));
  }
}

/* ─────────────────────────────────────────
   ACTIONS — slides
───────────────────────────────────────── */

function setActiveSlide(slideId) {
  if (!_state || !slideId) return;
  if (_state.activeSlideId === slideId) return;
  _flushPendingEdit();
  _state.activeSlideId = slideId;
  renderThumbnailPanel();
  renderActiveSlide();
}

function navigateSlide(delta) {
  if (!_state) return;
  const idx = _state.deck.slides.findIndex(s => s.id === _state.activeSlideId);
  const next = Math.max(0, Math.min(_state.deck.slides.length - 1, idx + delta));
  if (next === idx) return;
  setActiveSlide(_state.deck.slides[next].id);
}

function insertSlideAfter(afterSlideId, templateId) {
  if (!_state) return;
  _state.deck = addSlide(_state.deck, templateId, afterSlideId);
  // Activate the new slide (the one after afterSlideId)
  const idx = _state.deck.slides.findIndex(s => s.id === afterSlideId);
  const newSlide = _state.deck.slides[idx + 1];
  if (newSlide) _state.activeSlideId = newSlide.id;
  rerenderEverything();
}

function duplicateActiveSlide() {
  if (!_state) return;
  const id = _state.activeSlideId;
  _state.deck = duplicateSlide(_state.deck, id);
  // Activate the duplicate
  const idx = _state.deck.slides.findIndex(s => s.id === id);
  const dup = _state.deck.slides[idx + 1];
  if (dup) _state.activeSlideId = dup.id;
  rerenderEverything();
}

function deleteActiveSlide() {
  if (!_state) return;
  if (_state.deck.slides.length <= 1) return;
  const id = _state.activeSlideId;
  const idx = _state.deck.slides.findIndex(s => s.id === id);
  _state.deck = removeSlide(_state.deck, id);
  // Activate neighbour
  const nextIdx = Math.min(idx, _state.deck.slides.length - 1);
  _state.activeSlideId = _state.deck.slides[nextIdx].id;
  rerenderEverything();
}

/* ─────────────────────────────────────────
   ACTIONS — blocks
───────────────────────────────────────── */

function insertBlockOnActiveSlide(variant, family) {
  if (!_state) return;
  // Phase 3D — if a replace is in progress, swap the selected block's
  // variant rather than inserting a new block.
  if (_state.replaceMode) {
    if (_replaceSelectedBlockVariant(variant, family)) return;
    // fall through to insert if the replace target was lost
  }
  const slide = getSlide(_state.deck, _state.activeSlideId);
  if (!slide) return;

  const tpl = TEMPLATES[slide.templateId];
  if (!tpl) return;

  // Phase 3B — Smart placement: walk content zones in order, fill the first
  // one with fewer than 3 blocks. Because zones are listed left-to-right in
  // the TEMPLATES metadata, this naturally fills left column first, then
  // right column, then col3 (for C4/C6).
  const contentZones = tpl.zones.filter(z => z.type === 'content');
  if (contentZones.length === 0) {
    flashCanvasMessage('This template has no content zone — pick a Blank slide or a Column slide first.');
    return;
  }

  let targetZone = null;
  for (const z of contentZones) {
    if (blocksInZone(slide, z.name).length < 3) {
      targetZone = z;
      break;
    }
  }
  if (!targetZone) {
    flashCanvasMessage('All content zones are full — insert a new slide for more diagrams.');
    return;
  }

  const items     = placeholderItems(variant);
  const widthTier = zoneWidthTier(slide.templateId, targetZone.name);
  const columns   = pickDefaultColumns(variant, items.length, widthTier);

  const blockDef = {
    type:    'diagram',
    family:  family || VARIANT_FAMILY[variant] || null,
    variant,
    items,
    columns,
    density: 'standard',
    position: { zone: targetZone.name },
    size:     { widthPct: 100, heightPct: null },
  };

  _state.deck = withSlide(_state.deck, slide.id, s => addBlock(s, blockDef));
  rerenderEverything();
}

/**
 * Phase 3B — Width tier classification for a zone on a template.
 * Returns 'full' | 'half' | 'narrow' so pickDefaultColumns can choose
 * a column count that fits without crowding.
 *   full    → ~80%+ slide width (A1, B-templates' content area is ~57%-67%)
 *   half    → ~40-50% slide width (C1, C2 left, C3 right, E3, D1/D2 cols)
 *   narrow  → ~25-35% slide width (C4 cols, C6 cols, B5/B6 narrow accents)
 */
function zoneWidthTier(templateId, zoneName) {
  if (!templateId) return 'full';
  // Three-column templates always render narrow zones
  if (templateId === 'C4' || templateId === 'C6') return 'narrow';
  // D1 / D2 split content area into two columns of ~30% each → narrow
  if ((templateId === 'D1' || templateId === 'D2') && (zoneName === 'col1' || zoneName === 'col2')) {
    return 'narrow';
  }
  // Two-column templates put each column at ~half the slide
  if (
    templateId === 'C1' || templateId === 'C2' || templateId === 'C3' ||
    templateId === 'C5' || templateId === 'E3'
  ) {
    return 'half';
  }
  // B-templates have 57-67% content width — close enough to full
  // A1 Blank is full
  return 'full';
}

function pickDefaultColumns(variant, itemCount, widthTier) {
  const tier = widthTier || 'full';

  // Bullet/single-stack layouts always render 1 column
  if (
    variant === 'large-bullets' || variant === 'arrow-bullets' ||
    variant === 'process-steps' || variant === 'solid-box-small-bullets'
  ) {
    return 1;
  }

  // Compact label-only layouts go wide when there's room
  if (variant === 'pills' || variant === 'slanted-labels' || variant === 'bullseye' || variant === 'pyramid') {
    if (tier === 'narrow') return Math.min(itemCount, 1);
    if (tier === 'half')   return Math.min(itemCount, 2);
    return Math.min(itemCount, 4);
  }
  // Stats and small-bullets work nicely at 4 columns when there's room
  if (variant === 'stats' || variant === 'small-bullets') {
    if (tier === 'narrow') return 1;
    if (tier === 'half')   return Math.min(itemCount, 2);
    return Math.min(itemCount, 4);
  }
  // Box-type variants: scale columns down to fit narrow zones (Section 4.2)
  if (tier === 'narrow') return 1;
  if (tier === 'half')   return Math.min(itemCount, 2);
  // Most box/bullet/sequence layouts at full width: 3 columns is a safe default
  if (itemCount >= 3) return 3;
  return Math.max(1, itemCount);
}

/* ─────────────────────────────────────────
   TEMPLATE PICKER POPOVER
───────────────────────────────────────── */

function showTemplatePicker(anchorEl, afterSlideId) {
  hidePopover();
  hideContextMenu();

  const rect = anchorEl.getBoundingClientRect();
  const pop = document.createElement('div');
  pop.className = 'igs-template-popover';
  pop.style.cssText = `
    position: fixed;
    left: ${Math.round(rect.right + 8)}px;
    top: ${Math.round(rect.top)}px;
    z-index: 10000;
  `;

  // Group templates by category for the picker
  const categories = ['A', 'B', 'C', 'D', 'E'];
  const sections = categories.map(cat => {
    const tpls = Object.values(TEMPLATES).filter(t => t.category === cat);
    const items = tpls.map(t => `
      <button class="igs-tpl-pick" data-tpl-id="${t.id}" title="${t.name}">
        <span class="igs-tpl-pick-id">${t.id}</span>
        <span class="igs-tpl-pick-name">${t.name}</span>
      </button>
    `).join('');
    return `
      <div class="igs-tpl-pick-group" data-cat="${cat}">
        <div class="igs-tpl-pick-cat">Category ${cat}</div>
        <div class="igs-tpl-pick-grid">${items}</div>
      </div>
    `;
  }).join('');

  pop.innerHTML = `
    <div class="igs-tpl-pick-header">Pick a template</div>
    ${sections}
  `;
  document.body.appendChild(pop);
  _state.popover = pop;

  pop.querySelectorAll('.igs-tpl-pick').forEach(el => {
    el.addEventListener('click', () => {
      const tplId = el.dataset.tplId;
      hidePopover();
      insertSlideAfter(afterSlideId, tplId);
    });
  });
}

function hidePopover() {
  if (_state && _state.popover) {
    _state.popover.remove();
    _state.popover = null;
  }
}

/* ─────────────────────────────────────────
   SLIDE CONTEXT MENU (right-click)
───────────────────────────────────────── */

function showSlideContextMenu(slideId, x, y) {
  hidePopover();
  hideContextMenu();
  if (!_state) return;

  const menu = document.createElement('div');
  menu.className = 'igs-context-menu';
  menu.style.cssText = `
    position: fixed; left: ${x}px; top: ${y}px; z-index: 10000;
  `;
  menu.innerHTML = `
    <button data-action="duplicate">Duplicate slide</button>
    <button data-action="delete" ${_state.deck.slides.length <= 1 ? 'disabled' : ''}>Delete slide</button>
  `;
  document.body.appendChild(menu);
  _state.contextMenu = menu;

  menu.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
    setActiveSlide(slideId);
    duplicateActiveSlide();
    hideContextMenu();
  });
  menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
    setActiveSlide(slideId);
    deleteActiveSlide();
    hideContextMenu();
  });
}

function hideContextMenu() {
  if (_state && _state.contextMenu) {
    _state.contextMenu.remove();
    _state.contextMenu = null;
  }
}

/* ─────────────────────────────────────────
   GLOBAL EVENT HANDLERS
───────────────────────────────────────── */

function _onKeyDown(e) {
  if (!_state) return;
  // Don't capture arrows when typing in an input/textarea
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;

  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    navigateSlide(-1);
    e.preventDefault();
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    navigateSlide(+1);
    e.preventDefault();
  } else if (e.key === 'Escape') {
    hidePopover();
    hideContextMenu();
    closeGalleryOverlay();
  }
}

function _onDocumentClick(e) {
  if (!_state) return;
  // Close popover/context menu when clicking outside
  if (_state.popover && !_state.popover.contains(e.target)) {
    // But not if user clicked the "+" bar that opened it (that handler runs first)
    if (!e.target.classList || !e.target.classList.contains('igs-add-slide-bar')) {
      hidePopover();
    }
  }
  if (_state.contextMenu && !_state.contextMenu.contains(e.target)) {
    hideContextMenu();
  }
  // Close the gallery overlay if the click landed outside both the panel and
  // its toggle buttons. Lets the user dismiss it the same way as Gamma.
  const gp = byId('igsGalleryPanel');
  const gt = byId('igsGalleryToggles');
  if (gp && gp.classList.contains('is-open')) {
    const inPanel  = gp.contains(e.target);
    const inToggle = gt && gt.contains(e.target);
    if (!inPanel && !inToggle) closeGalleryOverlay();
  }
}

/* ─────────────────────────────────────────
   RE-RENDER ALL
───────────────────────────────────────── */

function rerenderEverything() {
  if (!_state) return;
  _flushPendingEdit();
  applyAccentVars();
  renderThumbnailPanel();
  renderGalleryPanel();
  renderActiveSlide();
}

/* ─────────────────────────────────────────
   FLASH MESSAGE (canvas hint)
───────────────────────────────────────── */

function flashCanvasMessage(msg) {
  const wrap = byId('outputWrap');
  if (!wrap) return;
  const flash = document.createElement('div');
  flash.className = 'igs-flash-msg';
  flash.textContent = msg;
  wrap.appendChild(flash);
  setTimeout(() => flash.remove(), 2400);
}

/* ─────────────────────────────────────────
   PHASE 3C — INVISIBLE EDITING
   Every text node on the slide is contenteditable from render. The user
   clicks and types — no mode toggle, no edit ceremony. Debounced save
   (300ms) writes back to the data model and refreshes the thumbnail.
───────────────────────────────────────── */

/* All editable diagram-text classes from smart-layouts.js + smart-diagrams.js.
   Mirrors app.js V3_TEXT_SEL but trimmed for deck mode (no chrome elements
   like .ig-title, .ig-callout-* — those don't appear inside slide blocks). */
const SLIDE_TEXT_SEL = [
  // Boxes family
  '.igs-title', '.igs-body', '.igs-circle-num', '.igs-labeled-tag',
  // Bullets family
  '.igs-bl-title', '.igs-bl-body', '.igs-bl-num',
  // Sequence family
  '.igs-tl-title', '.igs-tl-label', '.igs-tl-body',
  '.igs-mtl-title', '.igs-mtl-body',
  '.igs-mtlb-title', '.igs-mtlb-body',
  '.igs-arrow-title', '.igs-arrow-body',
  '.igs-pill', '.igs-slant-body',
  // Numbers family — match the actual classes used by smart-layouts
  '.igs-stat-num', '.igs-stat-label', '.igs-stat-desc',
  '.igs-circstat-num', '.igs-circstat-title', '.igs-circstat-desc',
  '.igs-barstat-num', '.igs-barstat-title', '.igs-barstat-desc',
  '.igs-starrating-score', '.igs-starrating-title', '.igs-starrating-desc',
  '.igs-dotgrid-num', '.igs-dotgrid-lbl', '.igs-dotgrid-desc',
  '.igs-dotline-val', '.igs-dotline-label',
  '.igs-cbl-title', '.igs-cbl-body',
  '.igs-cel-title', '.igs-cel-body',
  // Circles family
  '.igs-cycle-title', '.igs-cycle-body',
  '.igs-flower-title', '.igs-flower-body',
  '.igs-circle-title', '.igs-circle-body',
  '.igs-ring-title', '.igs-ring-body',
  '.igs-semi-title', '.igs-semi-body',
  // Quotes family
  '.igs-qbox-text', '.igs-qbox-attr',
  '.igs-bubble-box', '.igs-bubble-attr',
  // Steps family
  '.igs-stair-title', '.igs-stair-body',
  '.igs-step-title', '.igs-step-body',
  '.igs-boxstep-title', '.igs-boxstep-body',
  '.igs-arrowstep-title', '.igs-arrowstep-body',
  '.igs-stepicon-title', '.igs-stepicon-body',
  '.igs-pyramid-title', '.igs-pyramid-body',
  '.igs-funnel-title', '.igs-funnel-body',
  // Diagrams family (smart-diagrams.js)
  '.igd-title', '.igd-body', '.igd-label',
].join(', ');

/* Class fragments → which item field they edit. Used to map a clicked
   text element to (itemIndex, field) for data-model updates. */
const FIELD_MAP = (() => {
  const m = {
    // Boxes
    'igs-title': 'title', 'igs-body': 'body',
    'igs-circle-num': 'title', 'igs-labeled-tag': 'title',
    // Bullets
    'igs-bl-title': 'title', 'igs-bl-body': 'body', 'igs-bl-num': 'title',
    // Sequence
    'igs-tl-title': 'title', 'igs-tl-label': 'title', 'igs-tl-body': 'body',
    'igs-mtl-title': 'title', 'igs-mtl-body': 'body',
    'igs-mtlb-title': 'title', 'igs-mtlb-body': 'body',
    'igs-arrow-title': 'title', 'igs-arrow-body': 'body',
    'igs-pill': 'title', 'igs-slant-body': 'body',
    // Numbers
    'igs-stat-num': 'title', 'igs-stat-label': 'body', 'igs-stat-desc': 'body',
    'igs-circstat-num': 'title', 'igs-circstat-title': 'body', 'igs-circstat-desc': 'body',
    'igs-barstat-num': 'title', 'igs-barstat-title': 'body', 'igs-barstat-desc': 'body',
    'igs-starrating-score': 'title', 'igs-starrating-title': 'body', 'igs-starrating-desc': 'body',
    'igs-dotgrid-num': 'title', 'igs-dotgrid-lbl': 'body', 'igs-dotgrid-desc': 'body',
    'igs-dotline-val': 'title', 'igs-dotline-label': 'body',
    'igs-cbl-title': 'title', 'igs-cbl-body': 'body',
    'igs-cel-title': 'title', 'igs-cel-body': 'body',
    // Circles
    'igs-cycle-title': 'title', 'igs-cycle-body': 'body',
    'igs-flower-title': 'title', 'igs-flower-body': 'body',
    'igs-circle-title': 'title', 'igs-circle-body': 'body',
    'igs-ring-title': 'title', 'igs-ring-body': 'body',
    'igs-semi-title': 'title', 'igs-semi-body': 'body',
    // Quotes — quote text is the body, attribution is the title
    'igs-qbox-text': 'body', 'igs-qbox-attr': 'title',
    'igs-bubble-box': 'body', 'igs-bubble-attr': 'title',
    // Steps
    'igs-stair-title': 'title', 'igs-stair-body': 'body',
    'igs-step-title': 'title', 'igs-step-body': 'body',
    'igs-boxstep-title': 'title', 'igs-boxstep-body': 'body',
    'igs-arrowstep-title': 'title', 'igs-arrowstep-body': 'body',
    'igs-stepicon-title': 'title', 'igs-stepicon-body': 'body',
    'igs-pyramid-title': 'title', 'igs-pyramid-body': 'body',
    'igs-funnel-title': 'title', 'igs-funnel-body': 'body',
    // Diagrams (igd-*)
    'igd-title': 'title', 'igd-body': 'body', 'igd-label': 'title',
  };
  return m;
})();

/* Item-container class fragments. Used to walk up from a clicked text
   element and find its enclosing item container, then derive the item
   index from sibling position. */
const ITEM_CONTAINER_FRAGMENTS = [
  'igs-card', 'igs-cycle-item', 'igs-flower-petal', 'igs-flower-center',
  'igs-tl-item', 'igs-mtl-item', 'igs-mtlb-item',
  'igs-arrow-item', 'igs-slant-item',
  'igs-stat-col', 'igs-circstat-col', 'igs-barstat-item', 'igs-starrating-item',
  'igs-dotgrid-card', 'igs-dotline-item', 'igs-cbl-item', 'igs-cel-item',
  'igs-circle-item', 'igs-ring-item', 'igs-semi-item',
  'igs-qbox-item', 'igs-bubble-item',
  'igs-stair-item', 'igs-step-item', 'igs-boxstep-item', 'igs-arrowstep-item',
  'igs-stepicon-item', 'igs-pyramid-item', 'igs-funnel-item',
  'igs-bl-large', 'igs-bl-small', 'igs-bl-arrow', 'igs-bl-process', 'igs-bl-boxsmall',
  'igs-pill',
];

/* Number-family text classes — when one of these is edited, call
   IgReactiveVisuals.updateVisualAfterEdit to redraw the bar/star/SVG. */
const NUMBER_TEXT_FRAGMENTS = [
  'igs-circstat-num', 'igs-barstat-num', 'igs-starrating-score',
  'igs-dotgrid-num', 'igs-dotline-val',
];

let _editTimer  = null;     // debounce timer per active edit element
let _editTarget = null;     // tracks the currently-debouncing element
let _editCommit = null;     // commit function for the pending save
let _canvasInputWired = false;

/**
 * Make every text node inside the active slide editable. Called after every
 * renderActiveSlide() so freshly-rendered diagrams are immediately editable.
 */
function makeSlideTextEditable() {
  const wrap = byId('outputWrap');
  if (!wrap) return;
  const slide = wrap.querySelector('.igs-slide');
  if (!slide) return;
  slide.querySelectorAll(SLIDE_TEXT_SEL).forEach(el => {
    if (el.contentEditable !== 'true') el.contentEditable = 'true';
  });
}

/**
 * Wire the canvas-level input/click handlers exactly once. The handlers
 * use event delegation, so they survive renderActiveSlide() replacing the
 * inner HTML.
 */
function wireCanvasEditingOnce() {
  if (_canvasInputWired) return;
  const wrap = byId('outputWrap');
  if (!wrap) return;
  _canvasInputWired = true;

  // Debounced save on every keystroke inside an editable text element
  wrap.addEventListener('input', _onCanvasInput);
  // Detect blank-zone clicks → create free-text element
  wrap.addEventListener('click',  _onCanvasClick);
  // Sanitize empty contenteditable elements so :empty CSS placeholder works
  wrap.addEventListener('input',  _sanitizeEmptyOnInput);
  // Phase 3D — hover state (outline + handle) on diagram blocks
  // mouseover/mouseout bubble (mouseenter/mouseleave do not), so we use
  // them with relatedTarget checks for clean enter/leave semantics.
  wrap.addEventListener('mouseover', _onCanvasMouseOver);
  wrap.addEventListener('mouseout',  _onCanvasMouseOut);
}

function _onCanvasMouseOver(e) {
  const block = e.target && e.target.closest && e.target.closest('.igs-block');
  if (!block) return;
  // Don't highlight text blocks (they aren't selectable diagrams)
  if (block.classList.contains('igs-text-block')) return;
  block.classList.add('igs-block-hover');
}

function _onCanvasMouseOut(e) {
  const block = e.target && e.target.closest && e.target.closest('.igs-block');
  if (!block) return;
  // Only remove hover when the pointer truly leaves the block (relatedTarget
  // is the element pointer is moving to — if it's still inside the block,
  // do nothing).
  const to = e.relatedTarget;
  if (to && block.contains(to)) return;
  block.classList.remove('igs-block-hover');
}

function _onCanvasInput(e) {
  if (!_state) return;
  const el = e.target;
  if (!el || !el.matches) return;

  // Slide-title edits (H2 with data-edit-role="slide-title")
  if (el.matches('h2.igs-slide-title[data-edit-role="slide-title"]')) {
    _scheduleSave(el, () => _commitSlideTitle(el));
    return;
  }
  // Diagram text edits — match any of SLIDE_TEXT_SEL
  if (el.matches(SLIDE_TEXT_SEL)) {
    _scheduleSave(el, () => _commitDiagramText(el));
    return;
  }
  // Free-text element (created on blank-zone click)
  if (el.matches('.igs-free-text-temp')) {
    _scheduleSave(el, () => _commitFreeText(el));
    return;
  }
  // Committed text block (rendered from data model, has data-block-id)
  if (el.matches('.igs-text-block')) {
    _scheduleSave(el, () => _commitTextBlock(el));
    return;
  }
}

/**
 * Sanitize contenteditable elements that look empty (lone <br>, &nbsp;, etc.)
 * so the CSS `:empty::before` placeholder shows correctly.
 */
function _sanitizeEmptyOnInput(e) {
  const el = e.target;
  if (!el || el.nodeType !== 1) return;
  if (!el.hasAttribute('data-placeholder')) return;
  // Strip lone <br> when textContent is empty
  if (el.textContent.length === 0 && el.children.length > 0) {
    el.innerHTML = '';
  }
}

function _scheduleSave(el, commitFn) {
  // If the same element is already debouncing, just reset the timer.
  if (_editTimer) clearTimeout(_editTimer);
  _editTarget = el;
  _editCommit = commitFn;
  _editTimer = setTimeout(() => {
    _editTimer  = null;
    _editTarget = null;
    _editCommit = null;
    try { commitFn(); } catch (err) { /* swallow — never break editing */ }
  }, 300);
}

/**
 * Flush a pending debounced save synchronously. Call this before any operation
 * that replaces the active slide DOM (slide navigation, template change,
 * full re-render) so the user's most recent typing is captured.
 */
function _flushPendingEdit() {
  if (!_editTimer) return;
  clearTimeout(_editTimer);
  const fn = _editCommit;
  _editTimer  = null;
  _editTarget = null;
  _editCommit = null;
  if (fn) {
    try { fn(); } catch (err) {}
  }
}

/* ── Commit handlers ──────────────────────── */

function _commitSlideTitle(el) {
  if (!_state) return;
  const slideEl = el.closest('.igs-slide');
  if (!slideEl) return;
  const slideId = slideEl.getAttribute('data-slide-id');
  if (!slideId) return;
  const newTitle = (el.textContent || '').trim();
  _state.deck = updateSlide(_state.deck, slideId, { title: newTitle });
  // Refresh ONLY the thumbnail for this slide — don't re-render the active
  // slide canvas (would interrupt the user's caret).
  refreshThumbnail(slideId);
}

function _commitDiagramText(el) {
  if (!_state) return;
  const slideEl = el.closest('.igs-slide');
  const blockEl = el.closest('.igs-block');
  if (!slideEl || !blockEl) return;
  const slideId = slideEl.getAttribute('data-slide-id');
  const blockId = blockEl.getAttribute('data-block-id');
  if (!slideId || !blockId) return;

  const mapping = _findItemAndField(el, blockEl);
  if (!mapping || mapping.itemIndex < 0) return;

  const slide = getSlide(_state.deck, slideId);
  if (!slide) return;
  const block = slide.blocks.find(b => b.id === blockId);
  if (!block) return;

  const newText = (el.textContent || '').trim();
  const newItems = block.items.slice();
  if (!newItems[mapping.itemIndex]) return;
  newItems[mapping.itemIndex] = {
    ...newItems[mapping.itemIndex],
    [mapping.field]: newText,
  };

  _state.deck = withSlide(_state.deck, slideId, s =>
    updateBlock(s, blockId, { items: newItems })
  );
  refreshThumbnail(slideId);

  // Wire reactive visuals: bar fill, star count, SVG arc, dot pattern
  if (window.IgReactiveVisuals && _isNumberFamilyText(el)) {
    try { window.IgReactiveVisuals.updateVisualAfterEdit(el); } catch (err) {}
  }
}

function _commitTextBlock(el) {
  if (!_state) return;
  const slideEl = el.closest('.igs-slide');
  if (!slideEl) return;
  const slideId = slideEl.getAttribute('data-slide-id');
  const blockId = el.getAttribute('data-block-id');
  if (!slideId || !blockId) return;
  const newText = (el.textContent || '').trim();
  _state.deck = withSlide(_state.deck, slideId, s =>
    updateBlock(s, blockId, { items: [{ title: '', body: newText }] })
  );
  refreshThumbnail(slideId);
}

function _commitFreeText(el) {
  if (!_state) return;
  const slideEl = el.closest('.igs-slide');
  const zoneEl  = el.closest('.igs-zone-content');
  if (!slideEl || !zoneEl) return;
  const slideId  = slideEl.getAttribute('data-slide-id');
  const zoneName = zoneEl.getAttribute('data-zone');
  const newText  = (el.textContent || '').trim();
  if (!slideId || !zoneName) return;

  // First commit — promote the temp element into a real text block.
  if (!el.dataset.committedBlock) {
    if (!newText) return; // ignore until user actually types
    const slide = getSlide(_state.deck, slideId);
    if (!slide) return;
    let updatedSlide;
    _state.deck = withSlide(_state.deck, slideId, s => {
      updatedSlide = addBlock(s, {
        type: 'text',
        variant: null,
        family: 'text',
        items: [{ title: '', body: newText }],
        position: { zone: zoneName },
        size: { widthPct: 100, heightPct: null },
      });
      return updatedSlide;
    });
    // Mark the temp element so subsequent edits update the same block
    const newBlockId = updatedSlide.blocks[updatedSlide.blocks.length - 1].id;
    el.dataset.committedBlock = newBlockId;
    refreshThumbnail(slideId);
    return;
  }

  // Subsequent edits — patch the block body
  const blockId = el.dataset.committedBlock;
  _state.deck = withSlide(_state.deck, slideId, s =>
    updateBlock(s, blockId, { items: [{ title: '', body: newText }] })
  );
  refreshThumbnail(slideId);
}

/* ── Item / field mapping ─────────────────── */

function _findItemAndField(textEl, blockEl) {
  // Walk up looking for an item-container ancestor inside blockEl
  let cur = textEl;
  while (cur && cur !== blockEl && cur.parentElement) {
    const cls = cur.className || '';
    if (typeof cls === 'string' && _isItemContainer(cls)) {
      // Find this item's index among siblings that are also item containers
      const siblings = Array.from(cur.parentElement.children)
        .filter(c => typeof c.className === 'string' && _isItemContainer(c.className));
      const itemIndex = siblings.indexOf(cur);
      const field = _fieldFromTextClass(textEl.className || '');
      return { itemIndex, field };
    }
    cur = cur.parentElement;
  }
  return null;
}

function _isItemContainer(className) {
  for (const f of ITEM_CONTAINER_FRAGMENTS) {
    if (className.indexOf(f) !== -1) return true;
  }
  return false;
}

function _fieldFromTextClass(className) {
  for (const cls of Object.keys(FIELD_MAP)) {
    if (className.indexOf(cls) !== -1) return FIELD_MAP[cls];
  }
  return 'body';
}

function _isNumberFamilyText(el) {
  const cls = el.className || '';
  for (const f of NUMBER_TEXT_FRAGMENTS) {
    if (cls.indexOf(f) !== -1) return true;
  }
  return false;
}

/* ── Free-text creation on blank-zone click ─ */

function _onCanvasClick(e) {
  if (!_state) return;
  const target = e.target;
  if (!target || !target.matches) return;

  const inEditable = target.closest && target.closest('[contenteditable="true"]');
  const inBlock    = target.closest && target.closest('.igs-block');

  // Universal "click outside a block → deselect" rule. Runs BEFORE the
  // free-text/edit handlers so clicks on blank zone area, accent zones, or
  // anywhere not inside a diagram clear the selection. Toolbar buttons are
  // outside #outputWrap (in document.body) so they don't trigger this.
  if (_state.selected && !inBlock) {
    _deselectBlock();
  }

  // Click inside a contenteditable element — let the browser handle caret
  if (inEditable) return;
  // Click on accent placeholder or interactive UI — ignore
  if (target.closest && target.closest('.igs-accent-placeholder')) return;
  // Click on a diagram block — Phase 3D selection
  if (inBlock) {
    _selectBlock(inBlock);
    return;
  }
  // Click on a content zone's blank area → free-text creation/focus
  const zoneEl = target.closest && target.closest('.igs-zone-content');
  if (zoneEl && zoneEl.getAttribute('data-zone-type') !== 'title-block') {
    _createFreeText(zoneEl, e);
    return;
  }
}

function _createFreeText(zoneEl, evt) {
  if (!_state) return;

  // Only respond to clicks on the zone background or its block-stack — never
  // on a child element (block, accent placeholder, etc.).
  const stackEl = zoneEl.querySelector('.igs-block-stack');
  if (evt.target !== zoneEl && evt.target !== stackEl) return;

  const slideEl  = zoneEl.closest('.igs-slide');
  if (!slideEl) return;
  const slideId  = slideEl.getAttribute('data-slide-id');
  const zoneName = zoneEl.getAttribute('data-zone');
  if (!slideId || !zoneName) return;

  // Rule 1 — at most one free-text per zone. If the zone already has a
  // free-text element (whether the temp draft or an already-committed text
  // block), focus the existing one and place caret at the end. Never create
  // a second.
  const existing = zoneEl.querySelector('.igs-free-text-temp, .igs-text-block');
  if (existing) {
    if (existing.contentEditable !== 'true') existing.contentEditable = 'true';
    existing.focus();
    _placeCaretAtEnd(existing);
    return;
  }

  // Rule 2 — zone capacity. If the zone already holds 3 blocks (the visible
  // cap enforced in slide-renderer), don't add a free text — the zone is
  // full and the free text would push diagrams off the slide.
  const slide = getSlide(_state.deck, slideId);
  if (!slide) return;
  if (blocksInZone(slide, zoneName).length >= 3) {
    flashCanvasMessage('This zone is full — insert a new slide or delete a diagram first.');
    return;
  }

  // Rule 3 — create exactly one free-text element. Becomes a real text
  // block in the data model on first input via _commitFreeText.
  let stack = stackEl;
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'igs-block-stack';
    stack.setAttribute('data-density', 'light');
    zoneEl.appendChild(stack);
  }
  const ft = document.createElement('div');
  ft.className = 'igs-free-text-temp';
  ft.contentEditable = 'true';
  ft.setAttribute('data-placeholder', 'Type here');
  stack.appendChild(ft);
  ft.focus();
}

/**
 * Place the caret at the end of the given contenteditable element.
 */
function _placeCaretAtEnd(el) {
  if (!el) return;
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) {}
}

/* ─────────────────────────────────────────
   PHASE 3D — DIAGRAM SELECTION + DELETE + REPLACE
───────────────────────────────────────── */

function _selectBlock(blockEl) {
  if (!_state) return;
  // Text blocks are always edit-on-click — never select them as diagrams.
  if (blockEl.classList.contains('igs-text-block')) return;

  const slideEl = blockEl.closest('.igs-slide');
  if (!slideEl) return;
  const slideId = slideEl.getAttribute('data-slide-id');
  const blockId = blockEl.getAttribute('data-block-id');
  if (!slideId || !blockId) return;

  // If clicking the already-selected block, no-op
  if (_state.selected &&
      _state.selected.blockId === blockId &&
      _state.selected.slideId === slideId) {
    return;
  }

  _deselectBlock();
  _state.selected = { blockId, slideId };
  blockEl.classList.add('igs-block-selected');
  _showBlockToolbar(blockEl);
}

function _deselectBlock() {
  if (!_state || !_state.selected) return;
  const wrap = byId('outputWrap');
  if (wrap) {
    wrap.querySelectorAll('.igs-block.igs-block-selected').forEach(el =>
      el.classList.remove('igs-block-selected')
    );
  }
  _hideBlockToolbar();
  _state.selected = null;
  // Cancel any pending replace mode if user clicked away
  if (_state.replaceMode) {
    _state.replaceMode = null;
    _flashReplaceModeEnd();
  }
}

function _showBlockToolbar(blockEl) {
  _hideBlockToolbar();
  const tb = document.createElement('div');
  tb.className = 'igs-block-toolbar';
  // Replace icon: two arrows in opposite directions (swap)
  // Delete icon: trash can
  tb.innerHTML = `
    <button data-action="replace" title="Replace with another diagram">
      <svg viewBox="0 0 24 24"><path d="M7 7h10l-3-3M17 17H7l3 3"/></svg>
      Replace
    </button>
    <button data-action="delete" title="Delete this diagram">
      <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/></svg>
      Delete
    </button>
  `;
  const rect = blockEl.getBoundingClientRect();
  tb.style.cssText = `
    position: fixed;
    left: ${Math.round(rect.left)}px;
    top: ${Math.round(Math.max(8, rect.top - 40))}px;
    z-index: 9999;
  `;
  document.body.appendChild(tb);
  tb.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
    e.stopPropagation();
    _deleteSelectedBlock();
  });
  tb.querySelector('[data-action="replace"]').addEventListener('click', (e) => {
    e.stopPropagation();
    _enterReplaceMode();
  });
  _state.blockToolbar = tb;
}

function _hideBlockToolbar() {
  if (_state && _state.blockToolbar) {
    _state.blockToolbar.remove();
    _state.blockToolbar = null;
  }
}

function _deleteSelectedBlock() {
  if (!_state || !_state.selected) return;
  const { slideId, blockId } = _state.selected;
  _state.deck = withSlide(_state.deck, slideId, s => removeBlock(s, blockId));
  _state.selected = null;
  _hideBlockToolbar();
  rerenderEverything();
}

function _enterReplaceMode() {
  if (!_state || !_state.selected) return;
  _state.replaceMode = { ..._state.selected };
  _hideBlockToolbar();
  flashCanvasMessage('Replace mode — pick a diagram from the gallery to swap.');
  // Open the gallery overlay scrolled to diagrams
  toggleGalleryOverlay('diagrams');
}

function _flashReplaceModeEnd() {
  flashCanvasMessage('Replace cancelled.');
}

/**
 * Replace the selected block's variant/family while preserving items.
 * Called by insertBlockOnActiveSlide() when replaceMode is active.
 */
function _replaceSelectedBlockVariant(variant, family) {
  if (!_state || !_state.replaceMode) return false;
  const { slideId, blockId } = _state.replaceMode;
  const slide = getSlide(_state.deck, slideId);
  if (!slide) { _state.replaceMode = null; return false; }
  const block = slide.blocks.find(b => b.id === blockId);
  if (!block) { _state.replaceMode = null; return false; }

  // Pad/trim items to the new variant's fixed-slot count (if any)
  let newItems = block.items.slice();
  const fixed = FIXED_SLOT_COUNT[variant];
  if (fixed !== undefined) {
    while (newItems.length < fixed) newItems.push({ title: '', body: '' });
    if (newItems.length > fixed) newItems = newItems.slice(0, fixed);
  }

  _state.deck = withSlide(_state.deck, slideId, s =>
    updateBlock(s, blockId, {
      variant,
      family: family || VARIANT_FAMILY[variant] || null,
      items: newItems,
    })
  );
  _state.replaceMode = null;
  _state.selected   = null;
  closeGalleryOverlay();
  rerenderEverything();
  return true;
}

/* ─────────────────────────────────────────
   THUMBNAIL REFRESH (lightweight — single slide)
   Used after debounced text saves so the thumbnail reflects the edit
   without re-rendering the active slide canvas (would interrupt the
   user's caret).
───────────────────────────────────────── */

function refreshThumbnail(slideId) {
  if (!_state) return;
  const panel = byId('igsThumbPanel');
  if (!panel) return;
  const cell = panel.querySelector(`.igs-thumb-wrap[data-slide-id="${slideId}"]`);
  if (!cell) return;
  const slide = getSlide(_state.deck, slideId);
  if (!slide) return;
  const inner = renderSlide(slide, _state.tone, _state.accentColor);
  const innerHost = cell.querySelector('.igs-thumb-inner');
  if (innerHost) innerHost.innerHTML = inner;
}

/* ─────────────────────────────────────────
   GALLERY/POPOVER/CONTEXT-MENU CSS
   Specific to the deck-mode UI shell.
───────────────────────────────────────── */

const GALLERY_PANEL_CSS = `
/* ── Thumbnail panel (slim, 60px wide) ── */
#igsThumbPanel {
  background: #F5F6F8;
  border-right: 1px solid #E2E5EA;
  padding: 8px 4px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}
.igs-add-slide-bar {
  width: 50px;
  height: 12px;
  margin: 1px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa3ad;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border-radius: 2px;
  user-select: none;
  transition: background 0.15s;
}
.igs-add-slide-bar:hover {
  background: var(--accent-soft, rgba(37,99,235,0.10));
  color: var(--accent, #2563EB);
}
.igs-thumb-wrap { margin: 2px 0; }

/* ── Right gallery — fixed sliding overlay ──
   Default: translateX(100%) (off-screen to the right).
   .is-open: translateX(0) — slides in from the right edge of the viewport. ── */
#igsGalleryPanel {
  position: fixed;
  top: 52px;            /* below .app-header */
  right: 0;
  bottom: 0;
  width: 280px;
  z-index: 100;
  background: #FAFBFC;
  border-left: 1px solid #E2E5EA;
  padding: 0 0 24px;
  overflow-y: auto;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transform: translateX(100%);
  transition: transform 0.22s ease-out;
  box-shadow: -8px 0 24px rgba(0,0,0,0.08);
}
#igsGalleryPanel.is-open {
  transform: translateX(0);
}

/* ── Gallery toggle buttons — stacked on the right edge.
   When the gallery overlay is open, the buttons slide left so they remain
   visible at the panel's left edge. ── */
#igsGalleryToggles {
  position: fixed;
  top: 88px;
  right: 8px;
  z-index: 110;     /* above the panel so they stay clickable */
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: auto;
  transition: right 0.22s ease-out;
}
body[data-deck-overlay="open"] #igsGalleryToggles {
  right: 288px;     /* panel width 280 + 8px breathing room */
}
.igs-gallery-toggle-btn {
  width: 36px;
  height: 36px;
  background: #fff;
  border: 1px solid #E2E5EA;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1A1A2E;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  transition: all 0.15s;
  padding: 0;
}
.igs-gallery-toggle-btn:hover {
  border-color: var(--accent, #2563EB);
  color: var(--accent, #2563EB);
  box-shadow: 0 4px 10px rgba(0,0,0,0.10);
}
.igs-gallery-toggle-btn.is-active {
  background: var(--accent, #2563EB);
  border-color: var(--accent, #2563EB);
  color: #fff;
}
.igs-gallery-toggle-btn svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.igs-gallery-major {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #F0F2F5;
  border: 0;
  border-bottom: 1px solid #E2E5EA;
  padding: 12px 16px;
  cursor: pointer;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #1A1A2E;
  text-align: left;
}
.igs-gallery-major:hover { background: #E7EAEE; }
.igs-gallery-major-body {
  display: block;
  padding: 8px 0 14px;
  border-bottom: 1px solid #E2E5EA;
}
.igs-gallery-major-body[data-show="false"] { display: none; }

/* Templates section — category groups */
.igs-tpl-cat {
  margin: 0;
}
.igs-tpl-cat-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: 0;
  padding: 8px 16px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4b5563;
  cursor: pointer;
  text-align: left;
}
.igs-tpl-cat-header:hover { background: #EEF1F4; }
.igs-tpl-cat-grid {
  display: none;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 4px 12px 8px;
}
.igs-tpl-cat.is-open .igs-tpl-cat-grid { display: grid; }

.igs-tpl-thumb-card {
  background: #fff;
  border: 1px solid #E2E5EA;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: border-color 0.15s, transform 0.15s;
}
.igs-tpl-thumb-card:hover {
  border-color: var(--accent, #2563EB);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.06);
}
.igs-tpl-thumb-wrap {
  width: 100%;
  height: 56px;        /* matches 16:9 ratio for inner content */
  position: relative;
  overflow: hidden;
  border-radius: 3px;
  background: #fff;
}
.igs-tpl-thumb-inner {
  position: absolute;
  top: 0;
  left: 0;
  width: 960px;
  height: 540px;
  /* The card body width is ~99px; scale = 99/960 ≈ 0.103. Use a CSS variable
     so we can tune later if the panel width changes. */
  transform: scale(0.103);
  transform-origin: top left;
  pointer-events: none;
}
.igs-tpl-thumb-inner .igs-slide {
  pointer-events: none;
}
/* Make content zones visually distinct in the thumbnails (subtle border) */
.igs-tpl-thumb-inner .igs-zone-content {
  outline: 4px solid rgba(0,0,0,0.06);
  outline-offset: -4px;
}
.igs-tpl-thumb-meta {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0 2px;
}
.igs-tpl-thumb-id {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--accent, #2563EB);
}
.igs-tpl-thumb-name {
  font-size: 11px;
  color: #1A1A2E;
  line-height: 1.2;
}
.igs-gallery-section {
  margin: 0;
}
.igs-gallery-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: 0;
  padding: 8px 16px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1A1A2E;
  cursor: pointer;
  text-align: left;
}
.igs-gallery-header:hover { background: #EEF1F4; }
.igs-gallery-toggle { font-size: 11px; color: #6b7280; }
.igs-gallery-items {
  display: none;
  padding: 4px 8px 8px;
}
.igs-gallery-section.is-open .igs-gallery-items {
  display: block;
}
.igs-gallery-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #E2E5EA;
  border-radius: 6px;
  padding: 7px 10px;
  margin: 4px 0;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  color: #1A1A2E;
  transition: border-color 0.15s, background 0.15s;
}
.igs-gallery-item:hover {
  border-color: var(--accent, #2563EB);
  background: var(--accent-soft, rgba(37,99,235,0.06));
}
.igs-gallery-icon {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  flex-shrink: 0;
  background: var(--accent, #2563EB);
  opacity: 0.8;
}
.igs-gallery-icon[data-family="boxes"]     { background: #2563EB; }
.igs-gallery-icon[data-family="bullets"]   { background: #6366F1; }
.igs-gallery-icon[data-family="sequence"]  { background: #F59E0B; }
.igs-gallery-icon[data-family="numbers"]   { background: #10B981; }
.igs-gallery-icon[data-family="circles"]   { background: #EC4899; }
.igs-gallery-icon[data-family="quotes"]    { background: #8B5CF6; }
.igs-gallery-icon[data-family="steps"]     { background: #F97316; }
.igs-gallery-icon[data-family="road"]      { background: #14B8A6; }
.igs-gallery-icon[data-family="target"]    { background: #EF4444; }
.igs-gallery-icon[data-family="hierarchy"] { background: #0EA5E9; }
.igs-gallery-icon[data-family="venn"]      { background: #A855F7; }
.igs-gallery-icon[data-family="process"]   { background: #84CC16; }
.igs-gallery-icon[data-family="business"]  { background: #DC2626; }

.igs-gallery-name { flex: 1; }

/* ── Slide nav ── */
#igsSlideNav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(255,255,255,0.85);
  border-top: 1px solid #E2E5EA;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  color: #1A1A2E;
}
.igs-nav-prev, .igs-nav-next {
  width: 32px;
  height: 32px;
  border: 1px solid #E2E5EA;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  color: #1A1A2E;
}
.igs-nav-prev:disabled, .igs-nav-next:disabled { opacity: 0.4; cursor: not-allowed; }
.igs-nav-prev:hover:not(:disabled),
.igs-nav-next:hover:not(:disabled) {
  border-color: var(--accent, #2563EB);
  color: var(--accent, #2563EB);
}
.igs-nav-counter {
  font-weight: 600;
  letter-spacing: 0.02em;
  min-width: 100px;
  text-align: center;
}

/* ── Template picker popover ── */
.igs-template-popover {
  background: #fff;
  border: 1px solid #E2E5EA;
  border-radius: 8px;
  box-shadow: 0 12px 36px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
  padding: 14px;
  width: 360px;
  max-height: 70vh;
  overflow-y: auto;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.igs-tpl-pick-header {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1A1A2E;
  padding-bottom: 8px;
  border-bottom: 1px solid #E2E5EA;
  margin-bottom: 10px;
}
.igs-tpl-pick-group { margin-bottom: 12px; }
.igs-tpl-pick-cat {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.igs-tpl-pick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.igs-tpl-pick {
  background: #F5F6F8;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 8px 6px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.igs-tpl-pick:hover {
  background: var(--accent-soft, rgba(37,99,235,0.08));
  border-color: var(--accent, #2563EB);
}
.igs-tpl-pick-id {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent, #2563EB);
  letter-spacing: 0.04em;
}
.igs-tpl-pick-name {
  font-size: 12px;
  color: #1A1A2E;
  line-height: 1.25;
}

/* ── Right-click context menu ── */
.igs-context-menu {
  background: #fff;
  border: 1px solid #E2E5EA;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.14);
  padding: 4px 0;
  min-width: 160px;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.igs-context-menu button {
  display: block;
  width: 100%;
  background: transparent;
  border: 0;
  padding: 8px 14px;
  font-family: inherit;
  font-size: 13px;
  color: #1A1A2E;
  text-align: left;
  cursor: pointer;
}
.igs-context-menu button:hover:not(:disabled) {
  background: var(--accent-soft, rgba(37,99,235,0.08));
  color: var(--accent, #2563EB);
}
.igs-context-menu button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Phase 3D — Diagram hover, handle, selection ──
   Block sizes to its content (flex: 0 0 auto in slide-renderer.js), so
   the outline hugs the diagram tightly. outline-offset:8px gives the
   8px breathing room the spec calls for. Outline is not clipped by
   overflow:hidden anywhere because the slot is now overflow:visible. ── */
.igs-block {
  position: relative;
}
.igs-block.igs-block-hover {
  outline: 1px solid rgba(37, 99, 235, 0.35);
  outline-offset: 8px;
  border-radius: 4px;
}
.igs-block.igs-block-selected {
  outline: 2px solid #2563EB;
  outline-offset: 8px;
  border-radius: 4px;
}

/* ── Drag handle ──
   40x16px tab centered above the block, peeking 8px above the outline.
   3 white horizontal lines for grip texture. cursor:grab/grabbing
   gives the affordance even before drag is implemented. ── */
.igs-block-handle {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 16px;
  border-radius: 4px;
  background: var(--accent, #2563EB);
  z-index: 10;
  display: none;
  pointer-events: auto;
  cursor: grab;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.18);
}
.igs-block-handle:active { cursor: grabbing; }
.igs-block-handle-line {
  width: 18px;
  height: 1.5px;
  border-radius: 1px;
  background: rgba(255,255,255,0.85);
  pointer-events: none;
}
.igs-block.igs-block-hover .igs-block-handle,
.igs-block.igs-block-selected .igs-block-handle {
  display: flex;
}

/* ── Resize edge zones (Phase 3.5 affordance, no drag wired yet) ──
   8px wide invisible hit zones on left/right edges. cursor:ew-resize on
   hover. A thin vertical bar shows on hover to indicate grabability. ── */
.igs-block-resize-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  z-index: 8;
  display: none;
  pointer-events: auto;
  cursor: ew-resize;
}
.igs-block-resize-zone.is-left  { left: -6px; }
.igs-block-resize-zone.is-right { right: -6px; }
.igs-block-resize-zone::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 28px;
  border-radius: 2px;
  background: rgba(37, 99, 235, 0.7);
  opacity: 0;
  transition: opacity 0.12s;
}
.igs-block-resize-zone:hover::before { opacity: 1; }
.igs-block.igs-block-hover .igs-block-resize-zone,
.igs-block.igs-block-selected .igs-block-resize-zone {
  display: block;
}

/* Text blocks aren't "diagrams" — no hover affordance, no handles */
.igs-block.igs-text-block .igs-block-handle,
.igs-block.igs-text-block .igs-block-resize-zone {
  display: none !important;
}
.igs-block.igs-text-block.igs-block-hover,
.igs-block.igs-text-block.igs-block-selected {
  outline: none;
}

/* Floating toolbar above the selected diagram */
.igs-block-toolbar {
  display: flex;
  gap: 2px;
  background: var(--accent, #2563EB);
  color: #fff;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.18);
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.igs-block-toolbar button {
  background: transparent;
  border: 0;
  color: #fff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.igs-block-toolbar button:hover {
  background: rgba(255,255,255,0.18);
}
.igs-block-toolbar svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ── Phase 3C — Free-text temp element ──
   Created on blank-zone click. On first input it becomes a real text
   block in the data model. Takes zero space when empty (the placeholder
   appears via the shared [data-placeholder]:empty::before rule and is
   itself zero-width as a CSS pseudo). When non-empty, sizes to its
   content. Never pushes diagrams or titles off the slide. ── */
.igs-free-text-temp {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 16px;
  line-height: 1.55;
  color: var(--text-primary, #1A1A2E);
  outline: none;
  cursor: text;
  width: 100%;
}

/* ── Flash message ── */
.igs-flash-msg {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(26,26,46,0.92);
  color: #fff;
  padding: 10px 18px;
  border-radius: 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  z-index: 9999;
  animation: igs-flash-fade 2.4s ease-out forwards;
}
@keyframes igs-flash-fade {
  0%   { opacity: 0; transform: translateX(-50%) translateY(8px); }
  10%  { opacity: 1; transform: translateX(-50%) translateY(0); }
  85%  { opacity: 1; }
  100% { opacity: 0; }
}
`;

/* ─────────────────────────────────────────
   DOM HELPERS
───────────────────────────────────────── */

function byId(id) {
  return document.getElementById(id);
}
