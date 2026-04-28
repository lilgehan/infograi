/**
 * Infogr.ai v3 — Variant Slot Rules (Phase 4.5R)
 *
 * Per-variant slot definitions for all 45 layouts + 24 diagrams (69 total).
 * Used by assembly.js to validate and adjust AI-generated content before rendering.
 *
 * Each entry defines:
 *   family           — which render family owns this variant
 *   minItems         — minimum items required for a valid render
 *   maxItems         — maximum items accepted (assembly clips beyond this)
 *   preferredItems   — item counts that produce the best visual results
 *   elastic          — true if item count can vary freely within [min, max]
 *                      false = fixed-slot (must match exactly, or content is padded/switched)
 *   slot             — per-slot text character limits
 *     maxTitleChars        — max chars for item.title (standard density)
 *     maxBodyChars         — max chars for item.body (standard density; ~20 words)
 *     maxBodyCharsCompact  — max chars for item.body at compact density (0 = no body)
 *     maxBodyCharsDetailed — max chars for item.body at detailed density (~35-40 words)
 *     hasIcon              — whether this variant renders icons from item.icon
 *     iconSize             — rendered icon size in px (0 if no icon)
 *   sizeOverrides    — per-canvas-size maxItems overrides (only when more restrictive
 *                      than the variant default; global caps are applied in assembly.js)
 *
 * Global size caps applied in assembly.js (ENGINE-SPEC Layer 2.5):
 *   landscape (16:9) → 8   square (1:1) → 6   portrait (9:16) → 5   a4 → 8
 */

/* ─────────────────────────────────────────
   SLOT RULES MAP
───────────────────────────────────────── */

