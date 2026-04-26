/**
 * Infogr.ai v3 — Smart Layout Render Functions (Layer 2, All Families)
 *
 * Transforms semantic content items into visual representations.
 * Families: Boxes, Bullets, Sequence, Numbers, Circles, Quotes, Steps
 * Each render function takes the same items array and draws differently.
 * Same content → different visuals, no data change required.
 *
 * Reference: ENGINE-SPEC.md — Layer 2.3
 *
 * Usage:
 *   import { renderBoxes, BOXES_CSS, renderBullets, BULLETS_CSS, ... } from './smart-layouts.js';
 *   const html = renderBoxes(items, 'solid-boxes-icons', 'professional', 3, 'standard');
 */

import { renderDiagramSection } from './smart-diagrams.js';

/* ─────────────────────────────────────────
   ICON SYSTEM
   Mirrors renderer.js logic without importing it (would create a circular
   dependency since renderer.js imports FROM smart-layouts.js).
   Priority: LOCAL_SVG_MAP (instant, zero network) → /api/proxy → fallback circle.
───────────────────────────────────────── */

const SL_PROXY_BASE  = '/api/proxy?url=';
const SL_ICONS8_BASE = 'https://img.icons8.com/3d-fluency';
const SL_FALLBACK    = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='24' cy='24' r='6' fill='%23cbd5e1'/%3E%3C/svg%3E";

