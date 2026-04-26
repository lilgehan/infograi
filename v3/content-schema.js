/**
 * Infogr.ai v3 — Content Schema (Layer 1)
 *
 * Defines the semantic content format that separates WHAT content IS
 * from HOW it is rendered. This implements Layer 1 of the engine spec.
 *
 * Reference: ENGINE-SPEC.md — Layer 1 Semantic Content Schemas
 *
 * Key principle: content groups carry only meaning.
 * Visual representation choices (variant, columns) are separate.
 */

/* ─────────────────────────────────────────
   CONTENT ARCHETYPES
   The 12 semantic types from ENGINE-SPEC.md Layer 1.
───────────────────────────────────────── */

export const CONTENT_ARCHETYPES = {
  PROCESS:      'process',      // step 1 → step 2 → step 3
  COMPARISON:   'comparison',   // A vs B, or A vs B vs C
  HIERARCHY:    'hierarchy',    // parent → children → grandchildren
  JOURNEY:      'journey',      // stages across time or experience
  ECOSYSTEM:    'ecosystem',    // central thing + surrounding parts
  RANKING:      'ranking',      // ordered by importance/value
  RELATIONSHIP: 'relationship', // how things connect to each other
  CAUSE_EFFECT: 'cause-effect', // X leads to Y leads to Z
  FRAMEWORK:    'framework',    // structured model (SWOT, 4Ps, etc.)
  METRICS:      'metrics',      // numbers, KPIs, data points
  NARRATIVE:    'narrative',    // story with text + visuals
  CATALOG:      'catalog',      // collection of similar items
};

export const ARCHETYPE_LIST = Object.values(CONTENT_ARCHETYPES);

/* ─────────────────────────────────────────
   TEXT DENSITY LEVELS
   ENGINE-SPEC.md Layer 5 — Adaptive Text Engine
───────────────────────────────────────── */

export const DENSITY = {
  COMPACT:  'compact',  // 4–6 words per item body
  STANDARD: 'standard', // 13–17 words per item body
  DETAILED: 'detailed', // 23–27 words per item body
};

/* ─────────────────────────────────────────
   BOX VARIANT NAMES
   The 12 variants from ENGINE-SPEC.md Section 2.3 → Boxes
───────────────────────────────────────── */

export const BOX_VARIANTS = [
  'solid-boxes',
  'solid-boxes-icons',
  'outline-boxes',
  'side-line',
  'side-line-text',
  'top-line-text',
  'top-circle',
  'joined-boxes',
  'joined-boxes-icons',
  'leaf-boxes',
  'labeled-boxes',
  'alternating-boxes',
];

/* ─────────────────────────────────────────
   FORMAT DETECTION
   Distinguishes content-v1 format from legacy template format.
───────────────────────────────────────── */

/**
 * Detect whether a parsed JSON object is new content-v1 format or old template format.
 *
 * @param {object} json
 * @returns {'content-v1'|'template'|'unknown'}
 */
export function detectFormat(json) {
  if (!json || typeof json !== 'object') return 'unknown';

  // Explicit format marker (most reliable)
  if (json.format === 'content-v1') return 'content-v1';

  // Legacy template layouts
  if (json.layout === 'mixed-grid' || json.layout === 'steps-guide') return 'template';

  // Duck-typing: sections with items arrays → content-v1
  if (Array.isArray(json.sections) && json.sections.length > 0 && json.sections[0]?.items) {
    return 'content-v1';
  }

  return 'unknown';
}

/* ─────────────────────────────────────────
   ITEM VALIDATION
───────────────────────────────────────── */

/**
 * Validate and fix a single content item.
 * Structure: { title, body?, icon?, image?, data? }
 *
 * @param {*}      item
 * @param {number} idx   — index for error messages
 * @param {Array}  errors — error array to push to
 * @returns {object} fixed item
 */
function validateItem(item, idx, errors) {
  if (!item || typeof item !== 'object') {
    errors.push(`items[${idx}] is not an object — replaced with empty item`);
    return { title: `Item ${idx + 1}`, body: '' };
  }

  const fixed = { ...item };

  // title is required
  if (!fixed.title || typeof fixed.title !== 'string') {
    errors.push(`items[${idx}].title is missing or not a string`);
    fixed.title = fixed.title != null ? String(fixed.title) : `Item ${idx + 1}`;
  }

  // body is optional, but must be string if present
  if (fixed.body !== undefined && fixed.body !== null && typeof fixed.body !== 'string') {
    fixed.body = String(fixed.body);
  }

  // icon: optional string
  if (fixed.icon !== undefined && typeof fixed.icon !== 'string') {
    fixed.icon = String(fixed.icon);
  }

  // data: optional — leave as-is (used for metrics/stats)
  return fixed;
}

/* ─────────────────────────────────────────
   GROUP VALIDATION
───────────────────────────────────────── */

/**
 * Validate and fix a content group (section).
 * Structure: { archetype, items[], heading?, variant?, columns?, style? }
 *
 * @param {*}      group
 * @param {number} idx
 * @param {Array}  errors
 * @returns {object|null} fixed group (null if unfixable)
 */