export const SLOT_RULES = {

  /* ══════════════════════════════════════
     BOXES FAMILY (12 variants)
     Standard card-grid layouts.
     Elastic: yes — any count in range works.
  ══════════════════════════════════════ */

  'solid-boxes': {
    family: 'boxes',
    minItems: 2, maxItems: 8, preferredItems: [3, 4, 6],
    elastic: true,
    slot: {
      maxTitleChars: 45, maxBodyChars: 150,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 260,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 6 } },
  },

  'solid-boxes-icons': {
    family: 'boxes',
    minItems: 2, maxItems: 8, preferredItems: [3, 4, 6],
    elastic: true,
    slot: {
      maxTitleChars: 40, maxBodyChars: 130,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 230,
      hasIcon: true, iconSize: 32,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 6 } },
  },

  'outline-boxes': {
    family: 'boxes',
    minItems: 2, maxItems: 8, preferredItems: [3, 4, 6],
    elastic: true,
    slot: {
      maxTitleChars: 45, maxBodyChars: 150,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 260,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 6 } },
  },

  'side-line': {
    family: 'boxes',
    minItems: 2, maxItems: 6, preferredItems: [3, 4, 6],
    elastic: true,
    slot: {
      maxTitleChars: 50, maxBodyChars: 160,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 280,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 } },
  },

  'side-line-text': {
    family: 'boxes',
    minItems: 2, maxItems: 8, preferredItems: [3, 4, 6],
    elastic: true,
    slot: {
      maxTitleChars: 55, maxBodyChars: 180,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 300,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 } },
  },

  'top-line-text': {
    family: 'boxes',
    minItems: 2, maxItems: 6, preferredItems: [3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 45, maxBodyChars: 150,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 260,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 3 }, square: { maxItems: 4 } },
  },

  'top-circle': {
    family: 'boxes',
    minItems: 2, maxItems: 6, preferredItems: [3, 4, 6],
    elastic: true,
    slot: {
      maxTitleChars: 40, maxBodyChars: 120,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 200,
      hasIcon: true, iconSize: 32,
    },
    sizeOverrides: { portrait: { maxItems: 3 }, square: { maxItems: 4 } },
  },

  'joined-boxes': {
    family: 'boxes',
    minItems: 2, maxItems: 8, preferredItems: [2, 3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 40, maxBodyChars: 120,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 200,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 6 } },
  },

  'joined-boxes-icons': {
    family: 'boxes',
    minItems: 2, maxItems: 8, preferredItems: [2, 3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 100,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 170,
      hasIcon: true, iconSize: 28,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 6 } },
  },

  'leaf-boxes': {
    family: 'boxes',
    minItems: 2, maxItems: 6, preferredItems: [3, 4, 6],
    elastic: true,
    slot: {
      maxTitleChars: 40, maxBodyChars: 120,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 200,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 3 }, square: { maxItems: 4 } },
  },

  'labeled-boxes': {
    family: 'boxes',
    minItems: 2, maxItems: 6, preferredItems: [3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 45, maxBodyChars: 140,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 240,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 6 } },
  },

  'alternating-boxes': {
    family: 'boxes',
    minItems: 2, maxItems: 6, preferredItems: [3, 4, 6],
    elastic: true,
    slot: {
      maxTitleChars: 45, maxBodyChars: 150,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 260,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 6 } },
  },

  /* ══════════════════════════════════════
     BULLETS FAMILY (5 variants)
     List-style layouts — title-centric.
     Elastic: yes — scales well to many items.
  ══════════════════════════════════════ */

  'large-bullets': {
    family: 'bullets',
    minItems: 2, maxItems: 8, preferredItems: [3, 4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 55, maxBodyChars: 120,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 200,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 6 } },
  },

  'small-bullets': {
    family: 'bullets',
    minItems: 2, maxItems: 10, preferredItems: [4, 5, 6, 7],
    elastic: true,
    slot: {
      maxTitleChars: 60, maxBodyChars: 100,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 170,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 6 }, square: { maxItems: 6 } },
  },

  'arrow-bullets': {
    family: 'bullets',
    minItems: 2, maxItems: 8, preferredItems: [3, 4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 55, maxBodyChars: 110,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 190,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 } },
  },

  'process-steps': {
    family: 'bullets',
    minItems: 2, maxItems: 7, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 50, maxBodyChars: 130,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 220,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 5 } },
  },

  'solid-box-small-bullets': {
    family: 'bullets',
    minItems: 2, maxItems: 8, preferredItems: [3, 4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 50, maxBodyChars: 100,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 170,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 } },
  },

  /* ══════════════════════════════════════
     SEQUENCE FAMILY (6 variants)
     Timeline/arrow/pill layouts.
     Elastic: yes — but horizontal variants
     are more space-constrained.
  ══════════════════════════════════════ */

  'timeline': {
    family: 'sequence',
    minItems: 2, maxItems: 8, preferredItems: [3, 4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 45, maxBodyChars: 130,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 220,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 5 } },
  },

  'minimal-timeline': {
    family: 'sequence',
    minItems: 2, maxItems: 8, preferredItems: [3, 4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 45, maxBodyChars: 110,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 190,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 5 } },
  },

  'minimal-timeline-boxes': {
    family: 'sequence',
    minItems: 2, maxItems: 8, preferredItems: [3, 4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 40, maxBodyChars: 120,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 200,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 5 } },
  },

  'arrows': {
    family: 'sequence',
    minItems: 2, maxItems: 7, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 90,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 160,
      hasIcon: false, iconSize: 0,
    },
    // Arrows are horizontal — very constrained on portrait
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 5 } },
  },

  'pills': {
    family: 'sequence',
    minItems: 2, maxItems: 9, preferredItems: [3, 4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 0,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 0,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  'slanted-labels': {
    family: 'sequence',
    minItems: 2, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 25, maxBodyChars: 0,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 0,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 5 } },
  },

  /* ══════════════════════════════════════
     NUMBERS FAMILY (8 variants)
     Stats, ratings, data-dense displays.
     Elastic: yes.
  ══════════════════════════════════════ */

  'stats': {
    family: 'numbers',
    minItems: 1, maxItems: 6, preferredItems: [3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 60,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 80,
      hasIcon: true, iconSize: 28,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 4 } },
  },

  'circle-stats': {
    family: 'numbers',
    minItems: 1, maxItems: 6, preferredItems: [3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 25, maxBodyChars: 50,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 70,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 3 }, square: { maxItems: 4 } },
  },

  'bar-stats': {
    family: 'numbers',
    minItems: 2, maxItems: 8, preferredItems: [3, 4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 40, maxBodyChars: 60,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 80,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 } },
  },

  'star-rating': {
    family: 'numbers',
    minItems: 1, maxItems: 5, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 40, maxBodyChars: 80,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 130,
      hasIcon: false, iconSize: 0,
    },
    // No sizeOverrides — already capped at 5
  },

  'dot-grid': {
    family: 'numbers',
    minItems: 1, maxItems: 6, preferredItems: [3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 50,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 80,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 4 } },
  },

  'dot-line': {
    family: 'numbers',
    minItems: 1, maxItems: 6, preferredItems: [3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 50,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 80,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 4 } },
  },

  'circle-bold-line': {
    family: 'numbers',
    minItems: 1, maxItems: 6, preferredItems: [3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 25, maxBodyChars: 50,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 80,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 4 } },
  },

  'circle-external-line': {
    family: 'numbers',
    minItems: 1, maxItems: 6, preferredItems: [3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 25, maxBodyChars: 50,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 80,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 4 } },
  },

  /* ══════════════════════════════════════
     CIRCLES FAMILY (5 variants)
     Radial / ring arrangements.
     Elastic: yes — but label-only (compact text).
  ══════════════════════════════════════ */

  'cycle': {
    family: 'circles',
    minItems: 3, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 25, maxBodyChars: 70,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 110,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  'flower': {
    family: 'circles',
    minItems: 3, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 25, maxBodyChars: 70,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 110,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  'circle': {
    family: 'circles',
    minItems: 3, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 25, maxBodyChars: 70,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 110,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  'ring': {
    family: 'circles',
    minItems: 3, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 25, maxBodyChars: 70,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 110,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  'semi-circle': {
    family: 'circles',
    minItems: 3, maxItems: 6, preferredItems: [3, 4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 25, maxBodyChars: 60,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 100,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 } },
  },

  /* ══════════════════════════════════════
     QUOTES FAMILY (2 variants)
     Note: item.body = quote text (long),
           item.title = attribution (short).
     Elastic: yes.
  ══════════════════════════════════════ */

  'quote-boxes': {
    family: 'quotes',
    minItems: 1, maxItems: 4, preferredItems: [1, 2, 3],
    elastic: true,
    slot: {
      maxTitleChars: 60,   // attribution
      maxBodyChars: 320,   // quote text (standard)
      maxBodyCharsCompact: 200,
      maxBodyCharsDetailed: 480,
      hasIcon: false, iconSize: 0,
    },
    // No sizeOverrides — already small max
  },

  'speech-bubbles': {
    family: 'quotes',
    minItems: 1, maxItems: 4, preferredItems: [2, 3],
    elastic: true,
    slot: {
      maxTitleChars: 60,   // attribution
      maxBodyChars: 280,   // quote text
      maxBodyCharsCompact: 160,
      maxBodyCharsDetailed: 420,
      hasIcon: false, iconSize: 0,
    },
  },

  /* ══════════════════════════════════════
     STEPS FAMILY (7 variants)
     Numbered/sequential step layouts.
     Elastic: yes — up to ~7 steps looks best.
  ══════════════════════════════════════ */

  'staircase': {
    family: 'steps',
    minItems: 2, maxItems: 7, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 45, maxBodyChars: 130,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 220,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 5 } },
  },

  'steps': {
    family: 'steps',
    minItems: 2, maxItems: 7, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 50, maxBodyChars: 150,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 260,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 } },
  },

  'box-steps': {
    family: 'steps',
    minItems: 2, maxItems: 6, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 45, maxBodyChars: 130,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 220,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 5 } },
  },

  'arrow-steps': {
    family: 'steps',
    minItems: 2, maxItems: 6, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 90,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 160,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 5 } },
  },

  'steps-with-icons': {
    family: 'steps',
    minItems: 2, maxItems: 7, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 45, maxBodyChars: 130,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 220,
      hasIcon: true, iconSize: 32,
    },
    sizeOverrides: { portrait: { maxItems: 5 } },
  },

  'pyramid': {
    family: 'steps',
    minItems: 3, maxItems: 6, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 0,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 0,
      hasIcon: false, iconSize: 0,
    },
    // Pyramid is label-only — no body text
    sizeOverrides: { portrait: { maxItems: 5 } },
  },

  'vertical-funnel': {
    family: 'steps',
    minItems: 3, maxItems: 6, preferredItems: [4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 70,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 110,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 } },
  },

  /* ══════════════════════════════════════
     DIAGRAMS — ROAD FAMILY (4 variants)
     Journey/milestone diagrams.
     Elastic: yes.
  ══════════════════════════════════════ */

  'road-horizontal': {
    family: 'road',
    minItems: 3, maxItems: 7, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 40, maxBodyChars: 120,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 200,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 5 } },
  },

  'road-vertical': {
    family: 'road',
    minItems: 3, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 45, maxBodyChars: 130,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 220,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 } },
  },

  'journey-map': {
    family: 'road',
    minItems: 3, maxItems: 7, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 110,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 190,
      hasIcon: true, iconSize: 24,
    },
    sizeOverrides: { portrait: { maxItems: 4 }, square: { maxItems: 5 } },
  },

  'experience-map': {
    family: 'road',
    minItems: 3, maxItems: 6, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 90,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 160,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 } },
  },

  /* ══════════════════════════════════════
     DIAGRAMS — TARGET FAMILY (4 variants)
     Bullseye/radial/orbit diagrams.
     Elastic: yes — label-centric.
  ══════════════════════════════════════ */

  'bullseye': {
    family: 'target',
    minItems: 3, maxItems: 6, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 25, maxBodyChars: 0,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 0,
      hasIcon: false, iconSize: 0,
    },
    // Concentric rings — label only
  },

  'radial': {
    family: 'target',
    minItems: 3, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 70,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 110,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  'orbit': {
    family: 'target',
    minItems: 3, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 70,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 110,
      hasIcon: true, iconSize: 24,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  'sunburst': {
    family: 'target',
    minItems: 3, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 25, maxBodyChars: 0,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 0,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  /* ══════════════════════════════════════
     DIAGRAMS — HIERARCHY FAMILY (4 variants)
     Org chart, tree, nested views.
     Elastic: yes.
  ══════════════════════════════════════ */

  'org-chart': {
    family: 'hierarchy',
    minItems: 3, maxItems: 8, preferredItems: [4, 5, 6, 7],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 80,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 140,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  'tree-horizontal': {
    family: 'hierarchy',
    minItems: 3, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 70,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 120,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  'pyramid-diagram': {
    family: 'hierarchy',
    minItems: 3, maxItems: 6, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 70,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 120,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 } },
  },

  'nested-boxes': {
    family: 'hierarchy',
    minItems: 2, maxItems: 5, preferredItems: [3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 80,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 140,
      hasIcon: false, iconSize: 0,
    },
    // Already small max — no sizeOverrides needed
  },

  /* ══════════════════════════════════════
     DIAGRAMS — VENN FAMILY (4 variants)
     Relationship / overlap diagrams.
     venn-2 and matrix-2x2 are FIXED-SLOT.
  ══════════════════════════════════════ */

  'venn-2': {
    family: 'venn',
    minItems: 2, maxItems: 2, preferredItems: [2],
    elastic: false,   // FIXED — exactly 2 circles
    slot: {
      maxTitleChars: 30, maxBodyChars: 100,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 170,
      hasIcon: false, iconSize: 0,
    },
  },

  'venn-3': {
    family: 'venn',
    minItems: 3, maxItems: 3, preferredItems: [3],
    elastic: false,   // 3-circle Venn — fixed
    slot: {
      maxTitleChars: 30, maxBodyChars: 90,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 160,
      hasIcon: false, iconSize: 0,
    },
  },

  'overlapping-sets': {
    family: 'venn',
    minItems: 2, maxItems: 4, preferredItems: [2, 3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 90,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 160,
      hasIcon: false, iconSize: 0,
    },
  },

  'matrix-2x2': {
    family: 'venn',
    minItems: 4, maxItems: 4, preferredItems: [4],
    elastic: false,   // FIXED — always a 2×2 grid
    slot: {
      maxTitleChars: 35, maxBodyChars: 150,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 260,
      hasIcon: false, iconSize: 0,
    },
  },

  /* ══════════════════════════════════════
     DIAGRAMS — PROCESS FAMILY (4 variants)
     Flow and motion diagrams.
     Elastic: yes.
  ══════════════════════════════════════ */

  'circular-flow': {
    family: 'process',
    minItems: 3, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 80,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 140,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  'swimlane': {
    family: 'process',
    minItems: 2, maxItems: 6, preferredItems: [3, 4, 5],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 100,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 170,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 } },
  },

  'branching': {
    family: 'process',
    minItems: 2, maxItems: 5, preferredItems: [3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 90,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 160,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 } },
  },

  'infinity-loop': {
    family: 'process',
    minItems: 2, maxItems: 4, preferredItems: [2, 3, 4],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 80,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 140,
      hasIcon: false, iconSize: 0,
    },
    // Already small max
  },

  /* ══════════════════════════════════════
     DIAGRAMS — BUSINESS FAMILY (4 variants)
     SWOT and BMC are FIXED-SLOT.
  ══════════════════════════════════════ */

  'swot': {
    family: 'business',
    minItems: 4, maxItems: 4, preferredItems: [4],
    elastic: false,   // FIXED — S / W / O / T
    slot: {
      maxTitleChars: 30, maxBodyChars: 260,
      maxBodyCharsCompact: 100, maxBodyCharsDetailed: 420,
      hasIcon: false, iconSize: 0,
    },
  },

  'competitive-map': {
    family: 'business',
    minItems: 2, maxItems: 8, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 30, maxBodyChars: 0,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 0,
      hasIcon: false, iconSize: 0,
    },
    // Competitive map only shows titles (labels on dots)
    sizeOverrides: { portrait: { maxItems: 5 }, square: { maxItems: 6 } },
  },

  'value-chain': {
    family: 'business',
    minItems: 3, maxItems: 6, preferredItems: [4, 5, 6],
    elastic: true,
    slot: {
      maxTitleChars: 35, maxBodyChars: 100,
      maxBodyCharsCompact: 0, maxBodyCharsDetailed: 170,
      hasIcon: false, iconSize: 0,
    },
    sizeOverrides: { portrait: { maxItems: 4 } },
  },

  'bmc': {
    family: 'business',
    minItems: 6, maxItems: 8, preferredItems: [8],
    elastic: false,   // FIXED — Business Model Canvas cells
    slot: {
      maxTitleChars: 30, maxBodyChars: 150,
      maxBodyCharsCompact: 60, maxBodyCharsDetailed: 250,
      hasIcon: false, iconSize: 0,
    },
  },
};

