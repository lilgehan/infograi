/**
 * Infogr.ai v3 — Schema Validation
 *
 * Lightweight schema validator for AI-returned JSON.
 * No external dependencies — runs in the browser.
 *
 * Usage:
 *   import { validateSchema, detectAndParse } from './schema.js';
 *   const { data, format } = await detectAndParse(rawText);
 *   // format: 'content-v1' | 'template' | 'unknown'
 */

/**
 * NOTE: Schema objects are inlined here rather than imported as JSON
 * so this file works in plain browser ES modules without a bundler.
 * The authoritative schema definitions live in templates/{id}/schema.json —
 * keep these in sync when schemas change.
 */

import { detectFormat, validateContent } from './content-schema.js';

/* Minimal inline schemas used for validation (full schemas are in the .json files for docs/tooling). */
const SCHEMAS = {
  'mixed-grid': {
    required: ['layout', 'title', 'hero_icon', 'stats', 'cards', 'callout', 'footer_brand'],
    properties: {
      layout:       { type: 'string', maxLength: 20 },
      title:        { type: 'string', maxLength: 72 },
      subtitle:     { type: 'string', maxLength: 140 },
      label:        { type: 'string', maxLength: 40 },
      hero_icon:    { type: 'string' },
      footer_brand: { type: 'string', maxLength: 60 },
    },
  },
  'steps-guide': {
    required: ['layout', 'title', 'hero_icon', 'sections', 'stats', 'callout', 'footer_brand'],
    properties: {
      layout:       { type: 'string', maxLength: 20 },
      title:        { type: 'string', maxLength: 72 },
      subtitle:     { type: 'string', maxLength: 140 },
      label:        { type: 'string', maxLength: 40 },
      hero_icon:    { type: 'string' },
      footer_brand: { type: 'string', maxLength: 60 },
    },
  },
};

/**
 * Icons8 has 100,000+ icons — the AI picks freely.
 * No approved list. Invalid icon names degrade gracefully via onerror in the renderer.
 * Validation only checks that icon fields are non-empty strings.
 */

/**
 * Validate a parsed JSON object against a layout schema.
 * Returns { valid: boolean, errors: string[], fixed: object }
 * where `fixed` has common issues auto-corrected.
 *
 * @param {object} json
 * @param {string} layoutId
 * @returns {{ valid: boolean, errors: string[], fixed: object }}
 */
export function validateSchema(json, layoutId) {
  const errors = [];
  const schema = SCHEMAS[layoutId];

  if (!schema) {
    return {
      valid: false,
      errors: [`Unknown layout: "${layoutId}"`],
      fixed: json,
    };
  }

  if (!json || typeof json !== 'object') {
    return { valid: false, errors: ['JSON is not an object'], fixed: {} };
  }

  // Deep clone for safe mutation
  const fixed = JSON.parse(JSON.stringify(json));

  // ── layout field ──
  if (fixed.layout !== layoutId) {
    errors.push(`layout should be "${layoutId}", got "${fixed.layout}" — auto-corrected`);
    fixed.layout = layoutId;
  }

  // ── Required string fields ──
  const requiredStrings = schema.required?.filter(k => schema.properties[k]?.type === 'string') ?? [];
  for (const key of requiredStrings) {
    if (!fixed[key] || typeof fixed[key] !== 'string') {
      errors.push(`Missing or invalid required field: "${key}"`);
      fixed[key] = fixed[key] ?? '';
    }
    // Enforce maxLength
    const maxLen = schema.properties[key]?.maxLength;
    if (maxLen && typeof fixed[key] === 'string' && fixed[key].length > maxLen) {
      errors.push(`"${key}" exceeds maxLength ${maxLen} — truncated`);
      fixed[key] = fixed[key].slice(0, maxLen);
    }
  }

  // ── Icon fields — just check non-empty; renderer handles missing icons via onerror ──
  if (!fixed.hero_icon || typeof fixed.hero_icon !== 'string') {
    errors.push(`hero_icon is missing or invalid`);
    fixed.hero_icon = 'star';
  }

  // ── stats array ──
  if (layoutId === 'mixed-grid' || layoutId === 'steps-guide') {
    if (!Array.isArray(fixed.stats) || fixed.stats.length < 3) {
      errors.push(`"stats" must be an array of at least 3 items`);
    } else {
      fixed.stats = fixed.stats.slice(0, 3).map((s, i) => {
        if (!s.number)   errors.push(`stats[${i}].number is missing`);
        if (!s.label)    errors.push(`stats[${i}].label is missing`);
        if (!s.icon)     s.icon = 'star'; // ensure non-empty
        return s;
      });
    }
  }

  // ── card_density (mixed-grid) ──
  if (layoutId === 'mixed-grid') {
    const VALID_DENSITIES = ['compact', 'standard', 'detailed'];
    if (fixed.card_density && !VALID_DENSITIES.includes(fixed.card_density)) {
      errors.push(`card_density "${fixed.card_density}" is invalid — removed (renderer will default)`);
      delete fixed.card_density;
    }
  }

  // ── cards array (mixed-grid) ──
  if (layoutId === 'mixed-grid') {
    if (!Array.isArray(fixed.cards) || fixed.cards.length < 3) {
      errors.push(`"cards" must be an array of at least 3 items`);
    } else {
      fixed.cards = fixed.cards.slice(0, 3).map((c, i) => {
        if (!c.title) errors.push(`cards[${i}].title is missing`);
        if (!c.icon) c.icon = 'star'; // ensure non-empty; renderer handles missing icons gracefully
        if (!Array.isArray(c.bullets) || c.bullets.length < 3) {
          errors.push(`cards[${i}].bullets must have at least 3 items`);
          c.bullets = (c.bullets ?? []).slice(0, 3);
          while (c.bullets.length < 3) c.bullets.push('');
        }
        c.bullets = c.bullets.slice(0, 3);
        return c;
      });
    }
  }

  // ── sections array (steps-guide) ──
  if (layoutId === 'steps-guide') {
    if (!Array.isArray(fixed.sections) || fixed.sections.length < 2) {
      errors.push(`"sections" must be an array of at least 2 steps`);
    } else {
      fixed.sections = fixed.sections.slice(0, 6).map((s, i) => {
        if (!s.title) errors.push(`sections[${i}].title is missing`);
        if (!s.body)  errors.push(`sections[${i}].body is missing`);
        if (!s.icon) s.icon = 'star'; // ensure non-empty; renderer handles missing icons gracefully
        s.number = s.number ?? i + 1;
        return s;
      });
    }
  }

  // ── callout ──
  if (fixed.callout) {
    if (!fixed.callout.title) errors.push(`callout.title is missing`);
    if (!fixed.callout.body)  errors.push(`callout.body is missing`);
  }

  return {
    valid: errors.length === 0,
    errors,
    fixed,
  };
}

