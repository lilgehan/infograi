/**
 * Infogr.ai v3 — Renderer
 *
 * fillTemplate(json, layoutId, tone) → HTML string
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
 * Phase 1 supports: 'mixed-grid', 'steps-guide'
 * Phase 2 adds:     'timeline', 'funnel', 'comparison', 'flowchart'
 */

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
const ICONS8_BASE = 'https://img.icons8.com/fluency';

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
  // Remote icon — proxied Icons8 URL
  const src = `${PROXY_BASE}${encodeURIComponent(`${ICONS8_BASE}/${px}/${name}.png`)}`;
  return `<img class="${cssClass}" src="${src}" alt="${escapeHtml(name)}" width="${px}" height="${px}" data-icon="true" data-icon-name="${escapeHtml(name)}" />`;
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

function renderCard(card) {
  const iconHtml = renderIconHtml(card.icon, 'ig-card-icon', 40);
  const bullets  = (card.bullets ?? [])
    .map(b => `<li class="ig-card-bullet">${escapeHtml(b)}</li>`)
    .join('');

  return `<div class="ig-card">
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
    }

    // Stats row (3 items)
    if (json.stats?.length) {
      fillSlot(doc, 'stats-loop', json.stats.map(renderStat).join(''));
    }

    // Cards grid (3 items)
    if (json.cards?.length) {
      fillSlot(doc, 'cards-loop', json.cards.map(renderCard).join(''));
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

export { iconUrl, escapeHtml, TONE_ACCENT_DEFAULTS };
