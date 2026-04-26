/**
 * Infogr.ai v3 — Prompt Builder
 *
 * Builds the AI prompt for each v3 layout.
 * Replaces the monolithic buildDynamicPrompt() from v2.x app.js.
 *
 * Key differences from v2.x:
 *  - AI returns JSON only (not HTML)
 *  - Prompt is much shorter (~400 tokens static + ~200 dynamic)
 *  - JSON schema is embedded in the static (cached) part
 *  - All HTML/CSS decisions are removed from the prompt
 *
 * Usage:
 *   import { buildPrompt } from './prompt-builder.js';
 *   const messages = buildPrompt({ topic, layoutId, tone, size });
 *   // Pass messages to Anthropic API
 */

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

const SYSTEM_PROMPT = `You are Infogr.ai, a professional infographic content designer. You generate structured JSON content for infographic templates.

## YOUR ONLY JOB
Return valid JSON that matches the schema below. No HTML. No CSS. No markdown. No explanations.
Output ONLY the raw JSON object, nothing else.

## CONTENT RULES (always apply)
- Real, specific facts and data — never lorem ipsum, never vague filler
- Active voice — no "In today's world", "It is important to", "Leveraging synergies"
- Numbers beat vague adjectives: "94% faster" beats "much faster"
- Icon names: pick any Icons8 icon name. Use lowercase, hyphenated names that literally describe the visual — words you'd type into an icon search bar. Be specific: "pie-chart" not "chart", "fingerprint" not "security", "neural-network" not "brain", "bar-chart-side" not "stats". Icons8 has 100,000+ icons, so pick the most visually precise match for each concept.
- Titles: no punctuation at the end, title case, 1–2 lines max
- Bullets: write to the density target in the user message. Complete thoughts, not fragments.
- Callout: the single most surprising or actionable insight — not a summary of the document.

## CARD DENSITY (mixed-grid only)
The user message specifies a card_density. Include it as-is in your JSON and match the bullet length PRECISELY:
- "compact"  → 4–6 words per bullet. One tight line only. No wrapping.
- "standard" → Target exactly 15 words per bullet. Hard range: 13–17 words. No shorter, no longer.
- "detailed" → Target exactly 25 words per bullet. Hard range: 23–27 words.

UNIFORMITY IS MANDATORY — count your words before writing each bullet:
All 9 bullets (3 cards × 3 bullets) must land within ±2 words of each other.
Example: if bullet 1 is 15 words, every other bullet must be 13–17 words.
Bullets that are 10 words in one card and 20 words in another destroy visual alignment.

CARD TITLES: All 3 card titles must be 3–5 words. Keep the same word count across all 3 titles.

## FONT RULES (baked into templates — do not put font names in JSON)
- Hero titles: Space Grotesk only (this is handled by the template automatically)
- All other text: Plus Jakarta Sans (handled automatically)
- NEVER output Syne, Oswald, Roboto Condensed, or any wide/condensed font names

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
   MIXED-GRID SCHEMA PROMPT
───────────────────────────────────────── */

const MIXED_GRID_SCHEMA_PROMPT = `## JSON SCHEMA — mixed-grid

\`\`\`
{
  "layout":       "mixed-grid",             // always this value
  "title":        string,                   // 72 chars max, 1–2 lines, no end punctuation
  "subtitle":     string,                   // 140 chars max, 1–2 sentences
  "label":        string,                   // eyebrow pill: "STEP-BY-STEP GUIDE", "DATA SNAPSHOT" — 40 chars max
  "hero_icon":    string,                   // 1 Icons8 icon name — visually anchors the topic
  "card_density": string,                   // copy verbatim from the density rule in the user message: "compact" | "standard" | "detailed"
  "stats": [                                // EXACTLY 3 stat blocks
    { "number": string, "label": string, "icon": string },  // number: "94%", "5", "$2M" — label: 2-4 words
    { "number": string, "label": string, "icon": string },
    { "number": string, "label": string, "icon": string }
  ],
  "cards": [                                // EXACTLY 3 content cards — ALL 3 must use the same bullet length
    { "icon": string, "title": string, "bullets": [string, string, string] },  // title: 3-5 words, same count across all cards; bullets: EXACTLY 3, all within ±2 words of each other
    { "icon": string, "title": string, "bullets": [string, string, string] },
    { "icon": string, "title": string, "bullets": [string, string, string] }
  ],
  "callout": {
    "title": string,                        // "Pro Tip", "Key Insight", "Remember" — 20 chars max
    "body":  string                         // 200 chars max — 1-2 punchy sentences
  },
  "footer_brand": string                    // brand or source attribution — 60 chars max
}
\`\`\``;

