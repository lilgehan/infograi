/**
 * Infogr.ai v3 — Document Archetype Recipes (Layer 0)
 *
 * Document archetypes are the TOP layer of the engine.
 * They are user-visible "document types" that pre-configure the entire
 * pipeline: composition pattern, preferred section families/variants,
 * density profile, and AI prompt hints.
 *
 * Archetypes are NOT templates — they configure the engine, not bypass it.
 * The same smart-layouts and smart-diagrams render functions are used;
 * archetypes just tell them what to pick and how to arrange the result.
 *
 * Reference: ENGINE-SPEC.md — Layer 0 → Document Archetypes
 *            ENGINE-SPEC.md — "The 5 Launch Archetypes"
 *
 * Usage:
 *   import { ARCHETYPES, getArchetype } from './archetypes.js';
 *   const recipe = getArchetype('mind-map');
 */

/* ─────────────────────────────────────────
   ARCHETYPE RECIPES
   Each recipe pre-configures the engine for a specific document type.
───────────────────────────────────────── */

export const ARCHETYPES = [

  /* ── 1. Mind Map / Ecosystem ─────────────────────────────── */
  {
    id:             'mind-map',
    name:           'Mind Map',
    icon:           'brain',
    preferredSizes: ['square', 'landscape'],
    composition:    'asymmetric-sidebar',
    sections: [
      {
        role:      'main',
        family:    'circles',
        variant:   'flower',
        density:   'compact',
        itemCount: { min: 4, max: 6 },
        aiHint:    'Central concept (first item) surrounded by related nodes. Use "flower" layout so the first item becomes the center hub.',
      },
      {
        role:      'sidebar',
        family:    'boxes',
        variant:   'labeled-boxes',
        density:   'standard',
        itemCount: { min: 3, max: 4 },
        aiHint:    'Key insights or supporting details for each node. Use numbered labels for quick scanning.',
      },
      {
        role:      'bottom',
        family:    'numbers',
        variant:   'stats',
        density:   'compact',
        itemCount: { min: 3, max: 3 },
        aiHint:    'Three key metrics or data points that anchor the mind map quantitatively.',
      },
    ],
    aiSystemHint: `Create a mind-map style document with a central concept surrounded by related nodes (use "flower" layout for the first section — first item is the center hub). Add a sidebar with key insights using "labeled-boxes". Include exactly 3 key metrics at the bottom using "stats". Total: 3 sections.`,
  },

  /* ── 2. Executive Dashboard ──────────────────────────────── */
  {
    id:             'dashboard',
    name:           'Dashboard',
    icon:           'chart-increasing',
    preferredSizes: ['a4', 'landscape'],
    composition:    'dashboard',
    sections: [
      {
        role:      'top',
        family:    'numbers',
        variant:   'stats',
        density:   'compact',
        itemCount: { min: 3, max: 4 },
        aiHint:    'Three to four top-level KPIs as a summary strip. Numbers must be specific and impactful.',
      },
      {
        role:      'middle-left',
        family:    'boxes',
        variant:   'solid-boxes-icons',
        density:   'standard',
        itemCount: { min: 3, max: 4 },
        aiHint:    'Key capability or feature cards with icons. Left column of the 2-col body area.',
      },
      {
        role:      'middle-right',
        family:    'boxes',
        variant:   'side-line',
        density:   'standard',
        itemCount: { min: 3, max: 4 },
        aiHint:    'Supporting details or secondary metrics. Right column of the 2-col body area.',
      },
      {
        role:      'bottom',
        family:    'sequence',
        variant:   'timeline',
        density:   'compact',
        itemCount: { min: 3, max: 5 },
        aiHint:    'Roadmap, milestones, or timeline of upcoming events. Bottom full-width strip.',
      },
    ],
    aiSystemHint: `Create an executive dashboard document with 4 sections arranged in a dashboard layout:
1. TOP section (full-width): "stats" variant — exactly 3-4 KPIs as the summary strip. Numbers must be real and specific.
2. MIDDLE-LEFT section: "solid-boxes-icons" variant — 3-4 feature/capability cards with icons.
3. MIDDLE-RIGHT section: "side-line" variant — 3-4 supporting details or secondary metrics.
4. BOTTOM section (full-width): "timeline" variant — 3-5 roadmap items or milestones.
Total: exactly 4 sections in this order.`,
  },

  /* ── 3. Competitive / Comparison Map ────────────────────── */
  {
    id:             'competitive-map',
    name:           'Competitive Map',
    icon:           'target',
    preferredSizes: ['landscape', 'square'],
    composition:    'quadrant',
    sections: [
      {
        role:      'q1',
        family:    'boxes',
        variant:   'alternating-boxes',
        density:   'standard',
        itemCount: { min: 2, max: 3 },
        aiHint:    'Top-left quadrant. First category (e.g. Strengths, Leader, Category A). Use alternating-boxes.',
      },
      {
        role:      'q2',
        family:    'boxes',
        variant:   'alternating-boxes',
        density:   'standard',
        itemCount: { min: 2, max: 3 },
        aiHint:    'Top-right quadrant. Second category (e.g. Weaknesses, Challenger, Category B). Use alternating-boxes.',
      },
      {
        role:      'q3',
        family:    'boxes',
        variant:   'alternating-boxes',
        density:   'standard',
        itemCount: { min: 2, max: 3 },
        aiHint:    'Bottom-left quadrant. Third category (e.g. Opportunities, Niche, Category C). Use alternating-boxes.',
      },
      {
        role:      'q4',
        family:    'boxes',
        variant:   'alternating-boxes',
        density:   'standard',
        itemCount: { min: 2, max: 3 },
        aiHint:    'Bottom-right quadrant. Fourth category (e.g. Threats, Emerging, Category D). Use alternating-boxes.',
      },
    ],
    aiSystemHint: `Create a competitive/comparison map with exactly 4 sections arranged in a 2×2 quadrant grid.
Each section represents one quadrant and uses the "alternating-boxes" variant with 2-3 items.
Name each section clearly (e.g. Strengths / Weaknesses / Opportunities / Threats, or four competitor categories).
The 4 sections appear in this order: top-left, top-right, bottom-left, bottom-right.
Total: exactly 4 sections.`,
  },

  /* ── 4. Process / System Flow ────────────────────────────── */
  {
    id:             'process-flow',
    name:           'Process Flow',
    icon:           'checklist',
    preferredSizes: ['a4', 'portrait'],
    composition:    'stack',
    sections: [
      {
        role:      'flow',
        family:    'sequence',
        variant:   'arrows',
        density:   'standard',
        itemCount: { min: 4, max: 6 },
        aiHint:    'Main process stages as directional arrow blocks. Use "arrows" variant for clear flow direction.',
      },
      {
        role:      'annotations',
        family:    'boxes',
        variant:   'side-line',
        density:   'standard',
        itemCount: { min: 3, max: 4 },
        aiHint:    'Side notes, requirements, or decision rules for the process. Use "side-line" for clean annotations.',
      },
      {
        role:      'metrics',
        family:    'numbers',
        variant:   'circle-stats',
        density:   'compact',
        itemCount: { min: 3, max: 4 },
        aiHint:    'Key process metrics such as duration, success rate, or throughput. Use "circle-stats" for visual emphasis.',
      },
    ],
    aiSystemHint: `Create a process/system flow document with 3 sections stacked vertically:
1. FLOW section: "arrows" variant — 4-6 sequential process stages as directional arrow blocks.
2. ANNOTATIONS section: "side-line" variant — 3-4 side notes, requirements, or decision criteria.
3. METRICS section: "circle-stats" variant — 3-4 process metrics (duration, success rate, etc.).
Total: exactly 3 sections in this order. The flow section must come first.`,
  },

  /* ── 5. Research Atlas / Knowledge Map ───────────────────── */
  {
    id:             'research-atlas',
    name:           'Research Atlas',
    icon:           'idea',
    preferredSizes: ['a4', 'portrait'],
    composition:    'two-col-equal',
    sections: [
      {
        role:      'left-taxonomy',
        family:    'boxes',
        variant:   'outline-boxes',
        density:   'detailed',
        itemCount: { min: 3, max: 4 },
        aiHint:    'Left column taxonomy or category structure. Use "outline-boxes" for a clean, scholarly look.',
      },
      {
        role:      'right-features',
        family:    'boxes',
        variant:   'top-circle',
        density:   'standard',
        itemCount: { min: 3, max: 4 },
        aiHint:    'Right column key findings or feature highlights. Use "top-circle" for icon-anchored visual emphasis.',
      },
      {
        role:      'insights',
        family:    'quotes',
        variant:   'quote-boxes',
        density:   'standard',
        itemCount: { min: 2, max: 3 },
        aiHint:    'Key insight statements or notable findings as highlighted quotes. Spans the bottom.',
      },
      {
        role:      'bottom-stats',
        family:    'numbers',
        variant:   'stats',
        density:   'compact',
        itemCount: { min: 3, max: 3 },
        aiHint:    'Three quantitative research anchors (sample size, key statistic, confidence metric).',
      },
    ],
    aiSystemHint: `Create a research atlas / knowledge map document with 4 sections in a two-column layout:
1. LEFT TAXONOMY section: "outline-boxes" variant — 3-4 categories or taxonomy items (detailed style).
2. RIGHT FEATURES section: "top-circle" variant — 3-4 key findings with icon anchors (standard style).
3. INSIGHTS section: "quote-boxes" variant — 2-3 notable insight statements or research quotes.
4. BOTTOM STATS section: "stats" variant — exactly 3 quantitative anchors.
Total: exactly 4 sections. Sections 1 and 2 will be side-by-side; sections 3 and 4 span below.`,
  },

];

/* ─────────────────────────────────────────
   LOOKUP — getArchetype(id)
───────────────────────────────────────── */

/**
 * Look up an archetype recipe by id.
 *
 * @param {string} id — e.g. 'mind-map', 'dashboard', 'competitive-map', 'process-flow', 'research-atlas'
 * @returns {object|null} archetype recipe or null if not found
 */
export function getArchetype(id) {
  return ARCHETYPES.find(a => a.id === id) || null;
}

/**
 * Set of all archetype IDs — used in app.js to detect archetype layouts.
 */
export const ARCHETYPE_IDS = new Set(ARCHETYPES.map(a => a.id));
