// ── v3 IMPORTS ────────────────────────────────────────────
import { initRenderer, renderFromContent } from './v3/renderer.js';
import { buildPrompt, detectLayout       } from './v3/prompt-builder.js';
import { detectAndParse                  } from './v3/schema.js';
import { getArchetype, ARCHETYPE_IDS     } from './v3/archetypes.js';
import {
  enterSlideDeckMode, exitSlideDeckMode, applyToneToDeck, generateDemoDeck,
  undoDeck, redoDeck, canUndoDeck, canRedoDeck,
} from './v3/slide-deck-ui.js';

/* ============================================================
   Infogr.ai v2.4 → v3 Integration
   ─────────────────────────────────────────────────────────────
   NEW in v2.4:
   • LOCAL_ICON_SVGS — 25 icons as inline SVGs; checked in
     preprocessHTML before proxy rewrite, so folder/gear/etc.
     never fall back to a colored-circle initial.
   • HISTORY — custom snapshot undo/redo (max 50 entries).
     Snapshots are saved only on toolbar actions (not on
     keystrokes). cleanupSpans() runs before each snapshot.
     Deduplication: identical states are never double-saved.
     Ctrl+Z / Ctrl+Y intercepted inside the iframe.
     Cursor resets after undo (MVP trade-off, noted below).
   • applyFormat() — Selection/Range API; surroundContents
     primary path, extractContents fallback for cross-element
     selections. No execCommand for text formatting.
   • applyBold / applyItalic / applyTextDecoration — toggle
     helpers that read computed style before deciding direction.
   • cleanupSpans() — removes empty + bare spans, normalizes
     text nodes. Runs before snapshot and after every format.
   • updateToolbarState() — reads computed styles on
     selectionchange (debounced 50ms). Updates font dropdown,
     size input, and B/I/U/S active states live.
   • insertBulletAtLineStart() — finds block container,
     inserts prefix at first text position (not cursor).
   • insertNumberedBullet() — scans siblings for numbered
     context, auto-increments.
   • Format painter — capture style bundle on first click,
     apply on next selection. Click again or Escape to cancel.
   • Typeable font-size input (number field, 8–96px).
   • Alignment still uses execCommand (reliable for blocks).
   ─────────────────────────────────────────────────────────────
   UNDO/REDO BEHAVIOUR (explicit):
   • Triggers: every toolbar action (format, bullet, painter).
     NOT triggered by keystrokes — typed text uses the browser's
     own contenteditable history, which handles char-by-char.
     Our Ctrl+Z intercept overrides the browser shortcut so
     the two histories don't conflict.
   • Deduplication: if innerHTML equals the top snapshot,
     no new entry is pushed.
   • Stack limit: 50 entries (~500KB–2MB RAM, acceptable).
   • Cursor after undo: resets to start of body. Preserving
     cursor requires stable node references (XPath or data-ids)
     which is out of scope for this beta.
   ============================================================ */

// ── LOCAL ICON LIBRARY ─────────────────────────────────────
// 25 critical Icons8 names as inline SVGs.
// Checked in preprocessHTML BEFORE proxy rewrite.
// Colors chosen to approximate Icons8 Fluency palette.
const LOCAL_ICON_SVGS = {
  'folder':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M4 14a4 4 0 0 1 4-4h10l4 4h22a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#FFA726"/><path d="M4 20h40v14a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#FFB74D"/><rect x="10" y="25" width="18" height="2" rx="1" fill="#E65100" opacity="0.35"/></svg>`,
  'gear':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#607D8B" d="M39 21.5l-2.2-.4c-.3-1-.7-1.9-1.3-2.8l1.3-1.8c.4-.5.3-1.2-.2-1.7l-2.8-2.8c-.5-.4-1.2-.4-1.7-.1l-1.8 1.3c-.9-.5-1.8-1-2.8-1.3l-.4-2.2C26.8 9 26.2 8.5 25.5 8.5h-4c-.7 0-1.3.5-1.4 1.2l-.4 2.2c-1 .3-1.9.8-2.8 1.3l-1.8-1.3c-.5-.3-1.2-.3-1.7.1l-2.8 2.8c-.5.5-.5 1.2-.2 1.7l1.3 1.8c-.5.9-1 1.8-1.3 2.8l-2.2.4C9 21.7 8.5 22.3 8.5 23v4c0 .7.5 1.3 1.2 1.4l2.2.4c.3 1 .8 1.9 1.3 2.8l-1.3 1.8c-.3.5-.3 1.2.2 1.7l2.8 2.8c.5.4 1.2.4 1.7.1l1.8-1.3c.9.5 1.8 1 2.8 1.3l.4 2.2c.2.7.7 1.2 1.4 1.2h4c.7 0 1.3-.5 1.4-1.2l.4-2.2c1-.3 1.9-.8 2.8-1.3l1.8 1.3c.5.3 1.2.3 1.7-.1l2.8-2.8c.5-.5.5-1.2.2-1.7l-1.3-1.8c.5-.9 1-1.8 1.3-2.8l2.2-.4c.7-.2 1.2-.7 1.2-1.4v-4c0-.7-.5-1.3-1.1-1.5z"/><circle cx="24" cy="25" r="5.5" fill="#B0BEC5"/></svg>`,
  'settings':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#607D8B" d="M39 21.5l-2.2-.4c-.3-1-.7-1.9-1.3-2.8l1.3-1.8c.4-.5.3-1.2-.2-1.7l-2.8-2.8c-.5-.4-1.2-.4-1.7-.1l-1.8 1.3c-.9-.5-1.8-1-2.8-1.3l-.4-2.2C26.8 9 26.2 8.5 25.5 8.5h-4c-.7 0-1.3.5-1.4 1.2l-.4 2.2c-1 .3-1.9.8-2.8 1.3l-1.8-1.3c-.5-.3-1.2-.3-1.7.1l-2.8 2.8c-.5.5-.5 1.2-.2 1.7l1.3 1.8c-.5.9-1 1.8-1.3 2.8l-2.2.4C9 21.7 8.5 22.3 8.5 23v4c0 .7.5 1.3 1.2 1.4l2.2.4c.3 1 .8 1.9 1.3 2.8l-1.3 1.8c-.3.5-.3 1.2.2 1.7l2.8 2.8c.5.4 1.2.4 1.7.1l1.8-1.3c.9.5 1.8 1 2.8 1.3l.4 2.2c.2.7.7 1.2 1.4 1.2h4c.7 0 1.3-.5 1.4-1.2l.4-2.2c1-.3 1.9-.8 2.8-1.3l1.8 1.3c.5.3 1.2.3 1.7-.1l2.8-2.8c.5-.5.5-1.2.2-1.7l-1.3-1.8c.5-.9 1-1.8 1.3-2.8l2.2-.4c.7-.2 1.2-.7 1.2-1.4v-4c0-.7-.5-1.3-1.1-1.5z"/><circle cx="24" cy="25" r="5.5" fill="#90A4AE"/></svg>`,
  'home':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6L4 22h7v18h10v-10h6v10h10V22h7z" fill="#42A5F5"/><rect x="18" y="30" width="12" height="10" fill="#1976D2"/><path d="M24 6L4 22h7v18h10v-10h6v10h10V22h7z" fill="none"/></svg>`,
  'brain':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><ellipse cx="17" cy="23" rx="9" ry="13" fill="#CE93D8"/><ellipse cx="31" cy="23" rx="9" ry="13" fill="#BA68C8"/><rect x="22" y="10" width="4" height="26" rx="2" fill="#F3E5F5"/><circle cx="15" cy="17" r="3" fill="#9C27B0" opacity="0.7"/><circle cx="33" cy="19" r="3" fill="#7B1FA2" opacity="0.7"/><circle cx="14" cy="27" r="2.5" fill="#AB47BC" opacity="0.6"/><circle cx="34" cy="27" r="2.5" fill="#9C27B0" opacity="0.6"/></svg>`,
  'rocket':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 4C16 12 12 22 14 30l4 4c8 2 18-2 26-10C44 12 36 4 24 4z" fill="#5C6BC0"/><circle cx="28" cy="20" r="4" fill="#E8EAF6"/><path d="M14 30c-4 0-8 4-10 8l4 2 2 4c4-2 8-6 8-10z" fill="#EF9A9A"/><path d="M18 34l-4-4c-3 3-4 7-4 8l3 1 1 3c1 0 5-1 8-4z" fill="#FFCDD2" opacity="0.7"/></svg>`,
  'briefcase':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="18" width="32" height="22" rx="3" fill="#8D6E63"/><path d="M17 18v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" fill="none" stroke="#5D4037" stroke-width="2.5"/><rect x="8" y="28" width="32" height="3" fill="#6D4C41"/><rect x="21" y="25" width="6" height="7" rx="1" fill="#A1887F"/></svg>`,
  'database':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><ellipse cx="24" cy="12" rx="14" ry="5" fill="#64B5F6"/><path d="M10 12v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8c0 2.8-6.3 5-14 5s-14-2.2-14-5z" fill="#2196F3"/><path d="M10 20v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8c0 2.8-6.3 5-14 5s-14-2.2-14-5z" fill="#1976D2"/><path d="M10 28v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8c0 2.8-6.3 5-14 5s-14-2.2-14-5z" fill="#1565C0"/></svg>`,
  'search':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="20" cy="20" r="12" fill="none" stroke="#78909C" stroke-width="4"/><line x1="30" y1="30" x2="42" y2="42" stroke="#546E7A" stroke-width="4.5" stroke-linecap="round"/></svg>`,
  'mail':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="6" y="12" width="36" height="26" rx="3" fill="#64B5F6"/><path d="M6 15l18 13 18-13" stroke="#1976D2" stroke-width="2" fill="none"/><path d="M6 15l18 13L42 15H6z" fill="#90CAF9"/></svg>`,
  'smartphone':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="13" y="4" width="22" height="40" rx="4" fill="#546E7A"/><rect x="16" y="9" width="16" height="25" fill="#B0BEC5"/><circle cx="24" cy="40" r="2.5" fill="#90A4AE"/></svg>`,
  'cloud-storage':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M38 22a10 10 0 0 0-19.6-2.8A8 8 0 0 0 10 27a8 8 0 0 0 8 8h20a8 8 0 0 0 0-16z" fill="#42A5F5"/><path d="M30 31l-6 6-6-6" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="24" y1="37" x2="24" y2="26" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  'shield':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 4L8 10v14c0 10.5 7 18 16 20 9-2 16-9.5 16-20V10z" fill="#42A5F5"/><path d="M16 25l5 5 11-12" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'calendar-3':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="6" y="10" width="36" height="32" rx="3" fill="#EF5350"/><rect x="6" y="10" width="36" height="14" rx="3" fill="#E53935"/><circle cx="16" cy="8" r="3" fill="#B71C1C"/><circle cx="32" cy="8" r="3" fill="#B71C1C"/><line x1="6" y1="24" x2="42" y2="24" stroke="#EF9A9A" stroke-width="1"/><rect x="11" y="28" width="6" height="5" rx="1" fill="white" opacity="0.85"/><rect x="21" y="28" width="6" height="5" rx="1" fill="white" opacity="0.85"/><rect x="31" y="28" width="6" height="5" rx="1" fill="white" opacity="0.85"/><rect x="11" y="35" width="6" height="4" rx="1" fill="white" opacity="0.6"/><rect x="21" y="35" width="6" height="4" rx="1" fill="white" opacity="0.6"/></svg>`,
  'chart-increasing':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="5"  y="30" width="8" height="12" rx="1.5" fill="#A5D6A7"/><rect x="15" y="22" width="8" height="20" rx="1.5" fill="#66BB6A"/><rect x="25" y="14" width="8" height="28" rx="1.5" fill="#43A047"/><rect x="35" y="6"  width="8" height="36" rx="1.5" fill="#2E7D32"/><line x1="3" y1="44" x2="47" y2="44" stroke="#1B5E20" stroke-width="2" stroke-linecap="round"/></svg>`,
  'star':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 5l5.3 10.7 11.8 1.7-8.5 8.3 2 11.8L24 32l-10.6 5.5 2-11.8L7 17.4l11.8-1.7z" fill="#FFC107" stroke="#FF8F00" stroke-width="0.5"/></svg>`,
  'key':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="16" cy="20" r="10" fill="none" stroke="#FFC107" stroke-width="4"/><line x1="24" y1="25" x2="43" y2="44" stroke="#FF8F00" stroke-width="4.5" stroke-linecap="round"/><line x1="36" y1="37" x2="36" y2="43" stroke="#FF8F00" stroke-width="3.5" stroke-linecap="round"/><line x1="41" y1="42" x2="41" y2="46" stroke="#FF8F00" stroke-width="3" stroke-linecap="round"/></svg>`,
  'lock':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="10" y="22" width="28" height="22" rx="3" fill="#42A5F5"/><path d="M16 22v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#1976D2" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="32" r="3" fill="#1565C0"/><rect x="22.5" y="32" width="3" height="6" rx="1" fill="#1565C0"/></svg>`,
  'user-group':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="16" cy="15" r="7" fill="#64B5F6"/><path d="M4 38c0-6.6 5.4-12 12-12 6.6 0 12 5.4 12 12" fill="#42A5F5"/><circle cx="34" cy="13" r="6" fill="#90CAF9"/><path d="M28 36c0-5 3.1-9.3 7.5-11.1A12.2 12.2 0 0 1 46 36" fill="#64B5F6"/></svg>`,
  'idea':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6a13 13 0 0 0-6 24.5V36h12v-5.5A13 13 0 0 0 24 6z" fill="#FFD54F"/><path d="M24 6a13 13 0 0 0-6 24.5V36h12v-5.5A13 13 0 0 0 24 6z" fill="#FFC107" opacity="0.5"/><rect x="18" y="36" width="12" height="3" rx="1.5" fill="#FF8F00"/><rect x="19.5" y="39" width="9" height="3" rx="1.5" fill="#FF8F00"/><line x1="24" y1="12" x2="24" y2="22" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>`,
  'target':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="14" fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="8"  fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="3"  fill="#EF5350"/></svg>`,
  'checklist':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="3" fill="#E3F2FD"/><path d="M13 19l4 4 8-8" stroke="#1976D2" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="13" y="28" width="3" height="3" rx="1" fill="#42A5F5"/><rect x="13" y="34" width="3" height="3" rx="1" fill="#42A5F5"/><line x1="19" y1="29.5" x2="35" y2="29.5" stroke="#90CAF9" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="35.5" x2="30" y2="35.5" stroke="#90CAF9" stroke-width="2" stroke-linecap="round"/></svg>`,
  'presentation':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="26" rx="3" fill="#42A5F5"/><rect x="8" y="12" width="32" height="18" fill="white"/><line x1="24" y1="34" x2="24" y2="42" stroke="#1976D2" stroke-width="2.5" stroke-linecap="round"/><line x1="16" y1="42" x2="32" y2="42" stroke="#1976D2" stroke-width="2.5" stroke-linecap="round"/><rect x="12" y="16" width="11" height="10" rx="1" fill="#E3F2FD"/><rect x="25" y="14" width="11" height="14" rx="1" fill="#BBDEFB"/></svg>`,
  'dollar-coin':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FFD54F"/><circle cx="24" cy="24" r="16" fill="#FFCA28"/><text x="24" y="30" text-anchor="middle" font-size="20" font-weight="800" fill="#E65100" font-family="Arial, sans-serif">$</text></svg>`,
  'teamwork':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="14" cy="16" r="6" fill="#64B5F6"/><circle cx="34" cy="16" r="6" fill="#42A5F5"/><path d="M4 36c0-5.5 4.5-10 10-10h20c5.5 0 10 4.5 10 10" fill="#90CAF9" opacity="0.7"/><path d="M4 36c0-5.5 4.5-10 10-10h20c5.5 0 10 4.5 10 10H4z" fill="#42A5F5" opacity="0.4"/><path d="M18 28l6 4 6-4" stroke="#1976D2" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  'source-code':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M16 14L6 24l10 10" stroke="#546E7A" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 14l10 10-10 10" stroke="#546E7A" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="28" y1="10" x2="20" y2="38" stroke="#90A4AE" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  // Aliases for common Icons8 names the AI uses
  'lightning-bolt':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M28 4L10 28h14l-4 16 22-24H28z" fill="#FFC107"/><path d="M28 4L10 28h14l-4 16 22-24H28z" fill="#FFD54F" opacity="0.5"/></svg>`,
  'checkmark':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#66BB6A"/><path d="M14 24l8 8 12-14" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'internet':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#42A5F5" stroke-width="3"/><ellipse cx="24" cy="24" rx="8" ry="20" fill="none" stroke="#42A5F5" stroke-width="2"/><line x1="4" y1="24" x2="44" y2="24" stroke="#42A5F5" stroke-width="2"/><line x1="7" y1="14" x2="41" y2="14" stroke="#42A5F5" stroke-width="1.5" opacity="0.6"/><line x1="7" y1="34" x2="41" y2="34" stroke="#42A5F5" stroke-width="1.5" opacity="0.6"/></svg>`,
  'clock':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#EDE7F6"/><circle cx="24" cy="24" r="20" fill="none" stroke="#7E57C2" stroke-width="3"/><line x1="24" y1="24" x2="24" y2="11" stroke="#5E35B1" stroke-width="3" stroke-linecap="round"/><line x1="24" y1="24" x2="34" y2="24" stroke="#7E57C2" stroke-width="2.5" stroke-linecap="round"/><circle cx="24" cy="24" r="2" fill="#5E35B1"/></svg>`,
};