/* ─────────────────────────────────────────
   GLOBAL SIZE CAPS (ENGINE-SPEC Layer 2.5)
───────────────────────────────────────── */

export const GLOBAL_SIZE_MAX = {
  landscape: 8,
  portrait:  5,
  square:    6,
  a4:        8,
};

/* ─────────────────────────────────────────
   TRANSFORMATION FAMILIES
   Used by assembly.js for auto-switching.
   When a variant can't accept the item count,
   the engine tries others in the same family.
───────────────────────────────────────── */

export const TRANSFORMATION_FAMILIES = {
  // Sequential content — process, journey
  sequential: [
    'timeline', 'minimal-timeline', 'minimal-timeline-boxes',
    'arrows', 'pills', 'slanted-labels',
    'road-horizontal', 'road-vertical', 'journey-map',
    'process-steps', 'arrow-steps', 'box-steps', 'steps',
  ],

  // Grouped content — catalog, ecosystem
  grouped: [
    'solid-boxes', 'solid-boxes-icons', 'outline-boxes',
    'side-line', 'side-line-text', 'top-line-text', 'top-circle',
    'leaf-boxes', 'labeled-boxes', 'alternating-boxes',
    'joined-boxes', 'joined-boxes-icons',
    'large-bullets', 'small-bullets', 'arrow-bullets', 'solid-box-small-bullets',
  ],

  // Hierarchical content — ranking, hierarchy
  hierarchical: [
    'pyramid', 'vertical-funnel', 'staircase', 'steps',
    'staircase', 'pyramid-diagram', 'nested-boxes',
    'org-chart', 'tree-horizontal',
  ],

  // Relational content — comparison, relationship (venn/overlap variants only)
  relational: [
    'venn-2', 'venn-3', 'overlapping-sets',
  ],

  // Radial content — ecosystem, framework
  radial: [
    'bullseye', 'radial', 'orbit', 'sunburst',
    'cycle', 'flower', 'circle', 'ring', 'semi-circle',
    'circular-flow',
  ],

  // Data / metrics
  data: [
    'stats', 'circle-stats', 'bar-stats', 'dot-grid', 'dot-line',
    'circle-bold-line', 'circle-external-line', 'star-rating',
  ],

  // Quotes
  quotes: ['quote-boxes', 'speech-bubbles'],

  // Business frameworks
  business: ['swot', 'competitive-map', 'value-chain', 'bmc'],

  // Journey / experience
  journey: ['journey-map', 'experience-map', 'road-horizontal', 'road-vertical'],
};

