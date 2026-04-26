/**
 * Infogr.ai v3 — Schema Validation
 *
 * Lightweight schema validator for AI-returned JSON.
 * No external dependencies — runs in the browser.
 *
 * All AI responses go through the content-v1 path.
 * Legacy template schemas (mixed-grid, steps-guide) have been removed.
 *
 * Usage:
 *   import { detectAndParse, extractJsonFromResponse } from './schema.js';
 *   const { data, format } = detectAndParse(rawText);
 *   // format is always 'content-v1' for well-formed responses
 */

import { validateContent } from './content-schema.js';

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
 * Full pipeline: extract JSON → validate as content-v1 → return fixed data.
 *
 * This is the single entry point for all AI response parsing.
 * All layouts now return content-v1 JSON.
 *
 * @param {string} rawText    — raw AI response text
 * @param {string} [_hint]    — ignored (kept for call-site compatibility)
 * @returns {{ data: object, format: 'content-v1'|'unknown' }}
 * @throws {Error}            — if JSON extraction fails entirely
 */
export function detectAndParse(rawText, _hint) {
  const parsed = extractJsonFromResponse(rawText);
  if (!parsed) throw new Error('[v3 schema] Could not extract JSON from AI response.');

  // All responses should be content-v1; validate and fix
  if (parsed.format === 'content-v1' || parsed.sections) {
    const { errors, fixed } = validateContent(parsed);
    if (errors.length > 0) {
      console.warn('[v3 schema] content-v1 validation issues:', errors);
    }
    return { data: fixed, format: 'content-v1' };
  }

  // Fallback — return raw parsed with a warning
  console.warn('[v3 schema] Response missing "format" or "sections" — returning raw parsed JSON.');
  return { data: parsed, format: 'unknown' };
}
