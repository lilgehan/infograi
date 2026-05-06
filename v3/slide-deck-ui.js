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
  addBlock, removeBlock, updateBlock, moveBlock, getSlide, blocksInZone, withSlide,
  changeSlideTemplate, updateSlide, nextBlockOrder,
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

/* ─────────────────────────────────────────
   PHASE 3 UNIFIED INTERACTION STATE
   Single source of truth for every canvas interaction. Every handler
   reads/writes this object — no handler decides on its own.
   Reference: SLIDE-DECK-PHASE3-UNIFIED-PROMPT.md Section A.
───────────────────────────────────────── */

const interactionState = {
  // 'idle' | 'hovering' | 'editingText' | 'selectedBlock'
  // | 'dragging' | 'resizing' | 'thumbnailFocused'
  // (dragging / resizing are wired in Phase F-G — currently unreachable.)
  mode:            'idle',
  hoveredBlockId:  null,
  selectedBlockId: null,
  activeTextEl:    null,
  // Drag/resize fields kept in shape for the deferred phases.
  dragStart:       null,
  resizeStart:     null,
  resizeHandle:    null,
};

function setMode(newMode) {
  if (interactionState.mode === newMode) return;
  // Cleanup when leaving editingText so a stale activeTextEl reference
  // doesn't survive a click on a different block.
  if (interactionState.mode === 'editingText' && newMode !== 'editingText') {
    interactionState.activeTextEl = null;
  }
  interactionState.mode = newMode;
}

function setHovered(blockId) {
  if (interactionState.hoveredBlockId === blockId) return;
  const wrap = byId('outputWrap');
  if (wrap) {
    if (interactionState.hoveredBlockId) {
      const prev = wrap.querySelector(
        `.igs-block-wrapper[data-block-id="${cssEscape(interactionState.hoveredBlockId)}"]`
      );
      if (prev) prev.classList.remove('igs-hover');
    }
    if (blockId) {
      const next = wrap.querySelector(
        `.igs-block-wrapper[data-block-id="${cssEscape(blockId)}"]`
      );
      if (next) {
        next.classList.add('igs-hover');
        _positionGrabBarSmart(next);
      }
    }
  }
  interactionState.hoveredBlockId = blockId;
}

function setSelected(blockId) {
  if (interactionState.selectedBlockId === blockId) {
    // Same block already selected — make sure mode is right.
    setMode('selectedBlock');
    return;
  }
  const wrap = byId('outputWrap');
  if (wrap && interactionState.selectedBlockId) {
    const prev = wrap.querySelector(
      `.igs-block-wrapper[data-block-id="${cssEscape(interactionState.selectedBlockId)}"]`
    );
    if (prev) {
      prev.classList.remove('igs-selected');
      prev.classList.remove('igs-toolbar-below');
    }
  }
  interactionState.selectedBlockId = blockId;
  if (wrap && blockId) {
    const next = wrap.querySelector(
      `.igs-block-wrapper[data-block-id="${cssEscape(blockId)}"]`
    );
    if (next) {
      next.classList.add('igs-selected');
      _positionToolbarSmart(next);
      _positionGrabBarSmart(next);
    }
  }
  setMode(blockId ? 'selectedBlock' : 'idle');
}

/**
 * Toolbar smart positioning — flip the toolbar BELOW the wrapper when
 * there isn't enough vertical clearance above (less than ~80px in slide
 * coordinates). Solves the edge case where a wrapper sits at the very
 * top of a slide with no title row above (A1 first block, E1 quote
 * inside the quote zone, etc.).
 */
function _positionToolbarSmart(wrapper) {
  if (!wrapper) return;
  const slide = wrapper.closest('.igs-slide');
  if (!slide) return;
  const wrapperRect = wrapper.getBoundingClientRect();
  const slideRect   = slide.getBoundingClientRect();
  if (slideRect.height === 0) return;
  const scaleY = slideRect.height / 540;
  const TOOLBAR_NEEDED_ABOVE = 80; // toolbar height ~36 + grab bar 16 + cushion 28
  const availableAbove = (wrapperRect.top - slideRect.top) / scaleY;
  if (availableAbove < TOOLBAR_NEEDED_ABOVE) {
    wrapper.classList.add('igs-toolbar-below');
  } else {
    wrapper.classList.remove('igs-toolbar-below');
  }
}

/**
 * Phase 4 v2.1 — Grab bar smart positioning. Default position is
 * `top: -24px` from the wrapper. When the wrapper is within 24px of the
 * slide's top edge (in slide-coord px), the grab bar would clip outside
 * the slide. In that case, add `.igs-grab-bar-below` so CSS flips the
 * bar to `bottom: -24px` instead. Same pattern as `_positionToolbarSmart`.
 */
function _positionGrabBarSmart(wrapper) {
  if (!wrapper) return;
  const slide = wrapper.closest('.igs-slide');
  if (!slide) return;
  const wrapperRect = wrapper.getBoundingClientRect();
  const slideRect   = slide.getBoundingClientRect();
  if (slideRect.height === 0) return;
  const scaleY = slideRect.height / 540;
  const GRAB_BAR_NEEDED_ABOVE = 28; // 24px bar offset + 4px cushion
  const availableAbove = (wrapperRect.top - slideRect.top) / scaleY;
  if (availableAbove < GRAB_BAR_NEEDED_ABOVE) {
    wrapper.classList.add('igs-grab-bar-below');
  } else {
    wrapper.classList.remove('igs-grab-bar-below');
  }
}

/* ─────────────────────────────────────────
   PHASE F — DRAG-TO-REORDER
   Mouse-down on .igs-grab-bar starts a drag. The wrapper follows the
   cursor via inline transform. A blue insertion line shows the drop
   target. Mouseup commits via slide-deck.moveBlock(). Cmd+Z restores
   the pre-drag deck state (one history snapshot per drag, taken on
   mousedown).
───────────────────────────────────────── */

let _dropLineEl = null;
let _dropTarget = null; // { zone, index } | null

function _startDrag(wrapper, e) {
  if (!_state || !wrapper) return;
  const blockId = wrapper.getAttribute('data-block-id');
  if (!blockId) return;

  const slide = wrapper.closest('.igs-slide');
  if (!slide) return;

  // Phase 4 v2.1 — drag is now meaningful on every slide via cross-slide
  // drop (>50% past slide top/bottom moves to prev/next slide). Removed
  // the v2 single-block-single-zone early-return.

  const slideRect = slide.getBoundingClientRect();
  const scaleY = slideRect.height / 540;
  const scaleX = slideRect.width  / 960;

  // Capture the wrapper's LAYOUT position (no transform applied yet) so
  // the horizontal clamp in _updateDrag doesn't drift across frames.
  const wrapperRectAtStart = wrapper.getBoundingClientRect();
  const layoutLeftSlidePx     = (wrapperRectAtStart.left - slideRect.left) / scaleX;
  const layoutTopSlidePx      = (wrapperRectAtStart.top  - slideRect.top)  / scaleY;
  const wrapperWidthSlidePx   = wrapperRectAtStart.width  / scaleX;
  const wrapperHeightSlidePx  = wrapperRectAtStart.height / scaleY;

  // Snapshot history once at the start of the drag, so Cmd+Z restores
  // the pre-drag arrangement (not intermediate frames).
  _pushHistory();

  setMode('dragging');
  interactionState.dragStart = {
    x: e.clientX,
    y: e.clientY,
    blockId,
    wrapper,
    scaleX,
    scaleY,
    slideRect,
    layoutLeftSlidePx,
    layoutTopSlidePx,
    wrapperWidthSlidePx,
    wrapperHeightSlidePx,
  };

  wrapper.classList.add('igs-dragging');
  // Hide the toolbar / hover outline during drag — let the user see what
  // they're moving without UI clutter.
  wrapper.classList.remove('igs-hover');
  document.body.classList.add('igs-deck-dragging');

  _dropTarget = null;
  _ensureDropLine();
}

function _ensureDropLine() {
  const wrap = byId('outputWrap');
  if (!wrap) return;
  if (!_dropLineEl) {
    _dropLineEl = document.createElement('div');
    _dropLineEl.className = 'igs-drop-line';
    _dropLineEl.style.display = 'none';
    wrap.appendChild(_dropLineEl);
  }
}

/** Hide the drop line visually WITHOUT clearing _dropTarget. Phase 4 v2
 *  drop-target persistence — keep the last valid target alive until
 *  release, so the user doesn't have to perfectly land inside a zone at
 *  the millisecond of mouseup. */
