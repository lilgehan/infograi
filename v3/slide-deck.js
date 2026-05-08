/**
 * Infogr.ai v3 — Slide Deck Data Model (Phase 1)
 *
 * Immutable data layer for multi-slide decks.
 * All exported mutators return NEW deck/slide objects — never mutate inputs.
 *
 * Reference: SLIDE-DECK-PLAN.md
 *
 * Schema:
 *   Deck   { id, title, theme, size, accentColor, slides[] }
 *   Slide  { id, templateId, title, blocks[] }
 *   Block  { id, type, family, variant, items[], columns, density,
 *            position: { zone, order }, size: { widthPct, heightPct } }
 */

/* ─────────────────────────────────────────
   ID GENERATION
───────────────────────────────────────── */

function genId(prefix) {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}_${time}${rand}`;
}

/* ─────────────────────────────────────────
   DECK CREATION
───────────────────────────────────────── */

/**
 * Create a new empty deck. Caller is expected to seed slides via addSlide().
 *
 * @param {string} title         — deck title (also used as default title-slide text)
 * @param {string} theme         — tone id: 'professional' | 'bold' | 'minimal' | 'playful'
 * @param {string} accentColor   — hex color, e.g. '#2563EB'
 * @returns {object} new deck
 */
export function createDeck(title, theme, accentColor) {
  return {
    id:          genId('deck'),
    title:       title || '',
    theme:       theme || 'professional',
    size:        'landscape',
    accentColor: accentColor || '#2563EB',
    slides:      [],
  };
}

/* ─────────────────────────────────────────
   SLIDE OPERATIONS
───────────────────────────────────────── */

/**
 * Append or insert a slide. Returns a new deck.
 *
 * @param {object}      deck
 * @param {string}      templateId      — e.g. 'A1', 'B3'
 * @param {string|null} afterSlideId    — insert after this slide id, or null/undefined to append
 * @param {object}      [extra]         — optional initial fields ({ title })
 * @returns {object} new deck
 */
export function addSlide(deck, templateId, afterSlideId, extra) {
  const newSlide = createSlide(templateId, extra);
  const nextSlides = deck.slides.slice();

  if (!afterSlideId) {
    nextSlides.push(newSlide);
  } else {
    const idx = nextSlides.findIndex(s => s.id === afterSlideId);
    if (idx === -1) {
      nextSlides.push(newSlide);
    } else {
      nextSlides.splice(idx + 1, 0, newSlide);
    }
  }

  return { ...deck, slides: nextSlides };
}

/**
 * Build a fresh slide object. Internal helper, exported for tests.
 */
export function createSlide(templateId, extra) {
  const ex = extra || {};
  // Phase 8 Wave 1 — extended slide schema to carry through:
  //   subtitle  — already documented in CODEBASE.md but was dropped here
  //   ctaLabel  — same — only used by E6 template's CTA button text
  //   eyebrow   — { icon, label } small editorial pill above the title
  //   decor     — string id of a background-decoration variant
  // None of these are required; templates that don't set them get default
  // rendering and are unaffected.
  return {
    id:           genId('slide'),
    templateId:   templateId || 'A1',
    title:        ex.title    || '',
    subtitle:     (ex.subtitle !== undefined && ex.subtitle !== null) ? ex.subtitle : null,
    ctaLabel:     (ex.ctaLabel !== undefined && ex.ctaLabel !== null) ? ex.ctaLabel : null,
    eyebrow:      ex.eyebrow  || null,
    decor:        ex.decor    || null,
    /* Phase 8 Wave 3 fix — optional per-zone headers (e.g. comparison
       column titles "What's working" / "What needs attention"). Map of
       zone-name → small heading string. */
    zoneHeaders:  ex.zoneHeaders || null,
    blocks:       [],
  };
}

/**
 * Remove a slide by id. Refuses to remove the last remaining slide
 * — returns the deck unchanged in that case.
 */
export function removeSlide(deck, slideId) {
  if (deck.slides.length <= 1) return deck;
  const nextSlides = deck.slides.filter(s => s.id !== slideId);
  if (nextSlides.length === deck.slides.length) return deck;
  return { ...deck, slides: nextSlides };
}

/**
 * Reorder slides to match the given id list. Ids not present are ignored.
 * Slides absent from the order list are appended in their original order.
 */
export function reorderSlides(deck, slideIds) {
  const byId = new Map(deck.slides.map(s => [s.id, s]));
  const ordered = [];
  const seen = new Set();

  for (const id of slideIds) {
    const slide = byId.get(id);
    if (slide && !seen.has(id)) {
      ordered.push(slide);
      seen.add(id);
    }
  }
  // Append any leftovers in original order
  for (const slide of deck.slides) {
    if (!seen.has(slide.id)) ordered.push(slide);
  }

  return { ...deck, slides: ordered };
}

/**
 * Duplicate a slide and insert the copy immediately after the source.
 * The copy gets a new slide id; every block inside also gets a fresh id
 * so block-id references remain unique across the deck.
 */
export function duplicateSlide(deck, slideId) {
  const idx = deck.slides.findIndex(s => s.id === slideId);
  if (idx === -1) return deck;

  const source = deck.slides[idx];
  const copy = {
    ...deepClone(source),
    id: genId('slide'),
    blocks: source.blocks.map(b => ({ ...deepClone(b), id: genId('block') })),
  };

  const nextSlides = deck.slides.slice();
  nextSlides.splice(idx + 1, 0, copy);
  return { ...deck, slides: nextSlides };
}

/**
 * Find a slide by id. Read-only — returns a reference, not a clone.
 * Returns null if not found.
 */
export function getSlide(deck, slideId) {
  return deck.slides.find(s => s.id === slideId) || null;
}

/**
 * Replace a slide's fields. Returns a new deck.
 *
 * @param {object} deck
 * @param {string} slideId
 * @param {object} changes — partial slide object
 */
export function updateSlide(deck, slideId, changes) {
  const idx = deck.slides.findIndex(s => s.id === slideId);
  if (idx === -1) return deck;

  const next = { ...deck.slides[idx], ...changes, id: deck.slides[idx].id };
  const nextSlides = deck.slides.slice();
  nextSlides[idx] = next;
  return { ...deck, slides: nextSlides };
}

/**
 * Swap a slide's template while preserving its blocks.
 *
 * Blocks reference zones by name (`block.position.zone`). When the new template
 * has different zone names than the old one, any block whose zone is missing
 * is remapped to the first content-typed zone in the new template. If the new
 * template has no content zones (e.g. A2 Title Slide), orphan blocks are kept
 * but not displayed — they'll resurface if the user picks a template with
 * content zones again.
 *
 * @param {object}   deck
 * @param {string}   slideId
 * @param {string}   newTemplateId
 * @param {function} [zoneLookup] — (templateId) => Array<{ name, type }>.
 *                                  Caller injects this to avoid a circular
 *                                  import on slide-templates.js.
 * @returns {object} new deck
 */
export function changeSlideTemplate(deck, slideId, newTemplateId, zoneLookup) {
  const idx = deck.slides.findIndex(s => s.id === slideId);
  if (idx === -1) return deck;

  const slide = deck.slides[idx];
  if (slide.templateId === newTemplateId) return deck;

  const newZones = (typeof zoneLookup === 'function') ? zoneLookup(newTemplateId) : [];
  const validNames    = new Set(newZones.map(z => z.name));
  const fallbackZone  = (newZones.find(z => z.type === 'content') || {}).name || null;

  const nextBlocks = slide.blocks.map(b => {
    const zone = b.position && b.position.zone;
    if (zone && validNames.has(zone)) return b; // zone still exists — keep as-is
    if (!fallbackZone) return b;                // no content zone — leave block dormant
    return {
      ...b,
      position: {
        ...b.position,
        zone:  fallbackZone,
        order: b.position ? b.position.order : 0,
      },
    };
  });

  const nextSlide = { ...slide, templateId: newTemplateId, blocks: nextBlocks };
  const nextSlides = deck.slides.slice();
  nextSlides[idx] = nextSlide;
  return { ...deck, slides: nextSlides };
}

/* ─────────────────────────────────────────
   BLOCK OPERATIONS
───────────────────────────────────────── */

/**
 * Add a block to a slide. The slide is treated as immutable —
 * returns a new slide object with the block appended.
 *
 * @param {object} slide
 * @param {object} blockDef — partial block (must have type+variant or family+variant)
 * @returns {object} new slide
 */
export function addBlock(slide, blockDef) {
  const zone = (blockDef.position && blockDef.position.zone) || 'content';
  const order =
    (blockDef.position && typeof blockDef.position.order === 'number')
      ? blockDef.position.order
      : nextBlockOrder(slide, zone);

  // Phase 5A — free positioning. Optional fields:
  //   position.mode = 'flow' (default) | 'free'
  //   position.x / .y = slide-coord px (used only in 'free' mode)
  //   size.widthPx / .heightPx = slide-coord px (used only in 'free' mode)
  // Flow mode keeps the legacy widthPct (% of slot) + heightPct (px).
  const posMode = (blockDef.position && blockDef.position.mode) || 'flow';
  const posX    = (blockDef.position && typeof blockDef.position.x === 'number') ? blockDef.position.x : null;
  const posY    = (blockDef.position && typeof blockDef.position.y === 'number') ? blockDef.position.y : null;

  const newBlock = {
    id:       blockDef.id || genId('block'),
    type:     blockDef.type     || 'diagram',
    family:   blockDef.family   || null,
    variant:  blockDef.variant  || null,
    items:    Array.isArray(blockDef.items) ? blockDef.items.slice() : [],
    columns:  blockDef.columns  || 3,
    density:  blockDef.density  || 'standard',
    position: { zone, order, mode: posMode, x: posX, y: posY },
    size:     {
      widthPct:  (blockDef.size && blockDef.size.widthPct)  || 100,
      heightPct: (blockDef.size && blockDef.size.heightPct) || null,
      widthPx:   (blockDef.size && typeof blockDef.size.widthPx  === 'number') ? blockDef.size.widthPx  : null,
      heightPx:  (blockDef.size && typeof blockDef.size.heightPx === 'number') ? blockDef.size.heightPx : null,
    },
  };

  return { ...slide, blocks: slide.blocks.concat([newBlock]) };
}

/**
 * Remove a block by id. Returns a new slide.
 */
export function removeBlock(slide, blockId) {
  const nextBlocks = slide.blocks.filter(b => b.id !== blockId);
  if (nextBlocks.length === slide.blocks.length) return slide;
  return { ...slide, blocks: nextBlocks };
}

/**
 * Patch a block. `changes` is a partial block; nested objects (position, size)
 * are shallow-merged — pass complete sub-objects when changing them.
 */
export function updateBlock(slide, blockId, changes) {
  const idx = slide.blocks.findIndex(b => b.id === blockId);
  if (idx === -1) return slide;

  const current = slide.blocks[idx];
  const next = {
    ...current,
    ...changes,
    id:       current.id,
    position: changes.position ? { ...current.position, ...changes.position } : current.position,
    size:     changes.size     ? { ...current.size,     ...changes.size     } : current.size,
  };

  const nextBlocks = slide.blocks.slice();
  nextBlocks[idx] = next;
  return { ...slide, blocks: nextBlocks };
}

/**
 * Phase F — Move a block to a different zone and/or position within a zone.
 * Removes the block from its current zone, inserts it at `targetZone` at
 * `targetIndex` (0 = top of zone), and renumbers `position.order` cleanly
 * across both source and target zones (0, 1, 2 …) so subsequent inserts
 * use predictable orders.
 *
 * Immutable — returns a new slide. No-op if the block doesn't exist.
 *
 * @param {object} slide
 * @param {string} blockId
 * @param {string} targetZone
 * @param {number} targetIndex — 0-based slot index in the target zone
 * @returns {object} new slide
 */
export function moveBlock(slide, blockId, targetZone, targetIndex) {
  const block = slide.blocks.find(b => b.id === blockId);
  if (!block) return slide;

  const sourceZone = block.position && block.position.zone;

  // Build the target zone's ordered list WITHOUT the moving block.
  const targetList = slide.blocks
    .filter(b => b.id !== blockId && b.position && b.position.zone === targetZone)
    .sort((a, b) => (a.position.order || 0) - (b.position.order || 0));

  // Clamp targetIndex into the target list's valid range.
  const clampedIndex = Math.max(0, Math.min(targetIndex, targetList.length));

  // Insert the moving block at clampedIndex in the target list.
  const movedBlock = {
    ...block,
    position: { zone: targetZone, order: clampedIndex },
  };
  const newTargetList = targetList.slice();
  newTargetList.splice(clampedIndex, 0, movedBlock);

  // Build the source zone's ordered list (if different from target).
  let newSourceList = null;
  if (sourceZone && sourceZone !== targetZone) {
    newSourceList = slide.blocks
      .filter(b => b.id !== blockId && b.position && b.position.zone === sourceZone)
      .sort((a, b) => (a.position.order || 0) - (b.position.order || 0));
  }

  // Renumber both lists 0, 1, 2 … for clean state.
  const renumber = (list) => list.map((b, i) => ({
    ...b,
    position: { ...b.position, order: i },
  }));
  const renumberedTarget = renumber(newTargetList);
  const renumberedSource = newSourceList ? renumber(newSourceList) : null;

  // Reconstruct the full block list: keep blocks from other zones unchanged,
  // replace blocks in the target zone (and source zone if separate) with the
  // renumbered lists.
  const otherBlocks = slide.blocks.filter(b => {
    if (b.id === blockId) return false; // moving block already in target list
    const z = b.position && b.position.zone;
    if (z === targetZone) return false; // replaced by renumberedTarget
    if (renumberedSource && z === sourceZone) return false; // replaced by renumberedSource
    return true;
  });

  const nextBlocks = otherBlocks
    .concat(renumberedTarget)
    .concat(renumberedSource || []);

  return { ...slide, blocks: nextBlocks };
}

/**
 * Compute the next stack-order number for a zone. Used when inserting
 * a block without an explicit order — places it at the bottom of the stack.
 */
export function nextBlockOrder(slide, zoneName) {
  let max = -1;
  for (const b of slide.blocks) {
    if (b.position && b.position.zone === zoneName && b.position.order > max) {
      max = b.position.order;
    }
  }
  return max + 1;
}

/**
 * Convenience: blocks in a zone, sorted by order. Returns a new array
 * (does not mutate the slide's block list).
 *
 * Phase 5A — free-positioned blocks (mode='free') are NOT in any zone for
 * layout purposes. They render as direct children of the slide root via
 * absolute positioning. blocksInZone filters them out so flow rendering
 * doesn't accidentally include them in a zone's stack.
 */
export function blocksInZone(slide, zoneName) {
  return slide.blocks
    .filter(b => b.position
                  && b.position.zone === zoneName
                  && b.position.mode !== 'free')
    .sort((a, b) => (a.position.order || 0) - (b.position.order || 0));
}

/**
 * Phase 5A — convenience: free-positioned blocks on a slide. Returns a
 * new array.
 */
export function freeBlocks(slide) {
  return (slide.blocks || []).filter(b => b.position && b.position.mode === 'free');
}

/* ─────────────────────────────────────────
   DECK-LEVEL CONVENIENCE
───────────────────────────────────────── */

/**
 * Apply a slide-level update through the deck. Functional convenience.
 *
 * @param {object}   deck
 * @param {string}   slideId
 * @param {function} fn  — (slide) => newSlide
 * @returns {object} new deck
 */
export function withSlide(deck, slideId, fn) {
  const idx = deck.slides.findIndex(s => s.id === slideId);
  if (idx === -1) return deck;
  const next = fn(deck.slides[idx]);
  if (next === deck.slides[idx]) return deck;
  const nextSlides = deck.slides.slice();
  nextSlides[idx] = next;
  return { ...deck, slides: nextSlides };
}

/* ─────────────────────────────────────────
   INTERNAL HELPERS
───────────────────────────────────────── */

function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepClone);
  const out = {};
  for (const k of Object.keys(value)) out[k] = deepClone(value[k]);
  return out;
}
