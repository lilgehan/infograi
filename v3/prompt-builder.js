/**
 * Infogr.ai v3 — Prompt Builder
 *
 * Builds the AI prompt for each v3 layout.
 * ALL layouts go through the content-v1 path — no legacy templates.
 *
 * Key facts:
 *  - AI returns JSON only (not HTML)
 *  - Prompt is ~400 tokens static + ~200 dynamic
 *  - JSON schema embedded in the static (cached) part
 *  - detectLayout() always returns 'content-v1'
 *  - buildPrompt() always uses CONTENT_V1_SCHEMA_PROMPT
 *  - When archetypeId is provided, archetype recipe overrides the generic hints
 *
 * Usage:
 *   import { buildPrompt, detectLayout } from './prompt-builder.js';
 *   const messages = buildPrompt({ topic, layoutId, tone, size, archetypeId });
 */

import { getArchetype } from './archetypes.js';

/* ─────────────────────────────────────────
   ICON NAMING CONVENTION
   Icons8 has 100,000+ icons — the AI picks freely.
   No approved list. The renderer handles missing icons with onerror fallback.
   Naming rules: lowercase, hyphenated, visually literal.
   Examples: 'pie-chart', 'fingerprint', 'neural-network', 'bar-chart', 'handshake'
───────────────────────────────────────── */

/* ─────────────────────────────────────────
   TONE DESCRIPTIONS
───────────────────────────────────────── */
const TONE_GUIDES = {
  professional: 'Professional — authoritative, data-driven, specific. Name real tools, cite real numbers, describe concrete outcomes. Write complete sentences in bullets — not fragments. "Reduces onboarding time by 40% using structured prompts" beats "saves time".',
  bold:         'Bold — high-impact, direct, punchy. UPPERCASE labels. Each bullet is a power statement: verb-first, one clear fact, nothing wasted. Maximum information density per word.',
  minimal:      'Minimal — calm, precise, editorial. Fewer words, more weight. Each bullet is one precise, memorable thought. No buzzwords, no filler, no repeating the title.',
  playful:      'Playful — warm, energetic, concrete. Write like an expert friend explaining something exciting. Active voice. Mix specific numbers with relatable examples. Include one surprising insight.',
};

/* ─────────────────────────────────────────
   STATIC SYSTEM PROMPT (cached)
   This part never changes between requests.
   Use prompt-caching-2024-07-31 on this block.
───────────────────────────────────────── */

const SYSTEM_PROMPT = `You are Infogr.ai, a professional infographic content designer. You generate structured JSON content for infographic layouts.

## YOUR ONLY JOB
Return valid JSON that matches the schema below. No HTML. No CSS. No markdown. No explanations.
Output ONLY the raw JSON object, nothing else.

## CONTENT RULES (always apply)
- Real, specific facts and data — never lorem ipsum, never vague filler
- Active voice — no "In today's world", "It is important to", "Leveraging synergies"
- Numbers beat vague adjectives: "94% faster" beats "much faster"
- Icon names: pick any Icons8 icon name. Use lowercase, hyphenated names that literally describe the visual — words you'd type into an icon search bar. Be specific: "pie-chart" not "chart", "fingerprint" not "security", "neural-network" not "brain", "bar-chart-side" not "stats". Icons8 has 100,000+ icons, so pick the most visually precise match for each concept.
- Titles: no punctuation at the end, title case, 1–2 lines max
- Body text: write to the density target in the user message. Complete thoughts, not fragments.
- Callout: the single most surprising or actionable insight — not a summary of the document.

## ICONS
Icons8 has 100,000+ icons in its library. You are free to pick ANY icon name.
Rules:
- Lowercase, hyphenated: "pie-chart", "fingerprint", "bar-chart-side", "brain-circuit", "handshake", "rocket-launch"
- Visually literal — the name should describe exactly what you'd see drawn
- Specific beats generic: "magnifying-glass" beats "search", "lightning-bolt" beats "fast"
- Never invent compound names with 4+ parts — "ai-robot-brain-chip" won't exist
- The renderer falls back gracefully if an icon doesn't exist, so pick the best match confidently

## OUTPUT FORMAT
Return ONLY a raw JSON object — no prose before or after, no code fences.`;

/* ─────────────────────────────────────────
   CONTENT-V1 SCHEMA PROMPT
   AI returns semantic content; renderer picks the visual form.
───────────────────────────────────────── */