// ── STATE ──────────────────────────────────────────────────
const STATE = {
  apiKey:        '',
  topic:         '',
  layout:        'auto',
  tone:          'professional',
  size:          'a4',
  accent:        '#2563EB',
  currentHTML:   null,
  zoomLevel:     0.7,
  formatPainter: null,   // null | { fontFamily, fontSize, fontWeight, fontStyle, color, textDecoration }
  isV3:          false,  // true when current output was rendered by v3 template engine
  processedHTML: null,   // full HTML string for export
  mode:          'single', // 'single' | 'deck' — controls which UI shell is active
};

// ── HISTORY (undo/redo) ─────────────────────────────────────
// Only toolbar actions push snapshots. Keystrokes are handled
// by the browser's native contenteditable undo. Ctrl+Z inside
// the iframe is intercepted to use our stack instead.
const HISTORY = {
  stack:   [],   // array of body.innerHTML strings
  index:   -1,   // current position (-1 = empty)
  maxSize: 50,
};

const TONE_COLORS = {
  professional: '#2563EB',
  bold:         '#F59E0B',
  minimal:      '#0F766E',
  playful:      '#7C3AED',
};

const SIZES = {
  a4:        { w: 800,  h: 1131, label: 'A4',   sections: '6-8' },
  portrait:  { w: 800,  h: 1422, label: '9:16', sections: '7-9' },
  square:    { w: 800,  h: 800,  label: '1:1',  sections: '4-5' },
  landscape: { w: 1100, h: 800,  label: '16:9', sections: '3-4' },
};

// ── QUICK LAYOUTS — Group 1 ────────────────────────────────
const QUICK_LAYOUTS = [
  { id: 'auto',        name: 'Auto (AI picks)', thumb: 'auto'       },
  { id: 'content-v1',  name: 'Overview / Boxes', thumb: 'grid'      },
  { id: 'timeline',    name: 'Timeline',        thumb: 'timeline'   },
  { id: 'funnel',      name: 'Funnel',          thumb: 'funnel'     },
  { id: 'comparison',  name: 'Comparison',      thumb: 'comparison' },
  { id: 'flowchart',   name: 'Flowchart',       thumb: 'flowchart'  },
  { id: 'process',     name: 'Process / Steps', thumb: 'steps'      },
];

// ── ADVANCED DOCUMENTS — Group 2 (archetypes) ──────────────
const ADVANCED_LAYOUTS = [
  { id: 'mind-map',        name: 'Mind Map',        thumb: 'arch-mindmap'    },
  { id: 'dashboard',       name: 'Dashboard',       thumb: 'arch-dashboard'  },
  { id: 'competitive-map', name: 'Competitive Map', thumb: 'arch-quadrant'   },
  { id: 'process-flow',    name: 'Process Flow',    thumb: 'arch-processflow'},
  { id: 'research-atlas',  name: 'Research Atlas',  thumb: 'arch-atlas'      },
];

// Combined for backward compat (callAgent references STATE.layout)
const LAYOUTS = [...QUICK_LAYOUTS, ...ADVANCED_LAYOUTS];

// ── DOM ────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ── INIT ───────────────────────────────────────────────────
window.addEventListener('load', () => {
  // initRenderer is now a no-op — all rendering is programmatic via smart-layouts

  // Restore the saved API key on page load
  const k = localStorage.getItem('infograi_key');
  if (k) {
    $('apiKey').value = k;
    $('apiDot').className = 'api-dot ok';
    STATE.apiKey = k;
  }

  // Persist on any change. Three rules:
  //   1. Field empty   → clear localStorage (user explicitly removed it)
  //   2. Field valid   → save to localStorage, dot green
  //   3. Field invalid → dot grey, but DO NOT clear localStorage — the
  //      previously-saved good key stays so a typo or partial paste can't
  //      wipe it. Pasting a fresh valid key replaces the stored one.
  function persistApiKey(v) {
    const trimmed = (v || '').trim();
    if (trimmed === '') {
      $('apiDot').className = 'api-dot';
      localStorage.removeItem('infograi_key');
      STATE.apiKey = '';
      return;
    }
    if (trimmed.startsWith('sk-ant') && trimmed.length > 20) {
      $('apiDot').className = 'api-dot ok';
      localStorage.setItem('infograi_key', trimmed);
      STATE.apiKey = trimmed;
    } else {
      $('apiDot').className = 'api-dot';
      // Intentional: do not remove the stored key
    }
  }
  $('apiKey').addEventListener('input',  (e) => persistApiKey(e.target.value));
  $('apiKey').addEventListener('change', (e) => persistApiKey(e.target.value));
  $('apiKey').addEventListener('blur',   (e) => persistApiKey(e.target.value));

  renderLayoutPicker();

  $$('#toneRow .chip').forEach(el => {
    el.addEventListener('click', () => {
      $$('#toneRow .chip').forEach(b => b.classList.remove('on'));
      el.classList.add('on');
      STATE.tone   = el.dataset.tone;
      STATE.accent = TONE_COLORS[STATE.tone];
      $('accentPicker').value = STATE.accent;
      applyAccentToCanvas();
      if (STATE.mode === 'deck') applyToneToDeck(STATE.tone, STATE.accent);
    });
  });

  // ── Mode toggle (Single Page / Slide Deck) ────────────────
  $$('#modeRow .mode-btn').forEach(el => {
    el.addEventListener('click', () => {
      const mode = el.dataset.mode;
      if (mode === STATE.mode) return;
      $$('#modeRow .mode-btn').forEach(b => b.classList.toggle('on', b === el));
      STATE.mode = mode;
      document.body.dataset.mode = mode;

      if (mode === 'deck') {
        // Slide Deck mode: lock size to landscape, hand off canvas to UI controller
        STATE.size = 'landscape';
        $$('#sizeRow .sz-btn').forEach(b => b.classList.toggle('on', b.dataset.size === 'landscape'));
        $('ribbon').style.display = 'flex';
        const lbl = $('genBtn').querySelector('.lbl-btn');
        if (lbl) lbl.textContent = 'Generate Slide Deck';
        const topic = $('promptIn').value.trim();
        enterSlideDeckMode(topic, STATE.tone, STATE.accent);
      } else {
        // Back to Single Page mode
        exitSlideDeckMode();
        const lbl = $('genBtn').querySelector('.lbl-btn');
        if (lbl) lbl.textContent = 'Generate Infographic';
        if (STATE.currentHTML) {
          renderHTML(STATE.currentHTML);
        } else {
          $('outputWrap').innerHTML = `
            <div class="empty">
              <div class="empty-ico">◈</div>
              <div class="empty-ttl">Your infographic will appear here</div>
              <div class="empty-sub">Pick a layout, describe your topic, and the designer agent generates a complete, beautiful infographic as HTML — Canva level, in one shot.</div>
            </div>
          `;
          $('ribbon').style.display = 'none';
        }
      }
    });
  });

  $$('#sizeRow .sz-btn').forEach(el => {
    el.addEventListener('click', () => {
      $$('#sizeRow .sz-btn').forEach(b => b.classList.remove('on'));
      el.classList.add('on');
      STATE.size = el.dataset.size;
      applyFrameSize();
    });
  });

  $('genBtn').addEventListener('click', generate);

  // Enter key in the topic textarea triggers Generate (Shift+Enter inserts a newline)
  $('promptIn').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generate();
    }
  });

  $('accentPicker').addEventListener('input', (e) => {
    STATE.accent = e.target.value;
    applyAccentToCanvas();
    if (STATE.mode === 'deck') applyToneToDeck(STATE.tone, STATE.accent);
  });

  $('btnPNG').addEventListener('click',  exportPNG);
  $('btnPDF').addEventListener('click',  exportPDF);
  $('btnHTML').addEventListener('click', exportHTML);

  setupRibbon();
  setupZoom();
});

