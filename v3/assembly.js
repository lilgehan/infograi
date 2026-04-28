/**
 * Infogr.ai v3 — Assembly Function (Phase 4.5R)
 *
 * Sits between the AI response and the renderer.
 * Validates and adjusts content-v1 JSON so every section's item count
 * and text lengths match the target variant's slot rules.
 *
 * Usage:
 *   import { assembleContent } from './assembly.js';
 *   const { adjusted, changes } = assembleContent(contentJson, sizeId);
 *   // Pass `adjusted` to renderFromContent()
 *
 * What it does per section:
 *   1. Looks up slot rules for section.variant
 *   2. Applies global size cap + per-variant size overrides
 *   3. Trims items[] to effectiveMaxItems (logs each trim)
 *   4. For fixed-slot variants: pads or auto-switches if count is wrong
 *   5. For elastic variants: auto-switches if count is below minItems
 *   6. Truncates item.title and item.body per slot character limits
 *
 * Returns:
 *   { adjusted: contentJson, changes: string[] }
 *   `adjusted` is a deep clone — original is never mutated.
 *   `changes` is a human-readable log of every adjustment made.
 */

import {
  SLOT_RULES,
  GLOBAL_SIZE_MAX,
  TRANSFORMATION_FAMILIES,
  getEffectiveMaxItems,
  getTransformationFamilies,
} from './slot-rules.js';

/* ─────────────────────────────────────────
   FIXED-SLOT AUTO-SWITCH TABLE
   When a fixed-slot variant can't accept the
   given item count, try these alternatives first.
───────────────────────────────────────── */

const FIXED_SLOT_FALLBACKS = {
  // venn-2 (needs exactly 2) → venn-3 for 3, overlapping-sets for 4+
  'venn-2': {
    2: 'venn-2',
    3: 'venn-3',
    4: 'overlapping-sets',
    // counts 5+ handled by the ">= highest key" fallback → overlapping-sets
  },
  // venn-3 (needs exactly 3) → venn-2 for 2, overlapping-sets for 4+
  'venn-3': {
    2: 'venn-2',
    3: 'venn-3',
    4: 'overlapping-sets',
  },
  // matrix-2x2 (needs exactly 4) → solid-boxes for any other count
  'matrix-2x2': {
    2: 'solid-boxes', 3: 'solid-boxes',
    4: 'matrix-2x2',
    5: 'solid-boxes', 6: 'solid-boxes', 7: 'solid-boxes', 8: 'solid-boxes',
  },
  // swot (needs exactly 4) → pad/trim only, never auto-switch (SWOT is SWOT)
  'swot': null,
  // bmc (needs 6-8) → fall back to value-chain if fewer items
  'bmc': {
    fallbackVariant: 'value-chain',
    fallbackThreshold: 6,
  },
};

/* ─────────────────────────────────────────
   TEXT TRUNCATION
───────────────────────────────────────── */

/**
 * Truncate a string to maxChars, appending '…' if truncated.
 * Returns the string unchanged if it fits within maxChars.
 * Returns '' if maxChars === 0.
 */
function truncateAt(str, maxChars) {
  if (!str || typeof str !== 'string') return str || '';
  if (maxChars === 0) return '';
  if (str.length <= maxChars) return str;
  // Try to break at a word boundary within the last 15% of the limit
  const hardLimit = maxChars - 1;
  const slice = str.slice(0, hardLimit);
  const lastSpace = slice.lastIndexOf(' ');
  const breakAt = lastSpace > hardLimit * 0.75 ? lastSpace : hardLimit;
  return str.slice(0, breakAt).trimEnd() + '…';
}

/* ─────────────────────────────────────────
   FIND BEST FALLBACK VARIANT
───────────────────────────────────────── */

/**
 * Given a variant and an item count, find the best alternative variant
 * in the same transformation family that accepts the item count at sizeId.
 *
 * Prefers variants where:
 *   - item count is within [minItems, effectiveMaxItems]
 *   - the item count appears in preferredItems
 *
 * @param {string} currentVariant
 * @param {number} itemCount
 * @param {string} sizeId
 * @returns {string|null} best fallback variant id, or null if none found
 */