/**
 * Extract JSON from a Claude response string that may include prose or markdown fences.
 * Returns parsed object, or null if extraction fails.
 *
 * @param {string} rawText
 * @returns {object|null}
 */
export function extractJsonFromResponse(rawText) {
  if (!rawText) return null;

  // Try direct parse first
  try {
    return JSON.parse(rawText.trim());
  } catch (_) { /* fall through */ }

  // Strip markdown code fences ```json ... ``` or ``` ... ```
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch (_) { /* fall through */ }
  }

  // Find the outermost { ... } block
  const start = rawText.indexOf('{');
  const end   = rawText.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(rawText.slice(start, end + 1)); } catch (_) { /* fall through */ }
  }

  return null;
}

/**
 * Full pipeline: extract → validate → return fixed JSON or throw.
 * Legacy path for template-based layouts (mixed-grid, steps-guide).
 *
 * @param {string} rawText    — raw AI response text
 * @param {string} layoutId   — expected layout
 * @returns {object}          — validated + fixed JSON
 * @throws {Error}            — if extraction fails or critical fields missing
 */
export function parseAndValidate(rawText, layoutId) {
  const parsed = extractJsonFromResponse(rawText);
  if (!parsed) throw new Error('[v3 schema] Could not extract JSON from AI response.');

  const { valid, errors, fixed } = validateSchema(parsed, layoutId);

  if (!valid && errors.some(e => !e.includes('auto-corrected') && !e.includes('not approved') && !e.includes('replaced') && !e.includes('truncated'))) {
    console.warn('[v3 schema] Validation warnings:', errors);
  }

  return fixed;
}

/**
 * Format-aware pipeline: extract → auto-detect format → validate → return.
 *
 * This is the Phase 2 entry point. It auto-detects whether the AI returned
 * a content-v1 document or a legacy template document, then validates
 * and fixes it using the appropriate validator.
 *
 * Use this in callAgentV3() instead of parseAndValidate() when layout is
 * 'content-v1' or 'auto'.
 *
 * @param {string} rawText    — raw AI response text
 * @param {string} [hint]     — optional layout hint ('content-v1' | 'mixed-grid' | etc.)
 * @returns {{ data: object, format: 'content-v1'|'template'|'unknown' }}
 * @throws {Error}            — if JSON extraction fails entirely
 */
export function detectAndParse(rawText, hint) {
  const parsed = extractJsonFromResponse(rawText);
  if (!parsed) throw new Error('[v3 schema] Could not extract JSON from AI response.');

  // Auto-detect format from the JSON itself
  const detected = detectFormat(parsed);

  // Honor an explicit hint if detection is ambiguous
  const format = detected !== 'unknown' ? detected : (hint === 'content-v1' ? 'content-v1' : detected);

  if (format === 'content-v1') {
    // Validate with the content-v1 validator from content-schema.js
    const { errors, fixed } = validateContent(parsed);
    if (errors.length > 0) {
      console.warn('[v3 schema] content-v1 validation issues:', errors);
    }
    return { data: fixed, format: 'content-v1' };
  }

  if (format === 'template') {
    // Determine which template it is from the layout field
    const layoutId = parsed.layout || hint || 'mixed-grid';
    const { errors, fixed } = validateSchema(parsed, layoutId);
    if (errors.length > 0) {
      console.warn('[v3 schema] template validation issues:', errors);
    }
    return { data: fixed, format: 'template' };
  }

  // Unknown format — return raw parsed with a warning
  console.warn('[v3 schema] Could not detect format from AI response — returning raw parsed JSON.');
  return { data: parsed, format: 'unknown' };
}