function _hideDropLineVisually() {
  if (_dropLineEl) {
    _dropLineEl.style.display = 'none';
  }
}

/** Clear both the visual drop line AND the logical drop target. Called
 *  on cancel paths (escape, window blur) or during cleanup at release. */
function _hideDropLine() {
  _hideDropLineVisually();
  _dropTarget = null;
}

function _updateDrag(e) {
  const ds = interactionState.dragStart;
  if (!ds) return;

  // Visual: move the dragged wrapper with the cursor (transform in
  // unscaled px because the wrapper is INSIDE the scaled slide).
  let dxScaled = (e.clientX - ds.x) / ds.scaleX;
  const dyScaled = (e.clientY - ds.y) / ds.scaleY;

  // Phase 4 v2.1 — clamp horizontal movement to slide bounds. Vertical is
  // not clamped here because cross-slide drop (in _endDrag) needs the
  // wrapper to be able to extend past the slide's top/bottom by >50% of
  // its own height. The visual left after applying the transform is
  // layoutLeft + dxScaled — bound that within [0, 960 - wrapperWidth].
  const minDx = 0                                      - ds.layoutLeftSlidePx;
  const maxDx = (960 - ds.wrapperWidthSlidePx)         - ds.layoutLeftSlidePx;
  if (dxScaled < minDx) dxScaled = minDx;
  if (dxScaled > maxDx) dxScaled = maxDx;

  ds.wrapper.style.transform = `translate(${dxScaled}px, ${dyScaled}px)`;

  // Phase 5A — drop-target / insertion-line machinery is no longer needed.
  // Drag commits as free position at the wrapper's final visual location
  // (in _endDrag). The wrapper following the cursor is the visual feedback.
}

function _resolveDropTarget(e, draggedBlockId) {
  const slide = byId('outputWrap') && byId('outputWrap').querySelector('.igs-slide');
  if (!slide) return null;

  // Find the content zone under the cursor. Walk every .igs-zone-content
  // and check getBoundingClientRect against the cursor.
  const zones = slide.querySelectorAll('.igs-zone-content[data-zone-type="content"]');
  let targetZoneEl = null;
  for (const z of zones) {
    const r = z.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top  && e.clientY <= r.bottom) {
      targetZoneEl = z;
      break;
    }
  }
  if (!targetZoneEl) return null;

  const targetZoneName = targetZoneEl.getAttribute('data-zone');
  if (!targetZoneName) return null;

  // Block dropping into a zone that already has 3 blocks (excluding the
  // dragged block if it's coming from this zone). Section 12 Rule 3.
  const wrappers = Array.from(targetZoneEl.querySelectorAll('.igs-block-wrapper'))
    .filter(w => !w.classList.contains('igs-dragging'));

  // Determine insertion index by comparing cursor Y to wrapper midpoints.
  // 0 = above first; N = after Nth (0-based).
  let insertIndex = wrappers.length;
  for (let i = 0; i < wrappers.length; i++) {
    const r = wrappers[i].getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) {
      insertIndex = i;
      break;
    }
  }

  return {
    zone:    targetZoneName,
    index:   insertIndex,
    zoneEl:  targetZoneEl,
    full:    wrappers.length >= 3 && _isCrossZoneOrNewSlot(draggedBlockId, targetZoneName, insertIndex, wrappers),
  };
}

function _isCrossZoneOrNewSlot(draggedBlockId, targetZone, insertIndex, wrappers) {
  // The drop is "filling a new slot" if the dragged block isn't already
  // in this zone OR if it is but it's leaving its current slot.
  if (!_state) return false;
  const slide = getSlide(_state.deck, _state.activeSlideId);
  if (!slide) return false;
  const block = slide.blocks.find(b => b.id === draggedBlockId);
  if (!block) return false;
  return (block.position && block.position.zone) !== targetZone;
}

function _showDropLine(target) {
  if (!_dropLineEl) return;
  const wrap = byId('outputWrap');
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();

  // Wrappers in the zone (excluding the dragged one).
  const wrappers = Array.from(target.zoneEl.querySelectorAll('.igs-block-wrapper'))
    .filter(w => !w.classList.contains('igs-dragging'));
  const zoneRect = target.zoneEl.getBoundingClientRect();

  let lineTop;
  if (wrappers.length === 0) {
    lineTop = zoneRect.top + 8;
  } else if (target.index >= wrappers.length) {
    const last = wrappers[wrappers.length - 1].getBoundingClientRect();
    lineTop = last.bottom + 4;
  } else {
    const r = wrappers[target.index].getBoundingClientRect();
    lineTop = r.top - 4;
  }

  // Position relative to #outputWrap (the line's offset parent).
  _dropLineEl.style.display = 'block';
  _dropLineEl.style.left   = (zoneRect.left  - wrapRect.left + 4) + 'px';
  _dropLineEl.style.width  = (zoneRect.width - 8) + 'px';
  _dropLineEl.style.top    = (lineTop - wrapRect.top) + 'px';
  // Tint red when the target is full (drop will be rejected).
  _dropLineEl.style.background = target.full ? 'rgba(220,38,38,0.85)' : '';
}

function _endDrag(e) {
  const ds = interactionState.dragStart;
  if (!ds) {
    setMode('idle');
    return;
  }

  // Phase 5A — drop-target capture removed (drag now commits as free
  // position at the visual drop location, not at a reorder slot).

  // Phase 4 v2.1 — cross-slide drop detection. If the dragged wrapper is
  // more than 50% of its own height past the slide's top or bottom edge,
  // attempt to move the block to the previous / next slide.
  const wrapperFinalRect = ds.wrapper.getBoundingClientRect();
  const slide = ds.wrapper.closest('.igs-slide');
  const slideRect = slide ? slide.getBoundingClientRect() : null;
  let crossSlideDirection = null;
  if (slideRect) {
    const halfH = wrapperFinalRect.height / 2;
    const pastTop    = slideRect.top    - wrapperFinalRect.top;
    const pastBottom = wrapperFinalRect.bottom - slideRect.bottom;
    if (pastTop    > halfH) crossSlideDirection = 'prev';
    else if (pastBottom > halfH) crossSlideDirection = 'next';
  }

  ds.wrapper.style.transform = '';
  ds.wrapper.classList.remove('igs-dragging');
  document.body.classList.remove('igs-deck-dragging');
  _hideDropLine();

  interactionState.dragStart = null;

  // Cross-slide drop attempt takes priority over intra-slide reorder.
  if (crossSlideDirection) {
    if (_attemptCrossSlideDrop(ds.blockId, crossSlideDirection)) {
      return; // success — _attemptCrossSlideDrop handles state + render
    }
    // Cross-slide failed (no neighbouring slide, or target slide has no
    // content zone, or target zone is full). Snap back with a hint.
    flashCanvasMessage(crossSlideDirection === 'prev'
      ? 'No previous slide with available space.'
      : 'No next slide with available space.');
    setMode('selectedBlock');
    setSelected(ds.blockId);
    return;
  }

  // Phase 5A — INTRA-SLIDE drag commits as FREE POSITION at the wrapper's
  // final visual location. This is the change that makes drag actually
  // move blocks (was: drag-to-reorder, which was a no-op for any slide
  // without multiple blocks-in-zone or multiple zones).
  // x, y, width, height are computed in slide-coord px (960 × 540 design
  // space) so they're independent of the canvas's display scale.
  const finalX = (wrapperFinalRect.left - slideRect.left) / ds.scaleX;
  const finalY = (wrapperFinalRect.top  - slideRect.top)  / ds.scaleY;
  const finalW = wrapperFinalRect.width  / ds.scaleX;
  const finalH = wrapperFinalRect.height / ds.scaleY;

  const slideId = _state.activeSlideId;
  _state.deck = withSlide(_state.deck, slideId, s =>
    updateBlock(s, ds.blockId, {
      position: { mode: 'free', x: finalX, y: finalY },
      size:     { widthPx: finalW, heightPx: finalH },
    })
  );
  setMode('idle');
  rerenderEverything();
  setSelected(ds.blockId);
}

/**
 * Phase 5A — Cross-slide drop. When the user drags a block more than 50%
 * past the slide's top or bottom edge, move it to the prev / next slide
 * as a FREE-POSITIONED block (Phase 5A). Returns true on success, false
 * if the caller should fall back to snap-back.
 *
 * The block lands near the top (when dragged past bottom → next slide) or
 * near the bottom (when dragged past top → prev slide) of the target slide,
 * preserving its horizontal position from the source slide.
 *
 * Failure cases (return false):
 *   • no neighbouring slide in that direction
 *   • target slide can't accept blocks (e.g., title or closing slide
 *     where dropping a diagram doesn't make semantic sense)
 */