const CONTENT_V1_SCHEMA_PROMPT = `## JSON SCHEMA — content-v1

This is the content-first format. Return semantic content items with archetype and variant.
The renderer maps each variant to a fully-styled visual component automatically.

### Content Archetypes
Pick the archetype that best describes the relationship between your items:
- **process**     — step 1 → step 2 → step 3 (ordered, causal sequence)
- **comparison**  — A vs B, or A vs B vs C (parallel attributes)
- **hierarchy**   — parent → children → grandchildren (levels of abstraction)
- **journey**     — stages across time or experience (discovery, consideration...)
- **ecosystem**   — central thing + surrounding parts (hub and spoke)
- **ranking**     — ordered by importance or value (top 5, leaderboard)
- **relationship**— how things connect to each other (dependencies, links)
- **cause-effect**— X leads to Y leads to Z (causality chain)
- **framework**   — structured model (SWOT, 4Ps, 3-tier, etc.)
- **metrics**     — numbers, KPIs, data points (purely quantitative)
- **narrative**   — story with text + visuals (explanation, case study)
- **catalog**     — collection of similar items (features, options, tools)

### Available Variants — pick the one that best fits archetype + item count

**Boxes** (cards/grid layouts — best for 3–6 items):
- solid-boxes          — filled accent boxes; frameworks, catalogs
- solid-boxes-icons    — solid boxes with icon at top; items have distinct icons
- outline-boxes        — bordered white boxes; clean and minimal
- side-line            — left accent bar + card; process steps, cause-effect
- side-line-text       — left accent bar, no bg; minimal, text-heavy
- top-line-text        — top accent bar, no bg; editorial
- top-circle           — circle at top (icon or number); numbered steps
- joined-boxes         — horizontal strip; timelines, journeys
- joined-boxes-icons   — joined strip with icons; same with icons
- leaf-boxes           — organic rounded; playful, feature showcases
- labeled-boxes        — numbered tag top-left; rankings, numbered catalogs
- alternating-boxes    — alternating accent/light; dynamic comparisons

**Bullets** (list layouts — best for 4–8 items):
- large-bullets            — big dot + title + body card; feature lists
- small-bullets            — small dot, minimal; quick lists
- arrow-bullets            — arrow prefix; action items, recommendations
- process-steps            — numbered with left accent bar; ordered procedures
- solid-box-small-bullets  — boxed small bullet; compact feature lists

**Sequence** (flow/order layouts — best for 4–8 items):
- timeline                 — spine + dot + connecting line; chronological events
- minimal-timeline         — minimal dot + divider; simple sequences
- minimal-timeline-boxes   — dotted boxes; timeline with card bg
- arrows                   — alternating arrow blocks; process flows
- pills                    — rounded pill + arrow connector; short label chains
- slanted-labels           — chevron label + body text; labeled steps

**Numbers** (stat/data layouts — best for 3–8 items; item.title = the number/stat, item.body = label):
- stats                — bold number grid; KPI dashboards
- circle-stats         — number inside ring; metrics with visual emphasis
- bar-stats            — horizontal progress bar; percentage comparisons (title must include %)
- star-rating          — star row per item; ratings, reviews (body = score, e.g. "4.5")
- dot-grid             — dot matrix grid; percentage visualisation (title must include %)
- dot-line             — dot row per item; percentage bar alternative (title must include %)
- circle-bold-line     — filled circle + title + body; numbered list with emphasis
- circle-external-line — outlined circle + title + body; softer numbered list

**Circles** (radial/cycle layouts):
- cycle          — numbered cycle with return arrow; circular processes (4–8 items)
- flower         — center item + surrounding petals; hub-and-spoke (first item = center)
- circle         — icon/number bubble grid; feature sets (3–6 items)
- ring           — outlined ring + text row; ordered lists (4–8 items)
- semi-circle    — tiered rows 1+2+3...; hierarchy or ranked groups (3–9 items)

**Quotes** (testimonial/statement layouts; item.title = attribution, item.body = quote text):
- quote-boxes      — card with large quotation mark; testimonials, key statements
- speech-bubbles   — alternating chat bubbles; dialogue, debate, Q&A

**Steps** (sequential/shape layouts — best for 4–7 items):
- staircase         — progressively wider bars; escalating steps, growth
- steps             — numbered circle + text; generic ordered steps
- box-steps         — boxed numbered steps; clean process cards
- arrow-steps       — chevron-shaped steps; sequential flows
- steps-with-icons  — step row with icon; icon-rich procedures
- pyramid           — first item = apex (narrowest), last = base (widest); priority hierarchy
- vertical-funnel   — first item = widest (top), last = narrowest; conversion funnels, filtering

### Column Count Guide
- 1 item  → columns: 1
- 2 items → columns: 2
- 3 items → columns: 3
- 4 items → columns: 2 (2×2 grid)
- 5 items → columns: 3 (3+2)
- 6 items → columns: 3 (3×2)
Note: sequence, bullets, steps, and quote variants are single-column — set columns: 1

\`\`\`json
{
  "format":      "content-v1",
  "title":       "string",         // 72 chars max, title case, no end punctuation
  "subtitle":    "string",         // 140 chars max, 1-2 sentences
  "label":       "string",         // eyebrow pill: "QUICK GUIDE", "3 STEPS" — 40 chars max
  "hero_icon":   "string",         // 1 Icons8 icon name that anchors the topic visually
  "archetype":   "string",         // document-level archetype (from list above)
  "sections": [
    {
      "archetype": "string",       // section archetype (can differ from document)
      "variant":   "string",       // variant from list above — drives the visual component
      "columns":   1,              // 1 | 2 | 3 | 4 (follow column count guide; sequence/bullets/steps = 1)
      "style":     "standard",     // "compact" | "standard" | "detailed" (text density)
      "items": [                   // 2–8 content items per section
        {
          "title": "string",       // 3-6 words, title case
          "body":  "string",       // compact=omit, standard=~15 words, detailed=~25 words
          "icon":  "string"        // Icons8 icon name (lowercase, hyphenated) — omit for quotes/numbers
        }
      ]
    }
  ],
  "stats": [                       // optional — EXACTLY 3 if included
    { "number": "string", "label": "string", "icon": "string" }
  ],
  "callout": {
    "title": "string",             // "Key Insight", "Pro Tip" — 20 chars max
    "body":  "string"              // 200 chars max, 1-2 punchy sentences
  },
  "footer_brand": "string"         // 60 chars max
}
\`\`\`

## STYLE RULES
- Items in a single section must have consistent body length (±3 words)
- compact: omit body field entirely (title only, 4-7 words)
- standard: body = 13–17 words, one complete thought
- detailed: body = 23–27 words, full explanation
- All items in a section must use the same style
- Pick icons that are visually distinct from each other across items
- Numbers/stats variants: item.title = the number (e.g. "94%", "1.2M", "4.5"), item.body = the descriptive label
- Quotes variants: item.title = attribution (person/source), item.body = the quote text

### Diagram Variants — use when spatial relationships matter more than lists

**Road / Journey** (linear path through time, phases, or experience — best for 3–6 items):
- road-horizontal   — left-to-right road with milestone stops; product roadmaps, project phases
- road-vertical     — top-to-bottom road; sequential milestones, onboarding flows
- journey-map       — horizontal stages with emotion/action rows; customer journey, UX maps
- experience-map    — phases with icon + title + body stacked; user experience, lifecycle

**Target / Radial** (concentric importance or orbital relationships — best for 3–5 items):
- bullseye          — nested rings with center = most important; priorities, focus levels
- radial            — center hub + items radiating outward; ecosystem maps, hub-and-spoke (first item = center)
- orbit             — center + items orbiting at fixed radius; satellite features, connected concepts (first item = center)
- sunburst          — center disc + outer segments; category breakdown, topic clusters (first item = center)

**Hierarchy / Funnel** (parent-child structure or narrowing stages — best for 3–6 items):
- org-chart         — top-down tree with connecting lines; org structure, reporting lines (first item = root)
- tree-horizontal   — left-to-right branching tree; decision trees, taxonomy (first item = root)
- pyramid-diagram   — triangle layers from apex to base; priority pyramid (first item = apex/top)
- nested-boxes      — boxes inside boxes; containment hierarchy, scope levels (first item = outermost)

**Venn / Relationship** (overlap, intersection, or positioning — best for 2–4 items):
- venn-2            — two overlapping circles; binary comparison with shared overlap (exactly 2 items)
- venn-3            — three overlapping circles; triple intersection (exactly 3 items)
- overlapping-sets  — horizontally offset ovals showing partial overlap; set relationships
- matrix-2x2        — four-quadrant 2×2 grid with axis labels; strategic positioning (exactly 4 items)

**Process / Motion** (cyclical flows, parallel tracks, or branching logic — best for 3–6 items):
- circular-flow     — closed loop with arrows between stages; recurring cycles, feedback loops
- swimlane          — parallel horizontal lanes, each with steps; multi-actor processes
- branching         — tree that fans out from single root; decision trees, if/then flows (first item = root)
- infinity-loop     — figure-eight loop with two phases; dual cycles, yin-yang processes (items split evenly)

**Business / Analysis** (strategic frameworks — fixed structures):
- swot              — 2×2 quadrant grid: Strengths / Weaknesses / Opportunities / Threats (exactly 4 items in that order)
- competitive-map   — 2-axis positioning map with labeled points; market landscape (items = competitors/products)
- value-chain       — horizontal linked chain of activities; Porter's value chain, pipeline stages
- bmc               — Business Model Canvas 9-block grid (exactly 9 items: Key Partners, Key Activities, Key Resources, Value Propositions, Customer Relationships, Channels, Customer Segments, Cost Structure, Revenue Streams)

**Diagram style rules:**
- For radial/orbit/sunburst: first item is always the center; remaining items surround it
- For org-chart/tree-horizontal/branching: first item is always the root node
- For nested-boxes/pyramid-diagram: first item is the outermost/topmost level
- For venn-2: exactly 2 items; for venn-3: exactly 3 items; for matrix-2x2 and swot: exactly 4 items; for bmc: exactly 9 items
- columns field is ignored for diagram variants — set columns: 1
- icon field is supported on all diagram variants
- Use diagram variants when you need to show WHERE things are relative to each other, not just WHAT they are`;