// ── LAYOUT PICKER ──────────────────────────────────────────
function renderLayoutPicker() {
  const grid = $('layoutGrid');

  // Build Group 1: Quick Layouts
  const quickCards = QUICK_LAYOUTS.map((l, i) => `
    <div class="tpl-card ${i === 0 ? 'on' : ''}" data-layout="${l.id}">
      ${layoutThumb(l.thumb)}
      <div class="tpl-name">${l.name}</div>
    </div>
  `).join('');

  // Build Group 2: Advanced Documents (archetypes)
  const advancedCards = ADVANCED_LAYOUTS.map(l => `
    <div class="tpl-card tpl-card--advanced" data-layout="${l.id}">
      ${layoutThumb(l.thumb)}
      <div class="tpl-name">${l.name}</div>
    </div>
  `).join('');

  grid.innerHTML = `
    <div class="tpl-group">
      <div class="tpl-group-label">QUICK LAYOUTS</div>
      <div class="tpl-group-cards">${quickCards}</div>
    </div>
    <div class="tpl-group-divider"></div>
    <div class="tpl-group">
      <div class="tpl-group-label">ADVANCED DOCUMENTS</div>
      <div class="tpl-group-cards">${advancedCards}</div>
    </div>
  `;

  grid.querySelectorAll('.tpl-card').forEach(el => {
    el.addEventListener('click', () => {
      if (el.classList.contains('on') && el.dataset.layout !== 'auto') {
        el.classList.remove('on');
        grid.querySelector('[data-layout="auto"]')?.classList.add('on');
        STATE.layout = 'auto';
        return;
      }
      grid.querySelectorAll('.tpl-card').forEach(b => b.classList.remove('on'));
      el.classList.add('on');
      STATE.layout = el.dataset.layout;
    });
  });
}