function findFallbackVariant(currentVariant, itemCount, sizeId) {
  const families = getTransformationFamilies(currentVariant);
  if (!families.length) return null;

  // Collect all candidate variants from the same families
  const candidates = new Set();
  for (const familyName of families) {
    const members = TRANSFORMATION_FAMILIES[familyName] || [];
    for (const v of members) {
      if (v !== currentVariant) candidates.add(v);
    }
  }

  let bestVariant   = null;
  let bestScore     = -Infinity;

  for (const variantId of candidates) {
    const rule = SLOT_RULES[variantId];
    if (!rule) continue;

    const effMax = getEffectiveMaxItems(variantId, sizeId);
    const effMin = rule.minItems;

    // Must accept this item count
    if (itemCount < effMin || itemCount > effMax) continue;

    // Score: prefer preferred item counts, prefer elastic, prefer same family
    let score = 0;
    if (rule.preferredItems && rule.preferredItems.includes(itemCount)) score += 10;
    if (rule.elastic) score += 5;
    // Prefer variants from the same primary family (first family)
    const primaryFamily = families[0];
    if (TRANSFORMATION_FAMILIES[primaryFamily] && TRANSFORMATION_FAMILIES[primaryFamily].includes(variantId)) score += 3;

    if (score > bestScore) {
      bestScore   = score;
      bestVariant = variantId;
    }
  }

  return bestVariant;
}

/* ─────────────────────────────────────────
   APPLY SECTION SLOT RULES
───────────────────────────────────────── */

/**
 * Apply slot rules to a single section.
 *
 * @param {object} section    — a content-v1 section object (will NOT be mutated)
 * @param {number} sectionIdx — 0-based index, for readable change messages
 * @param {string} sizeId     — canvas size id
 * @param {string[]} changes  — array to push human-readable change messages into
 * @returns {object} adjusted section (new object)
 */