function _attemptCrossSlideDrop(blockId, direction) {
  if (!_state) return false;
  const slides = _state.deck.slides;
  const currentIdx = slides.findIndex(s => s.id === _state.activeSlideId);
  if (currentIdx === -1) return false;

  const targetIdx = direction === 'prev' ? currentIdx - 1 : currentIdx + 1;
  if (targetIdx < 0 || targetIdx >= slides.length) return false;
  const targetSlide = slides[targetIdx];

  const targetTpl = TEMPLATES[targetSlide.templateId];
  if (!targetTpl) return false;

  // Phase 5A — free-positioned blocks don't need a content zone, but we
  // still gate cross-slide drops on the target slide having SOME way to
  // accept content. Hero / title / closing slides without any content
  // zone still don't accept dropped blocks. Phase 6 may revisit this.
  const hasContentZone = targetTpl.zones.some(z => z.type === 'content');
  if (!hasContentZone) return false;

  // Get the block from the current slide.
  const currentSlide = getSlide(_state.deck, _state.activeSlideId);
  if (!currentSlide) return false;
  const block = currentSlide.blocks.find(b => b.id === blockId);
  if (!block) return false;

  // Compute the landing position on the target slide.
  // Preserve the block's horizontal x (or default to 50 if not set).
  // Vertical: near top when dragged past source bottom, near bottom when
  // dragged past source top. 5% padding from slide edges.
  const SLIDE_PAD_X = 960 * 0.05;
  const SLIDE_PAD_Y = 540 * 0.05;
  const blockW = (block.size && block.size.widthPx)  || 400;
  const blockH = (block.size && block.size.heightPx) || 200;

  // X: keep current x if available, else center horizontally. Clamp to slide.
  let landX = (block.position && typeof block.position.x === 'number')
    ? block.position.x
    : Math.max(SLIDE_PAD_X, (960 - blockW) / 2);
  landX = Math.max(SLIDE_PAD_X, Math.min(landX, 960 - SLIDE_PAD_X - blockW));

  // Y: top of target if landing from above, bottom if landing from below.
  const landY = direction === 'prev'
    ? Math.max(SLIDE_PAD_Y, 540 - SLIDE_PAD_Y - blockH)
    : SLIDE_PAD_Y;

  // Remove from current slide.
  _state.deck = withSlide(_state.deck, _state.activeSlideId, s => removeBlock(s, blockId));
  // Add to target slide as a free-positioned block.
  const newBlockDef = {
    ...block,
    position: { mode: 'free', x: landX, y: landY, zone: 'content' /* nominal */ },
    size: {
      widthPct:  (block.size && block.size.widthPct)  || 100,
      heightPct: (block.size && block.size.heightPct) || null,
      widthPx:   blockW,
      heightPx:  blockH,
    },
  };
  _state.deck = withSlide(_state.deck, targetSlide.id, s => addBlock(s, newBlockDef));

  // Switch to the target slide.
  _state.activeSlideId = targetSlide.id;
  setMode('idle');
  rerenderEverything();
  setSelected(blockId);
  return true;
}

/* ─────────────────────────────────────────
   PHASE G — RESIZE
   Mouse-down on .igs-resize-handle starts a resize. The wrapper grows /
   shrinks live via inline style. Constraints: min 240px width, max =
   parent zone width, max height = available zone height (Rule 15-17).
   Hitting a limit blocks that dimension's growth and red-flashes the
   offending edge for 320ms. Cmd+Z restores the pre-resize state.
───────────────────────────────────────── */

const HANDLE_SIGNS = {
  nw: { dx: -1, dy: -1 },
  n:  { dx:  0, dy: -1 },
  ne: { dx: +1, dy: -1 },
  e:  { dx: +1, dy:  0 },
  se: { dx: +1, dy: +1 },
  s:  { dx:  0, dy: +1 },
  sw: { dx: -1, dy: +1 },
  w:  { dx: -1, dy:  0 },
};
const MIN_BLOCK_WIDTH_PX = 240; // ~25% of 960 (Section 5.2)

function _startResize(wrapper, handleEl, e) {
  if (!_state || !wrapper) return;
  const blockId = wrapper.getAttribute('data-block-id');
  if (!blockId) return;
  const handle = handleEl.getAttribute('data-handle');
  if (!handle || !HANDLE_SIGNS[handle]) return;

  const slide  = wrapper.closest('.igs-slide');
  const slotEl = wrapper.parentElement; // .igs-block-slot in flow mode; .igs-slide in free mode
  if (!slide) return;

  const isFree = wrapper.classList.contains('igs-block-free');

  const slideRect   = slide.getBoundingClientRect();
  const slotRect    = slotEl ? slotEl.getBoundingClientRect() : slideRect;
  const wrapperRect = wrapper.getBoundingClientRect();
  const scaleX = slideRect.width  / 960;
  const scaleY = slideRect.height / 540;
  if (scaleX === 0 || scaleY === 0) return;

  // Snapshot history once at the start of the resize.
  _pushHistory();

  setMode('resizing');
  interactionState.resizeStart = {
    x: e.clientX,
    y: e.clientY,
    blockId,
    wrapper,
    handle,
    isFree,
    scaleX,
    scaleY,
    slideRect,
    // Wrapper start dimensions in slide-coord px.
    startWidth:  wrapperRect.width  / scaleX,
    startHeight: wrapperRect.height / scaleY,
    // Wrapper start position in slide-coord px (used in free mode to update
    // the block's x/y when the user resizes from a left/top handle).
    startX: (wrapperRect.left - slideRect.left) / scaleX,
    startY: (wrapperRect.top  - slideRect.top)  / scaleY,
    // Slot rect — the wrapper's containing block in FLOW mode. CSS interprets
    // `width: X%` as X% of the slot's content box. In free mode the wrapper
    // uses px sizing, so this isn't used — but we keep it for the flow path.
    slotWidthPx: slotRect.width  / scaleX,
  };
  interactionState.resizeHandle = handle;
  document.body.classList.add('igs-deck-resizing');
}