function layoutThumb(kind) {
  const thumbs = {
    // ── Quick Layout thumbs ──────────────────────────────────
    auto: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><text x="40" y="20" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="11" fill="#E05A2B">AUTO</text><text x="40" y="34" text-anchor="middle" font-family="sans-serif" font-size="7.5" fill="#666">✨ AI decides</text><circle cx="16" cy="44" r="2" fill="#E05A2B"/><circle cx="40" cy="44" r="2" fill="#E05A2B"/><circle cx="64" cy="44" r="2" fill="#E05A2B"/></svg>`,
    steps: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="9" rx="2" fill="#1A2744"/><circle cx="12" cy="21" r="4" fill="#E05A2B"/><rect x="19" y="18.5" width="40" height="3" rx="1.5" fill="#ccc"/><circle cx="12" cy="33" r="4" fill="#1A2744"/><rect x="19" y="30.5" width="36" height="3" rx="1.5" fill="#ccc"/><circle cx="12" cy="45" r="4" fill="#E05A2B"/><rect x="19" y="42.5" width="32" height="3" rx="1.5" fill="#ccc"/></svg>`,
    grid: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="9" rx="2" fill="#1A2744"/><rect x="4" y="16" width="34" height="16" rx="2" fill="#E05A2B" opacity="0.8"/><rect x="42" y="16" width="34" height="16" rx="2" fill="#1A2744" opacity="0.8"/><rect x="4" y="35" width="21" height="14" rx="2" fill="white" stroke="#ddd" stroke-width="0.5"/><rect x="29" y="35" width="21" height="14" rx="2" fill="white" stroke="#ddd" stroke-width="0.5"/><rect x="55" y="35" width="21" height="14" rx="2" fill="white" stroke="#ddd" stroke-width="0.5"/></svg>`,
    timeline: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="9" rx="2" fill="#1A2744"/><line x1="40" y1="16" x2="40" y2="50" stroke="#E05A2B" stroke-width="1.5"/><circle cx="40" cy="20" r="3" fill="#E05A2B"/><rect x="43" y="16" width="27" height="7" rx="2" fill="#c2e5ff"/><circle cx="40" cy="33" r="3" fill="#1A2744"/><rect x="10" y="29" width="27" height="7" rx="2" fill="#c2e5ff"/></svg>`,
    funnel: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><polygon points="8,10 72,10 64,22 16,22" fill="#E05A2B" opacity="0.9"/><polygon points="16,24 64,24 56,36 24,36" fill="#E05A2B" opacity="0.7"/><polygon points="24,38 56,38 50,50 30,50" fill="#E05A2B" opacity="0.5"/></svg>`,
    comparison: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="9" rx="2" fill="#1A2744"/><rect x="4" y="16" width="33" height="32" rx="2" fill="#FEE2E2" stroke="#FECACA" stroke-width="0.5"/><rect x="43" y="16" width="33" height="32" rx="2" fill="#DCFCE7" stroke="#BBF7D0" stroke-width="0.5"/></svg>`,
    flowchart: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><rect x="27" y="2" width="26" height="9" rx="4" fill="#ffecbd"/><rect x="22" y="16" width="36" height="9" rx="2" fill="#c2e5ff"/><path d="M40 30 L52 36 L40 42 L28 36 Z" fill="#dcccff"/><rect x="23" y="46" width="34" height="6" rx="3" fill="#ffecbd"/></svg>`,

    // ── Advanced Document (archetype) thumbs ─────────────────
    // Mind Map: central circle with 4 surrounding dots and connector lines
    'arch-mindmap': `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#EEF2FF" rx="3"/>
      <circle cx="40" cy="26" r="9" fill="#4F46E5"/>
      <circle cx="14" cy="14" r="5" fill="#818CF8"/><line x1="33" y1="19" x2="18" y2="17" stroke="#818CF8" stroke-width="1.5"/>
      <circle cx="66" cy="14" r="5" fill="#818CF8"/><line x1="47" y1="19" x2="62" y2="17" stroke="#818CF8" stroke-width="1.5"/>
      <circle cx="14" cy="38" r="5" fill="#818CF8"/><line x1="33" y1="33" x2="18" y2="36" stroke="#818CF8" stroke-width="1.5"/>
      <circle cx="66" cy="38" r="5" fill="#818CF8"/><line x1="47" y1="33" x2="62" y2="36" stroke="#818CF8" stroke-width="1.5"/>
    </svg>`,

    // Dashboard: top bar + 2×2 grid in middle + bottom bar
    'arch-dashboard': `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F0FDF4" rx="3"/>
      <rect x="4" y="4" width="72" height="10" rx="2" fill="#16A34A" opacity="0.8"/>
      <rect x="4" y="17" width="34" height="14" rx="2" fill="#86EFAC" opacity="0.7"/>
      <rect x="42" y="17" width="34" height="14" rx="2" fill="#86EFAC" opacity="0.7"/>
      <rect x="4" y="34" width="72" height="14" rx="2" fill="#16A34A" opacity="0.4"/>
    </svg>`,

    // Competitive Map: 2×2 colored quadrants
    'arch-quadrant': `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#FFF7ED" rx="3"/>
      <rect x="4"  y="4"  width="34" height="21" rx="2" fill="#FDBA74" opacity="0.8"/>
      <rect x="42" y="4"  width="34" height="21" rx="2" fill="#FB923C" opacity="0.8"/>
      <rect x="4"  y="28" width="34" height="20" rx="2" fill="#EA580C" opacity="0.5"/>
      <rect x="42" y="28" width="34" height="20" rx="2" fill="#C2410C" opacity="0.5"/>
      <line x1="40" y1="2" x2="40" y2="50" stroke="white" stroke-width="1.5"/>
      <line x1="2" y1="26" x2="78" y2="26" stroke="white" stroke-width="1.5"/>
    </svg>`,

    // Process Flow: vertical connected arrow blocks
    'arch-processflow': `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F0F9FF" rx="3"/>
      <rect x="12" y="4"  width="56" height="9" rx="2" fill="#0284C7" opacity="0.9"/>
      <polygon points="40,14 44,18 36,18" fill="#0284C7"/>
      <rect x="12" y="18" width="56" height="9" rx="2" fill="#0284C7" opacity="0.7"/>
      <polygon points="40,28 44,32 36,32" fill="#0284C7" opacity="0.7"/>
      <rect x="12" y="32" width="56" height="9" rx="2" fill="#0284C7" opacity="0.5"/>
      <polygon points="40,42 44,46 36,46" fill="#0284C7" opacity="0.5"/>
      <rect x="12" y="46" width="56" height="5" rx="2" fill="#0284C7" opacity="0.3"/>
    </svg>`,

    // Research Atlas: two equal columns with items
    'arch-atlas': `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#FAF5FF" rx="3"/>
      <rect x="4"  y="4"  width="34" height="8"  rx="2" fill="#9333EA" opacity="0.8"/>
      <rect x="4"  y="15" width="34" height="8"  rx="2" fill="#9333EA" opacity="0.5"/>
      <rect x="4"  y="26" width="34" height="8"  rx="2" fill="#9333EA" opacity="0.3"/>
      <rect x="42" y="4"  width="34" height="8"  rx="2" fill="#7E22CE" opacity="0.8"/>
      <rect x="42" y="15" width="34" height="8"  rx="2" fill="#7E22CE" opacity="0.5"/>
      <rect x="42" y="26" width="34" height="8"  rx="2" fill="#7E22CE" opacity="0.3"/>
      <rect x="4"  y="38" width="72" height="10" rx="2" fill="#C4B5FD" opacity="0.6"/>
    </svg>`,
  };
  return thumbs[kind] || '';
}

// ── GENERATE ───────────────────────────────────────────────
async function generate() {
  const topic = $('promptIn').value.trim();

  // ── Slide Deck mode ──────────────────────────────────────
  // Phase 1+2: build a hardcoded 6-slide demo deck. No AI / no API key.
  // The Phase 4 AI pipeline will replace this with a real deck generator.
  if (STATE.mode === 'deck') {
    if (!topic) { alert('Please describe your topic.'); return; }
    STATE.topic = topic;
    generateDemoDeck(topic, STATE.tone, STATE.accent);
    $('ribbon').style.display = 'flex';
    return;
  }

  // ── Single-page mode (original AI flow) ──────────────────
  const apiKey = $('apiKey').value.trim();
  if (!apiKey) { alert('Please enter your Anthropic API key.'); return; }
  if (!topic)  { alert('Please describe your document topic.'); return; }

  STATE.apiKey = apiKey;
  STATE.topic  = topic;

  const btn = $('genBtn');
  btn.disabled = true;
  btn.classList.add('loading');
  $('ribbon').style.display = 'none';

  showGenerating();

  try {
    const html = await callAgent(topic);
    STATE.currentHTML = html;
    renderHTML(html);
    $('ribbon').style.display = 'flex';
    autoFitZoom();
    setupCanvasEvents();
    autoConvertImages();
  } catch (err) {
    console.error(err);
    showError(err.message || String(err));
  }

  btn.disabled = false;
  btn.classList.remove('loading');
}

// ── AGENT DISPATCHER ───────────────────────────────────────
// All layouts go through the content-v1 engine (renderFromContent).
async function callAgent(topic) {
  const rawLayout = STATE.layout;

  // Detect whether the user selected an archetype or a quick layout
  if (ARCHETYPE_IDS.has(rawLayout)) {
    // Archetype path: pass archetypeId to buildPrompt + compositionId to renderFromContent
    const archetype = getArchetype(rawLayout);
    const compositionId = archetype?.composition || 'stack';
    STATE.isV3 = true;
    return await callAgentV3(topic, rawLayout, rawLayout, compositionId);
  }

  // Quick layout path
  const layoutId = rawLayout === 'auto' ? detectLayout(topic) : rawLayout;
  STATE.isV3 = true;
  return await callAgentV3(topic, layoutId, null, null);
}

// ── V3 AGENT — JSON → renderFromContent ────────────────────
// @param {string}      topic
// @param {string}      layoutId       — used for quick-layout variant hints
// @param {string|null} archetypeId    — if set, passes recipe instructions to AI
// @param {string|null} compositionId  — if set, applies page composition to output
async function callAgentV3(topic, layoutId, archetypeId, compositionId) {
  const { system, messages } = buildPrompt({
    topic,
    layoutId,
    tone:        STATE.tone,
    size:        STATE.size,
    archetypeId: archetypeId || undefined,
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-api-key':     STATE.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
      stream:     true,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`API error: ${err.error?.message || res.statusText}`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let lineBuffer  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer  = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const ev = JSON.parse(raw);
        if (ev.type === 'error') throw new Error(`Stream error: ${ev.error?.message}`);
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          accumulated += ev.delta.text;
          updateStreamProgress(accumulated.length);
        }
      } catch (e) {
        if (e.message.startsWith('Stream error')) throw e;
      }
    }
  }

  // All responses go through the content-v1 path
  const accentOverride = (STATE.accent !== TONE_COLORS[STATE.tone]) ? STATE.accent : null;
  const { data: contentJson } = detectAndParse(accumulated.trim(), layoutId);
  return renderFromContent(contentJson, STATE.tone, STATE.size, accentOverride, compositionId || undefined);
}

// ── V2.4 AGENT — raw HTML (unchanged) ──────────────────────
async function callAgentV2(topic) {
  const sz = SIZES[STATE.size];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-api-key':     STATE.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 12000,
      stream:     true,
      messages: [{
        role: 'user',
        content: buildPromptParts(topic, sz),
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`API error: ${err.error?.message || res.statusText}`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let lineBuffer  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer  = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const ev = JSON.parse(raw);
        if (ev.type === 'error') throw new Error(`Stream error: ${ev.error?.message}`);
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          accumulated += ev.delta.text;
          updateStreamProgress(accumulated.length);
        }
      } catch (e) {
        if (e.message.startsWith('Stream error')) throw e;
      }
    }
  }

  const text = accumulated.trim()
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  if (!text.includes('<') || !text.includes('>')) {
    throw new Error('Agent did not return valid HTML. Please try again.');
  }
  return text;
}

// ── PROMPT ─────────────────────────────────────────────────
function buildPromptParts(topic, sz) {
  return [
    { type: 'text', text: STATIC_PROMPT, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: buildDynamicPrompt(topic, sz) },
  ];
}

const STATIC_PROMPT = `You are a world-class infographic designer. Generate a single, complete, self-contained HTML infographic document.

FONTS — include in <head>:
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
Use "Space Grotesk" ONLY for the hero title (1-2 lines max). Use "Plus Jakarta Sans" for ALL other text.
NEVER use Syne, Oswald, or any wide/condensed/extended font — they render stretched.

CSS VARIABLES — required, define at :root:
  :root { --accent: #2563EB; --accent-soft: rgba(37,99,235,0.12); }
Use var(--accent) and var(--accent-soft) throughout for all accent-colored elements.

CANVAS — absolute rule:
The .ig-page element MUST be: width:{W}px; height:{H}px; overflow:hidden; box-sizing:border-box;
  display:flex; flex-direction:column; font-family:'Plus Jakarta Sans',sans-serif;
Body: margin:0; background:#f0f2f5; display:flex; justify-content:center; align-items:flex-start;

OVERFLOW RULES — NON-NEGOTIABLE — apply every single one:
1. .ig-page: overflow:hidden (height is fixed — nothing can escape it)
2. Every flex/grid child: add min-height:0 (THIS IS CRITICAL — without it, flex children expand beyond allocation)
3. Every section, column, card, row container: overflow:hidden; min-height:0;
4. For 2-column layouts: the row needs overflow:hidden; each column needs min-height:0; overflow:hidden;
5. Limit text lines: paragraph/body text must use max-height or -webkit-line-clamp to cap at 3-4 lines
6. When space is tight: use 2 bullets not 3, font-size:10px not 12px — less content is always better than overflow
7. Verify mentally before writing: does the sum of all section heights equal the canvas height? If unsure, use less.

ICONS — Icons8 Fluency (primary, colorful illustrated):
<img src="https://img.icons8.com/fluency/96/{name}.png" width="{px}" height="{px}" alt="{label}" loading="lazy">
Sizes: hero=96-128px, section card (center above text)=72-80px, stats=36-40px, inline=28-32px
Names: rocket, idea, lightning-bolt, gear, calendar-3, user-group, shield, checkmark, star, trophy, target, key, lock, internet, database, source-code, console, cloud-storage, briefcase, dollar-coin, search, open-book, chart-increasing, analytics, pie-chart, clock, teamwork, strategy, growth, workflow, checklist, deadline, meeting, handshake, networking, statistics, report, presentation, brain, artificial-intelligence, robot-2, color-palette, image, video, collaboration, creativity, resume, approval, priority, layers, settings, home, smartphone, mail, folder, link
ONLY use names from this exact list. Do not invent or modify icon names.
Icons are PRIMARY visual anchors — center them above section content, use 72-80px, give them breathing room.
Footer must include: <small style="font-size:10px;color:#94A3B8;">Icons by <a href="https://icons8.com" style="color:inherit;text-decoration:none;">Icons8</a></small>

LOGOS — use when topic names real brands. Never leave blank. Fallback chain:
1. <img src="https://logo.clearbit.com/{domain}" width="32" height="32" style="border-radius:6px;object-fit:contain;" loading="lazy">
   Domains: anthropic.com github.com notion.so slack.com figma.com vercel.com openai.com google.com microsoft.com apple.com amazon.com stripe.com discord.com youtube.com twitter.com linear.app airtable.com zapier.com
2. <img src="https://cdn.simpleicons.org/{slug}" width="32" height="32"> (SVG, brand-colored)
3. Icons8 thematic icon matching brand category
4. Inline SVG: <svg width="32" height="32"><circle cx="16" cy="16" r="16" fill="#2563EB"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="13" font-family="sans-serif" font-weight="700">AB</text></svg>

CONTENT RULES:
1. Real specific facts only — named tools, exact numbers, real stats. Zero filler or lorem ipsum.
2. Every text element must have contenteditable="true" for inline editing.
3. Active voice. Cut every unnecessary word.
4. Titles ≤50 chars. Bullets ≤70 chars. Body ≤120 chars per sentence.
5. 2-4 points per section. Density: Canva/Gemini quality level.`;

function buildDynamicPrompt(topic, sz) {
  const toneGuides = {
    professional: `TONE — Professional:
  Background: #FFFFFF main, #F8FAFC alternating sections
  --accent: ${TONE_COLORS.professional} (blue) for headers, borders, stat numbers, icon badges
  Text: #0F172A headings, #334155 body, #64748B captions
  Cards: white, 1px solid #E2E8F0, border-radius:10px, box-shadow:0 1px 4px rgba(0,0,0,0.06)
  Feel: clean, authoritative, corporate-grade`,
    bold: `TONE — Bold (dark, high-contrast):
  Background: #0F172A main canvas, #1E293B for card sections
  --accent: ${TONE_COLORS.bold} (amber) for labels, borders, stat numbers
  Text: #FFFFFF headings, #CBD5E1 body, #94A3B8 captions
  Cards: rgba(255,255,255,0.06) glass effect, 1px solid rgba(255,255,255,0.12), border-radius:12px
  Labels: UPPERCASE, var(--accent) color, letter-spacing:0.1em, 11px
  Feel: editorial dark magazine, punchy, high-contrast`,
    minimal: `TONE — Minimal:
  Background: #FAFAF8 main, #F5F3EF alternating
  --accent: ${TONE_COLORS.minimal} (dark teal) — use sparingly: 1px borders, a single underline accent
  Text: #1C1917 headings, #57534E body, #A8A29E captions
  Borders: 1px solid #E7E5E4. No drop-shadows. Flat design only.
  Feel: editorial, airy, refined typography — every pixel earns its place`,
    playful: `TONE — Playful:
  Background: #FFFBEB main, #FEF3C7 alternating sections
  --accent: ${TONE_COLORS.playful} (purple) for headers; #F59E0B amber for highlights and stat numbers
  Text: #1C1917 headings, #44403C body
  Cards: border-radius:20px, box-shadow:0 3px 16px rgba(0,0,0,0.08), colorful icon badge backgrounds
  Icons: 80-96px centered above text — let them breathe, they're heroes not accessories
  Feel: warm, energetic, friendly — specific and data-rich, never childish`,
  };

  const layoutRecipes = {
    'steps-guide': `LAYOUT — Steps Guide:
  1. Full-width hero header (accent bg): LABEL tag + main title (Space Grotesk, 36-40px) + subtitle
  2. Prerequisites row: 3-4 horizontal chips, each with 28px icon + short label
  3. Numbered steps (5-7): large step-number (56px, accent color) left + title (18px bold) + 2-sentence description + 48px icon right
     Alternate white/light-accent row backgrounds
  4. Key stats strip: 3-4 boxes, each with big number (32px Space Grotesk) + label + 36px icon
  5. Callout box: left 4px accent border, light bg, tip text
  6. Footer: brand name + attribution`,
    'mixed-grid': `LAYOUT — Mixed Grid:
  1. Full-width hero: title (Space Grotesk 40px) + subtitle + 96px hero icon right-aligned
  2. 3-4 stat boxes row: big number (36px) + label + 40px icon
  3. 2-column: wider left (title + 4-5 bullets + 64px icon) + narrow right (callout or key points)
  4. 3-column card grid: each card = 72px icon centered + bold title + 3 bullets
  5. Summary callout or quote
  6. Footer`,
    'timeline': `LAYOUT — Timeline:
  1. Header with title + subtitle
  2. Central vertical bar (3px accent) centered horizontally, full height
  3. 5-7 alternating left/right nodes: 12px circle dot on bar + date (accent color, bold) + title + 1-sentence desc
     Left: text right-aligned ending at bar. Right: text left-aligned from bar.
  4. Stats or summary row
  5. Footer`,
    'funnel': `LAYOUT — Funnel:
  1. Header with title + subtitle
  2. 5 trapezoid layers narrowing top to bottom:
     Use border-width CSS trick or clip-path. Colors: var(--accent) at 1.0, 0.80, 0.63, 0.47, 0.33 opacity.
     Each: centered stage name (white bold) + 1-line description right of the shape
  3. Result/outcome box below
  4. Footer`,
    'comparison': `LAYOUT — Comparison:
  1. Header framing the two options
  2. Side-by-side columns (equal width):
     Left: red-tinted header (#FEE2E2) + "Before"/"Option A" + 4-5 points
     Right: green-tinted header (#DCFCE7) + "After"/"Option B" + 4-5 points
  3. 3-4 comparison rows: left item → right item with arrow divider
  4. Summary / recommendation
  5. Footer`,
    'flowchart': `LAYOUT — Flowchart:
  1. Header
  2. Connected flow: rounded-rect process steps (accent bg, white text) + diamond decisions (rotated square, amber) + labeled arrows
     Use CSS flexbox columns + connector lines via ::after pseudo-elements or thin SVG lines
  3. Legend
  4. Footer`,
  };

  const layoutDir = STATE.layout === 'auto'
    ? `LAYOUT — Auto: choose the single best layout from: steps-guide (sequential how-to), mixed-grid (overview/explainer), timeline (history/roadmap), funnel (stages/tiers), comparison (X vs Y), flowchart (decision tree).`
    : `LAYOUT — MANDATORY: use "${STATE.layout}" layout exactly as described below.`;

  const recipe = layoutRecipes[STATE.layout] || '';

  return `${toneGuides[STATE.tone]}

TOPIC: ${topic}
CANVAS: exactly ${sz.w}px × ${sz.h}px — no overflow, no scroll
SECTIONS: ${sz.sections} visual sections to fill the canvas height perfectly
${layoutDir}
${recipe}
Return ONLY the complete <!DOCTYPE html> document. No markdown fences, no explanation.`;
}

// ── SHARED SCRIPTS (used by both v2 and v3 preprocessors) ──
const fallbackScript = `<script id="ig-icon-fallback">
(function(){
  function applyFallback(img){
    if(img.dataset.fallbackApplied||img.dataset.local)return;
    img.dataset.fallbackApplied='1';
    img.onerror=function(){
      this.onerror=null;
      var sz=parseInt(this.getAttribute('width')||this.offsetWidth||48);
      var colors=['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444'];
      var col=colors[Math.floor(Math.random()*colors.length)];
      var lbl=(this.alt||'i').trim().charAt(0).toUpperCase();
      var half=sz/2;
      this.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="'+sz+'" height="'+sz+'" viewBox="0 0 '+sz+' '+sz+'">'+
        '<circle cx="'+half+'" cy="'+half+'" r="'+half+'" fill="'+col+'"/>'+
        '<text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="white" '+
        'font-family="sans-serif" font-weight="700" font-size="'+Math.round(sz*0.42)+'">'+lbl+'</text>'+
        '</svg>'
      );
    };
  }
  document.querySelectorAll('img[data-icon]').forEach(applyFallback);
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if(n.tagName==='IMG')applyFallback(n);
        else if(n.querySelectorAll)n.querySelectorAll('img[data-icon]').forEach(applyFallback);
      });
    });
  }).observe(document.body,{childList:true,subtree:true});
})();
<\/script>`;

const editorScript = `<script id="ig-icon-editor">
(function(){
  var sel=null,ovl=null,drag=false,rsz=false,rh='',sx=0,sy=0,sw=0,sh=0,otx=0,oty=0;
  function getTr(el){var m=(el.style.transform||'').match(/translate\\(([^,]+)px,\\s*([^)]+)px\\)/);return m?[parseFloat(m[1]),parseFloat(m[2])]:[0,0];}
  function posOverlay(){if(!ovl||!sel)return;var r=sel.getBoundingClientRect();ovl.style.left=r.left+'px';ovl.style.top=r.top+'px';ovl.style.width=r.width+'px';ovl.style.height=r.height+'px';}
  function mkHandle(dir,t,l,r,b){var d=document.createElement('div');d.dataset.h=dir;d.style.cssText='position:absolute;width:10px;height:10px;background:#2563EB;border:2px solid #fff;border-radius:2px;pointer-events:all;z-index:10000;cursor:'+dir+'-resize;box-sizing:border-box;';if(t!==null)d.style.top=t;if(l!==null)d.style.left=l;if(r!==null)d.style.right=r;if(b!==null)d.style.bottom=b;d.addEventListener('mousedown',function(e){e.stopPropagation();e.preventDefault();rsz=true;rh=dir;sx=e.clientX;sy=e.clientY;sw=sel.offsetWidth;sh=sel.offsetHeight;});return d;}
  function doSelect(img){desel();sel=img;ovl=document.createElement('div');ovl.style.cssText='position:fixed;border:2px solid #2563EB;pointer-events:none;z-index:9999;box-sizing:border-box;border-radius:2px;';ovl.appendChild(mkHandle('nw','-5px','-5px',null,null));ovl.appendChild(mkHandle('ne','-5px',null,'-5px',null));ovl.appendChild(mkHandle('se',null,null,'-5px','-5px'));ovl.appendChild(mkHandle('sw',null,'-5px',null,'-5px'));document.body.appendChild(ovl);posOverlay();img.style.cursor='move';}
  function desel(){if(ovl){ovl.remove();ovl=null;}if(sel){sel.style.cursor='';}sel=null;}
  function isIcon(img){return img.dataset.icon==='true'||(img.src&&(img.src.includes('proxy')||img.src.includes('icons8')||img.src.includes('clearbit')||img.src.includes('simpleicons')||img.dataset.local));}
  document.addEventListener('click',function(e){var img=e.target.closest&&e.target.closest('img');if(img&&isIcon(img)){e.stopPropagation();e.preventDefault();doSelect(img);}else if(!e.target.dataset||!e.target.dataset.h){desel();}},true);
  document.addEventListener('mousedown',function(e){if(sel&&e.target===sel){drag=true;e.preventDefault();sx=e.clientX;sy=e.clientY;var t=getTr(sel);otx=t[0];oty=t[1];sel.style.cursor='grabbing';}});
  document.addEventListener('mousemove',function(e){if(drag&&sel){sel.style.transform='translate('+(otx+(e.clientX-sx))+'px,'+(oty+(e.clientY-sy))+'px)';sel.style.position='relative';sel.style.zIndex='5';posOverlay();}if(rsz&&sel){var dx=e.clientX-sx,dy=e.clientY-sy,w=sw,h=sh;if(rh.includes('e'))w=Math.max(20,sw+dx);if(rh.includes('s'))h=Math.max(20,sh+dy);if(rh.includes('w'))w=Math.max(20,sw-dx);if(rh.includes('n'))h=Math.max(20,sh-dy);var newSz=Math.max(w,h);sel.style.width=newSz+'px';sel.style.height=newSz+'px';posOverlay();}});
  document.addEventListener('mouseup',function(){drag=false;rsz=false;rh='';if(sel)sel.style.cursor='move';});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')desel();});
  document.addEventListener('scroll',posOverlay,true);
  window.addEventListener('resize',posOverlay);
})();
<\/script>`;

// ── HTML PRE-PROCESSOR (v2.4) ──────────────────────────────
// Order of operations matters:
//   1. Local SVG icons checked FIRST (by name in URL)
//   2. Remaining icon8/clearbit/simpleicons URLs → proxy
//   3. Overflow CSS injected into <head>
//   4. Fallback + icon editor scripts injected before </body>

function preprocessHTML(html, sz) {
  // 1. Replace known Icons8 URLs with local SVGs (before proxy step)
  html = html.replace(
    /src=(["'])(https?:\/\/img\.icons8\.com\/[^"']*\/([^/.]+?)(?:\.png|\.svg|\.gif)?)(\1)/g,
    (match, q1, url, iconName, q2) => {
      const name = iconName.toLowerCase();
      if (LOCAL_ICON_SVGS[name]) {
        const encoded = encodeURIComponent(LOCAL_ICON_SVGS[name]);
        return `src="data:image/svg+xml;charset=utf-8,${encoded}" data-icon="true" data-local="true"`;
      }
      // Not in local library — fall through to proxy rewrite below
      return `src="${'/api/proxy?url=' + encodeURIComponent(url)}" data-icon="true"`;
    }
  );

  // 2. Rewrite any remaining Icons8 URLs that the regex above may have missed
  html = html.replace(
    /src=(["'])(https?:\/\/img\.icons8\.com\/[^"']+)\1/g,
    (match, q, url) => `src="${'/api/proxy?url=' + encodeURIComponent(url)}" data-icon="true"`
  );

  // 3. Rewrite Clearbit logo URLs → proxy
  html = html.replace(
    /src=(["'])(https?:\/\/logo\.clearbit\.com\/[^"']+)\1/g,
    (match, q, url) => `src="${'/api/proxy?url=' + encodeURIComponent(url)}" data-icon="true"`
  );

  // 4. Rewrite SimpleIcons URLs → proxy
  html = html.replace(
    /src=(["'])(https?:\/\/cdn\.simpleicons\.org\/[^"']+)\1/g,
    (match, q, url) => `src="${'/api/proxy?url=' + encodeURIComponent(url)}" data-icon="true"`
  );

  // 5. Inject overflow-enforcement CSS
  const overflowCSS = `<style id="ig-overflow-fix">