/* ─────────────────────────────────────────
   buildPrompt()
───────────────────────────────────────── */

/**
 * Build the messages array for the Anthropic API call.
 * Always uses the content-v1 schema path.
 *
 * @param {object} opts
 * @param {string}  opts.topic       — user's topic description
 * @param {string}  opts.layoutId    — any layout id (all route through content-v1)
 * @param {string}  opts.tone        — 'professional' | 'bold' | 'minimal' | 'playful'
 * @param {string} [opts.size]       — 'a4' | 'portrait' | 'square' | 'landscape' (default 'a4')
 * @param {string} [opts.archetypeId] — optional archetype id from archetypes.js
 *                                      When provided, archetype recipe overrides generic hints:
 *                                      aiSystemHint → system prefix, per-section variant/density/itemCount/aiHint
 *
 * @returns {{ system: Array, messages: Array, cacheKey: string }}
 */
export function buildPrompt({ topic, layoutId, tone, size = 'a4', archetypeId }) {
  const toneGuide = TONE_GUIDES[tone] || TONE_GUIDES.professional;

  // Always use content-v1 schema (all layouts go through renderFromContent)
  const staticBlock = `${SYSTEM_PROMPT}\n\n${CONTENT_V1_SCHEMA_PROMPT}`;

  // ── Canvas size rules ────────────────────────────────────────
  const SIZE_RULES = {
    a4:        'Canvas: A4 portrait (800×1131px). Titles ≤ 60 chars. Callout body ≤ 200 chars. Generate MAXIMUM 3 sections with 3–4 items each.',
    portrait:  'Canvas: Portrait (800×1422px). Titles ≤ 65 chars. Callout body ≤ 220 chars. Generate MAXIMUM 4 sections with 3–4 items each.',
    square:    'Canvas: Square (800×800px). VERY limited vertical space. Titles ≤ 35 chars. Callout ≤ 90 chars. Stat labels ≤ 3 words. Generate MAXIMUM 2 sections with 3 items each.',
    landscape: 'Canvas: Landscape (1100×800px). Wide but SHORT — very limited vertical space. Titles ≤ 40 chars. Callout ≤ 90 chars. Stat labels ≤ 3 words. Generate MAXIMUM 2 sections with 3–4 items each.',
  };
  const SINGLE_PAGE_RULE = 'CRITICAL: The TOTAL content must fit on a single page with NO scrolling. Leave 15% vertical space empty rather than overflow. Fewer sections with rich content is always better than more sections that overflow.';
  const sizeRule = SIZE_RULES[size] || SIZE_RULES.a4;

  // ── Content density rule ─────────────────────────────────────
  const toneId = tone || 'professional';
  let density;
  if (size === 'square') {
    density = 'compact';
  } else if (size === 'landscape') {
    density = 'standard';
  } else if (size === 'portrait') {
    density = (toneId === 'minimal') ? 'standard' : 'detailed';
  } else { // a4
    density = (toneId === 'minimal') ? 'compact' : 'standard';
  }

  // ── Column guidance per size ─────────────────────────────────
  const columnNote = {
    a4:        'Max 3 columns per section (A4 portrait is narrow). 2–3 items per row is ideal.',
    portrait:  'Max 2 columns per section (portrait is narrow). Prefer vertical stacks.',
    square:    'Max 3 columns per section. Prefer 2–3 items, compact style.',
    landscape: 'Up to 4 columns per section (landscape is wide). Use 3–4 item rows.',
  }[size] || 'Max 3 columns per section.';

  // ── ARCHETYPE PATH — override hints with recipe ───────────────
  if (archetypeId) {
    const archetype = getArchetype(archetypeId);
    if (archetype) {
      // Build per-section instructions from the recipe
      const sectionInstructions = archetype.sections.map((s, i) => {
        const count = `${s.itemCount.min}–${s.itemCount.max} items`;
        return `  Section ${i + 1} (role: ${s.role}): variant="${s.variant}", style="${s.density}", ${count}. ${s.aiHint}`;
      }).join('\n');

      const archetypeDirective = [
        `## DOCUMENT TYPE: ${archetype.name}`,
        archetype.aiSystemHint,
        '',
        '## SECTION BREAKDOWN (follow exactly):',
        sectionInstructions,
        '',
        `CRITICAL: Generate EXACTLY ${archetype.sections.length} sections in the order listed above.`,
        'Do NOT add extra sections. Do NOT change the variants specified.',
        `Each section's "style" must match the density listed for that section.`,
      ].join('\n');

      const userMessage = [
        `Topic: ${topic}`,
        `Tone: ${toneGuide}`,
        sizeRule,
        SINGLE_PAGE_RULE,
        columnNote,
        '',
        archetypeDirective,
        '',
        'Generate the JSON now. Return only the raw JSON object.',
      ].filter(Boolean).join('\n');

      return {
        system: [
          {
            type: 'text',
            text: staticBlock,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          { role: 'user', content: userMessage },
        ],
        cacheKey: `v3-content-v1-static`,
      };
    }
  }

  // ── QUICK LAYOUT PATH — generic hints ────────────────────────
  // When the user picks a named layout, nudge the AI toward relevant variants
  const LAYOUT_VARIANT_HINTS = {
    'timeline':   'Prefer sequence variants: timeline, minimal-timeline, or minimal-timeline-boxes.',
    'funnel':     'Prefer steps variants: vertical-funnel or pyramid.',
    'comparison': 'Prefer boxes variants: alternating-boxes, outline-boxes, or solid-boxes.',
    'flowchart':  'Prefer sequence variants: arrows or slanted-labels.',
    'content-v1': '',
    'auto':       '',
  };
  const layoutHint = LAYOUT_VARIANT_HINTS[layoutId] || '';

  const userMessage = [
    `Topic: ${topic}`,
    `Tone: ${toneGuide}`,
    sizeRule,
    SINGLE_PAGE_RULE,
    `Section style: "${density}" — match item body lengths to that density (see STYLE RULES above).`,
    columnNote,
    layoutHint,
    '',
    'Generate the JSON now. Return only the raw JSON object.',
  ].filter(Boolean).join('\n');

  return {
    system: [
      {
        type: 'text',
        text: staticBlock,
        cache_control: { type: 'ephemeral' },
      },
    ],

    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],

    cacheKey: `v3-content-v1-static`,
  };
}