/* ─────────────────────────────────────────
   VARIANT → FAMILY LOOKUP
───────────────────────────────────────── */

/** Returns the transformation family name(s) this variant belongs to. */
export function getTransformationFamilies(variantId) {
  return Object.entries(TRANSFORMATION_FAMILIES)
    .filter(([, members]) => members.includes(variantId))
    .map(([name]) => name);
}

/* ─────────────────────────────────────────
   EFFECTIVE MAX ITEMS HELPER
───────────────────────────────────────── */

/**
 * Returns the effective maximum item count for a variant at a given canvas size.
 * Takes the minimum of: variant maxItems, variant sizeOverride, global size cap.
 *
 * @param {string} variantId   — e.g. 'solid-boxes'
 * @param {string} sizeId      — 'landscape' | 'portrait' | 'square' | 'a4'
 * @returns {number}
 */
export function getEffectiveMaxItems(variantId, sizeId) {
  const rule = SLOT_RULES[variantId];
  if (!rule) return GLOBAL_SIZE_MAX[sizeId] || 8;

  const globalCap  = GLOBAL_SIZE_MAX[sizeId] || 8;
  const variantMax = rule.maxItems;
  const override   = rule.sizeOverrides && rule.sizeOverrides[sizeId];
  const overrideCap = override ? override.maxItems : variantMax;

  return Math.min(variantMax, overrideCap, globalCap);
}