.ig-page{overflow:hidden!important;height:${sz.h}px!important;max-height:${sz.h}px!important;}
.ig-page>*{overflow:hidden!important;min-height:0!important;flex-shrink:0;}
.ig-page *{min-height:0;box-sizing:border-box;}
.ig-page div,.ig-page section,.ig-page article,.ig-page aside{overflow:hidden;}
</style>`;
  html = html.replace(/<\/head>/i, overflowCSS + '\n</head>');

  // 6–7. Fallback + icon editor (defined at module scope, shared with v3)
  html = html.replace(/<\/body>/i, fallbackScript + '\n' + editorScript + '\n</body>');
  return html;
}

// ── HTML PRE-PROCESSOR (v3) ────────────────────────────────
// v3 templates are already styled — no overflow CSS injection,
// no icon URL rewriting (renderer already proxied them).
//
// What we do here:
//   1. Inject <base href="/"> so the srcdoc iframe resolves
//      absolute paths like /v3/editor.js against the app origin.
//   2. Mark all text elements with contenteditable="true" so the
//      v3 object editor can toggle them during selection / editing.
//   3. Inject the icon fallback script (handles broken proxy loads).
//   4. Inject /v3/editor.js — the full PowerPoint-style object editor.
function preprocessHTMLv3(html) {
  // Inject icon fallback script before </body>.
  // contenteditable is now injected via DOM traversal in renderHTML() — see V3_TEXT_SEL.
  html = html.replace(/<\/body>/i, fallbackScript + '\n</body>');
  return html;
}

// ── RENDERER ───────────────────────────────────────────────
function renderHTML(html) {
  const sz = SIZES[STATE.size];

  // For v3: process the template HTML (adds contenteditable, fallback script, etc.)
  // For v2: process with full preprocessor (proxy icons, overflow CSS, etc.)
  const processed = STATE.isV3 ? preprocessHTMLv3(html) : preprocessHTML(html, sz);

  // Store the full processed HTML string for export
  STATE.processedHTML = processed;

  // Parse the processed HTML to extract styles and body content
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(processed, 'text/html');

  // Create the edit canvas div
  const canvas = document.createElement('div');
  canvas.id = 'editCanvas';
  canvas.style.cssText = `width:${sz.w}px;height:${sz.h}px;overflow:hidden;position:relative;background:#fff;flex-shrink:0;`;

  // Copy all <style> tags from the parsed document into the canvas
  const styles = parsedDoc.querySelectorAll('style');
  styles.forEach(s => {
    const clone = document.createElement('style');
    clone.textContent = s.textContent;
    clone.className = 'ig-injected-style';
    canvas.appendChild(clone);
  });

  // Copy <link rel="stylesheet"> font tags into the main document head (once)
  const links = parsedDoc.querySelectorAll('link[rel="stylesheet"]');
  links.forEach(l => {
    if (!document.querySelector(`link[href="${l.href}"]`)) {
      const clone = document.createElement('link');
      clone.rel = 'stylesheet';
      clone.href = l.href;
      document.head.appendChild(clone);
    }
  });

  // Insert the body content into the canvas
  canvas.innerHTML += parsedDoc.body.innerHTML;

  // BUG 1 FIX — inject contenteditable on all v3 smart-layout text elements.
  // Done via DOM traversal (not string replacement) so it works with any variant.
  if (STATE.isV3) {
    const V3_TEXT_SEL = [
      // Chrome (renderer.js chrome elements)
      '.ig-title', '.ig-subtitle', '.ig-label',
      '.ig-stat-num', '.ig-stat-label',
      '.ig-callout-title', '.ig-callout-body',
      '.ig-footer-brand',
      // Boxes family
      '.igs-title', '.igs-body', '.igs-circle-num', '.igs-labeled-tag',
      // Bullets family
      '.igs-bl-title', '.igs-bl-body', '.igs-bl-num',
      // Sequence family
      '.igs-tl-title', '.igs-tl-label', '.igs-tl-body',
      '.igs-mtl-title', '.igs-mtl-body',
      '.igs-mtlb-title', '.igs-mtlb-body',
      '.igs-arrow-title', '.igs-arrow-body',
      '.igs-pill', '.igs-slant-body',
      // Numbers family
      '.igs-stat-num', '.igs-stat-label',
      '.igs-bar-stat-label', '.igs-bar-stat-num',
      '.igs-star-title', '.igs-star-score',
      '.igs-dotgrid-label',
      '.igs-dotline-title', '.igs-dotline-num',
      '.igs-cbl-title', '.igs-cbl-body',
      '.igs-cel-title', '.igs-cel-body',
      // Circles family
      '.igs-cycle-title', '.igs-cycle-body',
      '.igs-flower-title', '.igs-flower-body',
      '.igs-circle-title', '.igs-circle-body',
      '.igs-ring-title', '.igs-ring-body',
      '.igs-semi-title', '.igs-semi-body',
      // Quotes family
      '.igs-qbox-text', '.igs-qbox-attr',
      '.igs-bubble-box', '.igs-bubble-attr',
      // Steps family
      '.igs-stair-title', '.igs-stair-body',
      '.igs-step-title', '.igs-step-body',
      '.igs-boxstep-title', '.igs-boxstep-body',
      '.igs-arrowstep-title', '.igs-arrowstep-body',
      '.igs-stepicon-title', '.igs-stepicon-body',
      '.igs-pyramid-title', '.igs-pyramid-body',
      '.igs-funnel-title', '.igs-funnel-body',
      // Diagrams family (smart-diagrams.js — Phase 4)
      '.igd-title', '.igd-body', '.igd-label',
    ].join(', ');
    canvas.querySelectorAll(V3_TEXT_SEL).forEach(el => {
      el.contentEditable = 'true';
    });
  }

  const wrap = $('outputWrap');
  wrap.innerHTML = '';
  wrap.appendChild(canvas);
}

