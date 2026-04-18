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
  professional: 'Professional — clear, authoritative, data-driven. Corporate tone. Real numbers and facts. No fluff.',
  bold:         'Bold — high-impact, direct, punchy. UPPERCASE labels. Short sentences. Maximum density. Power words.',
  minimal:      'Minimal — calm, precise, editorial. Every word earns its place. Whitespace is a design choice. No buzzwords.',
  playful:      'Playful — warm, energetic, specific. Engaging without being childish. Use active voice. Surprise the reader with one unexpected insight.',
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
- Active voice, concise phrasing — no "In today's world" or "It is important to"
- Numbers beat vague adjectives: "94% faster" beats "much faster"
- Icon names: choose ONLY from the approved list provided. Pick icons that actually match the content meaning, not generic ones.
- Titles: no punctuation at the end, title case, 1–2 lines max
- Bullets: 6–12 words each, scannable, specific. Each bullet is a complete thought.
- Callout: the single most surprising or actionable insight. Not a summary of the whole doc.

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
  "label":        string,                   // eyebrow pill: "STEP-BY-STEP GUIDE", "DATA SNAPSHOT", etc. — 40 chars max
  "hero_icon":    string,                   // 1 icon from approved list — visually anchors the whole topic
  "stats": [                                // EXACTLY 3 stat blocks
    { "number": string, "label": string, "icon": string },  // number: "94%", "5", "$2M" — label: 2-4 words
    { "number": string, "label": string, "icon": string },
    { "number": string, "label": string, "icon": string }
  ],
  "cards": [                                // EXACTLY 3 content cards
    { "icon": string, "title": string, "bullets": [string, string, string] },  // title: 3-6 words; bullets: EXACTLY 3, 6-12 words each
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

  // The dynamic user message (changes per request)
  const userMessage = [
    `Topic: ${topic}`,
    `Layout: ${layoutId}`,
    `Tone: ${toneGuide}`,
    `Canvas size: ${size}`,
    '',
    'Generate the JSON now. Return only the raw JSON object.',
  ].join('\n');

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