const SL_LOCAL_SVG_MAP = {
  'folder':          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M4 14a4 4 0 0 1 4-4h10l4 4h22a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#FFA726"/><path d="M4 20h40v14a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#FFB74D"/></svg>`,
  'gear':            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#607D8B" d="M39 21.5l-2.2-.4c-.3-1-.7-1.9-1.3-2.8l1.3-1.8c.4-.5.3-1.2-.2-1.7l-2.8-2.8c-.5-.4-1.2-.4-1.7-.1l-1.8 1.3c-.9-.5-1.8-1-2.8-1.3l-.4-2.2C26.8 9 26.2 8.5 25.5 8.5h-4c-.7 0-1.3.5-1.4 1.2l-.4 2.2c-1 .3-1.9.8-2.8 1.3l-1.8-1.3c-.5-.3-1.2-.3-1.7.1l-2.8 2.8c-.5.5-.5 1.2-.2 1.7l1.3 1.8c-.5.9-1 1.8-1.3 2.8l-2.2.4C9 21.7 8.5 22.3 8.5 23v4c0 .7.5 1.3 1.2 1.4l2.2.4c.3 1 .8 1.9 1.3 2.8l-1.3 1.8c-.3.5-.3 1.2.2 1.7l2.8 2.8c.5.4 1.2.4 1.7.1l1.8-1.3c.9.5 1.8 1 2.8 1.3l.4 2.2c.2.7.7 1.2 1.4 1.2h4c.7 0 1.3-.5 1.4-1.2l.4-2.2c1-.3 1.9-.8 2.8-1.3l1.8 1.3c.5.3 1.2.3 1.7-.1l2.8-2.8c.5-.5.5-1.2.2-1.7l-1.3-1.8c.5-.9 1-1.8 1.3-2.8l2.2-.4c.7-.2 1.2-.7 1.2-1.4v-4c0-.7-.5-1.3-1.1-1.5z"/><circle cx="24" cy="25" r="5.5" fill="#B0BEC5"/></svg>`,
  'settings':        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#607D8B" d="M39 21.5l-2.2-.4c-.3-1-.7-1.9-1.3-2.8l1.3-1.8c.4-.5.3-1.2-.2-1.7l-2.8-2.8c-.5-.4-1.2-.4-1.7-.1l-1.8 1.3c-.9-.5-1.8-1-2.8-1.3l-.4-2.2C26.8 9 26.2 8.5 25.5 8.5h-4c-.7 0-1.3.5-1.4 1.2l-.4 2.2c-1 .3-1.9.8-2.8 1.3l-1.8-1.3c-.5-.3-1.2-.3-1.7.1l-2.8 2.8c-.5.5-.5 1.2-.2 1.7l1.3 1.8c-.5.9-1 1.8-1.3 2.8l-2.2.4C9 21.7 8.5 22.3 8.5 23v4c0 .7.5 1.3 1.2 1.4l2.2.4c.3 1 .8 1.9 1.3 2.8l-1.3 1.8c-.3.5-.3 1.2.2 1.7l2.8 2.8c.5.4 1.2.4 1.7.1l1.8-1.3c.9.5 1.8 1 2.8 1.3l.4 2.2c.2.7.7 1.2 1.4 1.2h4c.7 0 1.3-.5 1.4-1.2l.4-2.2c1-.3 1.9-.8 2.8-1.3l1.8 1.3c.5.3 1.2.3 1.7-.1l2.8-2.8c.5-.5.5-1.2.2-1.7l-1.3-1.8c.5-.9 1-1.8 1.3-2.8l2.2-.4c.7-.2 1.2-.7 1.2-1.4v-4c0-.7-.5-1.3-1.1-1.5z"/><circle cx="24" cy="25" r="5.5" fill="#90A4AE"/></svg>`,
  'home':            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6L4 22h7v18h10v-10h6v10h10V22h7z" fill="#42A5F5"/><rect x="18" y="30" width="12" height="10" fill="#1976D2"/></svg>`,
  'brain':           `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><ellipse cx="17" cy="23" rx="9" ry="13" fill="#CE93D8"/><ellipse cx="31" cy="23" rx="9" ry="13" fill="#BA68C8"/><rect x="22" y="10" width="4" height="26" rx="2" fill="#F3E5F5"/><circle cx="15" cy="17" r="3" fill="#9C27B0" opacity="0.7"/><circle cx="33" cy="19" r="3" fill="#7B1FA2" opacity="0.7"/></svg>`,
  'rocket':          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 4C16 12 12 22 14 30l4 4c8 2 18-2 26-10C44 12 36 4 24 4z" fill="#5C6BC0"/><circle cx="28" cy="20" r="4" fill="#E8EAF6"/><path d="M14 30c-4 0-8 4-10 8l4 2 2 4c4-2 8-6 8-10z" fill="#EF9A9A"/></svg>`,
  'briefcase':       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="18" width="32" height="22" rx="3" fill="#8D6E63"/><path d="M17 18v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" fill="none" stroke="#5D4037" stroke-width="2.5"/><rect x="8" y="28" width="32" height="3" fill="#6D4C41"/><rect x="21" y="25" width="6" height="7" rx="1" fill="#A1887F"/></svg>`,
  'database':        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><ellipse cx="24" cy="12" rx="14" ry="5" fill="#64B5F6"/><path d="M10 12v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8c0 2.8-6.3 5-14 5s-14-2.2-14-5z" fill="#2196F3"/><path d="M10 20v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8c0 2.8-6.3 5-14 5s-14-2.2-14-5z" fill="#1976D2"/><path d="M10 28v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8c0 2.8-6.3 5-14 5s-14-2.2-14-5z" fill="#1565C0"/></svg>`,
  'search':          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="20" cy="20" r="12" fill="none" stroke="#78909C" stroke-width="4"/><line x1="30" y1="30" x2="42" y2="42" stroke="#546E7A" stroke-width="4.5" stroke-linecap="round"/></svg>`,
  'mail':            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="6" y="12" width="36" height="26" rx="3" fill="#64B5F6"/><path d="M6 15l18 13 18-13" stroke="#1976D2" stroke-width="2" fill="none"/><path d="M6 15l18 13L42 15H6z" fill="#90CAF9"/></svg>`,
  'smartphone':      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="13" y="4" width="22" height="40" rx="4" fill="#546E7A"/><rect x="16" y="9" width="16" height="25" fill="#B0BEC5"/><circle cx="24" cy="40" r="2.5" fill="#90A4AE"/></svg>`,
  'cloud-storage':   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M38 22a10 10 0 0 0-19.6-2.8A8 8 0 0 0 10 27a8 8 0 0 0 8 8h20a8 8 0 0 0 0-16z" fill="#42A5F5"/><path d="M30 31l-6 6-6-6" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="24" y1="37" x2="24" y2="26" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  'shield':          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 4L8 10v14c0 10.5 7 18 16 20 9-2 16-9.5 16-20V10z" fill="#42A5F5"/><path d="M16 25l5 5 11-12" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'calendar-3':      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="6" y="10" width="36" height="32" rx="3" fill="#EF5350"/><rect x="6" y="10" width="36" height="14" rx="3" fill="#E53935"/><circle cx="16" cy="8" r="3" fill="#B71C1C"/><circle cx="32" cy="8" r="3" fill="#B71C1C"/><rect x="11" y="28" width="6" height="5" rx="1" fill="white" opacity="0.85"/><rect x="21" y="28" width="6" height="5" rx="1" fill="white" opacity="0.85"/><rect x="31" y="28" width="6" height="5" rx="1" fill="white" opacity="0.85"/></svg>`,
  'chart-increasing':`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="5" y="30" width="8" height="12" rx="1.5" fill="#A5D6A7"/><rect x="15" y="22" width="8" height="20" rx="1.5" fill="#66BB6A"/><rect x="25" y="14" width="8" height="28" rx="1.5" fill="#43A047"/><rect x="35" y="6" width="8" height="36" rx="1.5" fill="#2E7D32"/><line x1="3" y1="44" x2="47" y2="44" stroke="#1B5E20" stroke-width="2" stroke-linecap="round"/></svg>`,
  'star':            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 5l5.3 10.7 11.8 1.7-8.5 8.3 2 11.8L24 32l-10.6 5.5 2-11.8L7 17.4l11.8-1.7z" fill="#FFC107" stroke="#FF8F00" stroke-width="0.5"/></svg>`,
  'key':             `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="16" cy="20" r="10" fill="none" stroke="#FFC107" stroke-width="4"/><line x1="24" y1="25" x2="43" y2="44" stroke="#FF8F00" stroke-width="4.5" stroke-linecap="round"/><line x1="36" y1="37" x2="36" y2="43" stroke="#FF8F00" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  'lock':            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="10" y="22" width="28" height="22" rx="3" fill="#42A5F5"/><path d="M16 22v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#1976D2" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="32" r="3" fill="#1565C0"/></svg>`,
  'user-group':      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="16" cy="15" r="7" fill="#64B5F6"/><path d="M4 38c0-6.6 5.4-12 12-12 6.6 0 12 5.4 12 12" fill="#42A5F5"/><circle cx="34" cy="13" r="6" fill="#90CAF9"/><path d="M28 36c0-5 3.1-9.3 7.5-11.1A12.2 12.2 0 0 1 46 36" fill="#64B5F6"/></svg>`,
  'idea':            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6a13 13 0 0 0-6 24.5V36h12v-5.5A13 13 0 0 0 24 6z" fill="#FFD54F"/><rect x="18" y="36" width="12" height="3" rx="1.5" fill="#FF8F00"/><rect x="19.5" y="39" width="9" height="3" rx="1.5" fill="#FF8F00"/></svg>`,
  'target':          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="14" fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="8" fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="3" fill="#EF5350"/></svg>`,
  'checklist':       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="3" fill="#E3F2FD"/><path d="M13 19l4 4 8-8" stroke="#1976D2" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="13" y="28" width="3" height="3" rx="1" fill="#42A5F5"/><rect x="13" y="34" width="3" height="3" rx="1" fill="#42A5F5"/><line x1="19" y1="29.5" x2="35" y2="29.5" stroke="#90CAF9" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="35.5" x2="30" y2="35.5" stroke="#90CAF9" stroke-width="2" stroke-linecap="round"/></svg>`,
  'dollar-coin':     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FFC107"/><circle cx="24" cy="24" r="16" fill="#FFD54F"/><text x="24" y="31" text-anchor="middle" font-size="20" font-weight="bold" fill="#E65100" font-family="sans-serif">$</text></svg>`,
  'lightning-bolt':  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M28 4L10 28h14l-4 16 18-24H24z" fill="#FFC107" stroke="#FF8F00" stroke-width="1" stroke-linejoin="round"/></svg>`,
  'checkmark':       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#4CAF50"/><path d="M14 25l7 7 13-14" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

/** Resolve icon name → src URL (local data URI or proxied Icons8). */
function resolveIconSrc(name) {
  if (!name || typeof name !== 'string') return SL_FALLBACK;
  const key = name.toLowerCase().replace(/\s+/g, '-');
  const svg = SL_LOCAL_SVG_MAP[key];
  if (svg) return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const raw = `${SL_ICONS8_BASE}/94/${key}.png`;
  return `${SL_PROXY_BASE}${encodeURIComponent(raw)}`;
}

/** Build an <img> tag for an icon with proper src, fallback, and data-icon attribute. */
function iconImg(name, cssClass) {
  const src = resolveIconSrc(name || 'star');
  const cls = cssClass ? ` class="${cssClass}"` : '';
  return `<img${cls} src="${src}" alt="" loading="lazy" data-icon="true" onerror="this.onerror=null;this.src='${SL_FALLBACK}'">`;
}

/* ─────────────────────────────────────────
   TEXT DENSITY HELPERS
   ENGINE-SPEC.md Layer 5 — Adaptive Text Engine
───────────────────────────────────────── */

/**
 * Truncate body text to fit the target density.
 *   compact  → no body (title-only display)
 *   standard → ~20 words
 *   detailed → ~40 words
 */
function truncateBody(body, density) {
  if (!body || density === 'compact') return '';
  const words = body.trim().split(/\s+/);
  const limit = density === 'detailed' ? 40 : 20;
  if (words.length <= limit) return body;
  return words.slice(0, limit).join(' ') + '…';
}

/**
 * Truncate title to 7 words in compact mode.
 */
function truncateTitle(title, density) {
  if (!title) return '';
  if (density !== 'compact') return title;
  const words = title.trim().split(/\s+/);
  if (words.length <= 7) return title;
  return words.slice(0, 7).join(' ') + '…';
}

/**
 * Escape HTML special chars.
 */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Chunk an array into groups of size n.
 */
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/* ─────────────────────────────────────────
   BOXES CSS
   Scoped to .ig-page .igs-* to prevent leaking into the app shell.
   Exported for use by renderFromContent() in renderer.js.
───────────────────────────────────────── */

export const BOXES_CSS = `
/* ── Smart Layout: grid system ── */
.ig-page .igs-grid {
  display: grid;
  gap: 14px;
  width: 100%;
}
.ig-page .igs-grid--1 { grid-template-columns: 1fr; }
.ig-page .igs-grid--2 { grid-template-columns: repeat(2, 1fr); }
.ig-page .igs-grid--3 { grid-template-columns: repeat(3, 1fr); }
.ig-page .igs-grid--4 { grid-template-columns: repeat(4, 1fr); }

/* ── Solid Boxes ── */
.ig-page .igs-solid {
  background: var(--accent);
  border-radius: var(--radius-card, 10px);
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-solid .igs-icon {
  display: block;
  width: 32px; height: 32px;
  object-fit: contain;
  margin: 0 auto 4px;
  filter: brightness(0) invert(1);
  flex-shrink: 0;
  align-self: center;
}
.ig-page .igs-solid .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.94em; font-weight: 700;
  color: #fff; margin: 0; line-height: 1.3;
}
.ig-page .igs-solid .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.77em; color: rgba(255,255,255,0.88);
  margin: 0; line-height: 1.45;
}

/* ── Outline Boxes ── */
.ig-page .igs-outline {
  background: var(--card-bg, #fff);
  border: 2px solid var(--accent);
  border-radius: var(--radius-card, 10px);
  padding: 18px 16px;
  display: flex; flex-direction: column; gap: 6px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-outline .igs-icon {
  display: block;
  width: 28px; height: 28px;
  object-fit: contain;
  margin: 0 auto 4px;
  flex-shrink: 0;
  align-self: center;
}
.ig-page .igs-outline .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.94em; font-weight: 700;
  color: var(--accent); margin: 0; line-height: 1.3;
}
.ig-page .igs-outline .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.77em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Side Line (card with left accent bar) ── */
.ig-page .igs-sideline {
  background: var(--card-bg, #fff);
  border-left: 4px solid var(--accent);
  border-radius: 0 var(--radius-card, 10px) var(--radius-card, 10px) 0;
  padding: 14px 16px;
  display: flex; flex-direction: column; gap: 5px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-sideline .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.94em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0; line-height: 1.3;
}
.ig-page .igs-sideline .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.77em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Side Line Text (minimal, no card bg) ── */
.ig-page .igs-sidelinetext {
  border-left: 3px solid var(--accent);
  padding: 5px 14px;
  display: flex; flex-direction: column; gap: 4px;
  overflow: hidden;
}
.ig-page .igs-sidelinetext .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.94em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0;
}
.ig-page .igs-sidelinetext .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.77em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Top Line Text (top accent bar, minimal) ── */
.ig-page .igs-topline {
  border-top: 3px solid var(--accent);
  padding: 12px 4px 6px;
  display: flex; flex-direction: column; gap: 5px;
  overflow: hidden;
}
.ig-page .igs-topline .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.94em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0;
}
.ig-page .igs-topline .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.77em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Top Circle ── */
.ig-page .igs-topcircle {
  background: var(--card-bg, #fff);
  border-radius: var(--radius-card, 10px);
  padding: 18px 14px 14px;
  display: flex; flex-direction: column;
  align-items: center; text-align: center; gap: 8px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-topcircle .igs-circle {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ig-page .igs-topcircle .igs-circle img,
.ig-page .igs-topcircle .igs-circle svg {
  display: block;
  width: 24px; height: 24px;
  object-fit: contain;
  filter: brightness(0) invert(1);
}
.ig-page .igs-topcircle .igs-circle-num {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 1em; font-weight: 700; color: #fff;
}
.ig-page .igs-topcircle .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.9em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0; line-height: 1.3;
}
.ig-page .igs-topcircle .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.75em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Joined Boxes ── */
.ig-page .igs-joined-row {
  display: flex; width: 100%; overflow: hidden;
  border-radius: var(--radius-card, 10px);
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  border: 1px solid var(--card-border, #e5e7eb);
  margin-bottom: 10px;
}
.ig-page .igs-joined-row:last-child { margin-bottom: 0; }
.ig-page .igs-joined {
  flex: 1;
  background: var(--card-bg, #fff);
  border-right: 1px solid var(--card-border, #e5e7eb);
  padding: 14px 13px;
  display: flex; flex-direction: column; gap: 5px;
  overflow: hidden;
}
.ig-page .igs-joined:last-child { border-right: none; }
.ig-page .igs-joined-row.igs-has-icons .igs-joined {
  align-items: center; text-align: center;
}
.ig-page .igs-joined .igs-icon {
  display: block;
  width: 28px; height: 28px;
  object-fit: contain;
  margin-bottom: 5px;
  flex-shrink: 0;
}
.ig-page .igs-joined .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.87em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0; line-height: 1.3;
}
.ig-page .igs-joined .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.74em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Leaf Boxes ── */
.ig-page .igs-leaf {
  background: var(--accent-soft, rgba(37,99,235,.1));
  border-radius: 0 38% 0 38%;
  padding: 20px 18px;
  display: flex; flex-direction: column; gap: 6px;
  min-height: 80px;
  overflow: hidden;
}
.ig-page .igs-leaf .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.92em; font-weight: 700;
  color: var(--accent); margin: 0; line-height: 1.3;
}
.ig-page .igs-leaf .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.76em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Labeled Boxes ── */
.ig-page .igs-labeled-wrap {
  position: relative; padding-top: 14px;
  overflow: visible;
}
.ig-page .igs-labeled {
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: 0 var(--radius-card, 10px) var(--radius-card, 10px) var(--radius-card, 10px);
  padding: 12px 14px 14px;
  display: flex; flex-direction: column; gap: 5px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-labeled-tag {
  position: absolute; top: 0; left: 0;
  background: var(--accent); color: #fff;
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.68em; font-weight: 700;
  padding: 2px 10px 2px 8px;
  border-radius: 4px 4px 4px 0;
  white-space: nowrap; max-width: 80%;
  overflow: hidden; text-overflow: ellipsis;
}
.ig-page .igs-labeled .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.92em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0; line-height: 1.3;
}
.ig-page .igs-labeled .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.76em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.45;
}

/* ── Alternating Boxes ── */
.ig-page .igs-alt {
  border-radius: var(--radius-card, 10px);
  padding: 16px;
  display: flex; flex-direction: column; gap: 6px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
}
.ig-page .igs-alt--primary {
  background: var(--accent);
}
.ig-page .igs-alt--secondary {
  background: var(--accent-soft, rgba(37,99,235,.1));
  border: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igs-alt--primary .igs-title { color: #fff; }
.ig-page .igs-alt--primary .igs-body  { color: rgba(255,255,255,.85); }
.ig-page .igs-alt--secondary .igs-title { color: var(--accent); }
.ig-page .igs-alt--secondary .igs-body  { color: var(--text-secondary, #6b7280); }
.ig-page .igs-alt .igs-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.92em; font-weight: 700; margin: 0; line-height: 1.3;
}
.ig-page .igs-alt .igs-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.76em; margin: 0; line-height: 1.45;
}
`;

/* ─────────────────────────────────────────
   VARIANT RENDERERS (internal)
   Each returns an HTML string for one item.
───────────────────────────────────────── */

/** solid-boxes / solid-boxes-icons */
function renderSolidItem(item, idx, withIcons, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  const iconHtml = withIcons && item.icon ? iconImg(item.icon, 'igs-icon') : '';
  return `<div class="igs-solid">${iconHtml}<p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** outline-boxes */
function renderOutlineItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  const iconHtml = item.icon ? iconImg(item.icon, 'igs-icon') : '';
  return `<div class="igs-outline">${iconHtml}<p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** side-line */
function renderSidelineItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  return `<div class="igs-sideline"><p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** side-line-text */
function renderSidelineTextItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  return `<div class="igs-sidelinetext"><p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** top-line-text */
function renderToplineItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  return `<div class="igs-topline"><p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** top-circle */
function renderTopCircleItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  const circleContent = item.icon
    ? iconImg(item.icon, '')
    : `<span class="igs-circle-num">${idx + 1}</span>`;
  return `<div class="igs-topcircle">
  <div class="igs-circle">${circleContent}</div>
  <p class="igs-title">${title}</p>
  ${body ? `<p class="igs-body">${body}</p>` : ''}
</div>`;
}

/** leaf-boxes */
function renderLeafItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  return `<div class="igs-leaf"><p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/** labeled-boxes */
function renderLabeledItem(item, idx, density) {
  const title = esc(truncateTitle(item.title, density));
  const body  = esc(truncateBody(item.body, density));
  const tag   = esc(`0${idx + 1}`.slice(-2)); // "01", "02" etc.
  return `<div class="igs-labeled-wrap">
  <span class="igs-labeled-tag">${tag}</span>
  <div class="igs-labeled">
    <p class="igs-title">${title}</p>
    ${body ? `<p class="igs-body">${body}</p>` : ''}
  </div>
</div>`;
}

/** alternating-boxes */
function renderAltItem(item, idx, density) {
  const title     = esc(truncateTitle(item.title, density));
  const body      = esc(truncateBody(item.body, density));
  const altClass  = idx % 2 === 0 ? 'igs-alt--primary' : 'igs-alt--secondary';
  return `<div class="igs-alt ${altClass}"><p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
}

/* ─────────────────────────────────────────
   JOINED BOXES BUILDER
   Joined boxes break the standard grid: they form horizontal
   strips of N items per row with no gaps between siblings.
───────────────────────────────────────── */

function renderJoinedBoxes(items, withIcons, columns, density) {
  const rows = chunk(items, columns);
  const rowsHtml = rows.map(rowItems => {
    const cells = rowItems.map(item => {
      const title = esc(truncateTitle(item.title, density));
      const body  = esc(truncateBody(item.body, density));
      const iconHtml = withIcons && item.icon ? iconImg(item.icon, 'igs-icon') : '';
      return `<div class="igs-joined">${iconHtml}<p class="igs-title">${title}</p>${body ? `<p class="igs-body">${body}</p>` : ''}</div>`;
    }).join('');
    const hasIconsClass = withIcons ? ' igs-has-icons' : '';
    return `<div class="igs-joined-row${hasIconsClass}">${cells}</div>`;
  }).join('');
  return rowsHtml;
}

/* ─────────────────────────────────────────
   STANDARD GRID WRAPPER
   Used by all non-joined variants.
───────────────────────────────────────── */

function wrapGrid(itemsHtml, columns) {
  const colClass = `igs-grid--${Math.min(Math.max(columns, 1), 4)}`;
  return `<div class="igs-grid ${colClass}">${itemsHtml}</div>`;
}

/* ─────────────────────────────────────────
   renderBoxes — main export
   Returns a complete HTML string (no wrapping div needed).
───────────────────────────────────────── */

/**
 * Render an array of content items as one of the 12 box variants.
 *
 * @param {Array}  items    — content items: [{ title, body?, icon?, image?, data? }]
 * @param {string} variant  — one of BOX_VARIANTS
 * @param {string} tone     — 'professional' | 'bold' | 'minimal' | 'playful' (for future use)
 * @param {number} columns  — 1 | 2 | 3 | 4
 * @param {string} density  — 'compact' | 'standard' | 'detailed'
 * @returns {string} HTML string
 */
export function renderBoxes(items, variant = 'solid-boxes', tone = 'professional', columns = 3, density = 'standard') {
  if (!Array.isArray(items) || items.length === 0) {
    return '<div class="igs-grid igs-grid--1"><p style="color:var(--text-secondary)">No content items.</p></div>';
  }

  // Clamp columns
  const cols = Math.min(Math.max(Number(columns) || 3, 1), 4);

  switch (variant) {

    case 'solid-boxes': {
      const html = items.map((item, i) => renderSolidItem(item, i, false, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'solid-boxes-icons': {
      const html = items.map((item, i) => renderSolidItem(item, i, true, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'outline-boxes': {
      const html = items.map((item, i) => renderOutlineItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'side-line': {
      const html = items.map((item, i) => renderSidelineItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'side-line-text': {
      const html = items.map((item, i) => renderSidelineTextItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'top-line-text': {
      const html = items.map((item, i) => renderToplineItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'top-circle': {
      const html = items.map((item, i) => renderTopCircleItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'joined-boxes': {
      // Joined boxes form rows; column count = items per row
      return renderJoinedBoxes(items, false, cols, density);
    }

    case 'joined-boxes-icons': {
      return renderJoinedBoxes(items, true, cols, density);
    }

    case 'leaf-boxes': {
      const html = items.map((item, i) => renderLeafItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'labeled-boxes': {
      const html = items.map((item, i) => renderLabeledItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    case 'alternating-boxes': {
      const html = items.map((item, i) => renderAltItem(item, i, density)).join('');
      return wrapGrid(html, cols);
    }

    default: {
      // Unknown variant — fall back to solid-boxes
      console.warn(`[smart-layouts] Unknown variant "${variant}" — falling back to solid-boxes`);
      const html = items.map((item, i) => renderSolidItem(item, i, false, density)).join('');
      return wrapGrid(html, cols);
    }
  }
}

/* ─────────────────────────────────────────
   LAYOUT FAMILIES REGISTRY
   Maps family name → render function.
   Used by renderer.js to dispatch renderFromContent() calls.
───────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════════════
   BULLETS FAMILY
   Variants: large-bullets, small-bullets, arrow-bullets,
             process-steps, solid-box-small-bullets
═══════════════════════════════════════════════════════════════ */

export const BULLETS_CSS = `
.ig-page .igs-bullets-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
/* large-bullets */
.ig-page .igs-bl-large {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-card);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
}
.ig-page .igs-bl-large .igs-bl-dot {
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 0.2rem;
}
.ig-page .igs-bl-large .igs-bl-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text-primary);
  line-height: 1.3;
}
.ig-page .igs-bl-large .igs-bl-body {
  font-family: var(--font-body);
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
  line-height: 1.45;
}
/* small-bullets */
.ig-page .igs-bl-small {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.35rem 0.5rem;
}
.ig-page .igs-bl-small .igs-bl-dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 0.45rem;
}
.ig-page .igs-bl-small .igs-bl-title {
  font-family: var(--font-body);
  font-size: 0.88rem;
  color: var(--text-primary);
  line-height: 1.4;
}
.ig-page .igs-bl-small .igs-bl-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
/* arrow-bullets */
.ig-page .igs-bl-arrow {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.4rem 0.5rem;
}
.ig-page .igs-bl-arrow .igs-bl-arrow-icon {
  flex-shrink: 0;
  font-size: 1rem;
  color: var(--accent);
  margin-top: 0.05rem;
  font-weight: 700;
}
.ig-page .igs-bl-arrow .igs-bl-title {
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 600;
}
.ig-page .igs-bl-arrow .igs-bl-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
/* process-steps (inline numbered) */
.ig-page .igs-bl-process {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--card-bg);
  border-left: 3px solid var(--accent);
  border-radius: 0 var(--radius-card) var(--radius-card) 0;
}
.ig-page .igs-bl-process .igs-bl-num {
  flex-shrink: 0;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--accent);
  min-width: 1.5rem;
  line-height: 1;
  padding-top: 0.15rem;
}
.ig-page .igs-bl-process .igs-bl-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
}
.ig-page .igs-bl-process .igs-bl-body {
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}
/* solid-box-small-bullets */
.ig-page .igs-bl-boxsmall {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.45rem 0.65rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
}
.ig-page .igs-bl-boxsmall .igs-bl-dot {
  flex-shrink: 0;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 0.45rem;
}
.ig-page .igs-bl-boxsmall .igs-bl-title {
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
}
.ig-page .igs-bl-boxsmall .igs-bl-body {
  font-family: var(--font-body);
  font-size: 0.77rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
`;

export function renderBullets(items, variant = 'large-bullets', tone = 'professional', columns = 1, density = 'standard') {
  const rows = items.map((item, i) => {
    const title = truncateTitle(item.title || '');
    const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);

    if (variant === 'large-bullets') {
      return `<li class="igs-bl-large">
        <span class="igs-bl-dot"></span>
        <div>
          <div class="igs-bl-title">${esc(title)}</div>
          ${body ? `<div class="igs-bl-body">${esc(body)}</div>` : ''}
        </div>
      </li>`;
    }
    if (variant === 'small-bullets') {
      return `<li class="igs-bl-small">
        <span class="igs-bl-dot"></span>
        <div>
          <div class="igs-bl-title">${esc(title)}</div>
          ${body ? `<div class="igs-bl-body">${esc(body)}</div>` : ''}
        </div>
      </li>`;
    }
    if (variant === 'arrow-bullets') {
      return `<li class="igs-bl-arrow">
        <span class="igs-bl-arrow-icon">→</span>
        <div>
          <div class="igs-bl-title">${esc(title)}</div>
          ${body ? `<div class="igs-bl-body">${esc(body)}</div>` : ''}
        </div>
      </li>`;
    }
    if (variant === 'process-steps') {
      return `<li class="igs-bl-process">
        <span class="igs-bl-num">${String(i + 1).padStart(2, '0')}</span>
        <div>
          <div class="igs-bl-title">${esc(title)}</div>
          ${body ? `<div class="igs-bl-body">${esc(body)}</div>` : ''}
        </div>
      </li>`;
    }
    if (variant === 'solid-box-small-bullets') {
      return `<li class="igs-bl-boxsmall">
        <span class="igs-bl-dot"></span>
        <div>
          <div class="igs-bl-title">${esc(title)}</div>
          ${body ? `<div class="igs-bl-body">${esc(body)}</div>` : ''}
        </div>
      </li>`;
    }
    // fallback
    return `<li class="igs-bl-large">
      <span class="igs-bl-dot"></span>
      <div><div class="igs-bl-title">${esc(title)}</div></div>
    </li>`;
  });

  return `<ul class="igs-bullets-list">${rows.join('')}</ul>`;
}

/* ═══════════════════════════════════════════════════════════════
   SEQUENCE FAMILY
   Variants: timeline, minimal-timeline, minimal-timeline-boxes,
             arrows, pills, slanted-labels
═══════════════════════════════════════════════════════════════ */

export const SEQUENCE_CSS = `
/* ── shared spine ── */
.ig-page .igs-seq-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
/* timeline */
.ig-page .igs-tl-item {
  display: flex;
  gap: 0.75rem;
  position: relative;
  padding-bottom: 1.1rem;
}
.ig-page .igs-tl-spine {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 1.4rem;
}
.ig-page .igs-tl-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  margin-top: 0.25rem;
}
.ig-page .igs-tl-line {
  flex: 1;
  width: 2px;
  background: var(--accent-soft);
  margin-top: 0.2rem;
}
.ig-page .igs-tl-item:last-child .igs-tl-line {
  display: none;
}
.ig-page .igs-tl-content .igs-tl-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
}
.ig-page .igs-tl-content .igs-tl-label {
  font-family: var(--font-body);
  font-size: 0.72rem;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 0.15rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ig-page .igs-tl-content .igs-tl-body {
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
  line-height: 1.45;
}
/* minimal-timeline */
.ig-page .igs-mtl-item {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--card-border);
}
.ig-page .igs-mtl-item:last-child { border-bottom: none; }
.ig-page .igs-mtl-dot {
  flex-shrink: 0;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 0.35rem;
}
.ig-page .igs-mtl-item .igs-mtl-title {
  font-family: var(--font-body);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
}
.ig-page .igs-mtl-item .igs-mtl-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
/* minimal-timeline-boxes */
.ig-page .igs-mtlb-item {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.55rem 0.75rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  margin-bottom: 0.45rem;
}
.ig-page .igs-mtlb-dot {
  flex-shrink: 0;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 0.35rem;
}
.ig-page .igs-mtlb-item .igs-mtlb-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.ig-page .igs-mtlb-item .igs-mtlb-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}
/* arrows */
.ig-page .igs-seq-arrows {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.ig-page .igs-arrow-item {
  display: flex;
  align-items: center;
  gap: 0;
}
.ig-page .igs-arrow-block {
  flex: 1;
  background: var(--accent-soft);
  padding: 0.55rem 0.8rem;
  position: relative;
}
.ig-page .igs-arrow-item:nth-child(odd) .igs-arrow-block { background: var(--accent-soft); }
.ig-page .igs-arrow-item:nth-child(even) .igs-arrow-block { background: var(--card-bg); border: 1px solid var(--card-border); }
.ig-page .igs-arrow-sep {
  font-size: 1.1rem;
  color: var(--accent);
  padding: 0 0.35rem;
  font-weight: 700;
}
.ig-page .igs-arrow-block .igs-arrow-title {
  font-family: var(--font-heading);
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
}
.ig-page .igs-arrow-block .igs-arrow-body {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
/* pills */
.ig-page .igs-seq-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.ig-page .igs-pill {
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-family: var(--font-body);
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-primary);
  border: 1px solid var(--card-border);
}
.ig-page .igs-pill-sep {
  color: var(--accent);
  font-size: 1rem;
  font-weight: 700;
}
/* slanted-labels */
.ig-page .igs-slant-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ig-page .igs-slant-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.ig-page .igs-slant-label {
  flex-shrink: 0;
  width: 5rem;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-heading);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem 0.25rem 0.6rem;
  clip-path: polygon(0 0, calc(100% - 0.5rem) 0, 100% 50%, calc(100% - 0.5rem) 100%, 0 100%);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ig-page .igs-slant-body {
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.4;
}
.ig-page .igs-slant-sub {
  font-size: 0.77rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
`;

export function renderSequence(items, variant = 'timeline', tone = 'professional', columns = 1, density = 'standard') {
  if (variant === 'timeline') {
    const rows = items.map(item => {
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      const label = item.label || '';
      return `<li class="igs-tl-item">
        <div class="igs-tl-spine">
          <div class="igs-tl-dot"></div>
          <div class="igs-tl-line"></div>
        </div>
        <div class="igs-tl-content">
          ${label ? `<div class="igs-tl-label">${esc(label)}</div>` : ''}
          <div class="igs-tl-title">${esc(title)}</div>
          ${body ? `<div class="igs-tl-body">${esc(body)}</div>` : ''}
        </div>
      </li>`;
    });
    return `<ul class="igs-seq-list">${rows.join('')}</ul>`;
  }

  if (variant === 'minimal-timeline') {
    const rows = items.map(item => {
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<li class="igs-mtl-item">
        <span class="igs-mtl-dot"></span>
        <div>
          <div class="igs-mtl-title">${esc(title)}</div>
          ${body ? `<div class="igs-mtl-body">${esc(body)}</div>` : ''}
        </div>
      </li>`;
    });
    return `<ul class="igs-seq-list">${rows.join('')}</ul>`;
  }

  if (variant === 'minimal-timeline-boxes') {
    const rows = items.map(item => {
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-mtlb-item">
        <span class="igs-mtlb-dot"></span>
        <div>
          <div class="igs-mtlb-title">${esc(title)}</div>
          ${body ? `<div class="igs-mtlb-body">${esc(body)}</div>` : ''}
        </div>
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  if (variant === 'arrows') {
    const rows = items.map((item, i) => {
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      const sep   = i < items.length - 1 ? `<span class="igs-arrow-sep">›</span>` : '';
      return `<div class="igs-arrow-item">
        <div class="igs-arrow-block">
          <div class="igs-arrow-title">${esc(title)}</div>
          ${body ? `<div class="igs-arrow-body">${esc(body)}</div>` : ''}
        </div>
        ${sep}
      </div>`;
    });
    return `<div class="igs-seq-arrows">${rows.join('')}</div>`;
  }

  if (variant === 'pills') {
    const pills = items.map((item, i) => {
      const title = truncateTitle(item.title || '');
      const sep   = i < items.length - 1 ? `<span class="igs-pill-sep">→</span>` : '';
      return `<span class="igs-pill">${esc(title)}</span>${sep}`;
    });
    return `<div class="igs-seq-pills">${pills.join('')}</div>`;
  }

  if (variant === 'slanted-labels') {
    const rows = items.map(item => {
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-slant-item">
        <div class="igs-slant-label">${esc(title)}</div>
        <div class="igs-slant-body">${body ? `<span>${esc(body)}</span>` : ''}</div>
      </div>`;
    });
    return `<div class="igs-slant-list">${rows.join('')}</div>`;
  }

  // fallback
  return renderSequence(items, 'timeline', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   NUMBERS FAMILY
   Variants: stats, circle-stats, bar-stats, star-rating,
             dot-grid, dot-line, circle-bold-line, circle-external-line
═══════════════════════════════════════════════════════════════ */

export const NUMBERS_CSS = `
/* stats */
.ig-page .igs-stats-grid {
  display: grid;
  gap: 0.65rem;
}
.ig-page .igs-stat-item {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  padding: 0.8rem 1rem;
  text-align: center;
  box-shadow: var(--card-shadow);
}
.ig-page .igs-stat-num {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 2rem;
  color: var(--accent);
  line-height: 1.1;
}
.ig-page .igs-stat-label {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
  line-height: 1.35;
}
/* circle-stats */
.ig-page .igs-circle-stat-item {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  padding: 0.8rem 0.6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  box-shadow: var(--card-shadow);
}
.ig-page .igs-circle-stat-ring {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  border: 4px solid var(--accent);
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ig-page .igs-circle-stat-ring .igs-stat-num {
  font-size: 1rem;
  margin: 0;
}
.ig-page .igs-circle-stat-item .igs-stat-label {
  font-size: 0.72rem;
  text-align: center;
}
/* bar-stats */
.ig-page .igs-bar-stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.6rem;
}
.ig-page .igs-bar-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.ig-page .igs-bar-stat-label {
  font-family: var(--font-body);
  font-size: 0.84rem;
  color: var(--text-primary);
  font-weight: 600;
}
.ig-page .igs-bar-stat-num {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 0.88rem;
  color: var(--accent);
}
.ig-page .igs-bar-track {
  width: 100%;
  height: 0.55rem;
  background: var(--card-border);
  border-radius: 999px;
  overflow: hidden;
}
.ig-page .igs-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width 0.4s ease;
}
/* star-rating */
.ig-page .igs-star-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--card-border);
}
.ig-page .igs-star-item:last-child { border-bottom: none; }
.ig-page .igs-star-title {
  flex: 1;
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
}
.ig-page .igs-star-stars {
  display: flex;
  gap: 0.1rem;
}
.ig-page .igs-star-full { color: var(--accent); font-size: 0.9rem; }
.ig-page .igs-star-half { color: var(--accent); font-size: 0.9rem; opacity: 0.7; }
.ig-page .igs-star-empty { color: var(--card-border); font-size: 0.9rem; }
.ig-page .igs-star-score {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--accent);
  min-width: 2rem;
  text-align: right;
}
/* dot-grid */
.ig-page .igs-dotgrid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.6rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
}
.ig-page .igs-dotgrid-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem;
  justify-content: center;
  max-width: 6rem;
}
.ig-page .igs-dotgrid-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}
.ig-page .igs-dotgrid-dot.filled { background: var(--accent); }
.ig-page .igs-dotgrid-dot.empty  { background: var(--card-border); }
.ig-page .igs-dotgrid-label {
  font-family: var(--font-body);
  font-size: 0.72rem;
  color: var(--text-secondary);
  text-align: center;
}
/* dot-line */
.ig-page .igs-dotline-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}
.ig-page .igs-dotline-title {
  flex-shrink: 0;
  width: 5.5rem;
  font-family: var(--font-body);
  font-size: 0.82rem;
  color: var(--text-primary);
  font-weight: 600;
}
.ig-page .igs-dotline-dots {
  display: flex;
  gap: 0.18rem;
  flex: 1;
}
.ig-page .igs-dotline-dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
}
.ig-page .igs-dotline-dot.filled { background: var(--accent); }
.ig-page .igs-dotline-dot.empty  { background: var(--card-border); }
.ig-page .igs-dotline-num {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.78rem;
  color: var(--accent);
  min-width: 2rem;
  text-align: right;
}
/* circle-bold-line */
.ig-page .igs-cbl-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--card-border);
}
.ig-page .igs-cbl-item:last-child { border-bottom: none; }
.ig-page .igs-cbl-circle {
  flex-shrink: 0;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 50%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 0.85rem;
  color: #fff;
}
.ig-page .igs-cbl-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.ig-page .igs-cbl-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}
/* circle-external-line */
.ig-page .igs-cel-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}
.ig-page .igs-cel-circle {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: 3px solid var(--accent);
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--accent);
}
.ig-page .igs-cel-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.ig-page .igs-cel-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}
`;

function parsePercent(str) {
  if (!str) return 0;
  const m = String(str).match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : 0;
}

function parseStars(str) {
  if (!str) return 4;
  const m = String(str).match(/(\d+(?:\.\d+)?)/);
  return m ? Math.min(5, parseFloat(m[1])) : 4;
}

function renderStarHtml(score) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (score >= i)           html += `<span class="igs-star-full">★</span>`;
    else if (score >= i - 0.5) html += `<span class="igs-star-half">★</span>`;
    else                       html += `<span class="igs-star-empty">★</span>`;
  }
  return html;
}

export function renderNumbers(items, variant = 'stats', tone = 'professional', columns = 3, density = 'standard') {
  if (variant === 'stats') {
    const cols = Math.min(columns, items.length, 4);
    const cards = items.map(item => {
      const num   = item.title || '—';
      const label = density === 'compact' ? '' : truncateBody(item.body || item.label || '', density);
      return `<div class="igs-stat-item">
        <div class="igs-stat-num">${esc(num)}</div>
        ${label ? `<div class="igs-stat-label">${esc(label)}</div>` : ''}
      </div>`;
    });
    return `<div class="igs-stats-grid" style="grid-template-columns:repeat(${cols},1fr)">${cards.join('')}</div>`;
  }

  if (variant === 'circle-stats') {
    const cols = Math.min(columns, items.length, 4);
    const cards = items.map(item => {
      const num   = item.title || '—';
      const label = density === 'compact' ? '' : truncateBody(item.body || item.label || '', density);
      return `<div class="igs-circle-stat-item">
        <div class="igs-circle-stat-ring">
          <div class="igs-stat-num">${esc(num)}</div>
        </div>
        ${label ? `<div class="igs-stat-label">${esc(label)}</div>` : ''}
      </div>`;
    });
    return `<div class="igs-stats-grid" style="grid-template-columns:repeat(${cols},1fr)">${cards.join('')}</div>`;
  }

  if (variant === 'bar-stats') {
    const rows = items.map(item => {
      const label = truncateTitle(item.body || item.label || item.title || '');
      const num   = item.title || '0%';
      const pct   = parsePercent(num);
      return `<div class="igs-bar-stat-item">
        <div class="igs-bar-stat-header">
          <span class="igs-bar-stat-label">${esc(label)}</span>
          <span class="igs-bar-stat-num">${esc(num)}</span>
        </div>
        <div class="igs-bar-track">
          <div class="igs-bar-fill" style="width:${Math.min(100, pct)}%"></div>
        </div>
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  if (variant === 'star-rating') {
    const rows = items.map(item => {
      const title = truncateTitle(item.title || '');
      const score = parseStars(item.body || '4');
      return `<div class="igs-star-item">
        <span class="igs-star-title">${esc(title)}</span>
        <span class="igs-star-stars">${renderStarHtml(score)}</span>
        <span class="igs-star-score">${score.toFixed(1)}</span>
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  if (variant === 'dot-grid') {
    const cols = Math.min(columns, items.length, 4);
    const TOTAL_DOTS = 20;
    const cards = items.map(item => {
      const num   = item.title || '50%';
      const label = density === 'compact' ? '' : truncateBody(item.body || item.label || '', density);
      const pct   = parsePercent(num);
      const filled = Math.round((pct / 100) * TOTAL_DOTS);
      let dots = '';
      for (let d = 0; d < TOTAL_DOTS; d++) {
        dots += `<span class="igs-dotgrid-dot ${d < filled ? 'filled' : 'empty'}"></span>`;
      }
      return `<div class="igs-dotgrid-item">
        <div class="igs-stat-num" style="font-size:1.1rem">${esc(num)}</div>
        <div class="igs-dotgrid-dots">${dots}</div>
        ${label ? `<div class="igs-dotgrid-label">${esc(label)}</div>` : ''}
      </div>`;
    });
    return `<div class="igs-stats-grid" style="grid-template-columns:repeat(${cols},1fr)">${cards.join('')}</div>`;
  }

  if (variant === 'dot-line') {
    const DOT_COUNT = 10;
    const rows = items.map(item => {
      const label  = truncateTitle(item.body || item.label || item.title || '');
      const num    = item.title || '50%';
      const pct    = parsePercent(num);
      const filled = Math.round((pct / 100) * DOT_COUNT);
      let dots = '';
      for (let d = 0; d < DOT_COUNT; d++) {
        dots += `<span class="igs-dotline-dot ${d < filled ? 'filled' : 'empty'}"></span>`;
      }
      return `<div class="igs-dotline-item">
        <span class="igs-dotline-title">${esc(label)}</span>
        <span class="igs-dotline-dots">${dots}</span>
        <span class="igs-dotline-num">${esc(num)}</span>
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  if (variant === 'circle-bold-line') {
    const rows = items.map(item => {
      const num   = item.title || '—';
      const title = truncateTitle(item.body || item.label || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-cbl-item">
        <div class="igs-cbl-circle">${esc(num)}</div>
        <div>
          <div class="igs-cbl-title">${esc(title || num)}</div>
          ${body ? `<div class="igs-cbl-body">${esc(body)}</div>` : ''}
        </div>
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  if (variant === 'circle-external-line') {
    const rows = items.map(item => {
      const num   = item.title || '—';
      const title = truncateTitle(item.body || item.label || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-cel-item">
        <div class="igs-cel-circle">${esc(num)}</div>
        <div>
          <div class="igs-cel-title">${esc(title || num)}</div>
          ${body ? `<div class="igs-cel-body">${esc(body)}</div>` : ''}
        </div>
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  // fallback
  return renderNumbers(items, 'stats', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   CIRCLES FAMILY
   Variants: cycle, flower, circle, ring, semi-circle
═══════════════════════════════════════════════════════════════ */

export const CIRCLES_CSS = `
/* cycle */
.ig-page .igs-cycle-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.ig-page .igs-cycle-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.5rem 0.7rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
}
.ig-page .igs-cycle-step {
  flex-shrink: 0;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.1rem;
}
.ig-page .igs-cycle-arrow {
  text-align: center;
  font-size: 1rem;
  color: var(--accent);
  line-height: 1;
  padding: 0.15rem 0;
}
.ig-page .igs-cycle-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.ig-page .igs-cycle-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}
/* flower */
.ig-page .igs-flower-center {
  background: var(--accent);
  color: #fff;
  border-radius: var(--radius-card);
  padding: 0.7rem 1rem;
  text-align: center;
  margin-bottom: 0.5rem;
}
.ig-page .igs-flower-center .igs-flower-title {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1rem;
  color: #fff;
}
.ig-page .igs-flower-center .igs-flower-body {
  font-size: 0.78rem;
  color: rgba(255,255,255,0.85);
  margin-top: 0.2rem;
}
.ig-page .igs-flower-petals {
  display: grid;
  gap: 0.5rem;
}
.ig-page .igs-flower-petal {
  background: var(--accent-soft);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  padding: 0.55rem 0.7rem;
  text-align: center;
}
.ig-page .igs-flower-petal .igs-flower-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-primary);
}
.ig-page .igs-flower-petal .igs-flower-body {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
/* circle (icon-in-circle grid) */
.ig-page .igs-circle-grid {
  display: grid;
  gap: 0.65rem;
}
.ig-page .igs-circle-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.7rem 0.5rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  text-align: center;
  box-shadow: var(--card-shadow);
}
.ig-page .igs-circle-bubble {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--accent-soft);
  border: 2px solid var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--accent);
}
.ig-page .igs-circle-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-primary);
}
.ig-page .igs-circle-body {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.35;
}
/* ring */
.ig-page .igs-ring-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.ig-page .igs-ring-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.ig-page .igs-ring-bubble {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 3px solid var(--accent);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--accent);
}
.ig-page .igs-ring-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.ig-page .igs-ring-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
/* semi-circle (tiered rows) */
.ig-page .igs-semi-tier {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}
.ig-page .igs-semi-item {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  padding: 0.5rem 0.65rem;
  text-align: center;
  box-shadow: var(--card-shadow);
  flex: 1;
  max-width: 10rem;
}
.ig-page .igs-semi-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--text-primary);
}
.ig-page .igs-semi-body {
  font-family: var(--font-body);
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
`;

export function renderCircles(items, variant = 'cycle', tone = 'professional', columns = 3, density = 'standard') {
  if (variant === 'cycle') {
    const rows = items.map((item, i) => {
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      const arrow = i < items.length - 1
        ? `<div class="igs-cycle-arrow">›</div>`
        : `<div class="igs-cycle-arrow">↩</div>`;
      return `
        <div class="igs-cycle-item">
          <div class="igs-cycle-step">${i + 1}</div>
          <div>
            <div class="igs-cycle-title">${esc(title)}</div>
            ${body ? `<div class="igs-cycle-body">${esc(body)}</div>` : ''}
          </div>
        </div>
        ${arrow}`;
    });
    return `<div class="igs-cycle-list">${rows.join('')}</div>`;
  }

  if (variant === 'flower') {
    const center  = items[0];
    const petals  = items.slice(1);
    const cols    = Math.min(columns, petals.length, 3);
    const cTitle  = truncateTitle(center?.title || '');
    const cBody   = density === 'compact' ? '' : truncateBody(center?.body || '', density);
    const petalHtml = petals.map(item => {
      const t = truncateTitle(item.title || '');
      const b = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-flower-petal">
        <div class="igs-flower-title">${esc(t)}</div>
        ${b ? `<div class="igs-flower-body">${esc(b)}</div>` : ''}
      </div>`;
    }).join('');
    return `<div>
      <div class="igs-flower-center">
        <div class="igs-flower-title">${esc(cTitle)}</div>
        ${cBody ? `<div class="igs-flower-body">${esc(cBody)}</div>` : ''}
      </div>
      <div class="igs-flower-petals" style="grid-template-columns:repeat(${cols},1fr)">
        ${petalHtml}
      </div>
    </div>`;
  }

  if (variant === 'circle') {
    const cols  = Math.min(columns, items.length, 4);
    const cards = items.map((item, i) => {
      const num   = item.title || String(i + 1);
      const title = truncateTitle(item.body || item.label || item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-circle-item">
        <div class="igs-circle-bubble">${esc(num.slice(0, 4))}</div>
        <div class="igs-circle-title">${esc(title)}</div>
        ${body ? `<div class="igs-circle-body">${esc(body)}</div>` : ''}
      </div>`;
    });
    return `<div class="igs-circle-grid" style="grid-template-columns:repeat(${cols},1fr)">${cards.join('')}</div>`;
  }

  if (variant === 'ring') {
    const rows = items.map((item, i) => {
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-ring-item">
        <div class="igs-ring-bubble">${i + 1}</div>
        <div>
          <div class="igs-ring-title">${esc(title)}</div>
          ${body ? `<div class="igs-ring-body">${esc(body)}</div>` : ''}
        </div>
      </div>`;
    });
    return `<div class="igs-ring-list">${rows.join('')}</div>`;
  }

  if (variant === 'semi-circle') {
    // Tiered rows: row 0 = 1 item, row 1 = 2 items, row 2 = 3 items, etc.
    const tiers = [];
    let idx = 0;
    let rowSize = 1;
    while (idx < items.length) {
      tiers.push(items.slice(idx, idx + rowSize));
      idx += rowSize;
      rowSize++;
    }
    const tiersHtml = tiers.map(tierItems => {
      const cells = tierItems.map(item => {
        const title = truncateTitle(item.title || '');
        const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
        return `<div class="igs-semi-item">
          <div class="igs-semi-title">${esc(title)}</div>
          ${body ? `<div class="igs-semi-body">${esc(body)}</div>` : ''}
        </div>`;
      }).join('');
      return `<div class="igs-semi-tier">${cells}</div>`;
    }).join('');
    return `<div>${tiersHtml}</div>`;
  }

  // fallback
  return renderCircles(items, 'cycle', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   QUOTES FAMILY
   Variants: quote-boxes, speech-bubbles
═══════════════════════════════════════════════════════════════ */

export const QUOTES_CSS = `
/* quote-boxes */
.ig-page .igs-qbox-item {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  padding: 0.9rem 1rem;
  margin-bottom: 0.6rem;
  box-shadow: var(--card-shadow);
  position: relative;
}
.ig-page .igs-qbox-mark {
  font-size: 2.5rem;
  line-height: 1;
  color: var(--accent);
  font-family: Georgia, serif;
  position: absolute;
  top: 0.3rem;
  left: 0.6rem;
  opacity: 0.35;
  pointer-events: none;
}
.ig-page .igs-qbox-text {
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-style: italic;
  color: var(--text-primary);
  line-height: 1.55;
  padding-top: 0.5rem;
}
.ig-page .igs-qbox-attr {
  margin-top: 0.5rem;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.78rem;
  color: var(--accent);
}
/* speech-bubbles */
.ig-page .igs-bubble-item {
  display: flex;
  margin-bottom: 0.8rem;
  gap: 0.6rem;
}
.ig-page .igs-bubble-item.right {
  flex-direction: row-reverse;
}
.ig-page .igs-bubble-avatar {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.8rem;
  color: #fff;
  margin-top: 0.1rem;
}
.ig-page .igs-bubble-content {
  max-width: 80%;
}
.ig-page .igs-bubble-box {
  background: var(--accent-soft);
  border: 1px solid var(--card-border);
  border-radius: 0 var(--radius-card) var(--radius-card) var(--radius-card);
  padding: 0.55rem 0.75rem;
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.45;
  font-style: italic;
}
.ig-page .igs-bubble-item.right .igs-bubble-box {
  border-radius: var(--radius-card) 0 var(--radius-card) var(--radius-card);
  background: var(--card-bg);
}
.ig-page .igs-bubble-attr {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.72rem;
  color: var(--accent);
  margin-top: 0.2rem;
  padding-left: 0.3rem;
}
.ig-page .igs-bubble-item.right .igs-bubble-attr {
  text-align: right;
  padding-left: 0;
  padding-right: 0.3rem;
}
`;

export function renderQuotes(items, variant = 'quote-boxes', tone = 'professional', columns = 1, density = 'standard') {
  if (variant === 'quote-boxes') {
    const rows = items.map(item => {
      // item.title = attribution, item.body = quote text
      const quote = item.body || item.title || '';
      const attr  = item.title !== quote ? (item.title || '') : '';
      return `<div class="igs-qbox-item">
        <div class="igs-qbox-mark">"</div>
        <div class="igs-qbox-text">${esc(quote)}</div>
        ${attr ? `<div class="igs-qbox-attr">— ${esc(attr)}</div>` : ''}
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  if (variant === 'speech-bubbles') {
    const rows = items.map((item, i) => {
      const quote = item.body || item.title || '';
      const attr  = item.title !== quote ? (item.title || '') : '';
      const side  = i % 2 === 1 ? 'right' : '';
      const initials = attr ? attr.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : String(i + 1);
      return `<div class="igs-bubble-item ${side}">
        <div class="igs-bubble-avatar">${esc(initials)}</div>
        <div class="igs-bubble-content">
          <div class="igs-bubble-box">${esc(quote)}</div>
          ${attr ? `<div class="igs-bubble-attr">${esc(attr)}</div>` : ''}
        </div>
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  // fallback
  return renderQuotes(items, 'quote-boxes', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   STEPS FAMILY
   Variants: staircase, steps, box-steps, arrow-steps,
             steps-with-icons, pyramid, vertical-funnel
═══════════════════════════════════════════════════════════════ */

export const STEPS_CSS = `
/* staircase */
.ig-page .igs-stair-item {
  background: var(--accent-soft);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  padding: 0.55rem 0.8rem;
  margin-bottom: 0.4rem;
  opacity: 0.5;
}
.ig-page .igs-stair-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.ig-page .igs-stair-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
/* steps */
.ig-page .igs-step-item {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--card-border);
}
.ig-page .igs-step-item:last-child { border-bottom: none; }
.ig-page .igs-step-num {
  flex-shrink: 0;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ig-page .igs-step-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.ig-page .igs-step-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}
/* box-steps */
.ig-page .igs-boxstep-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  margin-bottom: 0.45rem;
  box-shadow: var(--card-shadow);
}
.ig-page .igs-boxstep-num {
  flex-shrink: 0;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ig-page .igs-boxstep-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.ig-page .igs-boxstep-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}
/* arrow-steps */
.ig-page .igs-arrowstep-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.ig-page .igs-arrowstep-item {
  display: flex;
  align-items: center;
  padding: 0.55rem 0.9rem 0.55rem 1.3rem;
  background: var(--accent-soft);
  border: 1px solid var(--card-border);
  margin-bottom: 0.25rem;
  clip-path: polygon(0 0, calc(100% - 0.7rem) 0, 100% 50%, calc(100% - 0.7rem) 100%, 0 100%, 0.7rem 50%);
  position: relative;
}
.ig-page .igs-arrowstep-item:first-child {
  clip-path: polygon(0 0, calc(100% - 0.7rem) 0, 100% 50%, calc(100% - 0.7rem) 100%, 0 100%);
  padding-left: 0.9rem;
}
.ig-page .igs-arrowstep-item:nth-child(even) {
  background: var(--card-bg);
}
.ig-page .igs-arrowstep-num {
  flex-shrink: 0;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 0.8rem;
  color: var(--accent);
  margin-right: 0.5rem;
}
.ig-page .igs-arrowstep-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text-primary);
}
.ig-page .igs-arrowstep-body {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
/* steps-with-icons */
.ig-page .igs-stepicon-item {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--card-border);
}
.ig-page .igs-stepicon-item:last-child { border-bottom: none; }
.ig-page .igs-stepicon-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  background: var(--accent-soft);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.ig-page .igs-stepicon-icon img,
.ig-page .igs-stepicon-icon svg {
  display: block;
  width: 1.3rem;
  height: 1.3rem;
  object-fit: contain;
}
.ig-page .igs-stepicon-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.ig-page .igs-stepicon-body {
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}
/* pyramid */
.ig-page .igs-pyramid-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}
.ig-page .igs-pyramid-item {
  background: var(--accent-soft);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  padding: 0.5rem 0.7rem;
  text-align: center;
  transition: width 0.3s;
}
.ig-page .igs-pyramid-item .igs-pyramid-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-primary);
}
.ig-page .igs-pyramid-item .igs-pyramid-body {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
/* vertical-funnel */
.ig-page .igs-funnel-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}
.ig-page .igs-funnel-item {
  background: var(--accent);
  padding: 0.5rem 0.7rem;
  text-align: center;
  margin-bottom: 0.25rem;
  border-radius: var(--radius-card);
  transition: width 0.3s;
  opacity: 0.85;
}
.ig-page .igs-funnel-item:nth-child(even) { opacity: 0.7; }
.ig-page .igs-funnel-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.88rem;
  color: #fff;
}
.ig-page .igs-funnel-body {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: rgba(255,255,255,0.85);
  margin-top: 0.1rem;
}
`;

export function renderSteps(items, variant = 'steps', tone = 'professional', columns = 1, density = 'standard') {
  if (variant === 'staircase') {
    const n   = items.length || 1;
    const minW = 30;
    const rows = items.map((item, i) => {
      const pct   = Math.round(minW + (i / Math.max(n - 1, 1)) * (100 - minW));
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      // opacity increases with each step
      const opacity = (0.4 + (i / Math.max(n - 1, 1)) * 0.6).toFixed(2);
      return `<div class="igs-stair-item" style="width:${pct}%;opacity:${opacity}">
        <div class="igs-stair-title">${esc(title)}</div>
        ${body ? `<div class="igs-stair-body">${esc(body)}</div>` : ''}
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  if (variant === 'steps') {
    const rows = items.map((item, i) => {
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-step-item">
        <div class="igs-step-num">${i + 1}</div>
        <div>
          <div class="igs-step-title">${esc(title)}</div>
          ${body ? `<div class="igs-step-body">${esc(body)}</div>` : ''}
        </div>
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  if (variant === 'box-steps') {
    const rows = items.map((item, i) => {
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-boxstep-item">
        <div class="igs-boxstep-num">${i + 1}</div>
        <div>
          <div class="igs-boxstep-title">${esc(title)}</div>
          ${body ? `<div class="igs-boxstep-body">${esc(body)}</div>` : ''}
        </div>
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  if (variant === 'arrow-steps') {
    const rows = items.map((item, i) => {
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-arrowstep-item">
        <span class="igs-arrowstep-num">${String(i + 1).padStart(2, '0')}</span>
        <div>
          <div class="igs-arrowstep-title">${esc(title)}</div>
          ${body ? `<div class="igs-arrowstep-body">${esc(body)}</div>` : ''}
        </div>
      </div>`;
    });
    return `<div class="igs-arrowstep-list">${rows.join('')}</div>`;
  }

  if (variant === 'steps-with-icons') {
    const rows = items.map(item => {
      const title    = truncateTitle(item.title || '');
      const body     = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-stepicon-item">
        <div class="igs-stepicon-icon">
          ${iconImg(item.icon || 'star', '')}
        </div>
        <div>
          <div class="igs-stepicon-title">${esc(title)}</div>
          ${body ? `<div class="igs-stepicon-body">${esc(body)}</div>` : ''}
        </div>
      </div>`;
    });
    return `<div>${rows.join('')}</div>`;
  }

  if (variant === 'pyramid') {
    // first item = apex (narrowest), last = base (widest)
    const n    = items.length || 1;
    const minW = 25;
    const rows = items.map((item, i) => {
      const pct   = Math.round(minW + (i / Math.max(n - 1, 1)) * (100 - minW));
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-pyramid-item" style="width:${pct}%">
        <div class="igs-pyramid-title">${esc(title)}</div>
        ${body ? `<div class="igs-pyramid-body">${esc(body)}</div>` : ''}
      </div>`;
    });
    return `<div class="igs-pyramid-list">${rows.join('')}</div>`;
  }

  if (variant === 'vertical-funnel') {
    // first item = widest (top), last = narrowest (bottom)
    const n    = items.length || 1;
    const minW = 30;
    const rows = items.map((item, i) => {
      const pct   = Math.round(100 - (i / Math.max(n - 1, 1)) * (100 - minW));
      const title = truncateTitle(item.title || '');
      const body  = density === 'compact' ? '' : truncateBody(item.body || '', density);
      return `<div class="igs-funnel-item" style="width:${pct}%">
        <div class="igs-funnel-title">${esc(title)}</div>
        ${body ? `<div class="igs-funnel-body">${esc(body)}</div>` : ''}
      </div>`;
    });
    return `<div class="igs-funnel-list">${rows.join('')}</div>`;
  }

  // fallback
  return renderSteps(items, 'steps', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   LAYOUT FAMILIES REGISTRY
═══════════════════════════════════════════════════════════════ */

export const LAYOUT_FAMILIES = {
  boxes:    renderBoxes,
  bullets:  renderBullets,
  sequence: renderSequence,
  numbers:  renderNumbers,
  circles:  renderCircles,
  quotes:   renderQuotes,
  steps:    renderSteps,
};

/* Variant → family lookup map */
const VARIANT_FAMILY_MAP = {
  // boxes
  'solid-boxes':           'boxes',
  'solid-boxes-icons':     'boxes',
  'outline-boxes':         'boxes',
  'side-line':             'boxes',
  'side-line-text':        'boxes',
  'top-line-text':         'boxes',
  'top-circle':            'boxes',
  'joined-boxes':          'boxes',
  'joined-boxes-icons':    'boxes',
  'leaf-boxes':            'boxes',
  'labeled-boxes':         'boxes',
  'alternating-boxes':     'boxes',
  // bullets
  'large-bullets':             'bullets',
  'small-bullets':             'bullets',
  'arrow-bullets':             'bullets',
  'process-steps':             'bullets',
  'solid-box-small-bullets':   'bullets',
  // sequence
  'timeline':                  'sequence',
  'minimal-timeline':          'sequence',
  'minimal-timeline-boxes':    'sequence',
  'arrows':                    'sequence',
  'pills':                     'sequence',
  'slanted-labels':            'sequence',
  // numbers
  'stats':                     'numbers',
  'circle-stats':              'numbers',
  'bar-stats':                 'numbers',
  'star-rating':               'numbers',
  'dot-grid':                  'numbers',
  'dot-line':                  'numbers',
  'circle-bold-line':          'numbers',
  'circle-external-line':      'numbers',
  // circles
  'cycle':                     'circles',
  'flower':                    'circles',
  'circle':                    'circles',
  'ring':                      'circles',
  'semi-circle':               'circles',
  // quotes
  'quote-boxes':               'quotes',
  'speech-bubbles':            'quotes',
  // steps
  'staircase':                 'steps',
  'steps':                     'steps',
  'box-steps':                 'steps',
  'arrow-steps':               'steps',
  'steps-with-icons':          'steps',
  'pyramid':                   'steps',
  'vertical-funnel':           'steps',
};

/**
 * Render a section using the appropriate family render function.
 * Dispatches by variant name via VARIANT_FAMILY_MAP.
 * Falls back to solid-boxes if variant is unrecognised.
 *
 * @param {object} section — content group from content-v1 JSON
 *   { archetype, items, variant?, columns?, style? }
 * @param {string} tone
 * @returns {string} HTML string
 */
export function renderSection(section, tone = 'professional') {
  const { items = [], variant = 'solid-boxes', columns = 3, style: density = 'standard' } = section;
  const family = VARIANT_FAMILY_MAP[variant];
  const fn = family ? LAYOUT_FAMILIES[family] : null;
  if (fn) return fn(items, variant, tone, columns, density);
  // Try diagram families before falling back to solid-boxes
  const diagramHtml = renderDiagramSection(section, tone);
  if (diagramHtml !== null) return diagramHtml;
  return renderBoxes(items, 'solid-boxes', tone, columns, density);
}