function applySlotRules(section, sectionIdx, sizeId, changes) {
  const label    = `Section ${sectionIdx + 1}`;
  const variant  = section.variant || 'solid-boxes';
  const density  = section.style   || 'standard';
  const rule     = SLOT_RULES[variant];

  // Unknown variant — pass through unchanged
  if (!rule) return section;

  let currentVariant = variant;
  let currentRule    = rule;
  let items          = Array.isArray(section.items) ? [...section.items] : [];

  /* ── Step 1: Fixed-slot variants — auto-switch or pad/trim BEFORE size cap ──
     Check fixed-slot mismatch against the ORIGINAL item count first.
     This ensures venn-2 + 3 items → venn-3 rather than silently dropping the 3rd.
  ── */

  /* ── Step 2: Apply size-based item count cap ── */
  if (!currentRule.elastic) {
    const exactCount = currentRule.minItems === currentRule.maxItems
      ? currentRule.minItems
      : null;

    if (exactCount !== null && items.length !== exactCount) {
      // Check if there's a specific fallback for this item count
      const fixedFallbackMap = FIXED_SLOT_FALLBACKS[currentVariant];

      if (fixedFallbackMap === null) {
        // SWOT: never switch — pad or trim to 4
        if (items.length < exactCount) {
          const diff = exactCount - items.length;
          for (let i = 0; i < diff; i++) items.push({ title: '', body: '' });
          changes.push(
            `${label} ('${currentVariant}'): padded from ${section.items.length} to ${exactCount} items`
          );
        } else {
          items = items.slice(0, exactCount);
          changes.push(
            `${label} ('${currentVariant}'): trimmed from ${section.items.length} to ${exactCount} items`
          );
        }
      } else if (fixedFallbackMap && typeof fixedFallbackMap === 'object' && fixedFallbackMap.fallbackVariant) {
        // BMC-style: if below threshold, switch to fallback variant
        if (items.length < fixedFallbackMap.fallbackThreshold) {
          const newVariant = fixedFallbackMap.fallbackVariant;
          const newRule    = SLOT_RULES[newVariant];
          if (newRule) {
            changes.push(
              `${label}: auto-switched from '${currentVariant}' to '${newVariant}'` +
              ` (item count ${items.length} < required min ${fixedFallbackMap.fallbackThreshold})`
            );
            currentVariant = newVariant;
            currentRule    = newRule;
          }
        }
      } else if (fixedFallbackMap && typeof fixedFallbackMap === 'object') {
        // Lookup table by item count.
        // Strategy:
        //   1. Exact key match — best case
        //   2. Items exceed all table keys (too many) — use transformation family lookup
        //   3. Items fall between keys — use nearest lower key
        const tableKeys = Object.keys(fixedFallbackMap)
          .map(Number)
          .filter(k => !isNaN(k))
          .sort((a, b) => a - b);
        const maxTableKey = tableKeys[tableKeys.length - 1] ?? 0;

        let mapped;
        if (fixedFallbackMap[items.length] !== undefined) {
          // Case 1: exact key
          mapped = fixedFallbackMap[items.length];
        } else if (items.length > maxTableKey) {
          // Case 2: item count exceeds all table entries.
          // First try the transformation family for a variant that accepts all items.
          // If none found, use the highest table key (best available, items trimmed after).
          const tfFallback = findFallbackVariant(currentVariant, items.length, sizeId);
          if (tfFallback) {
            mapped = tfFallback;
          } else {
            // Best-available: use highest table key's mapped variant;
            // the size cap applied below will trim items to that variant's limit.
            mapped = fixedFallbackMap[maxTableKey];
          }
        } else {
          // Case 3: use nearest lower key
          let bestKey = null;
          for (const k of tableKeys) {
            if (k <= items.length) bestKey = k;
          }
          mapped = bestKey !== null ? fixedFallbackMap[bestKey] : undefined;
        }
        if (mapped && mapped !== currentVariant) {
          const newRule = SLOT_RULES[mapped];
          if (newRule) {
            changes.push(
              `${label}: auto-switched from '${currentVariant}' to '${mapped}'` +
              ` (item count ${items.length} doesn't fit fixed-slot of ${exactCount})`
            );
            currentVariant = mapped;
            currentRule    = newRule;
            // Re-apply effective max for new variant
            const newMax = getEffectiveMaxItems(mapped, sizeId);
            if (items.length > newMax) {
              items = items.slice(0, newMax);
              changes.push(
                `${label} ('${mapped}'): further trimmed to ${newMax} items after switch`
              );
            }
          }
        } else {
          // Pad/trim to exact count (fallback for unmapped counts)
          if (items.length < exactCount) {
            const diff = exactCount - items.length;
            for (let i = 0; i < diff; i++) items.push({ title: '', body: '' });
            changes.push(
              `${label} ('${currentVariant}'): padded from ${section.items.length} to ${exactCount} items`
            );
          } else {
            items = items.slice(0, exactCount);
            changes.push(
              `${label} ('${currentVariant}'): trimmed from ${section.items.length} to ${exactCount} items`
            );
          }
        }
      }
    }

    // For fixed-slot variants where min ≠ max (e.g. bmc min=6 max=8):
    // if items < minItems, try the fallback variant rather than padding.
    if (currentRule.minItems !== currentRule.maxItems && items.length < currentRule.minItems) {
      const fmap = FIXED_SLOT_FALLBACKS[currentVariant];
      if (fmap && fmap.fallbackVariant) {
        const newRule = SLOT_RULES[fmap.fallbackVariant];
        if (newRule) {
          changes.push(
            `${label}: auto-switched from '${currentVariant}' to '${fmap.fallbackVariant}'` +
            ` (item count ${items.length} < required min ${currentRule.minItems})`
          );
          currentVariant = fmap.fallbackVariant;
          currentRule    = newRule;
        }
      } else {
        // No fallback defined — pad to minItems
        const diff = currentRule.minItems - items.length;
        for (let i = 0; i < diff; i++) items.push({ title: '', body: '' });
        changes.push(`${label} ('${currentVariant}'): padded to minimum ${currentRule.minItems} items`);
      }
    }
  }

  /* ── Size-based item count cap (applied after fixed-slot switch) ── */
  {
    const effectiveMax = getEffectiveMaxItems(currentVariant, sizeId);
    if (items.length > effectiveMax) {
      const before = items.length;
      items = items.slice(0, effectiveMax);
      changes.push(
        `${label} ('${currentVariant}'): trimmed from ${before} to ${effectiveMax} items` +
        ` [size cap for '${sizeId}']`
      );
    }
  }

  /* ── Step 3: Elastic variants — auto-switch if too few items ── */
  if (currentRule.elastic && items.length > 0 && items.length < currentRule.minItems) {
    const fallback = findFallbackVariant(currentVariant, items.length, sizeId);
    if (fallback) {
      const newRule = SLOT_RULES[fallback];
      changes.push(
        `${label}: auto-switched from '${currentVariant}' to '${fallback}'` +
        ` (item count ${items.length} < min ${currentRule.minItems})`
      );
      currentVariant = fallback;
      currentRule    = newRule;
    }
    // If no fallback found, leave as-is — renderer handles gracefully
  }

  /* ── Step 4: Truncate text per slot limits ── */
  const slot = currentRule.slot;

  // Determine body char limit based on density
  let bodyLimit;
  if (density === 'compact') {
    bodyLimit = slot.maxBodyCharsCompact;
  } else if (density === 'detailed') {
    bodyLimit = slot.maxBodyCharsDetailed;
  } else {
    bodyLimit = slot.maxBodyChars; // standard (default)
  }

  items = items.map((item, iIdx) => {
    if (!item || typeof item !== 'object') return item;
    const newItem = { ...item };
    const itemLabel = `${label} ('${currentVariant}'), item ${iIdx + 1}`;

    // Truncate title
    if (typeof item.title === 'string' && item.title.length > slot.maxTitleChars) {
      newItem.title = truncateAt(item.title, slot.maxTitleChars);
      changes.push(
        `${itemLabel}: title truncated` +
        ` (${item.title.length} → ${slot.maxTitleChars} chars)`
      );
    }

    // Truncate / clear body
    if (typeof item.body === 'string') {
      if (bodyLimit === 0) {
        if (item.body.trim().length > 0) {
          newItem.body = '';
          // Only log meaningful removals (not already-empty)
          changes.push(`${itemLabel}: body cleared (density '${density}' / variant has no body)`);
        }
      } else if (item.body.length > bodyLimit) {
        newItem.body = truncateAt(item.body, bodyLimit);
        changes.push(
          `${itemLabel}: body truncated` +
          ` (${item.body.length} → ${bodyLimit} chars)`
        );
      }
    }

    return newItem;
  });

  /* ── Return adjusted section ── */
  return {
    ...section,
    variant: currentVariant,
    items,
  };
}

