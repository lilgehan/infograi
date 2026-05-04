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
  return {
    id:         genId('slide'),
    templateId: templateId || 'A1',
    title:      (extra && extra.title) || '',
    blocks:     [],
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

  const newBlock = {
    id:       blockDef.id || genId('block'),
    type:     blockDef.type     || 'diagram',
    family:   blockDef.family   || null,
    variant:  blockDef.variant  || null,
    items:    Array.isArray(blockDef.items) ? blockDef.items.slice() : [],
    columns:  blockDef.columns  || 3,
    density:  blockDef.density  || 'standard',
    position: { zone, order },
    size:     {
      widthPct:  (blockDef.size && blockDef.size.widthPct)  || 100,
      heightPct: (blockDef.size && blockDef.size.heightPct) || null,
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
 */
export function blocksInZone(slide, zoneName) {
  return slide.blocks
    .filter(b => b.position && b.position.zone === zoneName)
    .sort((a, b) => (a.position.order || 0) - (b.position.order || 0));
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
