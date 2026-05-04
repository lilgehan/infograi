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
  addBlock, getSlide, blocksInZone, withSlide, changeSlideTemplate,
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
  const tp = byId('igsThumbPanel');   if (tp) tp.style.display = '';
  const gp = byId('igsGalleryPanel'); if (gp) gp.style.display = '';
  const sn = byId('igsSlideNav');     if (sn) sn.style.display = '';

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

  const tp = byId('igsThumbPanel');   if (tp) { tp.innerHTML = ''; tp.style.display = 'none'; }
  const gp = byId('igsGalleryPanel'); if (gp) { gp.innerHTML = ''; gp.style.display = 'none'; }
  const sn = byId('igsSlideNav');     if (sn) sn.style.display = 'none';

  // Clear the canvas
  const canvas = byId('editCanvas');
  if (canvas) canvas.innerHTML = '';

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
  rerenderEverything();
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
  const canvas = byId('editCanvas');
  if (!canvas || !_state) return;

  // In deck mode the canvas fills its container — clear inline single-page sizing
  canvas.style.cssText = 'width:100%;height:100%;background:transparent;overflow:auto;';

  const slide = getSlide(_state.deck, _state.activeSlideId);
  if (!slide) {
    canvas.innerHTML = '<div style="padding:40px;color:#999;">No active slide.</div>';
    return;
  }

  const slideHtml = renderSlide(slide, _state.tone, _state.accentColor);
  canvas.innerHTML = `<div class="igs-canvas-wrap">${slideHtml}</div>`;

  updateSlideNav();
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
  const slide = getSlide(_state.deck, _state.activeSlideId);
  if (!slide) return;

  const tpl = TEMPLATES[slide.templateId];
  if (!tpl) return;

  // Find the first content-typed zone on the current template
  const targetZone = tpl.zones.find(z => z.type === 'content');
  if (!targetZone) {
    // No content zone (e.g. A2 title slide). Tell the user to switch slides.
    flashCanvasMessage('This template has no content zone — pick a Blank slide or a Column slide first.');
    return;
  }

  const items   = placeholderItems(variant);
  const columns = pickDefaultColumns(variant, items.length);

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

function pickDefaultColumns(variant, itemCount) {
  // Compact label-only layouts go wide
  if (variant === 'pills' || variant === 'slanted-labels' || variant === 'bullseye' || variant === 'pyramid') {
    return Math.min(itemCount, 4);
  }
  // Stats and small-bullets work nicely at 4 columns when there's room
  if (variant === 'stats' || variant === 'small-bullets') return Math.min(itemCount, 4);
  // Most box/bullet/sequence layouts: 3 columns is a safe default
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
  }
}

function _onDocumentClick(e) {
  // Close popover/context menu when clicking outside
  if (_state && _state.popover && !_state.popover.contains(e.target)) {
    // But not if user clicked the "+" bar that opened it (that handler runs first)
    if (!e.target.classList || !e.target.classList.contains('igs-add-slide-bar')) {
      hidePopover();
    }
  }
  if (_state && _state.contextMenu && !_state.contextMenu.contains(e.target)) {
    hideContextMenu();
  }
}

/* ─────────────────────────────────────────
   RE-RENDER ALL
───────────────────────────────────────── */

function rerenderEverything() {
  if (!_state) return;
  applyAccentVars();
  renderThumbnailPanel();
  renderGalleryPanel();
  renderActiveSlide();
}

/* ─────────────────────────────────────────
   FLASH MESSAGE (canvas hint)
───────────────────────────────────────── */

function flashCanvasMessage(msg) {
  const canvas = byId('editCanvas');
  if (!canvas) return;
  const flash = document.createElement('div');
  flash.className = 'igs-flash-msg';
  flash.textContent = msg;
  canvas.appendChild(flash);
  setTimeout(() => flash.remove(), 2400);
}

/* ─────────────────────────────────────────
   GALLERY/POPOVER/CONTEXT-MENU CSS
   Specific to the deck-mode UI shell.
───────────────────────────────────────── */

const GALLERY_PANEL_CSS = `
/* ── Thumbnail panel ── */
#igsThumbPanel {
  background: #F5F6F8;
  border-right: 1px solid #E2E5EA;
  padding: 12px 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}
.igs-add-slide-bar {
  width: 120px;
  height: 14px;
  margin: 2px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa3ad;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border-radius: 3px;
  user-select: none;
  transition: background 0.15s;
}
.igs-add-slide-bar:hover {
  background: var(--accent-soft, rgba(37,99,235,0.10));
  color: var(--accent, #2563EB);
}
.igs-thumb-wrap {
  margin: 2px 0;
}

/* ── Gallery panel ── */
#igsGalleryPanel {
  background: #FAFBFC;
  border-left: 1px solid #E2E5EA;
  padding: 0 0 24px;
  overflow-y: auto;
  font-family: 'Plus Jakarta Sans', sans-serif;
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