/* ─────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────── */

/**
 * assembleContent — validate and adjust AI-generated content-v1 JSON.
 *
 * Sits between the AI response and renderFromContent().
 * Deep-clones the input — original contentJson is never mutated.
 *
 * @param {object} contentJson — validated content-v1 document
 * @param {string} [sizeId]    — 'landscape' | 'portrait' | 'square' | 'a4'
 *                               Defaults to 'a4' if omitted.
 * @returns {{ adjusted: object, changes: string[] }}
 *   adjusted — the modified content-v1 JSON ready for rendering
 *   changes  — human-readable list of every adjustment made
 */
export function assembleContent(contentJson, sizeId = 'a4') {
  if (!contentJson || typeof contentJson !== 'object') {
    return { adjusted: contentJson, changes: ['assembleContent: invalid input (not an object)'] };
  }

  const changes = [];

  // Normalise sizeId: accept 'landscape'|'portrait'|'square'|'a4'
  // Also accept aliases used elsewhere in the codebase
  const sizeAliases = {
    '16:9': 'landscape', 'widescreen': 'landscape',
    '9:16': 'portrait',  'vertical': 'portrait',
    '1:1':  'square',    'instagram': 'square',
    'a4':   'a4',        'document': 'a4',
  };
  const normalisedSize = sizeAliases[sizeId] || sizeId || 'a4';
  if (!(normalisedSize in GLOBAL_SIZE_MAX)) {
    changes.push(`assembleContent: unknown sizeId '${sizeId}', defaulting to 'a4'`);
  }
  const effectiveSizeId = (normalisedSize in GLOBAL_SIZE_MAX) ? normalisedSize : 'a4';

  // Deep clone to avoid mutating the original
  let adjusted;
  try {
    adjusted = JSON.parse(JSON.stringify(contentJson));
  } catch (e) {
    return { adjusted: contentJson, changes: ['assembleContent: failed to clone contentJson'] };
  }

  // Process sections
  if (Array.isArray(adjusted.sections)) {
    adjusted.sections = adjusted.sections.map((section, idx) =>
      applySlotRules(section, idx, effectiveSizeId, changes)
    );
  }

  return { adjusted, changes };
}

/**
 * getSlotRule — convenience accessor.
 * Returns the slot rule for a variant, or null if not found.
 *
 * @param {string} variantId
 * @returns {object|null}
 */
export function getSlotRule(variantId) {
  return SLOT_RULES[variantId] || null;
}

/**
 * summariseChanges — format the changes array as a readable string.
 *
 * @param {string[]} changes
 * @returns {string}
 */
export function summariseChanges(changes) {
  if (!changes || changes.length === 0) return 'No adjustments made.';
  return changes.map((c, i) => `  ${i + 1}. ${c}`).join('\n');
}
