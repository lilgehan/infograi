/**
 * Infogr.ai v3 — Renderer
 *
 * fillTemplate(json, layoutId, tone) → HTML string       [legacy template path]
 * renderFromContent(contentJson, tone, size, accentColor) [content-v1 path — Phase 2]
 *
 * The single function that turns AI-generated JSON into a ready-to-render
 * infographic HTML string.
 *
 * INTEGRATION NOTE:
 * This file uses fetch() to load templates at runtime (no bundler required).
 * Templates are served as static files from /v3/templates/{layoutId}/template.html
 * by Vercel, just like any other static asset.
 *
 * When integrating into app.js: call `await initRenderer()` once on startup
 * to pre-cache templates, then call `fillTemplate(json, layoutId, tone)` synchronously.
 *
 * Legacy path:   'mixed-grid', 'steps-guide'  → fillTemplate()
 * Content-v1:    format:'content-v1'           → renderFromContent()
 */

import { renderSection, BOXES_CSS } from './smart-layouts.js';
import { GRID_CSS, clampColumns }    from './grid.js';

/* ── Template cache (populated by initRenderer / loadTemplate) ── */
const TEMPLATES = {};

/* ── Local SVG map — 25 critical icons embedded as data URIs ──
   These load instantly with zero network requests, zero CORS issues.
   Matches the LOCAL_ICON_SVGS map in app.js.
── */
const LOCAL_SVG_MAP = {
  'folder':         `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M4 14a4 4 0 0 1 4-4h10l4 4h22a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#FFA726"/><path d="M4 20h40v14a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#FFB74D"/></svg>`,
  'gear':           `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#607D8B" d="M39 21.5l-2.2-.4c-.3-1-.7-1.9-1.3-2.8l1.3-1.8c.4-.5.3-1.2-.2-1.7l-2.8-2.8c-.5-.4-1.2-.4-1.7-.1l-1.8 1.3c-.9-.5-1.8-1-2.8-1.3l-.4-2.2C26.8 9 26.2 8.5 25.5 8.5h-4c-.7 0-1.3.5-1.4 1.2l-.4 2.2c-1 .3-1.9.8-2.8 1.3l-1.8-1.3c-.5-.3-1.2-.3-1.7.1l-2.8 2.8c-.5.5-.5 1.2-.2 1.7l1.3 1.8c-.5.9-1 1.8-1.3 2.8l-2.2.4C9 21.7 8.5 22.3 8.5 23v4c0 .7.5 1.3 1.2 1.4l2.2.4c.3 1 .8 1.9 1.3 2.8l-1.3 1.8c-.3.5-.3 1.2.2 1.7l2.8 2.8c.5.4 1.2.4 1.7.1l1.8-1.3c.9.5 1.8 1 2.8 1.3l.4 2.2c.2.7.7 1.2 1.4 1.2h4c.7 0 1.3-.5 1.4-1.2l.4-2.2c1-.3 1.9-.8 2.8-1.3l1.8 1.3c.5.3 1.2.3 1.7-.1l2.8-2.8c.5-.5.5-1.2.2-1.7l-1.3-1.8c.5-.9 1-1.8 1.3-2.8l2.2-.4c.7-.2 1.2-.7 1.2-1.4v-4c0-.7-.5-1.3-1.1-1.5z"/><circle cx="24" cy="25" r="5.5" fill="#B0BEC5"/></svg>`,
  'settings':       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#607D8B" d="M39 21.5l-2.2-.4c-.3-1-.7-1.9-1.3-2.8l1.3-1.8c.4-.5.3-1.2-.2-1.7l-2.8-2.8c-.5-.4-1.2-.4-1.7-.1l-1.8 1.3c-.9-.5-1.8-1-2.8-1.3l-.4-2.2C26.8 9 26.2 8.5 25.5 8.5h-4c-.7 0-1.3.5-1.4 1.2l-.4 2.2c-1 .3-1.9.8-2.8 1.3l-1.8-1.3c-.5-.3-1.2-.3-1.7.1l-2.8 2.8c-.5.5-.5 1.2-.2 1.7l1.3 1.8c-.5.9-1 1.8-1.3 2.8l-2.2.4C9 21.7 8.5 22.3 8.5 23v4c0 .7.5 1.3 1.2 1.4l2.2.4c.3 1 .8 1.9 1.3 2.8l-1.3 1.8c-.3.5-.3 1.2.2 1.7l2.8 2.8c.5.4 1.2.4 1.7.1l1.8-1.3c.9.5 1.8 1 2.8 1.3l.4 2.2c.2.7.7 1.2 1.4 1.2h4c.7 0 1.3-.5 1.4-1.2l.4-2.2c1-.3 1.9-.8 2.8-1.3l1.8 1.3c.5.3 1.2.3 1.7-.1l2.8-2.8c.5-.5.5-1.2.2-1.7l-1.3-1.8c.5-.9 1-1.8 1.3-2.8l2.2-.4c.7-.2 1.2-.7 1.2-1.4v-4c0-.7-.5-1.3-1.1-1.5z"/><circle cx="24" cy="25" r="5.5" fill="#90A4AE"/></svg>`,
  'home':           `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6L4 22h7v18h10v-10h6v10h10V22h7z" fill="#42A5F5"/><rect x="18" y="30" width="12" height="10" fill="#1976D2"/></svg>`,
  'brain':          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><ellipse cx="17" cy="23" rx="9" ry="13" fill="#CE93D8"/><ellipse cx="31" cy="23" rx="9" ry="13" fill="#BA68C8"/><rect x="22" y="10" width="4" height="26" rx="2" fill="#F3E5F5"/><circle cx="15" cy="17" r="3" fill="#9C27B0" opacity="0.7"/><circle cx="33" cy="19" r="3" fill="#7B1FA2" opacity="0.7"/></svg>`,
  'rocket':         `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 4C16 12 12 22 14 30l4 4c8 2 18-2 26-10C44 12 36 4 24 4z" fill="#5C6BC0"/><circle cx="28" cy="20" r="4" fill="#E8EAF6"/><path d="M14 30c-4 0-8 4-10 8l4 2 2 4c4-2 8-6 8-10z" fill="#EF9A9A"/></svg>`,
  'briefcase':      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="18" width="32" height="22" rx="3" fill="#8D6E63"/><path d="M17 18v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" fill="none" stroke="#5D4037" stroke-width="2.5"/><rect x="8" y="28" width="32" height="3" fill="#6D4C41"/><rect x="21" y="25" width="6" height="7" rx="1" fill="#A1887F"/></svg>`,
  'database':       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><ellipse cx="24" cy="12" rx="14" ry="5" fill="#64B5F6"/><path d="M10 12v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8c0 2.8-6.3 5-14 5s-14-2.2-14-5z" fill="#2196F3"/><path d="M10 20v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8c0 2.8-6.3 5-14 5s-14-2.2-14-5z" fill="#1976D2"/><path d="M10 28v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8c0 2.8-6.3 5-14 5s-14-2.2-14-5z" fill="#1565C0"/></svg>`,
  'search':         `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="20" cy="20" r="12" fill="none" stroke="#78909C" stroke-width="4"/><line x1="30" y1="30" x2="42" y2="42" stroke="#546E7A" stroke-width="4.5" stroke-linecap="round"/></svg>`,
  'mail':           `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="6" y="12" width="36" height="26" rx="3" fill="#64B5F6"/><path d="M6 15l18 13 18-13" stroke="#1976D2" stroke-width="2" fill="none"/><path d="M6 15l18 13L42 15H6z" fill="#90CAF9"/></svg>`,
  'smartphone':     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="13" y="4" width="22" height="40" rx="4" fill="#546E7A"/><rect x="16" y="9" width="16" height="25" fill="#B0BEC5"/><circle cx="24" cy="40" r="2.5" fill="#90A4AE"/></svg>`,
  'cloud-storage':  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M38 22a10 10 0 0 0-19.6-2.8A8 8 0 0 0 10 27a8 8 0 0 0 8 8h20a8 8 0 0 0 0-16z" fill="#42A5F5"/><path d="M30 31l-6 6-6-6" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="24" y1="37" x2="24" y2="26" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  'shield':         `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 4L8 10v14c0 10.5 7 18 16 20 9-2 16-9.5 16-20V10z" fill="#42A5F5"/><path d="M16 25l5 5 11-12" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'calendar-3':     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="6" y="10" width="36" height="32" rx="3" fill="#EF5350"/><rect x="6" y="10" width="36" height="14" rx="3" fill="#E53935"/><circle cx="16" cy="8" r="3" fill="#B71C1C"/><circle cx="32" cy="8" r="3" fill="#B71C1C"/><rect x="11" y="28" width="6" height="5" rx="1" fill="white" opacity="0.85"/><rect x="21" y="28" width="6" height="5" rx="1" fill="white" opacity="0.85"/><rect x="31" y="28" width="6" height="5" rx="1" fill="white" opacity="0.85"/></svg>`,
  'chart-increasing':`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="5" y="30" width="8" height="12" rx="1.5" fill="#A5D6A7"/><rect x="15" y="22" width="8" height="20" rx="1.5" fill="#66BB6A"/><rect x="25" y="14" width="8" height="28" rx="1.5" fill="#43A047"/><rect x="35" y="6" width="8" height="36" rx="1.5" fill="#2E7D32"/><line x1="3" y1="44" x2="47" y2="44" stroke="#1B5E20" stroke-width="2" stroke-linecap="round"/></svg>`,
  'star':           `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 5l5.3 10.7 11.8 1.7-8.5 8.3 2 11.8L24 32l-10.6 5.5 2-11.8L7 17.4l11.8-1.7z" fill="#FFC107" stroke="#FF8F00" stroke-width="0.5"/></svg>`,
  'key':            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="16" cy="20" r="10" fill="none" stroke="#FFC107" stroke-width="4"/><line x1="24" y1="25" x2="43" y2="44" stroke="#FF8F00" stroke-width="4.5" stroke-linecap="round"/><line x1="36" y1="37" x2="36" y2="43" stroke="#FF8F00" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  'lock':           `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="10" y="22" width="28" height="22" rx="3" fill="#42A5F5"/><path d="M16 22v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#1976D2" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="32" r="3" fill="#1565C0"/></svg>`,
  'user-group':     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="16" cy="15" r="7" fill="#64B5F6"/><path d="M4 38c0-6.6 5.4-12 12-12 6.6 0 12 5.4 12 12" fill="#42A5F5"/><circle cx="34" cy="13" r="6" fill="#90CAF9"/><path d="M28 36c0-5 3.1-9.3 7.5-11.1A12.2 12.2 0 0 1 46 36" fill="#64B5F6"/></svg>`,
  'idea':           `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6a13 13 0 0 0-6 24.5V36h12v-5.5A13 13 0 0 0 24 6z" fill="#FFD54F"/><rect x="18" y="36" width="12" height="3" rx="1.5" fill="#FF8F00"/><rect x="19.5" y="39" width="9" height="3" rx="1.5" fill="#FF8F00"/></svg>`,
  'target':         `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="14" fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="8" fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="3" fill="#EF5350"/></svg>`,
  'checklist':      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="3" fill="#E3F2FD"/><path d="M13 19l4 4 8-8" stroke="#1976D2" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="13" y="28" width="3" height="3" rx="1" fill="#42A5F5"/><rect x="13" y="34" width="3" height="3" rx="1" fill="#42A5F5"/><line x1="19" y1="29.5" x2="35" y2="29.5" stroke="#90CAF9" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="35.5" x2="30" y2="35.5" stroke="#90CAF9" stroke-width="2" stroke-linecap="round"/></svg>`,
  'dollar-coin':    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FFC107"/><circle cx="24" cy="24" r="16" fill="#FFD54F"/><text x="24" y="31" text-anchor="middle" font-size="20" font-weight="bold" fill="#E65100" font-family="sans-serif">$</text></svg>`,
  'lightning-bolt': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M28 4L10 28h14l-4 16 18-24H24z" fill="#FFC107" stroke="#FF8F00" stroke-width="1" stroke-linejoin="round"/></svg>`,
  'checkmark':      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#4CAF50"/><path d="M14 25l7 7 13-14" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

/**
 * Returns the best src for an icon: local inline SVG data URI if available,
 * otherwise the Icons8 proxy URL. Zero CORS, zero external dependency for local icons.
 */
function localSvgDataUri(name) {
  const svg = LOCAL_SVG_MAP[name];
  if (!svg) return null;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* ── Icons8 proxy helper ── */
const PROXY_BASE = '/api/proxy?url=';
const ICONS8_BASE = 'https://img.icons8.com/3d-fluency';

// Fallback shown when an Icons8 icon name doesn't exist — a neutral gray circle
const ICON_FALLBACK_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='24' cy='24' r='6' fill='%23cbd5e1'/%3E%3C/svg%3E";

function iconUrl(name, size = 96) {
  // Use local SVG if available — instant load, no proxy needed
  const local = localSvgDataUri(name);
  if (local) return local;
  // Fall back to proxied Icons8 URL
  const raw = `${ICONS8_BASE}/${size}/${name}.png`;
  return `${PROXY_BASE}${encodeURIComponent(raw)}`;
}

/**
 * Render an icon as inline SVG (for local icons) or <img> (for proxy icons).
 * Inline SVG is 100% reliable — no network, no CSP issues, no onerror.
 *
 * @param {string} name      — icon name (e.g. 'folder')
 * @param {string} cssClass  — CSS class to apply to the element
 * @param {number} [px]      — display size in px
 * @returns {string} HTML string
 */
function renderIconHtml(name, cssClass, px = 40) {
  const svgStr = LOCAL_SVG_MAP[name];
  if (svgStr) {
    // Inject inline SVG — replace opening <svg tag to add class + size attributes
    return svgStr.replace(
      '<svg ',
      `<svg class="${cssClass}" width="${px}" height="${px}" aria-label="${escapeHtml(name)}" data-icon="true" data-icon-name="${escapeHtml(name)}" `
    );
  }
  // Remote icon — proxied Icons8 URL with graceful onerror fallback
  const src = `${PROXY_BASE}${encodeURIComponent(`${ICONS8_BASE}/${px}/${name}.png`)}`;
  return `<img class="${cssClass}" src="${src}" alt="${escapeHtml(name)}" width="${px}" height="${px}" data-icon="true" data-icon-name="${escapeHtml(name)}" onerror="this.onerror=null;this.src='${ICON_FALLBACK_SRC}'" />`;
}

/* ── Slot helpers ── */

/** Set innerHTML for a data-slot element. Safe no-op if slot not found. */
function fillSlot(doc, slotName, html) {
  const el = doc.querySelector(`[data-slot="${slotName}"]`);
  if (!el) return;
  el.innerHTML = html ?? '';
}

/** Set textContent for a data-slot element. */
function fillSlotText(doc, slotName, text) {
  const el = doc.querySelector(`[data-slot="${slotName}"]`);
  if (!el) return;
  el.textContent = text ?? '';
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────────
   MIXED-GRID slot renderers
───────────────────────────────────────── */

function renderStat(stat) {
  const iconHtml = renderIconHtml(stat.icon, 'ig-stat-icon', 28);
  return `<div class="ig-stat">
    <div class="ig-stat-icon-wrap">
      ${iconHtml}
    </div>
    <div class="ig-stat-text">
      <div class="ig-stat-num">${escapeHtml(stat.number)}</div>
      <div class="ig-stat-label">${escapeHtml(stat.label)}</div>
    </div>
  </div>`;
}

/**
 * Compute the card density class for a given size + tone + AI hint.
 *
 * Priority: AI-declared card_density (if valid) → size constraint → tone preference.
 *
 * Geometry rationale (bullets-container px available per bullet):
 *   A4 portrait  → ~261px → 4.6 lines/bullet  → standard (3 lines) or detailed (4)
 *   9:16 portrait→ ~500px → 9+ lines/bullet   → detailed (4 lines)
 *   1:1 square   → ~120px → 1.8 lines/bullet  → compact  (1 line)
 *   16:9 landscape→~144px → 2.5 lines/bullet  → standard (CSS caps at 2 lines via landscape override)
 *
 * @param {object} json    - parsed AI JSON (may contain card_density hint)
 * @param {string} sizeId  - 'a4'|'portrait'|'square'|'landscape'
 * @param {string} toneId  - 'professional'|'bold'|'minimal'|'playful'
 * @returns {'compact'|'standard'|'detailed'}
 */
function computeCardDensity(json, sizeId, toneId) {
  const VALID = ['compact', 'standard', 'detailed'];

  // Honour AI-declared density if it passes validation
  if (VALID.includes(json.card_density)) return json.card_density;

  // Size constraints take absolute priority (geometry doesn't change with tone)
  if (sizeId === 'square') return 'compact';
  // Landscape: ~2.5 lines fit, but CSS `.ig-page[data-size="landscape"] .ig-card-bullet`
  // (specificity 0,3,0) caps standard bullets at 2 lines — no extra class needed.
  if (sizeId === 'landscape') return 'standard';

  // Portrait has lots of vertical room
  if (sizeId === 'portrait') {
    return (toneId === 'minimal') ? 'standard' : 'detailed';
  }

  // A4: default by tone
  // minimal = intentional whitespace; professional/bold/playful = rich content
  return (toneId === 'minimal') ? 'compact' : 'standard';
}

function renderCard(card, density = 'standard') {
  const iconHtml = renderIconHtml(card.icon, 'ig-card-icon', 40);
  const bullets  = (card.bullets ?? [])
    .map(b => `<li class="ig-card-bullet">${escapeHtml(b)}</li>`)
    .join('');

  return `<div class="ig-card ig-card--${density}">
    <div class="ig-card-icon-wrap">
      ${iconHtml}
    </div>
    <div class="ig-card-title">${escapeHtml(card.title)}</div>
    <ul class="ig-card-bullets">${bullets}</ul>
  </div>`;
}

/* ─────────────────────────────────────────
   STEPS-GUIDE slot renderers
───────────────────────────────────────── */

function renderStep(step, idx) {
  const iconHtml = renderIconHtml(step.icon, 'ig-step-icon', 26);
  return `<div class="ig-step">
    <div class="ig-step-num">${escapeHtml(String(step.number ?? idx + 1))}</div>
    <div class="ig-step-icon-wrap">
      ${iconHtml}
    </div>
    <div class="ig-step-body">
      <div class="ig-step-title">${escapeHtml(step.title)}</div>
      <div class="ig-step-body-text">${escapeHtml(step.body)}</div>
    </div>
  </div>`;
}

/* ─────────────────────────────────────────
   TONE APPLICATION
───────────────────────────────────────── */

const TONE_ACCENT_DEFAULTS = {
  professional: '#2563EB',
  bold:         '#F59E0B',
  minimal:      '#0F766E',
  playful:      '#7C3AED',
};

function applyTone(doc, tone, accentOverride) {
  const page = doc.querySelector('.ig-page');
  if (!page) return;

  page.setAttribute('data-tone', tone || 'professional');

  // Inject --accent override if user changed the accent picker
  if (accentOverride) {
    const hex = accentOverride.replace('#', '');
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);

    const style = doc.createElement('style');
    style.textContent = `:root { --accent: ${accentOverride}; --accent-soft: rgba(${r},${g},${b},0.08); }`;
    doc.head.appendChild(style);
  }
}

/* ─────────────────────────────────────────
   SIZE APPLICATION
───────────────────────────────────────── */

function applySize(doc, size) {
  const page = doc.querySelector('.ig-page');
  if (!page) return;
  page.setAttribute('data-size', size || 'a4');
}

/* ─────────────────────────────────────────
   CORE: fillTemplate
───────────────────────────────────────── */

/**
 * Fill a v3 template with AI-generated JSON content.
 *
 * @param {object} json          — parsed AI output (matches layout schema)
 * @param {string} [layoutId]    — 'mixed-grid' | 'steps-guide' | ... (falls back to json.layout)
 * @param {string} [tone]        — 'professional' | 'bold' | 'minimal' | 'playful' (falls back to json.tone)
 * @param {string} [size]        — 'a4' | 'portrait' | 'square' | 'landscape' (falls back to json.size)
 * @param {string} [accentColor] — hex color override for --accent (e.g. '#E11D48')
 * @returns {string} Complete HTML string ready for srcdoc
 */
export function fillTemplate(json, layoutId, tone, size, accentColor) {
  const layout    = layoutId  || json.layout  || 'mixed-grid';
  const toneId    = tone      || json.tone    || 'professional';
  const sizeId    = size      || json.size    || 'a4';

  const templateHTML = TEMPLATES[layout];
  if (!templateHTML) {
    throw new Error(`[v3 renderer] Unknown layout: "${layout}". Available: ${Object.keys(TEMPLATES).join(', ')}`);
  }

  // Parse template into a DOM document
  const parser = new DOMParser();
  const doc    = parser.parseFromString(templateHTML, 'text/html');

  // Apply tone + size attributes
  applyTone(doc, toneId, accentColor);
  applySize(doc, sizeId);

  // ── Fill layout: MIXED-GRID ──
  if (layout === 'mixed-grid') {
    fillSlotText(doc, 'label',    json.label    || '');
    fillSlotText(doc, 'title',    json.title    || '');
    fillSlotText(doc, 'subtitle', json.subtitle || '');

    // Hero icon
    const heroEl = doc.querySelector('[data-slot="hero-icon"]');
    if (heroEl && json.hero_icon) {
      heroEl.src = iconUrl(json.hero_icon, 128);
      heroEl.alt = json.hero_icon;
      heroEl.setAttribute('data-icon-name', json.hero_icon);
      heroEl.setAttribute('data-icon', 'true');  // ← makes it selectable by the object editor
      heroEl.setAttribute('onerror', `this.onerror=null;this.src='${ICON_FALLBACK_SRC}'`);
    }

    // Stats row (3 items)
    if (json.stats?.length) {
      fillSlot(doc, 'stats-loop', json.stats.map(renderStat).join(''));
    }

    // Cards grid (3 items) — density class applied per card
    if (json.cards?.length) {
      const density = computeCardDensity(json, sizeId, toneId);
      fillSlot(doc, 'cards-loop', json.cards.map(c => renderCard(c, density)).join(''));
    }

    // Callout
    if (json.callout) {
      fillSlotText(doc, 'callout-title', json.callout.title);
      fillSlotText(doc, 'callout-body',  json.callout.body);
    }

    // Footer
    fillSlotText(doc, 'footer-brand', json.footer_brand || 'Infogr.ai');
  }

  // ── Fill layout: STEPS-GUIDE ──
  else if (layout === 'steps-guide') {
    fillSlotText(doc, 'label',    json.label    || '');
    fillSlotText(doc, 'title',    json.title    || '');
    fillSlotText(doc, 'subtitle', json.subtitle || '');

    // Hero icon
    const heroEl = doc.querySelector('[data-slot="hero-icon"]');
    if (heroEl && json.hero_icon) {
      heroEl.src = iconUrl(json.hero_icon, 128);
      heroEl.alt = json.hero_icon;
      heroEl.setAttribute('data-icon-name', json.hero_icon);
      heroEl.setAttribute('data-icon', 'true');  // ← makes it selectable by the object editor
      heroEl.setAttribute('onerror', `this.onerror=null;this.src='${ICON_FALLBACK_SRC}'`);
    }

    // Steps loop
    if (json.sections?.length) {
      fillSlot(doc, 'steps-loop',
        json.sections.map((s, i) => renderStep(s, i)).join(''));
    }

    // Stats (optional)
    if (json.stats?.length) {
      fillSlot(doc, 'stats-loop', json.stats.map(renderStat).join(''));
    }

    // Callout (optional)
    if (json.callout) {
      fillSlotText(doc, 'callout-title', json.callout.title);
      fillSlotText(doc, 'callout-body',  json.callout.body);
    }

    // Footer
    fillSlotText(doc, 'footer-brand', json.footer_brand || 'Infogr.ai');
  }

  // Return the complete filled HTML
  return doc.documentElement.outerHTML;
}

/* ─────────────────────────────────────────
   EXPORTS
───────────────────────────────────────── */

/* ─────────────────────────────────────────
   TEMPLATE LOADING (fetch-based, no bundler)
───────────────────────────────────────── */

const TEMPLATE_BASE_PATH = '/v3/templates';

/**
 * Fetch a single template and cache it.
 * @param {string} layoutId
 * @returns {Promise<string>} template HTML string
 */
async function loadTemplate(layoutId) {
  if (TEMPLATES[layoutId]) return TEMPLATES[layoutId];

  const url = `${TEMPLATE_BASE_PATH}/${layoutId}/template.html`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`[v3 renderer] Could not load template "${layoutId}" from ${url}`);
  const html = await resp.text();
  TEMPLATES[layoutId] = html;
  return html;
}

/**
 * Pre-cache all Phase 1 templates on startup.
 * Call once in app.js: `await initRenderer();`
 * After this, fillTemplate() can be called synchronously.
 */
export async function initRenderer() {
  await Promise.all([
    loadTemplate('mixed-grid'),
    loadTemplate('steps-guide'),
  ]);
}

/**
 * fillTemplateAsync — awaits template load if not yet cached.
 * Use this instead of fillTemplate() if initRenderer() wasn't called first.
 *
 * @param {object} json
 * @param {string} [layoutId]
 * @param {string} [tone]
 * @param {string} [size]
 * @param {string} [accentColor]
 * @returns {Promise<string>} filled HTML
 */
export async function fillTemplateAsync(json, layoutId, tone, size, accentColor) {
  const layout = layoutId || json.layout || 'mixed-grid';
  await loadTemplate(layout);
  return fillTemplate(json, layoutId, tone, size, accentColor);
}

/* ─────────────────────────────────────────
   CONTENT-V1: renderFromContent
   Phase 2 rendering path — no templates, pure programmatic layout.
   Takes a validated content-v1 JSON document and returns a full
   HTML string using the same pipeline as fillTemplate() output.
───────────────────────────────────────── */

/** Google Fonts URL shared by both template and content-v1 paths. */
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap';

/**
 * Build the header HTML for a content-v1 infographic.
 * Mirrors the `.ig-header` block used in legacy templates.
 */
function buildContentHeader(json) {
  const label    = json.label    ? `<span class="ig-label">${escapeHtml(json.label)}</span>` : '';
  const heroIcon = json.hero_icon
    ? `<div class="ig-hero-icon-wrap" style="text-align:center;margin-bottom:10px;">${renderIconHtml(json.hero_icon, 'ig-hero-icon', 64)}</div>`
    : '';
  const title    = json.title    ? `<h1 class="ig-title">${escapeHtml(json.title)}</h1>` : '';
  const subtitle = json.subtitle ? `<p class="ig-subtitle">${escapeHtml(json.subtitle)}</p>` : '';
  if (!label && !heroIcon && !title && !subtitle) return '';
  return `<div class="ig-header">${heroIcon}${label}${title}${subtitle}</div>`;
}

/**
 * Build optional stats row HTML.
 */
function buildStatsHtml(stats) {
  if (!Array.isArray(stats) || stats.length === 0) return '';
  return `<div class="ig-stats-row" data-slot="stats-loop">${stats.map(renderStat).join('')}</div>`;
}

/**
 * Build optional callout HTML.
 */
function buildCalloutHtml(callout) {
  if (!callout || (!callout.title && !callout.body)) return '';
  return `<div class="ig-callout">
  <div class="ig-callout-title">${escapeHtml(callout.title || '')}</div>
  <div class="ig-callout-body">${escapeHtml(callout.body || '')}</div>
</div>`;
}

/**
 * Build footer HTML.
 */
function buildFooterHtml(brand) {
  return `<div class="ig-footer"><span class="ig-footer-brand">${escapeHtml(brand || 'Infogr.ai')}</span></div>`;
}

/**
 * Render a content-v1 JSON document into a full HTML string.
 * Bypasses template files — all layout is programmatic via smart-layouts + grid.
 *
 * The returned HTML goes through the same preprocessHTMLv3() → renderHTML()
 * pipeline in app.js as legacy template output.
 *
 * @param {object} contentJson  — validated content-v1 document
 * @param {string} [tone]       — 'professional' | 'bold' | 'minimal' | 'playful'
 * @param {string} [size]       — 'a4' | 'portrait' | 'square' | 'landscape'
 * @param {string} [accentColor] — hex color override e.g. '#E11D48'
 * @returns {string} Full HTML string
 */
export function renderFromContent(contentJson, tone, size, accentColor) {
  const toneId  = tone  || contentJson.tone  || 'professional';
  const sizeId  = size  || contentJson.size  || 'a4';
  const accent  = accentColor || TONE_ACCENT_DEFAULTS[toneId] || '#2563EB';

  // Compute --accent-soft from accent hex
  let accentSoft = 'rgba(37,99,235,0.1)';
  try {
    const hex = accent.replace('#', '');
    const r = parseInt(hex.slice(0,2), 16);
    const g = parseInt(hex.slice(2,4), 16);
    const b = parseInt(hex.slice(4,6), 16);
    accentSoft = `rgba(${r},${g},${b},0.1)`;
  } catch (_) { /* use default */ }

  // Render each content section
  const sections = Array.isArray(contentJson.sections) ? contentJson.sections : [];
  const renderedSections = sections.map(section => renderSection(section, toneId));

  // Compose sections — currently stacked vertically (1 section per row).
  // Phase 3 will wire page-level column layout via grid.js renderSections().
  const sectionsHtml = renderedSections
    .map(s => `<div class="ig-content-section">${s}</div>`)
    .join('');

  // Assemble page body
  const header  = buildContentHeader(contentJson);
  const stats   = buildStatsHtml(contentJson.stats);
  const callout = buildCalloutHtml(contentJson.callout);
  const footer  = buildFooterHtml(contentJson.footer_brand);

  const accentOverrideCSS = `
    :root {
      --accent: ${accent};
      --accent-soft: ${accentSoft};
    }
  `;

  // Minimal content-v1 layout CSS (header/footer/section spacing).
  // Box + grid CSS is injected via BOXES_CSS + GRID_CSS imports.
  const contentLayoutCSS = `
    .ig-page .ig-header {
      text-align: center;
      padding: 32px 32px 20px;
    }
    .ig-page .ig-header .ig-label {
      display: inline-block;
      background: var(--accent);
      color: #fff;
      font-family: var(--font-heading, 'Space Grotesk', sans-serif);
      font-size: 0.7em;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 3px 12px;
      border-radius: 20px;
      margin-bottom: 10px;
    }
    .ig-page .ig-header .ig-title {
      font-family: var(--font-heading, 'Space Grotesk', sans-serif);
      font-size: 1.6em;
      font-weight: 700;
      color: var(--text-primary, #111827);
      margin: 0 0 8px;
      line-height: 1.2;
    }
    .ig-page .ig-header .ig-subtitle {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-size: 0.9em;
      color: var(--text-secondary, #6b7280);
      margin: 0;
      line-height: 1.5;
    }
    .ig-page .ig-content-section {
      padding: 0 28px 20px;
    }
    .ig-page .ig-stats-row {
      display: flex;
      gap: 16px;
      padding: 8px 28px 20px;
      flex-wrap: wrap;
    }
    .ig-page .ig-callout {
      margin: 0 28px 20px;
      background: var(--accent-soft, rgba(37,99,235,.1));
      border-left: 4px solid var(--accent);
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
    }
    .ig-page .ig-callout-title {
      font-family: var(--font-heading, 'Space Grotesk', sans-serif);
      font-size: 0.9em;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 4px;
    }
    .ig-page .ig-callout-body {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-size: 0.8em;
      color: var(--text-secondary, #6b7280);
      line-height: 1.45;
    }
    .ig-page .ig-footer {
      padding: 14px 28px;
      border-top: 1px solid var(--card-border, #e5e7eb);
      text-align: right;
    }
    .ig-page .ig-footer-brand {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-size: 0.7em;
      color: var(--text-secondary, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${GOOGLE_FONTS_URL}" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <style>${accentOverrideCSS}${BOXES_CSS}${GRID_CSS}${contentLayoutCSS}</style>
</head>
<body>
  <div class="ig-page" data-tone="${escapeHtml(toneId)}" data-size="${escapeHtml(sizeId)}">
    ${header}
    ${sectionsHtml}
    ${stats}
    ${callout}
    ${footer}
  </div>
</body>
</html>`;
}

export { iconUrl, escapeHtml, TONE_ACCENT_DEFAULTS };