function _updateResize(e) {
  const rs = interactionState.resizeStart;
  if (!rs) return;
  const sign = HANDLE_SIGNS[rs.handle];
  if (!sign) return;

  const dxPx = (e.clientX - rs.x) / rs.scaleX;
  const dyPx = (e.clientY - rs.y) / rs.scaleY;

  // Compute requested new dimensions.
  let newWidthPx  = rs.startWidth  + sign.dx * dxPx;
  let newHeightPx = rs.startHeight + sign.dy * dyPx;

  // Phase 5A — for FREE-mode wrappers, west / north / nw / ne / sw handles
  // also update the wrapper's position so the OPPOSITE edge stays fixed.
  // Compute new x / y here. Flow mode keeps newX = startX, newY = startY.
  let newX = rs.startX;
  let newY = rs.startY;
  if (rs.isFree) {
    // West handle: cursor moves right by dxPx. Width shrinks by dxPx.
    // The right edge stays at startX + startWidth, so:
    //   newX = (startX + startWidth) - newWidthPx = startX + (startWidth - newWidthPx) = startX - sign.dx * dxPx
    // sign.dx = -1 for west handles, so newX = startX + dxPx (cursor moved right → x increases).
    if (sign.dx < 0) newX = rs.startX + dxPx;
    if (sign.dy < 0) newY = rs.startY + dyPx;
  }

  // Slide-edge clamps. Slide is 960 × 540 in design coords; safe area is
  // 5% inset on every side. Silent clamping per Lily's request.
  const SLIDE_PAD_X = 960 * 0.05;
  const SLIDE_PAD_Y = 540 * 0.05;

  if (sign.dx !== 0) {
    if (rs.isFree) {
      // West handle: clamp newX >= 5% padding. Adjust newWidth to keep
      // right edge fixed.
      if (sign.dx < 0) {
        if (newX < SLIDE_PAD_X) {
          const overshoot = SLIDE_PAD_X - newX;
          newX = SLIDE_PAD_X;
          newWidthPx -= overshoot;
        }
        if (newWidthPx < MIN_BLOCK_WIDTH_PX) {
          // Clamp width minimum, then clamp x so right edge stays fixed.
          const overshoot = MIN_BLOCK_WIDTH_PX - newWidthPx;
          newWidthPx = MIN_BLOCK_WIDTH_PX;
          newX -= overshoot;
        }
      } else {
        // East handle in free mode: clamp newWidth to keep right edge
        // within slide right − 5%.
        const maxW = 960 - SLIDE_PAD_X - rs.startX;
        if (newWidthPx > maxW)  newWidthPx = maxW;
        if (newWidthPx < MIN_BLOCK_WIDTH_PX) newWidthPx = MIN_BLOCK_WIDTH_PX;
      }
    } else {
      // Flow mode — east handle only. Max width = slide right − 5% − layout left.
      const maxW = 960 - SLIDE_PAD_X - rs.startX;
      if (newWidthPx > maxW)  newWidthPx = maxW;
      if (newWidthPx < MIN_BLOCK_WIDTH_PX) newWidthPx = MIN_BLOCK_WIDTH_PX;
    }
  }

  if (sign.dy !== 0) {
    if (rs.isFree && sign.dy < 0) {
      // North handle: clamp newY >= 5% padding. Adjust newHeight to keep
      // bottom edge fixed.
      if (newY < SLIDE_PAD_Y) {
        const overshoot = SLIDE_PAD_Y - newY;
        newY = SLIDE_PAD_Y;
        newHeightPx -= overshoot;
      }
      if (newHeightPx < 40) {
        const overshoot = 40 - newHeightPx;
        newHeightPx = 40;
        newY -= overshoot;
      }
    } else {
      // South handle (flow OR free) — clamp newHeight to keep bottom edge
      // within slide bottom − 5%.
      const maxH = 540 - SLIDE_PAD_Y - rs.startY;
      if (newHeightPx > maxH) newHeightPx = maxH;
      if (newHeightPx < 40)   newHeightPx = 40;
    }
  }

  // Apply via inline style.
  if (rs.isFree) {
    // Free mode: px-based size + position.
    if (sign.dx !== 0) {
      rs.wrapper.style.width = `${newWidthPx}px`;
      if (sign.dx < 0) rs.wrapper.style.left = `${newX}px`;
    }
    if (sign.dy !== 0) {
      rs.wrapper.style.height = `${newHeightPx}px`;
      if (sign.dy < 0) rs.wrapper.style.top = `${newY}px`;
    }
  } else {
    // Flow mode: width as % of SLOT (the wrapper's containing block).
    if (sign.dx !== 0) {
      const widthPct = (newWidthPx / rs.slotWidthPx) * 100;
      rs.wrapper.style.width = `${widthPct}%`;
    }
    if (sign.dy !== 0) {
      rs.wrapper.style.height = `${newHeightPx}px`;
    }
  }

  // Stash the latest values so _endResize can persist without re-reading
  // the rect (avoids sub-pixel drift from rect rounding).
  rs.latestWidthPx  = newWidthPx;
  rs.latestHeightPx = newHeightPx;
  rs.latestX        = newX;
  rs.latestY        = newY;
}

function _endResize(/* e */) {
  const rs = interactionState.resizeStart;
  document.body.classList.remove('igs-deck-resizing');
  if (!rs) {
    setMode('idle');
    return;
  }

  const slideId = _state.activeSlideId;
  const blockId = rs.blockId;
  const sign    = HANDLE_SIGNS[rs.handle] || {};

  if (rs.isFree) {
    // Phase 5A — free mode: persist size as px and position (when changed).
    const finalW = rs.latestWidthPx  != null ? rs.latestWidthPx  : rs.startWidth;
    const finalH = rs.latestHeightPx != null ? rs.latestHeightPx : rs.startHeight;
    const finalX = rs.latestX        != null ? rs.latestX        : rs.startX;
    const finalY = rs.latestY        != null ? rs.latestY        : rs.startY;

    _state.deck = withSlide(_state.deck, slideId, s => {
      const block = s.blocks.find(b => b.id === blockId);
      if (!block) return s;
      const newSize = { ...block.size };
      if (sign.dx !== 0) newSize.widthPx  = Math.round(finalW * 10) / 10;
      if (sign.dy !== 0) newSize.heightPx = Math.round(finalH * 10) / 10;
      const newPos = { ...block.position };
      if (sign.dx < 0) newPos.x = Math.round(finalX * 10) / 10;
      if (sign.dy < 0) newPos.y = Math.round(finalY * 10) / 10;
      return updateBlock(s, blockId, { size: newSize, position: newPos });
    });

    // Clear inline overrides — renderer re-applies from data model.
    rs.wrapper.style.width  = '';
    rs.wrapper.style.height = '';
    rs.wrapper.style.left   = '';
    rs.wrapper.style.top    = '';
  } else {
    // Flow mode (legacy) — width as % of slot, height as px.
    const wrapperRect = rs.wrapper.getBoundingClientRect();
    const finalWidthPct  = (wrapperRect.width  / rs.scaleX) / rs.slotWidthPx * 100;
    const finalHeightPx  =  wrapperRect.height / rs.scaleY;

    _state.deck = withSlide(_state.deck, slideId, s => {
      const block = s.blocks.find(b => b.id === blockId);
      if (!block) return s;
      const newSize = { ...block.size };
      if (sign.dx !== 0) newSize.widthPct  = Math.round(finalWidthPct * 10) / 10;
      if (sign.dy !== 0) newSize.heightPct = Math.round(finalHeightPx);
      return updateBlock(s, blockId, { size: newSize });
    });

    rs.wrapper.style.width  = '';
    rs.wrapper.style.height = '';
  }

  interactionState.resizeStart = null;
  interactionState.resizeHandle = null;

  setMode('idle');
  rerenderEverything();
  setSelected(blockId);
}

/* ─────────────────────────────────────────
   PHASE F + G — GLOBAL MOUSEMOVE / MOUSEUP ROUTERS
───────────────────────────────────────── */

function handleGlobalMouseMove(e) {
  if (!_state) return;
  if (interactionState.mode === 'dragging')  _updateDrag(e);
  else if (interactionState.mode === 'resizing') _updateResize(e);
}

function handleGlobalMouseUp(e) {
  if (!_state) return;
  if (interactionState.mode === 'dragging')  _endDrag(e);
  else if (interactionState.mode === 'resizing') _endResize(e);
}

function clearSelection() {
  if (!interactionState.selectedBlockId) {
    if (_state && _state.replaceMode) {
      _state.replaceMode = null;
      _flashReplaceModeEnd();
    }
    return;
  }
  const wrap = byId('outputWrap');
  if (wrap) {
    wrap.querySelectorAll('.igs-block-wrapper.igs-selected').forEach(el => {
      el.classList.remove('igs-selected');
      el.classList.remove('igs-toolbar-below');
    });
  }
  interactionState.selectedBlockId = null;
  if (_state && _state.replaceMode) {
    _state.replaceMode = null;
    _flashReplaceModeEnd();
  }
}

function clearHover() {
  if (!interactionState.hoveredBlockId) return;
  const wrap = byId('outputWrap');
  if (wrap) {
    wrap.querySelectorAll('.igs-block-wrapper.igs-hover').forEach(el =>
      el.classList.remove('igs-hover')
    );
  }
  interactionState.hoveredBlockId = null;
}

/**
 * Minimal CSS.escape polyfill — safer than string interpolation when block IDs
 * could contain unusual characters. Block IDs come from genId() and are normally
 * alphanumeric+underscore, but this is a defense in depth.
 */
function cssEscape(value) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
  return String(value).replace(/([^A-Za-z0-9_-])/g, '\\$1');
}

/* ─────────────────────────────────────────
   DECK-MODE UNDO / REDO HISTORY
   Snapshots the deck (and active slide id) BEFORE every state-mutating
   operation. Cmd+Z restores the most recent snapshot; Cmd+Shift+Z (or
   Cmd+Y) replays the next one. Text-edit keystrokes are NOT pushed —
   the browser's native contenteditable undo handles those — so the deck
   stack stays focused on structural changes (add/delete/reorder slides
   and blocks, template swaps, replace operations).
───────────────────────────────────────── */

const _deckHistory = {
  past:   [],
  future: [],
  max:    50,
};

function _deckDeepClone(value) {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(value); } catch { /* fall through */ }
  }
  return JSON.parse(JSON.stringify(value));
}

/**
 * Snapshot the current deck onto the past stack and clear the redo stack.
 * Call this BEFORE every mutating operation (add/remove slide, add/remove
 * block, template change, replace). The snapshot includes the active slide
 * id so undo restores you to the same view.
 */
function _pushHistory() {
  if (!_state) return;
  const snap = {
    deck: _deckDeepClone(_state.deck),
    activeSlideId: _state.activeSlideId,
  };
  _deckHistory.past.push(snap);
  if (_deckHistory.past.length > _deckHistory.max) {
    _deckHistory.past.shift();
  }
  // A new operation invalidates everything in the redo stack.
  _deckHistory.future = [];
  _updateUndoRedoButtonsExternal();
}