function applyFrameSize() {
  const canvas = document.getElementById('editCanvas');
  if (!canvas) return;
  const sz = SIZES[STATE.size];
  canvas.style.width  = sz.w + 'px';
  canvas.style.height = sz.h + 'px';
}

function applyAccentToCanvas() {
  const canvas = document.getElementById('editCanvas');
  if (!canvas) return;
  let el = canvas.querySelector('#ig-accent-override');
  if (!el) {
    el = document.createElement('style');
    el.id = 'ig-accent-override';
    canvas.prepend(el);
  }
  el.textContent = `:root{--accent:${STATE.accent};--accent-soft:${hexToAlpha(STATE.accent, 0.12)};}`;
}

// Keep old name as alias for any remaining callers
function applyAccentToFrame() { applyAccentToCanvas(); }

// ── AUTO-FIT ZOOM ──────────────────────────────────────────
function autoFitZoom() {
  const sz = SIZES[STATE.size];
  const canvasArea = document.querySelector('.canvas-area');
  if (!canvasArea) { STATE.zoomLevel = 0.7; applyZoom(false); return; }

  const ribbonEl = $('ribbon');
  const ribbonH  = (ribbonEl && ribbonEl.offsetParent !== null) ? ribbonEl.offsetHeight : 0;

  const availW = canvasArea.clientWidth  - 80;
  const availH = canvasArea.clientHeight - ribbonH - 80;

  const zoomW = availW / sz.w;
  const zoomH = availH / sz.h;
  const fitZoom = Math.min(zoomW, zoomH, 0.90);

  STATE.zoomLevel = Math.max(0.30, Math.round(fitZoom * 20) / 20);
  applyZoom(false);
}

// ── UNDO / REDO ────────────────────────────────────────────
// Snapshot triggers: every toolbar action (applyFormat, bullet, painter).
// NOT triggered by typing — the browser's contenteditable history covers that.
// Ctrl+Z / Ctrl+Y intercepted in setupCanvasEvents when focus is inside editCanvas.

function initHistory() {
  HISTORY.stack = [];
  HISTORY.index = -1;
  // Capture the initial rendered state as entry 0
  const canvas = document.getElementById('editCanvas');
  if (!canvas) return;
  // Wait a tick for any font/image settling, then snapshot
  setTimeout(() => {
    if (!document.body) return;
    HISTORY.stack = [canvas.innerHTML];
    HISTORY.index = 0;
    updateUndoRedoButtons();
  }, 200);
}

function pushUndoSnapshot() {
  const canvas = document.getElementById('editCanvas');
  if (!canvas) return;

  cleanupSpans(document);
  const html = canvas.innerHTML;

  // Deduplicate: never save if identical to current top
  if (HISTORY.index >= 0 && HISTORY.stack[HISTORY.index] === html) return;

  // Truncate any redo states ahead of current position
  HISTORY.stack.splice(HISTORY.index + 1);
  HISTORY.stack.push(html);
  HISTORY.index = HISTORY.stack.length - 1;

  // Enforce max size: drop oldest entry
  if (HISTORY.stack.length > HISTORY.maxSize) {
    HISTORY.stack.shift();
    HISTORY.index = HISTORY.stack.length - 1;
  }

  updateUndoRedoButtons();
}

function performUndo() {
  // In Slide Deck mode, delegate to the deck-mode history (structural ops:
  // add/delete slide, add/delete block, replace, template change).
  if (STATE.mode === 'deck') {
    undoDeck();
    updateUndoRedoButtons();
    return;
  }
  if (HISTORY.index <= 0) return;
  HISTORY.index--;
  restoreSnapshot(HISTORY.stack[HISTORY.index]);
  updateUndoRedoButtons();
}

function performRedo() {
  if (STATE.mode === 'deck') {
    redoDeck();
    updateUndoRedoButtons();
    return;
  }
  if (HISTORY.index >= HISTORY.stack.length - 1) return;
  HISTORY.index++;
  restoreSnapshot(HISTORY.stack[HISTORY.index]);
  updateUndoRedoButtons();
}

function restoreSnapshot(html) {
  const canvas = document.getElementById('editCanvas');
  if (!canvas) return;
  // Restore canvas innerHTML — cursor will reset (MVP trade-off)
  canvas.innerHTML = html;
  // Re-run fallback detection on images
  canvas.querySelectorAll('img[data-icon]:not([data-local])').forEach(img => {
    if (!img.dataset.fallbackApplied) img.dispatchEvent(new Event('load'));
  });
}

function updateUndoRedoButtons() {
  const btnUndo = $('btnUndo');
  const btnRedo = $('btnRedo');
  if (STATE.mode === 'deck') {
    if (btnUndo) btnUndo.style.opacity = canUndoDeck() ? '' : '0.35';
    if (btnRedo) btnRedo.style.opacity = canRedoDeck() ? '' : '0.35';
    return;
  }
  if (btnUndo) btnUndo.style.opacity = HISTORY.index <= 0 ? '0.35' : '';
  if (btnRedo) btnRedo.style.opacity = HISTORY.index >= HISTORY.stack.length - 1 ? '0.35' : '';
}

// ── FORMAT ENGINE ──────────────────────────────────────────
// Core apply function using Selection/Range API.
// Pushes undo snapshot BEFORE applying (so you can undo).
// Primary: surroundContents (single-block selections, most common).
// Fallback: extractContents + wrap (cross-element selections).
//   The fallback can leave minor DOM untidiness in deeply nested
//   structures — cleanupSpans() normalizes afterward.

function applyFormat(cssProp, value) {
  const doc = document;

  const sel = doc.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) {
    // No text selection — try applying directly to _editorSelectedEl
    if (_editorSelectedEl) {
      pushUndoSnapshot();
      _editorSelectedEl.style[cssProp] = value;
    }
    return;
  }

  pushUndoSnapshot();

  const range = sel.getRangeAt(0).cloneRange();

  // Only apply inside editCanvas
  const canvas = document.getElementById('editCanvas');
  if (canvas && !canvas.contains(range.commonAncestorContainer)) return;

  try {
    // Primary path: works when selection is inside a single element
    const span = doc.createElement('span');
    span.style[cssProp] = value;
    range.surroundContents(span);
    // Reselect the newly created span
    sel.removeAllRanges();
    const nr = doc.createRange();
    nr.selectNodeContents(span);
    sel.addRange(nr);
  } catch {
    // Fallback: selection spans multiple elements
    const frag = range.extractContents();
    const wrapper = doc.createElement('span');
    wrapper.style[cssProp] = value;
    wrapper.appendChild(frag);
    range.insertNode(wrapper);
    sel.removeAllRanges();
    const nr = doc.createRange();
    nr.selectNodeContents(wrapper);
    sel.addRange(nr);
  }

  cleanupSpans(doc);
}

// Toggle helpers — read computed style first to decide direction

function applyBold() {
  const doc = document;
  const sel = doc.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const el    = range.commonAncestorContainer;
  const node  = el.nodeType === 3 ? el.parentElement : el;
  const isBold = parseInt(window.getComputedStyle(node)?.fontWeight || '400') >= 600;
  applyFormat('fontWeight', isBold ? '400' : '700');
}