/* ─────────────────────────────────────────
   STEPS-GUIDE SCHEMA PROMPT
───────────────────────────────────────── */

const STEPS_GUIDE_SCHEMA_PROMPT = `## JSON SCHEMA — steps-guide

\`\`\`
{
  "layout":       "steps-guide",            // always this value
  "title":        string,                   // 72 chars max, 1–2 lines
  "subtitle":     string,                   // 140 chars max, 1–2 sentences
  "label":        string,                   // "HOW TO", "5 STEPS", etc. — 40 chars max
  "hero_icon":    string,                   // 1 Icons8 icon name — visually anchors the topic
  "sections": [                             // 4–6 steps (exact count based on topic)
    {
      "number":  number,                    // step number: 1, 2, 3...
      "title":   string,                    // step title: 3-6 words, action verb first
      "body":    string,                    // 120 chars max — what to do and why, no fluff
      "icon":    string                     // icon specific to this step's action
    }
    // ...repeat for each step
  ],
  "stats": [                                // EXACTLY 3 quick facts
    { "number": string, "label": string, "icon": string },
    { "number": string, "label": string, "icon": string },
    { "number": string, "label": string, "icon": string }
  ],
  "callout": {
    "title": string,                        // "Common Mistake", "Pro Tip", "Key Rule" — 20 chars max
    "body":  string                         // 200 chars max
  },
  "footer_brand": string                    // 60 chars max
}
\`\`\``;

/* ─────────────────────────────────────────
   CONTENT-V1 SCHEMA PROMPT
   Phase 2 — Content/representation separation.
   AI returns archetype + items; renderer picks the visual form.
───────────────────────────────────────── */

const CONTENT_V1_SCHEMA_PROMPT = `## JSON SCHEMA — content-v1

This is the content-first format. Return semantic content items with archetype
classification. The renderer chooses the best visual representation automatically.

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

### Box Variants
Pick the variant that best fits the archetype and item count:
- **solid-boxes**        — filled accent-color boxes; great for frameworks, catalogs
- **solid-boxes-icons**  — solid boxes with an icon at the top; use when items have distinct icons
- **outline-boxes**      — bordered boxes, white fill; clean and minimal
- **side-line**          — left accent bar + card; great for process steps, cause-effect
- **side-line-text**     — left accent bar, no card bg; very minimal, text-heavy
- **top-line-text**      — top accent bar, no card; elegant, editorial
- **top-circle**         — circle at top (icon or number); good for numbered steps
- **joined-boxes**       — items joined in a horizontal strip; great for timelines, journeys
- **joined-boxes-icons** — joined strip with icons; same as above with icons
- **leaf-boxes**         — organic rounded corners; playful, feature showcases
- **labeled-boxes**      — numbered tag at top-left; rankings, numbered catalogs
- **alternating-boxes**  — alternating accent/light; visually dynamic comparisons

### Column Count Guide
- 1 item  → columns: 1
- 2 items → columns: 2
- 3 items → columns: 3
- 4 items → columns: 2 (2×2 grid looks better than 4×1)
- 5 items → columns: 3 (3+2 arrangement)
- 6 items → columns: 3 (3×2 perfect grid)

\`\`\`json
{
  "format":      "content-v1",
  "title":       string,          // 72 chars max, title case, no end punctuation
  "subtitle":    string,          // 140 chars max, 1-2 sentences
  "label":       string,          // eyebrow pill: "QUICK GUIDE", "3 STEPS" — 40 chars max
  "hero_icon":   string,          // 1 Icons8 icon name that anchors the topic visually
  "archetype":   string,          // document-level archetype (from list above)
  "sections": [
    {
      "archetype": string,        // section archetype (can differ from document)
      "variant":   string,        // box variant from list above
      "columns":   number,        // 1 | 2 | 3 | 4 (follow column count guide above)
      "style":     string,        // "compact" | "standard" | "detailed" (text density)
      "items": [                  // 2–6 content items per section
        {
          "title": string,        // 3-6 words, title case
          "body":  string,        // density-matched: compact=omit, standard=~15 words, detailed=~25 words
          "icon":  string         // Icons8 icon name (lowercase, hyphenated)
        }
        // ... repeat for each item
      ]
    }
    // ... repeat for each section (1-3 sections per infographic)
  ],
  "stats": [                      // optional — EXACTLY 3 if included
    { "number": string, "label": string, "icon": string }
  ],
  "callout": {
    "title": string,              // "Key Insight", "Pro Tip" — 20 chars max
    "body":  string               // 200 chars max, 1-2 punchy sentences
  },
  "footer_brand": string          // 60 chars max
}
\`\`\`

## STYLE RULES FOR CONTENT-V1
- Items in a single section should have consistent body length (±3 words)
- For "compact" style: omit body field entirely (title only)
- For "standard" style: body = 13–17 words, complete thought
- For "detailed" style: body = 23–27 words, full explanation
- All items in a section must use the same style
- Pick icons that are visually distinct from each other across items`;