/* ─────────────────────────────────────────
   AUTO-LAYOUT DETECTION
   Always returns 'content-v1' — all layouts use the same engine.
   The layoutId is still passed to buildPrompt() as a variant hint.
───────────────────────────────────────── */

/**
 * Detect the best layout id for a given topic string.
 * All layouts now render through content-v1; this returns a hint id
 * that buildPrompt() uses to suggest relevant variants to the AI.
 *
 * @param {string} topic
 * @returns {string} layoutId hint — always routes to content-v1 engine
 */
export function detectLayout(topic) {
  if (!topic) return 'content-v1';
  const lower = topic.toLowerCase();

  const rules = [
    { keywords: ['vs', 'versus', 'compare', 'comparison', 'differences between', 'pros cons', 'pro con'],
      layout: 'comparison' },
    { keywords: ['history', 'timeline', 'roadmap', 'evolution', 'milestones', 'over time', 'over the years'],
      layout: 'timeline' },
    { keywords: ['funnel', 'pipeline', 'stages', 'conversion', 'acquisition', 'sales process'],
      layout: 'funnel' },
    { keywords: ['flowchart', 'flow chart', 'process flow', 'decision tree', 'decision diagram'],
      layout: 'flowchart' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule.layout;
    }
  }

  return 'content-v1';
}

export { TONE_GUIDES, CONTENT_V1_SCHEMA_PROMPT };