function applyItalic() {
  const doc = document;
  const sel = doc.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const el    = range.commonAncestorContainer;
  const node  = el.nodeType === 3 ? el.parentElement : el;
  const isItalic = window.getComputedStyle(node)?.fontStyle === 'italic';
  applyFormat('fontStyle', isItalic ? 'normal' : 'italic');
}

function applyTextDecoration(dec) {
  // dec = 'underline' or 'line-through'
  // Reads current computed decoration, toggles the target value,
  // preserves any other active decorations.
  const doc = document;
  const sel = doc.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const el    = range.commonAncestorContainer;
  const node  = el.nodeType === 3 ? el.parentElement : el;
  const current = window.getComputedStyle(node)?.textDecorationLine || 'none';

  let newValue;
  if (current.includes(dec)) {
    const parts = current.split(/\s+/).filter(p => p && p !== dec && p !== 'none');
    newValue = parts.length ? parts.join(' ') : 'none';
  } else {
    const parts = current.split(/\s+/).filter(p => p && p !== 'none');
    parts.push(dec);
    newValue = parts.join(' ');
  }
  applyFormat('textDecoration', newValue);
}

// ── SPAN CLEANUP ───────────────────────────────────────────
// Runs before each snapshot and after each format operation.
// Prevents nested/conflicting spans from accumulating.

function cleanupSpans(doc) {
  // doc param kept for API compat; always scoped to editCanvas to avoid touching toolbar
  const canvas = document.getElementById('editCanvas');
  const root = canvas || doc?.body;
  if (!root) return;

  // 1. Remove empty spans (no text content, no images)
  root.querySelectorAll('span').forEach(span => {
    if (!span.dataset.icon && !span.querySelector('img') && span.textContent === '') {
      span.remove();
    }
  });

  // 2. Unwrap spans that have no style, no class, no data-icon
  root.querySelectorAll('span').forEach(span => {
    if (!span.getAttribute('style') && !span.getAttribute('class') && !span.dataset.icon) {
      const parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    }
  });

  // 3. Merge adjacent text nodes
  root.normalize();
}

// ── TOOLBAR STATE SYNC ─────────────────────────────────────
// Reads computed styles at the cursor/selection and updates
// the ribbon controls to match. Called on selectionchange
// with 50ms debounce to stay smooth.

let _toolbarDebounce = null;
function scheduleToolbarUpdate() {
  if (_toolbarDebounce) clearTimeout(_toolbarDebounce);
  _toolbarDebounce = setTimeout(updateToolbarState, 50);
}

// Tracks the element most recently reported by editor.js as selected
let _editorSelectedEl = null;

function updateToolbarState() {
  const doc = document;

  let el = null;

  // Priority 1: active text selection
  const sel = doc.getSelection();
  if (sel?.rangeCount) {
    const range   = sel.getRangeAt(0);
    const rawNode = range.commonAncestorContainer;
    el = rawNode.nodeType === 3 ? rawNode.parentElement : rawNode;
    if (!el || !doc.body?.contains(el)) el = null;
  }

  // Priority 2: cursor in contenteditable (collapsed selection)
  // el already set above from collapsed selection — leave as-is

  // Priority 3: editor.js selected element
  if (!el || el === doc.body || el === document.getElementById('editCanvas')) {
    el = _editorSelectedEl || el;
  }

  if (!el) return;

  // Only update toolbar when element is inside editCanvas
  const canvas = document.getElementById('editCanvas');
  if (canvas && !canvas.contains(el)) return;

  const computed = window.getComputedStyle(el);
  if (!computed) return;

  // Font family — match against dropdown options
  const ff = computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  const fontSel = $('rbFont');
  let matched = false;
  [...fontSel.options].forEach(opt => {
    const match = opt.value.toLowerCase() === ff.toLowerCase();
    opt.selected = match;
    if (match) matched = true;
  });
  // If no exact match, leave current selection unchanged

  // Font size — round to integer px
  const fsPx = Math.round(parseFloat(computed.fontSize));
  if (!isNaN(fsPx)) $('rbSizeInput').value = fsPx;

  // Bold
  const isBold   = parseInt(computed.fontWeight) >= 600;
  const isItalic = computed.fontStyle === 'italic';
  const tdLine   = computed.textDecorationLine || 'none';
  const isUnder  = tdLine.includes('underline');
  const isStrike = tdLine.includes('line-through');

  $('btnBold')?.classList.toggle('active', isBold);
  $('btnItalic')?.classList.toggle('active', isItalic);
  $('btnUnderline')?.classList.toggle('active', isUnder);
  $('btnStrike')?.classList.toggle('active', isStrike);

  // Text color
  const hex = rgbToHex(computed.color);
  if (hex) $('rbColor').value = hex;
}

// ── FONT SIZE ──────────────────────────────────────────────
function adjustFontSizeRelative(delta) {
  const doc = document;
  const sel = doc.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const el    = range.commonAncestorContainer;
  const node  = el.nodeType === 3 ? el.parentElement : el;
  const current = parseFloat(window.getComputedStyle(node)?.fontSize) || 14;
  applyFormat('fontSize', Math.max(8, Math.round(current + delta)) + 'px');
}

// ── BULLET INSERTION ───────────────────────────────────────
// Inserts prefix at the very start of the containing block element,
// not at the cursor. Handles: P, DIV, SECTION, LI, Hx, SPAN
// when it's the outermost text container.

const BLOCK_TAGS = new Set(['P','DIV','SECTION','ARTICLE','HEADER','FOOTER','MAIN','LI','H1','H2','H3','H4','H5','H6']);

function findBlockAncestor(node, doc) {
  let el = node.nodeType === 3 ? node.parentElement : node;
  while (el && el !== doc.body) {
    if (BLOCK_TAGS.has(el.tagName?.toUpperCase())) return el;
    el = el.parentElement;
  }
  // Fallback: return the direct child of body that contains the cursor
  el = node.nodeType === 3 ? node.parentElement : node;
  while (el?.parentElement && el.parentElement !== doc.body) el = el.parentElement;
  return el || doc.body;
}

function insertBulletAtLineStart(prefix) {
  const doc = document;

  const sel = doc.getSelection();
  if (!sel?.rangeCount) return;

  pushUndoSnapshot();

  const range   = sel.getRangeAt(0);
  const blockEl = findBlockAncestor(range.startContainer, doc);

  // Find the first text node via TreeWalker
  const walker    = doc.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
  const firstText = walker.nextNode();

  if (firstText) {
    const prefixNode = doc.createTextNode(prefix);
    firstText.parentNode.insertBefore(prefixNode, firstText);
  } else {
    blockEl.insertAdjacentText('afterbegin', prefix);
  }
}

function insertNumberedBullet() {
  const doc = document;

  const sel = doc.getSelection();
  if (!sel?.rangeCount) return;

  const range   = sel.getRangeAt(0);
  const blockEl = findBlockAncestor(range.startContainer, doc);

  let nextNum = 1;

  // Scan previous siblings for a numbered list context
  let prev = blockEl.previousElementSibling;
  while (prev) {
    const txt = prev.textContent.trim();
    const m   = txt.match(/^(\d+)\./);
    if (m) { nextNum = parseInt(m[1]) + 1; break; }
    if (txt.length > 0) break; // non-empty, non-numbered sibling — reset context
    prev = prev.previousElementSibling;
  }

  insertBulletAtLineStart(`${nextNum}. `);
}

// ── FORMAT PAINTER ─────────────────────────────────────────
// Click to enter painter mode (captures style bundle from selection).
// Click btnPainter again or press Escape to cancel.
// Make a selection while active → applies captured styles.

function activateFormatPainter() {
  if (STATE.formatPainter) {
    // Toggle off
    STATE.formatPainter = null;
    $('btnPainter').classList.remove('active');
    return;
  }

  const doc = document;

  const sel = doc.getSelection();
  if (!sel?.rangeCount) return;

  const range = sel.getRangeAt(0);
  const el    = range.commonAncestorContainer;
  const node  = el.nodeType === 3 ? el.parentElement : el;
  if (!node) return;

  const computed = window.getComputedStyle(node);
  if (!computed) return;

  STATE.formatPainter = {
    fontFamily:     computed.fontFamily,
    fontSize:       computed.fontSize,
    fontWeight:     computed.fontWeight,
    fontStyle:      computed.fontStyle,
    color:          computed.color,
    textDecoration: computed.textDecorationLine,
  };
  $('btnPainter').classList.add('active');
}

// Called on selectionchange when format painter is active
function tryApplyFormatPainter() {
  if (!STATE.formatPainter) return;

  const doc = document;

  const sel = doc.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return;

  pushUndoSnapshot();

  const range = sel.getRangeAt(0).cloneRange();
  const fp    = STATE.formatPainter;

  // Build inline style string
  const styleObj = {
    fontFamily:     fp.fontFamily,
    fontSize:       fp.fontSize,
    fontWeight:     fp.fontWeight,
    fontStyle:      fp.fontStyle,
    color:          fp.color,
  };
  if (fp.textDecoration && fp.textDecoration !== 'none') {
    styleObj.textDecoration = fp.textDecoration;
  }

  try {
    const span = doc.createElement('span');
    Object.assign(span.style, styleObj);
    range.surroundContents(span);
  } catch {
    const frag    = range.extractContents();
    const wrapper = doc.createElement('span');
    Object.assign(wrapper.style, styleObj);
    wrapper.appendChild(frag);
    range.insertNode(wrapper);
  }

  cleanupSpans(doc);

  // Deactivate after applying
  STATE.formatPainter = null;
  $('btnPainter').classList.remove('active');
}

// ── RIBBON SETUP ───────────────────────────────────────────
// v2.4: all format operations use Selection/Range API.
// Alignment still uses execCommand (reliable for block-level,
// low risk — justify commands aren't deprecated in practice).

function setupRibbon() {
  // Font family — no selection save/restore needed (same document)
  $('rbFont').addEventListener('change', (e) => {
    applyFormat('fontFamily', e.target.value);
  });

  // Font size number input — apply on Enter or blur
  const rbSize = $('rbSizeInput');
  const applySizeInput = () => {
    const px = Math.max(8, Math.min(96, parseInt(rbSize.value, 10) || 14));
    rbSize.value = px; // normalize display
    applyFormat('fontSize', px + 'px');
  };
  rbSize.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applySizeInput(); } });
  rbSize.addEventListener('blur', applySizeInput);

  // A↑ A↓ relative size
  $('btnAUp').addEventListener('mousedown',   (e) => { e.preventDefault(); adjustFontSizeRelative(+2); });
  $('btnADown').addEventListener('mousedown', (e) => { e.preventDefault(); adjustFontSizeRelative(-2); });

  // Undo / Redo
  $('btnUndo').addEventListener('mousedown', (e) => { e.preventDefault(); performUndo(); });
  $('btnRedo').addEventListener('mousedown', (e) => { e.preventDefault(); performRedo(); });

  // Bridge: slide-deck-ui calls window.IgDeckUndoRedo.refresh() after every
  // structural mutation so the toolbar undo/redo buttons dim correctly in
  // deck mode without slide-deck-ui needing to import from app.js.
  window.IgDeckUndoRedo = window.IgDeckUndoRedo || {};
  window.IgDeckUndoRedo.refresh = updateUndoRedoButtons;

  // B I U S
  $('btnBold').addEventListener('mousedown',      (e) => { e.preventDefault(); applyBold(); });
  $('btnItalic').addEventListener('mousedown',    (e) => { e.preventDefault(); applyItalic(); });
  $('btnUnderline').addEventListener('mousedown', (e) => { e.preventDefault(); applyTextDecoration('underline'); });
  $('btnStrike').addEventListener('mousedown',    (e) => { e.preventDefault(); applyTextDecoration('line-through'); });

  // Text color
  $('rbColor').addEventListener('input', (e) => {
    applyFormat('color', e.target.value);
  });

  // Alignment — execCommand (block-level, still reliable in all browsers)
  $$('.rbtn.align').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      if (!cmd) return;
      document.execCommand(cmd, false, null);
    });
  });

  // Lists
  $('btnBulletList').addEventListener('mousedown', (e) => { e.preventDefault(); insertBulletAtLineStart('• '); });
  $('btnNumberList').addEventListener('mousedown', (e) => { e.preventDefault(); insertNumberedBullet(); });

  // Format painter
  $('btnPainter').addEventListener('mousedown', (e) => { e.preventDefault(); activateFormatPainter(); });
}