function _restoreFromSnapshot(snap) {
  if (!_state || !snap) return;
  _state.deck = snap.deck;
  // Validate activeSlideId — it may point to a slide that no longer exists.
  if (getSlide(_state.deck, snap.activeSlideId)) {
    _state.activeSlideId = snap.activeSlideId;
  } else if (_state.deck.slides.length > 0) {
    _state.activeSlideId = _state.deck.slides[0].id;
  }
  // Drop selection / hover / mode — they referenced the previous DOM.
  setHovered(null);
  clearSelection();
  setMode('idle');
  interactionState.activeTextEl = null;
  rerenderEverything();
}

/** Public: called by slide-deck-ui internals and by app.js's undo button. */
export function undoDeck() {
  if (!_state) return false;
  if (_deckHistory.past.length === 0) return false;
  // Push the current state onto the redo stack before restoring.
  const current = {
    deck: _deckDeepClone(_state.deck),
    activeSlideId: _state.activeSlideId,
  };
  const prev = _deckHistory.past.pop();
  _deckHistory.future.push(current);
  if (_deckHistory.future.length > _deckHistory.max) {
    _deckHistory.future.shift();
  }
  _restoreFromSnapshot(prev);
  _updateUndoRedoButtonsExternal();
  return true;
}

export function redoDeck() {
  if (!_state) return false;
  if (_deckHistory.future.length === 0) return false;
  const current = {
    deck: _deckDeepClone(_state.deck),
    activeSlideId: _state.activeSlideId,
  };
  const next = _deckHistory.future.pop();
  _deckHistory.past.push(current);
  if (_deckHistory.past.length > _deckHistory.max) {
    _deckHistory.past.shift();
  }
  _restoreFromSnapshot(next);
  _updateUndoRedoButtonsExternal();
  return true;
}

/** Read-only state for app.js to dim undo/redo buttons appropriately. */
export function canUndoDeck() { return _state !== null && _deckHistory.past.length   > 0; }
export function canRedoDeck() { return _state !== null && _deckHistory.future.length > 0; }

/**
 * Reset the history. Called on enter/exit so a fresh deck starts with a
 * clean stack and a previous deck's history doesn't leak into the next.
 */
function _clearDeckHistory() {
  _deckHistory.past   = [];
  _deckHistory.future = [];
}

/**
 * Tell app.js to re-evaluate the undo/redo button dim state. Lazy lookup —
 * app.js owns the function and registers it on `window.IgDeckUndoRedo` if
 * it's available. We keep it loose so slide-deck-ui doesn't hard-depend
 * on app.js.
 */
function _updateUndoRedoButtonsExternal() {
  if (typeof window !== 'undefined' &&
      window.IgDeckUndoRedo &&
      typeof window.IgDeckUndoRedo.refresh === 'function') {
    try { window.IgDeckUndoRedo.refresh(); } catch {}
  }
}
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
  _clearDeckHistory();
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

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('click',   _onDocumentClick, true);
  // Phase F + G — global mousemove/mouseup drive drag-to-reorder and
  // resize. They early-return when mode isn't 'dragging' or 'resizing',
  // so they're cheap when idle.
  window.addEventListener('mousemove', handleGlobalMouseMove);
  window.addEventListener('mouseup',   handleGlobalMouseUp);
}

/**
 * Exit slide deck mode. Clears the panels, removes CSS, releases handlers.
 * The single-page mode UI takes over again.
 */
export function exitSlideDeckMode() {
  if (!_state) return;

  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('click',   _onDocumentClick, true);
  window.removeEventListener('mousemove', handleGlobalMouseMove);
  window.removeEventListener('mouseup',   handleGlobalMouseUp);

  // Reset interaction state and re-arm the canvas wiring flag so re-entry
  // re-attaches handlers cleanly even if #outputWrap is replaced by app.js.
  setHovered(null);
  clearSelection();
  setMode('idle');
  interactionState.activeTextEl = null;
  _canvasInputWired = false;
  _clearDeckHistory();

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

  // Wire thumbnail clicks. tabindex="0" is set in renderThumb so each cell
  // can receive keyboard focus; focus + blur put the panel into / out of
  // 'thumbnailFocused' mode so the keydown router can route Delete to slide
  // deletion (Section C of the spec).
  panel.querySelectorAll('.igs-thumb-wrap').forEach(el => {
    el.addEventListener('click', () => {
      setActiveSlide(el.dataset.slideId);
      // Click also gives the cell focus → enters thumbnailFocused mode.
      try { el.focus({ preventScroll: false }); } catch {}
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showSlideContextMenu(el.dataset.slideId, e.clientX, e.clientY);
    });
    el.addEventListener('focus', () => {
      if (interactionState.mode !== 'editingText') {
        setMode('thumbnailFocused');
      }
    });
    el.addEventListener('blur', () => {
      if (interactionState.mode === 'thumbnailFocused') {
        setMode('idle');
      }
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
    <div class="igs-thumb-wrap ${isActive ? 'is-active' : ''}" data-slide-id="${slide.id}" tabindex="0" role="button" aria-label="Slide ${idx + 1}" title="Slide ${idx + 1}">
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
  _pushHistory();
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

  // Phase 3 Unified Interaction — wire mousemove / mousedown / click /
  // input handlers exactly once. Event delegation survives renderActiveSlide
  // replacing the inner HTML.
  wireUnifiedInteractionOnce();
  makeSlideTextEditable();
  // Drop any block selection / hover from a prior render. The toolbar is
  // now part of the rendered DOM, so it disappears with the old slide
  // automatically — no separate hide call needed.
  setHovered(null);
  clearSelection();
  if (interactionState.mode === 'selectedBlock') setMode('idle');

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
  _pushHistory();
  _state.deck = addSlide(_state.deck, templateId, afterSlideId);
  // Activate the new slide (the one after afterSlideId)
  const idx = _state.deck.slides.findIndex(s => s.id === afterSlideId);
  const newSlide = _state.deck.slides[idx + 1];
  if (newSlide) _state.activeSlideId = newSlide.id;
  rerenderEverything();
}

function duplicateActiveSlide() {
  if (!_state) return;
  _pushHistory();
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
  _pushHistory();
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

  // Section 12.4 Rule 11 — Page overflow.
  // When all content zones are full, auto-create a new slide with the
  // same template and place the new diagram on it. Existing content on
  // the current slide stays put (Rule 14: new slide has no pre-filled
  // title — placeholder shows). The new slide becomes the active one
  // so the user sees the diagram they just added.
  if (!targetZone) {
    const oldSlideId = slide.id;
    _state.deck = addSlide(_state.deck, slide.templateId, oldSlideId);
    const newIdx = _state.deck.slides.findIndex(s => s.id === oldSlideId) + 1;
    const newSlide = _state.deck.slides[newIdx];
    if (newSlide) {
      _state.activeSlideId = newSlide.id;
      flashCanvasMessage('Slide was full — added a new slide for the diagram.');
      // Recursive call now lands on the empty new slide → first content zone wins
      return insertBlockOnActiveSlide(variant, family);
    }
    flashCanvasMessage('Could not auto-create overflow slide.');
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

  _pushHistory();
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

/**
 * Phase 3 Unified Interaction — keyboard router (Section C of the spec).
 * Branches by interactionState.mode so each context handles keys correctly:
 *
 *   editingText       → Enter is boundary-checked; Escape blurs; Delete is
 *                       a normal text-character delete (browser default).
 *   selectedBlock     → Delete/Backspace removes the block; Escape deselects.
 *                       Arrows still navigate slides for keyboard users.
 *   thumbnailFocused  → Delete/Backspace removes the focused slide (min 1
 *                       slide); Arrows navigate thumbnails; Escape returns.
 *   idle              → Arrows navigate slides; Escape closes overlays.
 */
function handleKeyDown(e) {
  if (!_state) return;
  const tag = (e.target && e.target.tagName) || '';
  // Always let regular form fields handle their own keys (API key input, etc.).
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  // Cmd+Z / Cmd+Shift+Z / Cmd+Y — deck-level undo / redo for structural
  // operations (add/delete slide, add/delete block, replace, template
  // change). Inside a contenteditable element, let the browser handle
  // text-level undo natively — don't preventDefault.
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')) {
    if (interactionState.mode === 'editingText' && interactionState.activeTextEl) {
      // Browser owns text-level undo inside contenteditable.
      return;
    }
    e.preventDefault();
    if (e.key === 'y' || e.key === 'Y' || ((e.key === 'z' || e.key === 'Z') && e.shiftKey)) {
      redoDeck();
    } else {
      undoDeck();
    }
    return;
  }

  switch (interactionState.mode) {
    case 'editingText':       handleKeyDownInTextEdit(e);    return;
    case 'selectedBlock':     handleKeyDownOnSelectedBlock(e); return;
    case 'thumbnailFocused':  handleKeyDownOnThumbnail(e);   return;
    default:                  handleKeyDownIdle(e);          return;
  }
}

function handleKeyDownInTextEdit(e) {
  if (e.key === 'Escape') {
    if (interactionState.activeTextEl) {
      try { interactionState.activeTextEl.blur(); } catch {}
    }
    interactionState.activeTextEl = null;
    setMode('idle');
    e.preventDefault();
    return;
  }
  if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
    // Section 12.4 Rule 5 — block Enter at slide bottom. Adding a line that
    // would push content past the slide boundary is rejected silently with
    // a red flash. Nothing moves.
    if (wouldEnterPushPastBoundary(e.target)) {
      e.preventDefault();
      flashSlideBoundary();
      return;
    }
    // Otherwise let the browser insert the newline.
  }
  // Delete / Backspace / character keys: let the browser handle text editing.
}

function handleKeyDownOnSelectedBlock(e) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    _deleteSelectedBlock();
    return;
  }
  if (e.key === 'Escape') {
    clearSelection();
    setMode('idle');
    e.preventDefault();
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    navigateSlide(-1);
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    navigateSlide(+1);
  }
}

function handleKeyDownOnThumbnail(e) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (_state && _state.deck.slides.length > 1) {
      e.preventDefault();
      deleteActiveSlide();
    } else {
      // Last slide — block deletion silently.
      e.preventDefault();
    }
    return;
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    navigateSlide(-1);
    _focusActiveThumbnail();
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    navigateSlide(+1);
    _focusActiveThumbnail();
  } else if (e.key === 'Escape') {
    setMode('idle');
    const wrap = byId('outputWrap');
    if (wrap) {
      try { wrap.focus(); } catch {}
    }
  }
}