/* ─────────────────────────────────────────
   SCHEMA PROMPT REGISTRY
───────────────────────────────────────── */

const SCHEMA_PROMPTS = {
  'mixed-grid':  MIXED_GRID_SCHEMA_PROMPT,
  'steps-guide': STEPS_GUIDE_SCHEMA_PROMPT,
  'content-v1':  CONTENT_V1_SCHEMA_PROMPT,
};

/* ─────────────────────────────────────────
   buildPrompt()
───────────────────────────────────────── */

/**
 * Build the messages array for the Anthropic API call.
 *
 * @param {object} opts
 * @param {string}  opts.topic     — user's topic description
 * @param {string}  opts.layoutId  — 'mixed-grid' | 'steps-guide' | ...
 * @param {string}  opts.tone      — 'professional' | 'bold' | 'minimal' | 'playful'
 * @param {string} [opts.size]     — 'a4' | 'portrait' | 'square' | 'landscape' (default 'a4')
 *
 * @returns {{ system: string, messages: Array, cacheKey: string }}
 */
export function buildPrompt({ topic, layoutId, tone, size = 'a4' }) {
  const schemaPrompt = SCHEMA_PROMPTS[layoutId];
  if (!schemaPrompt) {
    throw new Error(`[prompt-builder] Unknown layoutId: "${layoutId}". Valid: ${Object.keys(SCHEMA_PROMPTS).join(', ')}`);
  }

  const toneGuide = TONE_GUIDES[tone] || TONE_GUIDES.professional;

  // The static system part (cacheable — never changes per session)
  const staticBlock = `${SYSTEM_PROMPT}\n\n${schemaPrompt}`;

  // ── Canvas size rules ────────────────────────────────────────
  const SIZE_RULES = {
    a4:        'Canvas: A4 portrait (800×1131px). Titles ≤ 60 chars. Callout body ≤ 200 chars.',
    portrait:  'Canvas: Portrait (800×1422px). Titles ≤ 65 chars. Callout body ≤ 220 chars. Extra vertical room available.',
    square:    'Canvas: Square (800×800px). VERY limited. Titles ≤ 35 chars. Callout ≤ 90 chars. Stat labels ≤ 3 words.',
    landscape: 'Canvas: Landscape (1100×800px). Wide but short. Titles ≤ 40 chars. Callout ≤ 90 chars. Stat labels ≤ 3 words.',
  };
  const sizeRule = SIZE_RULES[size] || SIZE_RULES.a4;

  // ── Card density rule (mixed-grid only) ──────────────────────
  let densityRule = '';
  if (layoutId === 'mixed-grid') {
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
    densityRule = `Card density: "${density}" — write bullets at that length (see CARD DENSITY rules above).`;
  }

  // ── Content-v1 section style guide ───────────────────────────
  // Tell the AI which text density to target based on size.
  let contentDensityRule = '';
  if (layoutId === 'content-v1') {
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

    // Column guidance for content-v1 based on aspect ratio
    const columnNote = {
      a4:        'Max 3 columns per section (A4 portrait is narrow). 2–3 items per row is ideal.',
      portrait:  'Max 2 columns per section (portrait is narrow). Prefer vertical stacks.',
      square:    'Max 3 columns per section. Prefer 2–3 items, compact style.',
      landscape: 'Up to 4 columns per section (landscape is wide). Use 3–4 item rows.',
    }[size] || 'Max 3 columns per section.';

    contentDensityRule = [
      `Section style: "${density}" — match item body lengths to that density (see schema rules above).`,
      columnNote,
    ].join('\n');
  }

  // The dynamic user message (changes per request)
  const userMessage = [
    `Topic: ${topic}`,
    `Layout: ${layoutId}`,
    `Tone: ${toneGuide}`,
    sizeRule,
    densityRule,
    contentDensityRule,
    '',
    'Generate the JSON now. Return only the raw JSON object.',
  ].filter(Boolean).join('\n');

  return {
    // System prompt for the API call
    system: [
      {
        type: 'text',
        text: staticBlock,
        cache_control: { type: 'ephemeral' },
      },
    ],

    // Messages array
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],

    // Cache key for debugging
    cacheKey: `v3-${layoutId}-static`,
  };
}