// Called after each generation — wires canvas-level events
// (runs once; subsequent calls just call initHistory again)
let _canvasEventsWired = false;
function setupCanvasEvents() {
  if (!_canvasEventsWired) {
    _canvasEventsWired = true;

    // Selection change — update toolbar state
    document.addEventListener('selectionchange', () => {
      scheduleToolbarUpdate();
      // If format painter is active and user just made a selection, apply it
      if (STATE.formatPainter) tryApplyFormatPainter();
    });

    // Ctrl+Z / Ctrl+Y — use our history stack when focus is inside editCanvas
    document.addEventListener('keydown', (e) => {
      const canvas = document.getElementById('editCanvas');
      if (!canvas || !canvas.contains(document.activeElement)) return;

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (!e.shiftKey && e.key === 'z') { e.preventDefault(); performUndo(); }
      if ((e.shiftKey && e.key === 'z') || e.key === 'y') { e.preventDefault(); performRedo(); }
      if (e.key === 'Escape' && STATE.formatPainter) {
        STATE.formatPainter = null;
        $('btnPainter').classList.remove('active');
      }
    });

    // Listen for editor.js custom events (select/deselect/edit/snapshot)
    document.addEventListener('ig-editor-select', (e) => {
      _editorSelectedEl = e.detail?.element || null;
      scheduleToolbarUpdate();
    });
    document.addEventListener('ig-editor-edit', (e) => {
      _editorSelectedEl = e.detail?.element || null;
      scheduleToolbarUpdate();
    });
    document.addEventListener('ig-editor-deselect', () => {
      _editorSelectedEl = null;
    });
    document.addEventListener('ig-editor-snapshot', () => {
      pushUndoSnapshot();
    });
  }

  initHistory();
}

// ── ZOOM ───────────────────────────────────────────────────
function setupZoom() {
  $('btnZoomIn').addEventListener('click',  () => changeZoom(+0.1));
  $('btnZoomOut').addEventListener('click', () => changeZoom(-0.1));

  document.querySelector('.cbody').addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    changeZoom(e.deltaY < 0 ? +0.05 : -0.05);
  }, { passive: false });

  // Block browser pinch-zoom on the entire page
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      // Allow our custom zoom on .cbody, block everywhere else
      if (e.target.closest('.cbody')) return; // handled by listener above
      e.preventDefault();
    }
  }, { passive: false });

  // Block touch pinch-zoom on toolbar/sidebar (allow on .cbody)
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length >= 2 && !e.target.closest('.cbody')) {
      e.preventDefault();
    }
  }, { passive: false });
}

function changeZoom(delta) {
  STATE.zoomLevel = Math.max(0.2, Math.min(3.0, STATE.zoomLevel + delta));
  applyZoom(true);
}

function applyZoom(animate = true) {
  const wrap  = $('outputWrap');
  const cbody = document.querySelector('.cbody');
  if (!wrap) return;

  const z  = STATE.zoomLevel;
  const sz = SIZES[STATE.size];

  // BUG 3 FIX — anchor from top-left so margin extensions extend the scroll area
  // correctly. CSS transform doesn't affect layout flow, so we compensate with
  // margins equal to the extra pixels the scaled canvas visually occupies.
  wrap.style.transformOrigin = 'top left';
  wrap.style.transition      = animate ? 'transform 0.15s ease' : 'none';
  wrap.style.transform       = `scale(${z})`;

  if (sz) {
    const extraW = Math.max(0, Math.round(sz.w * z - sz.w));
    const extraH = Math.max(0, Math.round(sz.h * z - sz.h));
    wrap.style.marginRight  = extraW > 0 ? extraW + 'px' : '';
    wrap.style.marginBottom = extraH > 0 ? extraH + 'px' : '';
  }

  // Always allow scroll on both axes so two-finger pan works at any zoom level.
  // overflowX stays 'scroll' (always visible bar); overflowY switches to 'auto'
  // once content is large enough to need it.
  if (cbody) {
    cbody.style.overflowX = 'scroll';
    cbody.style.overflowY = 'auto';
  }
  $('zoomLabel').textContent = Math.round(z * 100) + '%';
}

// ── EXPORT HELPERS ─────────────────────────────────────────
function slugify(s) {
  return (s || 'infograi').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
function exportFilename(ext) {
  return `infograi-${slugify(STATE.topic)}.${ext}`;
}
function download(href, filename) {
  const a = document.createElement('a');
  a.href = href; a.download = filename;
  document.body.appendChild(a);
  a.click(); a.remove();
}

async function prepareExportFrame() {
  const frame = $('exportFrame');
  if (!frame) return null;

  // Build a full HTML document from the current canvas state (includes user edits)
  const canvas = document.getElementById('editCanvas');
  if (!canvas) return null;

  const styles = [...canvas.querySelectorAll('style.ig-injected-style, style#ig-accent-override')]
    .map(s => s.outerHTML).join('\n');
  const content = canvas.querySelector('.ig-page')?.outerHTML || canvas.innerHTML;
  const fullHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    ${styles}</head><body style="margin:0;padding:0;">${content}</body></html>`;

  frame.srcdoc = fullHTML;

  // Wait for the frame to load
  await new Promise(resolve => {
    frame.addEventListener('load', resolve, { once: true });
  });
  await new Promise(r => setTimeout(r, 600));

  return (
    frame.contentDocument?.querySelector('.ig-page') ||
    frame.contentDocument?.body?.firstElementChild ||
    frame.contentDocument?.body
  );
}

async function toBase64(url) {
  if (!url || url.startsWith('data:')) return url;
  try {
    const proxyUrl = url.includes('/api/proxy') ? url : `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror   = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {}
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror   = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

/**
 * Convert all external img srcs inside a container to data URIs so
 * html-to-image can capture them. Returns a restore function that
 * puts all original srcs back.
 */
async function prefetchImagesInEl(container) {
  const imgs    = [...container.querySelectorAll('img')];
  const origSrc = imgs.map(img => img.src);
  await Promise.all(imgs.map(async (img, i) => {
    if (!origSrc[i] || origSrc[i].startsWith('data:')) return;
    const b64 = await toBase64(origSrc[i]);
    if (b64) img.src = b64;
  }));
  return () => imgs.forEach((img, i) => { img.src = origSrc[i]; });
}

// Legacy alias — exportFrame-based path kept for potential future use
async function prefetchExportImages() {
  const doc = $('exportFrame')?.contentDocument;
  if (!doc) return () => {};
  return prefetchImagesInEl(doc);
}

async function autoConvertImages() {
  const canvas = document.getElementById('editCanvas');
  if (!canvas) return;
  // Wait a bit for images to start loading
  await new Promise(r => setTimeout(r, 1500));
  const imgs = [...canvas.querySelectorAll('img')].filter(img => {
    const src = img.src || '';
    return src && !src.startsWith('data:');
  });
  await Promise.all(imgs.map(async img => {
    const b64 = await toBase64(img.src);
    if (b64) img.src = b64;
  }));
}

// ── EXPORT PNG ─────────────────────────────────────────────
async function exportPNG() {
  // Capture editCanvas directly — html-to-image cannot cross iframe boundaries.
  const canvas = document.getElementById('editCanvas');
  if (!canvas) { alert('Nothing to export yet.'); return; }
  const sz = SIZES[STATE.size];
  await document.fonts.ready;
  const restore = await prefetchImagesInEl(canvas);
  try {
    const dataUrl = await htmlToImage.toPng(canvas, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      width:  sz?.w,
      height: sz?.h,
    });
    download(dataUrl, exportFilename('png'));
  } catch (e) {
    alert('PNG export failed: ' + (e?.message || String(e)) +
      '\n\nTip: Export as HTML and open in browser to screenshot.');
  } finally { restore(); }
}

// ── EXPORT PDF ─────────────────────────────────────────────
async function exportPDF() {
  // Capture editCanvas directly — html-to-image cannot cross iframe boundaries.
  const canvas = document.getElementById('editCanvas');
  if (!canvas) { alert('Nothing to export yet.'); return; }
  const sz = SIZES[STATE.size];
  await document.fonts.ready;
  const restore = await prefetchImagesInEl(canvas);
  try {
    const dataUrl = await htmlToImage.toPng(canvas, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      width:  sz?.w,
      height: sz?.h,
    });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: sz.h > sz.w ? 'portrait' : 'landscape',
      unit:        'px',
      format:      [sz?.w || 800, sz?.h || 1131],
      hotfixes:    ['px_scaling'],
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, sz?.w || 800, sz?.h || 1131);
    pdf.save(exportFilename('pdf'));
  } catch (e) {
    alert('PDF export failed: ' + (e?.message || String(e)));
  } finally { restore(); }
}

// ── EXPORT HTML ────────────────────────────────────────────
function exportHTML() {
  const canvas = document.getElementById('editCanvas');
  if (!canvas) { alert('Nothing to export yet.'); return; }

  // Build clean HTML from current canvas state (includes all user edits)
  const styles = [...canvas.querySelectorAll('style.ig-injected-style, style#ig-accent-override')]
    .map(s => s.outerHTML).join('\n');
  const content = canvas.querySelector('.ig-page')?.outerHTML || canvas.innerHTML;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    ${styles}</head><body style="margin:0;padding:0;">${content}</body></html>`;

  download('data:text/html;charset=utf-8,' + encodeURIComponent(html), exportFilename('html'));
}

// ── PROGRESS / ERROR UI ────────────────────────────────────
function showGenerating() {
  $('outputWrap').innerHTML = `
    <div class="loading-state">
      <div class="loading-ring"></div>
      <div class="loading-txt">Designer agent working…</div>
      <div class="loading-sub">Researching · Designing layout · Generating HTML</div>
      <div class="stream-count">Starting…</div>
    </div>`;
}

function updateStreamProgress(charCount) {
  const el = document.querySelector('.stream-count');
  if (el) {
    const pct = Math.min(98, Math.round((charCount / 9500) * 100));
    el.textContent = `${charCount.toLocaleString()} characters · ${pct}%`;
  }
}

function showError(msg) {
  $('outputWrap').innerHTML = `
    <div class="empty">
      <div class="empty-ico">⚠</div>
      <div class="empty-ttl">Generation failed</div>
      <div class="empty-sub">${escHTML(msg)}</div>
    </div>`;
}

// ── UTILS ──────────────────────────────────────────────────
function escHTML(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hexToAlpha(hex, alpha) {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent' || rgb === 'inherit') return null;
  const m = rgb.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (!m) return null;
  return '#' + [m[1], m[2], m[3]]
    .map(n => parseInt(n).toString(16).padStart(2, '0'))
    .join('');
}