function validateGroup(group, idx, errors) {
  if (!group || typeof group !== 'object') {
    errors.push(`sections[${idx}] is not an object — skipped`);
    return null;
  }

  const fixed = { ...group };

  // archetype
  if (!ARCHETYPE_LIST.includes(fixed.archetype)) {
    errors.push(`sections[${idx}].archetype "${fixed.archetype}" is invalid — defaulting to "catalog"`);
    fixed.archetype = 'catalog';
  }

  // items
  if (!Array.isArray(fixed.items) || fixed.items.length === 0) {
    errors.push(`sections[${idx}].items must be a non-empty array`);
    fixed.items = [];
  } else {
    const itemErrors = [];
    fixed.items = fixed.items.map((item, i) => validateItem(item, i, itemErrors));
    itemErrors.forEach(e => errors.push(`sections[${idx}].${e}`));
  }

  // columns: default based on item count if not set
  if (fixed.columns == null) {
    const n = fixed.items.length;
    if (n <= 1) fixed.columns = 1;
    else if (n === 2) fixed.columns = 2;
    else if (n === 4) fixed.columns = 2; // 2×2 looks better than 4×1 or 3+1
    else fixed.columns = 3;             // 3, 5, 6+ → 3-col
  }

  if (![1, 2, 3, 4].includes(fixed.columns)) {
    errors.push(`sections[${idx}].columns must be 1–4, got ${fixed.columns} — defaulting to 3`);
    fixed.columns = 3;
  }

  // variant: default to solid-boxes
  if (!fixed.variant) fixed.variant = 'solid-boxes';

  // style (density hint): default to standard
  if (!['compact', 'standard', 'detailed'].includes(fixed.style)) {
    fixed.style = 'standard';
  }

  return fixed;
}

/* ─────────────────────────────────────────
   DOCUMENT-LEVEL VALIDATION
───────────────────────────────────────── */

/**
 * Validate a full content-v1 JSON document.
 *
 * Expected shape:
 * {
 *   format:       'content-v1',
 *   title:        string,
 *   subtitle?:    string,
 *   label?:       string,
 *   hero_icon?:   string,
 *   archetype?:   string,
 *   sections:     ContentGroup[],
 *   stats?:       [{ number, label, icon }],
 *   callout?:     { title, body },
 *   footer_brand?: string,
 * }
 *
 * @param {object} json
 * @returns {{ valid: boolean, errors: string[], fixed: object }}
 */
export function validateContent(json) {
  const errors = [];

  if (!json || typeof json !== 'object') {
    return { valid: false, errors: ['Input is not an object'], fixed: { format: 'content-v1', title: '', sections: [] } };
  }

  const fixed = JSON.parse(JSON.stringify(json));

  // Stamp format marker
  fixed.format = 'content-v1';

  // title (required)
  if (!fixed.title || typeof fixed.title !== 'string') {
    errors.push('title is missing or not a string');
    fixed.title = fixed.title != null ? String(fixed.title) : '';
  }

  // subtitle (optional string)
  if (fixed.subtitle != null && typeof fixed.subtitle !== 'string') {
    fixed.subtitle = String(fixed.subtitle);
  }

  // label (optional string ≤40 chars)
  if (fixed.label != null) {
    fixed.label = String(fixed.label).slice(0, 40);
  }

  // hero_icon (optional)
  if (fixed.hero_icon != null && typeof fixed.hero_icon !== 'string') {
    fixed.hero_icon = String(fixed.hero_icon);
  }

  // archetype (optional, document-level)
  if (fixed.archetype != null && !ARCHETYPE_LIST.includes(fixed.archetype)) {
    errors.push(`Document archetype "${fixed.archetype}" is invalid — removing`);
    delete fixed.archetype;
  }

  // sections (required, non-empty array)
  if (!Array.isArray(fixed.sections) || fixed.sections.length === 0) {
    errors.push('sections must be a non-empty array');
    fixed.sections = [];
  } else {
    const groupErrors = [];
    fixed.sections = fixed.sections
      .map((s, i) => validateGroup(s, i, groupErrors))
      .filter(Boolean);
    errors.push(...groupErrors);
  }

  // stats (optional)
  if (fixed.stats != null) {
    if (!Array.isArray(fixed.stats)) {
      errors.push('stats must be an array — removing');
      delete fixed.stats;
    } else {
      fixed.stats = fixed.stats.slice(0, 4).map((s, i) => {
        if (!s.number) errors.push(`stats[${i}].number is missing`);
        if (!s.label)  errors.push(`stats[${i}].label is missing`);
        if (!s.icon)   s.icon = 'star';
        return s;
      });
    }
  }

  // callout (optional)
  if (fixed.callout != null) {
    if (typeof fixed.callout !== 'object') {
      errors.push('callout must be an object — removing');
      delete fixed.callout;
    } else {
      if (!fixed.callout.title) errors.push('callout.title is missing');
      if (!fixed.callout.body)  errors.push('callout.body is missing');
    }
  }

  // footer_brand (optional)
  if (fixed.footer_brand != null) {
    fixed.footer_brand = String(fixed.footer_brand).slice(0, 60);
  }

  return {
    valid:  errors.length === 0,
    errors,
    fixed,
  };
}
