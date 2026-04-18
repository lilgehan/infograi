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

/* ── Icons8 proxy helper ── */
const PROXY_BASE = '/api/proxy?url=';
const ICONS8_BASE = 'https://img.icons8.com/fluency';

function iconUrl(name, size = 96) {
  const raw = `${ICONS8_BASE}/${size}/${name}.png`;
  return `${PROXY_BASE}${encodeURIComponent(raw)}`;
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
  const src = iconUrl(stat.icon, 96);
  return `<div class="ig-stat">
    <div class="ig-stat-icon-wrap">
      <img class="ig-stat-icon" src="${src}" alt="${escapeHtml(stat.icon)}" data-icon="true" data-icon-name="${escapeHtml(stat.icon)}" />
    </div>
    <div class="ig-stat-text">
      <div class="ig-stat-num">${escapeHtml(stat.number)}</div>
      <div class="ig-stat-label">${escapeHtml(stat.label)}</div>
    </div>
  </div>`;
}

function renderCard(card) {
  const src     = iconUrl(card.icon, 96);
  const bullets = (card.bullets ?? [])
    .map(b => `<li class="ig-card-bullet">${escapeHtml(b)}</li>`)
    .join('');

  return `<div class="ig-card">
    <div class="ig-card-icon-wrap">
      <img class="ig-card-icon" src="${src}" alt="${escapeHtml(card.icon)}" data-icon="true" data-icon-name="${escapeHtml(card.icon)}" />
    </div>
    <div class="ig-card-title">${escapeHtml(card.title)}</div>
    <ul class="ig-card-bullets">${bullets}</ul>
  </div>`;
}

/* ─────────────────────────────────────────
   STEPS-GUIDE slot renderers
───────────────────────────────────────── */

function renderStep(step, idx) {
  const src = iconUrl(step.icon, 96);
  return `<div class="ig-step">
    <div class="ig-step-num">${escapeHtml(String(step.number ?? idx + 1))}</div>
    <div class="ig-step-icon-wrap">
      <img class="ig-step-icon" src="${src}" alt="${escapeHtml(step.icon)}" data-icon="true" data-icon-name="${escapeHtml(step.icon)}" />
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