/* ─────────────────────────────────────────
   AUTO-LAYOUT DETECTION
   Matches user topic keywords to a layout.
   Used when layout = 'auto'.
───────────────────────────────────────── */

// Phase 1 layouts — handled by fillTemplate() + HTML templates
const PHASE1_LAYOUTS = new Set(['mixed-grid', 'steps-guide']);

const AUTO_LAYOUT_RULES = [
  // Phase 1 — template-based
  { keywords: ['steps', 'how to', 'guide', 'setup', 'install', 'configure', 'tutorial', 'walkthrough'],
    layout: 'steps-guide' },

  // Phase 2 — content-v1 path (programmatic rendering via smart-layouts)
  { keywords: ['vs', 'versus', 'compare', 'comparison', 'differences between', 'pros cons', 'pro con', 'vs.'],
    layout: 'content-v1' },
  { keywords: ['history', 'timeline', 'roadmap', 'evolution', 'milestones', 'over time', 'over the years'],
    layout: 'content-v1' },
  { keywords: ['funnel', 'pipeline', 'stages', 'conversion', 'acquisition', 'sales process'],
    layout: 'content-v1' },
  { keywords: ['flowchart', 'flow chart', 'process flow', 'decision tree', 'decision diagram'],
    layout: 'content-v1' },
  { keywords: ['journey', 'customer journey', 'user journey', 'experience map'],
    layout: 'content-v1' },
  { keywords: ['framework', 'model', 'swot', '4ps', 'matrix', 'quadrant'],
    layout: 'content-v1' },
  { keywords: ['ecosystem', 'architecture', 'components', 'system overview'],
    layout: 'content-v1' },
];

/**
 * Detect the best layout for a given topic string.
 * Phase 1 layouts → fillTemplate() path.
 * Phase 2 layouts → renderFromContent() path via 'content-v1'.
 * Default → 'mixed-grid' (Phase 1 safe fallback).
 *
 * @param {string} topic
 * @returns {string} layoutId
 */
export function detectLayout(topic) {
  if (!topic) return 'mixed-grid';
  const lower = topic.toLowerCase();

  for (const rule of AUTO_LAYOUT_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule.layout;
    }
  }

  return 'mixed-grid';
}

export { TONE_GUIDES, CONTENT_V1_SCHEMA_PROMPT, PHASE1_LAYOUTS };