function handleKeyDownIdle(e) {
  // Don't capture arrows while a regular contenteditable has focus that we
  // didn't explicitly enter via mousedown (rare path — defensive).
  if (e.target && e.target.isContentEditable) return;

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
    if (interactionState.selectedBlockId) clearSelection();
  }
}

/**
 * Move keyboard focus to the active thumbnail. Called after arrow-key
 * navigation while in thumbnailFocused mode so the focus follows the
 * selection.
 */
function _focusActiveThumbnail() {
  if (!_state) return;
  const panel = byId('igsThumbPanel');
  if (!panel) return;
  const cell = panel.querySelector(
    `.igs-thumb-wrap[data-slide-id="${cssEscape(_state.activeSlideId)}"]`
  );
  if (cell) {
    try { cell.focus({ preventScroll: false }); } catch {}
  }
}

/* ─────────────────────────────────────────
   ENTER BOUNDARY DETECTION (Section 12.4 Rule 5)
   Uses getBoundingClientRect() so the math works under the canvas's
   CSS transform: scale(...). Computed line-height is in unscaled px;
   we multiply by the slide's scale factor to compare against screen-space
   rect coordinates. Per the user's instruction, accuracy over micro-perf.
───────────────────────────────────────── */

function wouldEnterPushPastBoundary(textEl) {
  if (!textEl || !textEl.getBoundingClientRect) return false;
  const slideEl = textEl.closest('.igs-slide');
  if (!slideEl) return false;

  const slideRect = slideEl.getBoundingClientRect();
  const textRect  = textEl.getBoundingClientRect();
  if (slideRect.height === 0) return false;

  // The slide is rendered at 540px native and CSS-scaled. Use the rendered
  // height to derive the actual scale factor, not a hardcoded constant.
  const scaleY = slideRect.height / 540;

  const cs = window.getComputedStyle(textEl);
  let lineHeight = parseFloat(cs.lineHeight);
  if (!isFinite(lineHeight) || isNaN(lineHeight)) {
    const fontSize = parseFloat(cs.fontSize) || 16;
    lineHeight = fontSize * 1.5;
  }
  // lineHeight from getComputedStyle is in unscaled px (the element is INSIDE
  // the scaled .igs-slide so its computed style is pre-transform).
  const visualDelta = lineHeight * scaleY;

  // Slide content area excludes the 5% bottom padding (per spec).
  const slidePadBottom = slideRect.height * 0.05;
  const slideBoundary  = slideRect.bottom - slidePadBottom;

  // Project: caret at textRect.bottom; one new line below puts the bottom
  // edge at textRect.bottom + visualDelta. If that crosses the slide
  // boundary, the Enter is blocked.
  const projectedBottom = textRect.bottom + visualDelta;
  return projectedBottom > slideBoundary;
}

