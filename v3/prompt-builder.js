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
   APPROVED ICON LIST
   Keep in sync with schema.js and schema.json
───────────────────────────────────────── */
const ICON_LIST = [
  'rocket','idea','lightning-bolt','gear','calendar-3','user-group','shield',
  'checkmark','star','trophy','target','key','lock','internet','database',
  'source-code','console','cloud-storage','briefcase','dollar-coin','search',
  'open-book','chart-increasing','analytics','pie-chart','clock','teamwork',
  'strategy','growth','workflow','checklist','deadline','meeting','handshake',
  'networking','statistics','report','presentation','brain','artificial-intelligence',
  'robot-2','color-palette','image','video','collaboration','creativity','resume',
  'approval','priority','layers','settings','home','smartphone','mail','folder','link',
].join(', ');

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
- Icon names: choose ONLY from the approved list. Pick icons that match the content meaning.
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

## APPROVED ICON LIST (use ONLY these exact names)
${ICON_LIST}

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
  "hero_icon":    string,                   // 1 icon from approved list — visually anchors the topic
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
  "hero_icon":    string,                   // 1 icon from approved list
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
   SCHEMA PROMPT REGISTRY
───────────────────────────────────────── */

const SCHEMA_PROMPTS = {
  'mixed-grid':  MIXED_GRID_SCHEMA_PROMPT,
  'steps-guide': STEPS_GUIDE_SCHEMA_PROMPT,
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
    throw new Error(`[prompt-builder] Unknown layoutId: "${layoutId}"`);
  }

  const toneGuide = TONE_GUIDES[tone] || TONE_GUIDES.professional;

  // The static system part (cacheable — never changes per session)
  const staticBlock = `${SYSTEM_PROMPT}\n\n${schemaPrompt}`;

  // ── Canvas size rules ────────────────────────────────────────
  // These govern non-text overflow only (title/callout char limits, icon sizes).
  // Bullet length is controlled separately by the density rule below.
  const SIZE_RULES = {
    a4:        'Canvas: A4 portrait (800×1131px). Titles ≤ 60 chars. Callout body ≤ 200 chars.',
    portrait:  'Canvas: Portrait (800×1422px). Titles ≤ 65 chars. Callout body ≤ 220 chars. Extra vertical room available.',
    square:    'Canvas: Square (800×800px). VERY limited. Titles ≤ 35 chars. Callout ≤ 90 chars. Stat labels ≤ 3 words.',
    landscape: 'Canvas: Landscape (1100×800px). Wide but short. Titles ≤ 40 chars. Callout ≤ 90 chars. Stat labels ≤ 3 words.',
  };
  const sizeRule = SIZE_RULES[size] || SIZE_RULES.a4;

  // ── Card density rule (mixed-grid only) ──────────────────────
  // Computed here so the AI receives an explicit instruction and
  // includes the correct card_density value in its JSON output.
  // The renderer (computeCardDensity) also computes this independently
  // as a fallback if the AI omits or mangles the field.
  let densityRule = '';
  if (layoutId === 'mixed-grid') {
    const toneId = tone || 'professional';
    let density;
    if (size === 'square') {
      // Square: ~30px per bullet — only 1 line fits
      density = 'compact';
    } else if (size === 'landscape') {
      // Landscape: ~39px per bullet — 2 lines fit (CSS override caps standard at 2 lines)
      // Use standard density so AI writes 12–15 word bullets, not 6-word fragments
      density = 'standard';
    } else if (size === 'portrait') {
      // Portrait: ~157px per bullet — 4 lines easily
      density = (toneId === 'minimal') ? 'standard' : 'detailed';
    } else { // a4
      // A4: ~77px per bullet — 4 lines possible, 3 lines is the sweet spot
      density = (toneId === 'minimal') ? 'compact' : 'standard';
    }
    densityRule = `Card density: "${density}" — write bullets at that length (see CARD DENSITY rules above).`;
  }

  // The dynamic user message (changes per request)
  const userMessage = [
    `Topic: ${topic}`,
    `Layout: ${layoutId}`,
    `Tone: ${toneGuide}`,
    sizeRule,
    densityRule,
    '',
    'Generate the JSON now. Return only the raw JSON object.',
  ].filter(Boolean).join('\n');

  return {
    // System prompt for the API call
    system: [
      {
        type: 'text',
        text: staticBlock,
        // Enable prompt caching on the static block
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

    // Cache key for debugging (identifies the static block version)
    cacheKey: `v3-${layoutId}-static`,
  };
}

/* ─────────────────────────────────────────
   AUTO-LAYOUT DETECTION
   Matches user topic keywords to a layout.
   Used when layout = 'auto'.
───────────────────────────────────────── */

const AUTO_LAYOUT_RULES = [
  { keywords: ['vs', 'versus', 'compare', 'comparison', 'difference', 'pros cons', 'pro con', 'vs.'],  layout: 'comparison'  },
  { keywords: ['steps', 'how to', 'guide', 'setup', 'install', 'configure', 'tutorial', 'walkthrough'], layout: 'steps-guide' },
  { keywords: ['history', 'timeline', 'roadmap', 'evolution', 'milestones', 'journey', 'over time'],   layout: 'timeline'    },
  { keywords: ['funnel', 'pipeline', 'stages', 'conversion', 'acquisition', 'sales process'],          layout: 'funnel'      },
  { keywords: ['decision', 'flowchart', 'flow', 'process flow', 'if else', 'diagram', 'decision tree'],layout: 'flowchart'   },
];

/**
 * Detect the best layout for a given topic string.
 * Returns 'mixed-grid' as the safe default.
 *
 * @param {string} topic
 * @returns {string} layoutId
 */
export function detectLayout(topic) {
  if (!topic) return 'mixed-grid';
  const lower = topic.toLowerCase();

  for (const rule of AUTO_LAYOUT_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      // Only return layouts that are implemented in Phase 1
      if (['steps-guide', 'mixed-grid'].includes(rule.layout)) {
        return rule.layout;
      }
      // Phase 2 layouts fall back to mixed-grid for now
      return 'mixed-grid';
    }
  }

  return 'mixed-grid';
}

export { TONE_GUIDES, ICON_LIST };