function flashSlideBoundary() {
  const wrap = byId('outputWrap');
  if (!wrap) return;
  const slide = wrap.querySelector('.igs-slide');
  if (!slide) return;
  slide.classList.remove('igs-boundary-flash');
  // Force a reflow so removing+adding restarts the CSS animation.
  void slide.offsetWidth;
  slide.classList.add('igs-boundary-flash');
  setTimeout(() => slide.classList.remove('igs-boundary-flash'), 480);
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
 * Wire the canvas-level interaction handlers exactly once. The handlers
 * use event delegation, so they survive renderActiveSlide() replacing the
 * inner HTML.
 *
 * Phase 3 Unified Interaction — Section B of the spec. Six listeners only:
 *   canvas:  mousemove / mousedown / click / input
 *   document: keydown   (already attached in enterSlideDeckMode)
 * Window-level mousemove + mouseup are reserved for drag/resize (Phase F-G,
 * deferred). All hover detection goes through mousemove + closest() — there
 * are NO mouseenter/mouseleave/mouseover/mouseout listeners on blocks.
 */
function wireUnifiedInteractionOnce() {
  if (_canvasInputWired) return;
  const wrap = byId('outputWrap');
  if (!wrap) return;
  _canvasInputWired = true;

  wrap.addEventListener('mousemove', handleCanvasMouseMove);
  wrap.addEventListener('mousedown', handleCanvasMouseDown);
  wrap.addEventListener('click',     handleCanvasClick);
  wrap.addEventListener('input',     handleCanvasInput);
  // Sanitize lone <br> in contenteditable elements so :empty placeholder works.
  wrap.addEventListener('input',     _sanitizeEmptyOnInput);
}

/* ─────────────────────────────────────────
   PHASE 3 UNIFIED — CANVAS HANDLERS
───────────────────────────────────────── */

/**
 * Hover detection — Section C of the spec. Resolves the nearest
 * `[data-block-id]` ancestor and toggles `.igs-hover` only when the resolved
 * id actually changes. This eliminates the flicker that mouseover/mouseout
 * delegation produced when the cursor moved between text inside the diagram,
 * the diagram background, the grab bar, and the resize handles.
 */
function handleCanvasMouseMove(e) {
  if (!_state) return;
  // Don't update hover during text edit / drag / resize.
  if (interactionState.mode === 'editingText' ||
      interactionState.mode === 'dragging'    ||
      interactionState.mode === 'resizing') {
    return;
  }
  const t = e.target;
  if (!t || !t.closest) return;

  const wrapper = t.closest('.igs-block-wrapper');
  // Treat text blocks (free-text) as non-hoverable diagrams — they have no UI layer.
  const blockId = (wrapper && !wrapper.classList.contains('igs-text-block'))
    ? wrapper.getAttribute('data-block-id')
    : null;

  setHovered(blockId);
}

/**
 * Primary interaction dispatcher — Section C of the spec. Every canvas
 * mousedown is routed here, in this exact order:
 *   1. Toolbar button   → swallow (the click event runs the action)
 *   2. Grab bar         → DRAG (deferred to Phase F)
 *   3. Resize handle    → RESIZE (deferred to Phase G)
 *   4. Contenteditable  → enter editingText
 *   5. Block wrapper    → select the block
 *   6. Nothing matched  → deselect, mode = idle
 */
function handleCanvasMouseDown(e) {
  if (!_state) return;
  const t = e.target;
  if (!t || !t.closest) return;

  // (1) Toolbar buttons — let the click event deliver the action. Don't
  // change selection or trigger any other dispatch path.
  if (t.closest('.igs-block-toolbar')) {
    return;
  }

  // (2) Grab bar — start drag-to-reorder (Phase F).
  const grabBar = t.closest('.igs-grab-bar');
  if (grabBar) {
    e.preventDefault();
    const wrapper = grabBar.closest('.igs-block-wrapper');
    if (wrapper) _startDrag(wrapper, e);
    return;
  }

  // (3) Resize handle — start resize (Phase G).
  const resizeHandle = t.closest('.igs-resize-handle');
  if (resizeHandle) {
    e.preventDefault();
    const wrapper = resizeHandle.closest('.igs-block-wrapper');
    if (wrapper) _startResize(wrapper, resizeHandle, e);
    return;
  }

  // (4) Contenteditable text — Lily-amended Rule 21 (Option B).
  // Original spec: clicking text places caret AND deselects any block.
  // Amended: clicking text inside a diagram block ALSO selects the parent
  // block (toolbar follows the user — Figma/PowerPoint/Canva pattern). The
  // INTERACTION mode stays 'editingText' so Delete deletes characters, not
  // the block. Clicking text outside a diagram (slide title, free-text
  // block, etc.) still deselects any prior block selection.
  const editableEl = t.closest('[contenteditable="true"]');
  if (editableEl) {
    const wrapper = editableEl.closest('.igs-block-wrapper');
    const isDiagramBlock = wrapper && !wrapper.classList.contains('igs-text-block');

    if (isDiagramBlock) {
      const blockId = wrapper.getAttribute('data-block-id');
      if (blockId) {
        // setSelected swaps the .igs-selected class on the wrappers and
        // runs smart toolbar positioning. We then override the mode below
        // so keyboard handling stays in editingText (Delete = chars).
        setSelected(blockId);
      }
    } else if (interactionState.selectedBlockId) {
      // Slide title / free-text / other contenteditable outside a diagram.
      clearSelection();
    }

    interactionState.activeTextEl = editableEl;
    setMode('editingText');
    // Don't preventDefault — let the browser place the caret naturally.
    return;
  }

  // (5) Block — Rule 19. Select on mousedown so the toolbar appears
  // immediately (no waiting for click). Text blocks (free-text) are
  // edit-only and don't get a selection state.
  const wrapper = t.closest('.igs-block-wrapper');
  if (wrapper) {
    if (wrapper.classList.contains('igs-text-block')) {
      // Text block clicked outside its contenteditable area (rare —
      // text blocks ARE the contenteditable element). Treat as text edit.
      if (interactionState.selectedBlockId) clearSelection();
      interactionState.activeTextEl = wrapper;
      setMode('editingText');
      return;
    }
    const blockId = wrapper.getAttribute('data-block-id');
    if (blockId) {
      setSelected(blockId);
      // Note: do NOT preventDefault — clicking on a diagram should still
      // place a caret if the click lands on a text node (handled by case 4
      // before we get here, but this guard is defense in depth).
    }
    return;
  }

  // (6) Nothing matched — deselect any current selection, return to idle.
  // Section 12 Rule 20. The click event will then handle free-text creation
  // if the click landed in a content zone's blank area.
  if (interactionState.selectedBlockId) {
    clearSelection();
  }
  if (interactionState.mode !== 'idle') {
    setMode('idle');
  }
}

/**
 * Canvas click — runs after mousedown + mouseup. The mousedown dispatcher
 * has already handled selection and text-edit transitions. The click handler
 * is responsible for two things only:
 *   1. Toolbar button actions (delete / replace).
 *   2. Free-text creation when the click lands on a content zone's blank
 *      area (Section 12 Rule 6).
 */
function handleCanvasClick(e) {
  if (!_state) return;
  const t = e.target;
  if (!t || !t.closest) return;

  // (1) Toolbar buttons — execute the action. The toolbar lives inside the
  // selected wrapper, so we already have a valid selection.
  const tbBtn = t.closest('.igs-block-toolbar button');
  if (tbBtn) {
    const action = tbBtn.getAttribute('data-action');
    if (action === 'delete') {
      _deleteSelectedBlock();
    } else if (action === 'replace') {
      _enterReplaceMode();
    }
    e.stopPropagation();
    return;
  }

  // (2) Free-text creation — only when the user just clicked an empty zone.
  // Skip when we're now editing text or holding a selection — those are not
  // free-text-creation contexts.
  if (interactionState.mode === 'editingText') return;
  if (interactionState.mode === 'selectedBlock') return;

  if (t.closest('.igs-accent-placeholder')) return;
  if (t.closest('.igs-block-wrapper')) return;
  if (t.closest('[contenteditable="true"]')) return;

  const zoneEl = t.closest('.igs-zone-content');
  if (zoneEl && zoneEl.getAttribute('data-zone-type') !== 'title-block') {
    _createFreeText(zoneEl, e);
  }
}

/**
 * Canvas input dispatcher — debounced save on every keystroke inside an
 * editable text element. Routes by element role:
 *   - hero / compact slide title (H1 or H2 with data-edit-role="slide-title")
 *   - hero subtitle (data-edit-role="slide-subtitle")
 *   - hero CTA span (data-edit-role="slide-cta")
 *   - any diagram text class (SLIDE_TEXT_SEL)
 *   - free-text temp element
 *   - committed text block
 */
function handleCanvasInput(e) {
  if (!_state) return;
  const el = e.target;
  if (!el || !el.matches) return;

  // Slide-title edits — match by data-edit-role so this works for both
  // compact title rows (H2) and hero/special title slides (H1).
  if (el.matches('[data-edit-role="slide-title"]')) {
    _scheduleSave(el, () => _commitSlideTitle(el));
    return;
  }
  if (el.matches('[data-edit-role="slide-subtitle"]')) {
    _scheduleSave(el, () => _commitSlideSubtitle(el));
    return;
  }
  if (el.matches('[data-edit-role="slide-cta"]')) {
    _scheduleSave(el, () => _commitSlideCta(el));
    return;
  }
  if (el.matches(SLIDE_TEXT_SEL)) {
    _scheduleSave(el, () => _commitDiagramText(el));
    return;
  }
  if (el.matches('.igs-free-text-temp')) {
    _scheduleSave(el, () => _commitFreeText(el));
    return;
  }
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

/**
 * Commit edits to the hero subtitle (A2 / A3 / A4 / E1 / E2 / E6).
 * Phase 3 Unified Interaction — every text element on every template is
 * now editable, so subtitle edits flow back to the data model the same way
 * title edits do.
 */
function _commitSlideSubtitle(el) {
  if (!_state) return;
  const slideEl = el.closest('.igs-slide');
  if (!slideEl) return;
  const slideId = slideEl.getAttribute('data-slide-id');
  if (!slideId) return;
  const newSubtitle = (el.textContent || '').trim();
  _state.deck = updateSlide(_state.deck, slideId, { subtitle: newSubtitle });
  refreshThumbnail(slideId);
}

/**
 * Commit edits to the CTA button text on E6 (Call to Action). The data
 * model field is `ctaLabel`.
 */
function _commitSlideCta(el) {
  if (!_state) return;
  const slideEl = el.closest('.igs-slide');
  if (!slideEl) return;
  const slideId = slideEl.getAttribute('data-slide-id');
  if (!slideId) return;
  const newCta = (el.textContent || '').trim();
  _state.deck = updateSlide(_state.deck, slideId, { ctaLabel: newCta });
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

/* ── Free-text creation on blank-zone click ─
   The legacy `_onCanvasClick` was replaced in Phase 3 Unified Interaction
   by `handleCanvasMouseDown` (selection / text-edit dispatcher) and
   `handleCanvasClick` (toolbar buttons + free-text creation only).
   Free-text creation itself lives in `_createFreeText` below. */

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
    interactionState.activeTextEl = existing;
    setMode('editingText');
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
  // Section 12 Rule 6 — invisible cursor: zero-height contenteditable
  // becomes visible only when focused. No visible placeholder text. The
  // browser's native caret indicates the editing position.
  const ft = document.createElement('div');
  ft.className = 'igs-free-text-temp';
  ft.contentEditable = 'true';
  stack.appendChild(ft);
  ft.focus();
  interactionState.activeTextEl = ft;
  setMode('editingText');
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

/**
 * Phase 3 Unified Interaction — selection helpers.
 * The toolbar is part of the rendered DOM (inside .igs-block-ui), so its
 * visibility is class-driven via CSS — there's no DOM manipulation needed
 * here beyond delegating to setSelected/clearSelection. Kept as thin
 * wrappers so call sites remain readable.
 */
function _selectBlock(blockEl) {
  if (!_state || !blockEl) return;
  if (blockEl.classList.contains('igs-text-block')) return;
  const blockId = blockEl.getAttribute('data-block-id');
  if (!blockId) return;
  setSelected(blockId);
}

function _deselectBlock() {
  clearSelection();
  if (interactionState.mode === 'selectedBlock') setMode('idle');
}

/** Toolbar visibility is now class-driven (.igs-selected on the wrapper). */
function _showBlockToolbar(/* blockEl */) { /* no-op — kept for backward compat */ }
function _hideBlockToolbar()              { /* no-op — kept for backward compat */ }

function _deleteSelectedBlock() {
  if (!_state) return;
  const blockId = interactionState.selectedBlockId;
  if (!blockId) return;
  const slideId = _state.activeSlideId;
  if (!slideId) return;
  _pushHistory();
  _state.deck = withSlide(_state.deck, slideId, s => removeBlock(s, blockId));
  clearSelection();
  setMode('idle');
  rerenderEverything();
}

function _enterReplaceMode() {
  if (!_state) return;
  const blockId = interactionState.selectedBlockId;
  if (!blockId) return;
  _state.replaceMode = { blockId, slideId: _state.activeSlideId };
  flashCanvasMessage('Replace mode — pick a diagram from the gallery to swap.');
  // Open the gallery overlay scrolled to diagrams.
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

  _pushHistory();
  _state.deck = withSlide(_state.deck, slideId, s =>
    updateBlock(s, blockId, {
      variant,
      family: family || VARIANT_FAMILY[variant] || null,
      items: newItems,
    })
  );
  _state.replaceMode = null;
  clearSelection();
  setMode('idle');
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

/* ── Phase 3 Unified Interaction — block wrapper, hover, selection ──
   The block wrapper hugs its diagram via inline-flex column. Hover and
   selected states use outline + outline-offset:8px so there's 8px of
   breathing room between the diagram and the visible border. The slot
   wrapper is overflow:visible so handles peek outside cleanly.

   Class hierarchy on the wrapper:
     .igs-block-wrapper                 — base
     .igs-block-wrapper.igs-hover       — pointer is over this block
     .igs-block-wrapper.igs-selected    — block is selected (mouse-released)
   Grab bar shows in BOTH states. Resize handles + toolbar show only when
   selected. Section 12.6 Rules 18 + 19 + 22. ── */
.igs-block-wrapper {
  display: inline-flex;
  flex-direction: column;
  width: 100%;
  position: relative;
}
.igs-block-wrapper.igs-hover {
  outline: 2px solid rgba(37, 99, 235, 0.30);
  outline-offset: 8px;
  border-radius: 4px;
}
.igs-block-wrapper.igs-selected {
  outline: 2px solid #2563EB;
  outline-offset: 8px;
  border-radius: 4px;
}

/* ── Interaction UI layer ──
   Holds grab bar + 8 resize handles + toolbar. Hidden by default; shown
   as a unit on hover and selection. NEVER contains contenteditable
   elements — clicking anything in here triggers selection/drag/resize,
   never text editing. The layer itself is pointer-events:none so it
   doesn't block clicks from reaching the diagram content underneath;
   each visible UI element re-enables pointer-events on itself. ── */
.igs-block-ui {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}
/* Hover shows grab bar only. Selected shows everything in the UI layer. */
.igs-block-wrapper.igs-hover     .igs-grab-bar,
.igs-block-wrapper.igs-selected  .igs-grab-bar { display: flex; }
.igs-block-wrapper.igs-selected  .igs-resize-handle,
.igs-block-wrapper.igs-selected  .igs-block-toolbar { display: flex; }

/* ── Grab bar (Rule 18) ──
   40x16 tab above the diagram, 24px above the wrapper edge so it sits
   above the outline. Grip texture is 3 white horizontal lines. cursor:grab
   on hover, cursor:grabbing on mousedown. Drag-to-reorder is wired in
   Phase F (deferred). ── */
.igs-grab-bar {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 16px;
  border-radius: 4px;
  background: var(--accent, #2563EB);
  z-index: 13;
  display: none;
  pointer-events: auto;
  cursor: grab;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.18);
}
.igs-grab-bar:active { cursor: grabbing; }
.igs-grab-bar-line {
  width: 18px;
  height: 1.5px;
  border-radius: 1px;
  background: rgba(255,255,255,0.9);
  pointer-events: none;
}

/* Phase 4 v2.1 — smart grab-bar position. When the wrapper is within
   ~24px of the slide top (no room for the bar above), JS adds
   .igs-grab-bar-below to flip the bar below the wrapper instead. */
.igs-block-wrapper.igs-grab-bar-below .igs-grab-bar {
  top: auto;
  bottom: -24px;
}

/* ── Resize handles (Rule 22) ──
   Eight 8px circles positioned on the selection outline (8px outside the
   diagram edge): 4 corners + 4 edge midpoints. Each circle has its own
   cursor for the grow direction it represents — exactly like PPT/Figma.
   Visible only when the diagram is selected. Drag wiring is deferred to
   Phase G. ── */
.igs-resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #ffffff;
  border: 1px solid #2563EB;
  border-radius: 50%;
  z-index: 12;
  display: none;
  pointer-events: auto;
  box-sizing: border-box;
}
/* corners */
.igs-resize-handle[data-handle="nw"] { top: -12px;     left: -12px;                                cursor: nwse-resize; }
.igs-resize-handle[data-handle="ne"] { top: -12px;     right: -12px;                               cursor: nesw-resize; }
.igs-resize-handle[data-handle="se"] { bottom: -12px;  right: -12px;                               cursor: nwse-resize; }
.igs-resize-handle[data-handle="sw"] { bottom: -12px;  left: -12px;                                cursor: nesw-resize; }
/* edge midpoints */
.igs-resize-handle[data-handle="n"]  { top: -12px;     left: 50%;   transform: translateX(-50%);  cursor: ns-resize; }
.igs-resize-handle[data-handle="s"]  { bottom: -12px;  left: 50%;   transform: translateX(-50%);  cursor: ns-resize; }
.igs-resize-handle[data-handle="w"]  { top: 50%;       left: -12px; transform: translateY(-50%);  cursor: ew-resize; }
.igs-resize-handle[data-handle="e"]  { top: 50%;       right: -12px;transform: translateY(-50%);  cursor: ew-resize; }

/* ── Phase 5A — handles per mode ──
   FLOW (default): wrapper is in a flex column, anchored top-left. Only
   e / s / se handles work (they grow rightward / downward — directions
   the layout naturally allows). The other 5 handles are hidden because
   left / top edges can't move independently in flex.
   FREE (.igs-block-free): wrapper is absolutely positioned with its own
   x / y. All 8 handles work — _updateResize moves x / y for w / n / nw /
   ne / sw handles together with width / height. */
.igs-block-wrapper:not(.igs-block-free) .igs-resize-handle[data-handle="nw"],
.igs-block-wrapper:not(.igs-block-free) .igs-resize-handle[data-handle="n"],
.igs-block-wrapper:not(.igs-block-free) .igs-resize-handle[data-handle="ne"],
.igs-block-wrapper:not(.igs-block-free) .igs-resize-handle[data-handle="w"],
.igs-block-wrapper:not(.igs-block-free) .igs-resize-handle[data-handle="sw"] {
  display: none !important;
}

/* Text blocks are edit-only — no hover, selection, or interaction UI */
.igs-block-wrapper.igs-text-block .igs-block-ui,
.igs-block-wrapper.igs-text-block .igs-grab-bar,
.igs-block-wrapper.igs-text-block .igs-resize-handle,
.igs-block-wrapper.igs-text-block .igs-block-toolbar {
  display: none !important;
}
.igs-block-wrapper.igs-text-block.igs-hover,
.igs-block-wrapper.igs-text-block.igs-selected {
  outline: none;
}

/* ── Toolbar (Section 12.6 Rule 19) ──
   Positioned 64px above the wrapper top so it clears the grab bar (top:-24,
   height:16, padding:4 ≈ ~32px tall toolbar → bottom edge at -32, leaving
   an 8px gap above the grab bar's top edge at -24). Test scenario 8:
   "Grab bar is always visible and never covered by toolbar". Lives inside
   .igs-block-ui so it scales with the slide and clicks on it stay inside
   the wrapper (don't trigger deselection). ── */
.igs-block-toolbar {
  position: absolute;
  top: -64px;
  left: 50%;
  transform: translateX(-50%);
  display: none;
  gap: 2px;
  background: var(--accent, #2563EB);
  color: #fff;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.18);
  font-family: 'Plus Jakarta Sans', sans-serif;
  white-space: nowrap;
  z-index: 14;
  pointer-events: auto;
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
