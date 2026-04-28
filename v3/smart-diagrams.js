/**
 * Infogr.ai v3 — Smart Diagram Render Functions (Layer 2, Phase 4)
 *
 * Diagrams visualize RELATIONSHIPS, HIERARCHY, and MOVEMENT.
 * Different from Smart Layouts which organize content into grids/lists.
 *
 * All diagrams: pure HTML+CSS+inline SVG — no canvas, no external libraries.
 * Icons use inline SVG (same as smart-layouts.js).
 *
 * Families:
 *   Road      — road-horizontal, road-vertical, journey-map, experience-map
 *   Target    — bullseye, radial, orbit
 *   Hierarchy — org-chart, pyramid-diagram, nested-diamonds
 *   Venn      — venn-diagram, linear-venn, linear-venn-filled
 *   Process   — infinity-loop
 *   Business  — swot, competitive-map, chain
 *
 * CSS prefix: .ig-page .igd-* (diagrams; layouts use .igs-*)
 * Editable text classes: .igd-title, .igd-body, .igd-label
 *
 * Usage:
 *   import { renderDiagramSection, DIAGRAM_CSS } from './smart-diagrams.js';
 *   const html = renderDiagramSection({ variant: 'swot', items, style: 'standard' }, 'professional');
 */

/* ─────────────────────────────────────────
   ICON SYSTEM
   Mirrors smart-layouts.js — no circular import with renderer.js.
   Priority: LOCAL_SVG_MAP (instant) → /api/proxy → fallback circle.
───────────────────────────────────────── */

const DG_PROXY_BASE  = '/api/proxy?url=';
const DG_ICONS8_BASE = 'https://img.icons8.com/3d-fluency';
const DG_FALLBACK    = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='24' cy='24' r='6' fill='%23cbd5e1'/%3E%3C/svg%3E";

const DG_LOCAL_SVG_MAP = {
  'folder':          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M4 14a4 4 0 0 1 4-4h10l4 4h22a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#FFA726"/><path d="M4 20h40v14a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#FFB74D"/></svg>`,
  'gear':            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#607D8B" d="M39 21.5l-2.2-.4c-.3-1-.7-1.9-1.3-2.8l1.3-1.8c.4-.5.3-1.2-.2-1.7l-2.8-2.8c-.5-.4-1.2-.4-1.7-.1l-1.8 1.3c-.9-.5-1.8-1-2.8-1.3l-.4-2.2C26.8 9 26.2 8.5 25.5 8.5h-4c-.7 0-1.3.5-1.4 1.2l-.4 2.2c-1 .3-1.9.8-2.8 1.3l-1.8-1.3c-.5-.3-1.2-.3-1.7.1l-2.8 2.8c-.5.5-.5 1.2-.2 1.7l1.3 1.8c-.5.9-1 1.8-1.3 2.8l-2.2.4C9 21.7 8.5 22.3 8.5 23v4c0 .7.5 1.3 1.2 1.4l2.2.4c.3 1 .8 1.9 1.3 2.8l-1.3 1.8c-.3.5-.3 1.2.2 1.7l2.8 2.8c.5.4 1.2.4 1.7.1l1.8-1.3c.9.5 1.8 1 2.8 1.3l.4 2.2c.2.7.7 1.2 1.4 1.2h4c.7 0 1.3-.5 1.4-1.2l.4-2.2c1-.3 1.9-.8 2.8-1.3l1.8 1.3c.5.3 1.2.3 1.7-.1l2.8-2.8c.5-.5.5-1.2.2-1.7l-1.3-1.8c.5-.9 1-1.8 1.3-2.8l2.2-.4c.7-.2 1.2-.7 1.2-1.4v-4c0-.7-.5-1.3-1.1-1.5z"/><circle cx="24" cy="25" r="5.5" fill="#B0BEC5"/></svg>`,
  'brain':           `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><ellipse cx="17" cy="23" rx="9" ry="13" fill="#CE93D8"/><ellipse cx="31" cy="23" rx="9" ry="13" fill="#BA68C8"/><rect x="22" y="10" width="4" height="26" rx="2" fill="#F3E5F5"/><circle cx="15" cy="17" r="3" fill="#9C27B0" opacity="0.7"/><circle cx="33" cy="19" r="3" fill="#7B1FA2" opacity="0.7"/></svg>`,
  'rocket':          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 4C16 12 12 22 14 30l4 4c8 2 18-2 26-10C44 12 36 4 24 4z" fill="#5C6BC0"/><circle cx="28" cy="20" r="4" fill="#E8EAF6"/><path d="M14 30c-4 0-8 4-10 8l4 2 2 4c4-2 8-6 8-10z" fill="#EF9A9A"/></svg>`,
  'star':            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 5l5.3 10.7 11.8 1.7-8.5 8.3 2 11.8L24 32l-10.6 5.5 2-11.8L7 17.4l11.8-1.7z" fill="#FFC107" stroke="#FF8F00" stroke-width="0.5"/></svg>`,
  'idea':            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6a13 13 0 0 0-6 24.5V36h12v-5.5A13 13 0 0 0 24 6z" fill="#FFD54F"/><rect x="18" y="36" width="12" height="3" rx="1.5" fill="#FF8F00"/><rect x="19.5" y="39" width="9" height="3" rx="1.5" fill="#FF8F00"/></svg>`,
  'target':          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="14" fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="8" fill="none" stroke="#EF5350" stroke-width="2.5"/><circle cx="24" cy="24" r="3" fill="#EF5350"/></svg>`,
  'checkmark':       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#4CAF50"/><path d="M14 25l7 7 13-14" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'lightning-bolt':  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M28 4L10 28h14l-4 16 18-24H24z" fill="#FFC107" stroke="#FF8F00" stroke-width="1" stroke-linejoin="round"/></svg>`,
  'user-group':      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="16" cy="15" r="7" fill="#64B5F6"/><path d="M4 38c0-6.6 5.4-12 12-12 6.6 0 12 5.4 12 12" fill="#42A5F5"/><circle cx="34" cy="13" r="6" fill="#90CAF9"/><path d="M28 36c0-5 3.1-9.3 7.5-11.1A12.2 12.2 0 0 1 46 36" fill="#64B5F6"/></svg>`,
  'dollar-coin':     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FFC107"/><circle cx="24" cy="24" r="16" fill="#FFD54F"/><text x="24" y="31" text-anchor="middle" font-size="20" font-weight="bold" fill="#E65100" font-family="sans-serif">$</text></svg>`,
  'shield':          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 4L8 10v14c0 10.5 7 18 16 20 9-2 16-9.5 16-20V10z" fill="#42A5F5"/><path d="M16 25l5 5 11-12" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'chart-increasing':`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="5" y="30" width="8" height="12" rx="1.5" fill="#A5D6A7"/><rect x="15" y="22" width="8" height="20" rx="1.5" fill="#66BB6A"/><rect x="25" y="14" width="8" height="28" rx="1.5" fill="#43A047"/><rect x="35" y="6" width="8" height="36" rx="1.5" fill="#2E7D32"/><line x1="3" y1="44" x2="47" y2="44" stroke="#1B5E20" stroke-width="2" stroke-linecap="round"/></svg>`,
};

function dgResolveIconSrc(name) {
  if (!name || typeof name !== 'string') return DG_FALLBACK;
  const key = name.toLowerCase().replace(/\s+/g, '-');
  const svg = DG_LOCAL_SVG_MAP[key];
  if (svg) return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const raw = `${DG_ICONS8_BASE}/94/${key}.png`;
  return `${DG_PROXY_BASE}${encodeURIComponent(raw)}`;
}

function dgIconImg(name, cssClass, size = 32) {
  const src = dgResolveIconSrc(name || 'star');
  const cls = cssClass ? ` class="${cssClass}"` : '';
  return `<img${cls} src="${src}" alt="" width="${size}" height="${size}" loading="lazy" data-icon="true" onerror="this.onerror=null;this.src='${DG_FALLBACK}'">`;
}

/* ─────────────────────────────────────────
   TEXT DENSITY HELPERS
   Same logic as smart-layouts.js
───────────────────────────────────────── */

function dgTruncateBody(body, density) {
  if (!body || density === 'compact') return '';
  const words = body.trim().split(/\s+/);
  const limit = density === 'detailed' ? 40 : 20;
  if (words.length <= limit) return body;
  return words.slice(0, limit).join(' ') + '…';
}

function dgTruncateTitle(title, density) {
  if (!title) return '';
  if (density !== 'compact') return title;
  const words = title.trim().split(/\s+/);
  if (words.length <= 7) return title;
  return words.slice(0, 7).join(' ') + '…';
}

/** Hard-truncate to max characters — used for diagram variants requiring consistent width */
function trunc(str, max = 25) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────────
   RADIAL POSITION HELPER
   Computes (x%, y%) for N items arranged in a circle.
   Starts at top (12 o'clock) and goes clockwise.
───────────────────────────────────────── */

function radialPositions(n, radiusPct = 36) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const x = 50 + radiusPct * Math.cos(angle);
    const y = 50 + radiusPct * Math.sin(angle);
    return { x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) };
  });
}

/* ═══════════════════════════════════════════════════════════════
   FAMILY 1 — ROAD
   Variants: road-horizontal, road-vertical, journey-map, experience-map
   Item roles: items[0..n-1] = sequential milestones/stages
═══════════════════════════════════════════════════════════════ */

export const ROAD_CSS = `
/* ── Road / Journey: base ── */
.ig-page .igd-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.88em; font-weight: 700;
  color: var(--text-primary, #111827); margin: 0; line-height: 1.25;
}
.ig-page .igd-body {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.75em; color: var(--text-secondary, #6b7280);
  margin: 0; line-height: 1.4;
}
.ig-page .igd-label {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.68em; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary, #6b7280); margin: 0;
}

/* ── road-horizontal ── */
.ig-page .igd-road-h {
  position: relative; padding: 16px 8px;
  overflow: hidden;
}
.ig-page .igd-road-h-track {
  position: absolute;
  left: 0; right: 0;
  top: calc(50% + 12px);
  height: 3px;
  background: var(--card-border, #e5e7eb);
  border-radius: 2px;
}
.ig-page .igd-road-h-track-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  width: 100%;
  opacity: 0.35;
}
.ig-page .igd-road-h-items {
  display: flex; align-items: center;
  position: relative; z-index: 1;
}
.ig-page .igd-road-h-item {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 6px;
}
.ig-page .igd-road-h-item--above { flex-direction: column; padding-bottom: 6px; }
.ig-page .igd-road-h-item--below { flex-direction: column-reverse; padding-top: 6px; }
.ig-page .igd-road-h-dot {
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--card-bg, #fff);
  box-shadow: 0 0 0 2px var(--accent);
  flex-shrink: 0; z-index: 2;
}
.ig-page .igd-road-h-card {
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: var(--radius-card, 10px);
  padding: 8px 10px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  max-width: 110px; text-align: center;
  overflow: hidden;
}
.ig-page .igd-road-h-num {
  display: inline-block;
  background: var(--accent); color: #fff;
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.62em; font-weight: 700;
  width: 18px; height: 18px; border-radius: 50%;
  line-height: 18px; text-align: center;
  margin-bottom: 4px;
}

/* ── road-vertical ── */
.ig-page .igd-road-v {
  position: relative; padding: 8px 24px;
}
.ig-page .igd-road-v-track {
  position: absolute;
  top: 0; bottom: 0; left: 50%;
  width: 3px;
  background: var(--card-border, #e5e7eb);
  transform: translateX(-50%);
  border-radius: 2px;
}
.ig-page .igd-road-v-items {
  display: flex; flex-direction: column; gap: 8px;
  position: relative; z-index: 1;
}
.ig-page .igd-road-v-item {
  display: flex; align-items: center; gap: 10px;
  min-height: 60px;
}
.ig-page .igd-road-v-item--right { flex-direction: row; }
.ig-page .igd-road-v-item--left  { flex-direction: row-reverse; }
.ig-page .igd-road-v-dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--card-bg, #fff);
  box-shadow: 0 0 0 2px var(--accent);
  flex-shrink: 0; z-index: 2;
  position: absolute; left: 50%; transform: translateX(-50%);
}
.ig-page .igd-road-v-card {
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: var(--radius-card, 10px);
  padding: 10px 12px;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  flex: 1; max-width: 46%;
  overflow: hidden;
}

/* ── journey-map ── */
.ig-page .igd-journey {
  display: flex; overflow: hidden;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igd-journey-stage {
  flex: 1; display: flex; flex-direction: column;
  border-right: 1px solid var(--card-border, #e5e7eb);
  position: relative; overflow: hidden;
}
.ig-page .igd-journey-stage:last-child { border-right: none; }
.ig-page .igd-journey-hdr {
  background: var(--accent);
  padding: 8px 10px;
  display: flex; align-items: center; gap: 6px;
  position: relative;
}
.ig-page .igd-journey-hdr::after {
  content: '';
  position: absolute; right: -10px; top: 0; bottom: 0;
  width: 0; border-top: 19px solid transparent;
  border-bottom: 19px solid transparent;
  border-left: 10px solid var(--accent);
  z-index: 2;
}
.ig-page .igd-journey-stage:last-child .igd-journey-hdr::after { display: none; }
.ig-page .igd-journey-hdr .igd-title { color: #fff; font-size: 0.78em; }
.ig-page .igd-journey-num {
  background: rgba(255,255,255,0.25); color: #fff;
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.65em; font-weight: 700;
  width: 18px; height: 18px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ig-page .igd-journey-body-wrap {
  padding: 10px;
  background: var(--card-bg, #fff);
  flex: 1;
}
.ig-page .igd-journey-body-wrap .igd-body { font-size: 0.72em; }

/* ── experience-map ── */
.ig-page .igd-expmap {
  display: flex; flex-direction: column;
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: var(--radius-card, 10px); overflow: hidden;
}
.ig-page .igd-expmap-row {
  display: flex;
  border-bottom: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igd-expmap-row:last-child { border-bottom: none; }
.ig-page .igd-expmap-row-label {
  width: 70px; min-width: 70px;
  background: var(--accent-soft, rgba(37,99,235,.08));
  border-right: 1px solid var(--card-border, #e5e7eb);
  padding: 8px 10px;
  display: flex; align-items: center;
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.65em; font-weight: 700;
  color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em;
}
.ig-page .igd-expmap-cells {
  display: flex; flex: 1;
}
.ig-page .igd-expmap-cell {
  flex: 1; padding: 8px 10px;
  border-right: 1px solid var(--card-border, #e5e7eb);
  overflow: hidden;
}
.ig-page .igd-expmap-cell:last-child { border-right: none; }
.ig-page .igd-expmap-emotion {
  font-size: 1.1em; text-align: center; padding: 6px;
  line-height: 1;
}
`;

/**
 * renderRoad — Road / Journey diagrams
 * Variants: road-horizontal, road-vertical, journey-map, experience-map
 * Items: sequential stages/milestones (items[0] = first, items[n-1] = last)
 */
export function renderRoad(items, variant, tone, columns, density) {
  const list = items.slice(0, 8);

  /* ── road-horizontal ── */
  if (variant === 'road-horizontal') {
    const cards = list.map((item, i) => {
      const above = i % 2 === 0 ? 'igd-road-h-item--above' : 'igd-road-h-item--below';
      const title = esc(trunc(item.title || '', 25));
      const body  = esc(dgTruncateBody(item.body || '', density));
      return `<div class="igd-road-h-item ${above}">
        ${above === 'igd-road-h-item--above'
          ? `<div class="igd-road-h-card">
               <div class="igd-road-h-num">${i + 1}</div>
               <p class="igd-title">${title}</p>
               ${body ? `<p class="igd-body">${body}</p>` : ''}
             </div>
             <div class="igd-road-h-dot"></div>`
          : `<div class="igd-road-h-dot"></div>
             <div class="igd-road-h-card">
               <div class="igd-road-h-num">${i + 1}</div>
               <p class="igd-title">${title}</p>
               ${body ? `<p class="igd-body">${body}</p>` : ''}
             </div>`}
      </div>`;
    }).join('');
    return `<div class="igd-road-h">
      <div class="igd-road-h-track"><div class="igd-road-h-track-fill"></div></div>
      <div class="igd-road-h-items">${cards}</div>
    </div>`;
  }

  /* ── road-vertical ── */
  if (variant === 'road-vertical') {
    const rows = list.map((item, i) => {
      const side  = i % 2 === 0 ? 'igd-road-v-item--right' : 'igd-road-v-item--left';
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      return `<div class="igd-road-v-item ${side}" style="position:relative">
        <div class="igd-road-v-dot"></div>
        <div class="igd-road-v-card">
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
        <div style="flex:1"></div>
      </div>`;
    }).join('');
    return `<div class="igd-road-v">
      <div class="igd-road-v-track"></div>
      <div class="igd-road-v-items">${rows}</div>
    </div>`;
  }

  /* ── journey-map ── */
  if (variant === 'journey-map') {
    const stages = list.slice(0, 6).map((item, i) => {
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      return `<div class="igd-journey-stage">
        <div class="igd-journey-hdr">
          <div class="igd-journey-num">${i + 1}</div>
          <p class="igd-title">${title}</p>
        </div>
        <div class="igd-journey-body-wrap">
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="igd-journey">${stages}</div>`;
  }

  /* ── experience-map ── */
  if (variant === 'experience-map') {
    const stages = list.slice(0, 6);
    const emotions = ['😊', '😐', '😊', '😄', '😕', '😞', '😊', '😄'];
    const stageRow = stages.map((item) => {
      const title = esc(dgTruncateTitle(item.title || '', density));
      return `<div class="igd-expmap-cell"><p class="igd-title" style="font-size:0.82em">${title}</p></div>`;
    }).join('');
    const bodyRow = stages.map(item => {
      const body = esc(dgTruncateBody(item.body || '', density));
      return `<div class="igd-expmap-cell">${body ? `<p class="igd-body">${body}</p>` : ''}</div>`;
    }).join('');
    const emotionRow = stages.map((item, i) => {
      const emoji = item.data?.emotion || emotions[i % emotions.length];
      return `<div class="igd-expmap-cell"><div class="igd-expmap-emotion">${emoji}</div></div>`;
    }).join('');
    return `<div class="igd-expmap">
      <div class="igd-expmap-row">
        <div class="igd-expmap-row-label">Stage</div>
        <div class="igd-expmap-cells">${stageRow}</div>
      </div>
      <div class="igd-expmap-row">
        <div class="igd-expmap-row-label">Detail</div>
        <div class="igd-expmap-cells">${bodyRow}</div>
      </div>
      <div class="igd-expmap-row">
        <div class="igd-expmap-row-label">Feeling</div>
        <div class="igd-expmap-cells">${emotionRow}</div>
      </div>
    </div>`;
  }

  // fallback
  return renderRoad(items, 'journey-map', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   FAMILY 2 — TARGET
   Variants: bullseye, radial, orbit
   Item roles:
     bullseye — items[0] = innermost/most important, items[n-1] = outermost
     radial   — items[0] = center hub, items[1..] = spokes
     orbit    — items[0] = center, items[1..4] = orbiting items (max 4)
═══════════════════════════════════════════════════════════════ */

export const TARGET_CSS = `
/* ── bullseye (SVG concentric rings) ── */
.ig-page .igd-bullseye-wrap {
  display: flex; align-items: center; gap: 20px; padding: 12px;
}
.ig-page .igd-bullseye-svg-col {
  flex: 0 0 40%; display: flex; align-items: center; justify-content: center;
}
.ig-page .igd-bullseye-svg-col svg { width: 100%; max-width: 200px; height: auto; }
.ig-page .igd-bullseye-text-col {
  flex: 1; display: flex; flex-direction: column; gap: 10px;
}
.ig-page .igd-bull-text-item {
  display: flex; align-items: flex-start; gap: 8px;
  max-width: 200px;
}
.ig-page .igd-bull-ring-badge {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--accent); color: #fff;
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.68em; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ig-page .igd-bull-text-item .igd-title { font-size: 0.82em; }
.ig-page .igd-bull-text-item .igd-body  { font-size: 0.72em; }

/* ── radial shared ── */
.ig-page .igd-radial-wrap {
  position: relative;
  margin: 0 auto;
}
.ig-page .igd-radial-hub {
  position: absolute;
  border-radius: 50%;
  background: var(--accent);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 10px;
  overflow: hidden;
  z-index: 2;
}
.ig-page .igd-radial-hub .igd-title { color: #fff; font-size: 0.78em; }
.ig-page .igd-radial-hub .igd-body  { color: rgba(255,255,255,0.85); font-size: 0.65em; }
.ig-page .igd-radial-spoke {
  position: absolute;
  height: 2px;
  background: var(--accent-soft, rgba(37,99,235,.2));
  transform-origin: 0 50%;
  z-index: 1;
  top: 50%; left: 50%;
}
.ig-page .igd-radial-item {
  position: absolute;
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: var(--radius-card, 10px);
  padding: 8px 10px;
  text-align: center;
  overflow: hidden;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  z-index: 2;
  transform: translate(-50%, -50%);
}
.ig-page .igd-radial-item .igd-title { font-size: 0.78em; }
.ig-page .igd-radial-item .igd-body  { font-size: 0.68em; }

/* ── orbit ── */
.ig-page .igd-orbit-wrap {
  position: relative; margin: 0 auto;
  display: flex; align-items: center; justify-content: center;
}
.ig-page .igd-orbit-item {
  position: absolute;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  transform: translate(-50%, -50%);
  z-index: 2;
}
.ig-page .igd-orbit-circle {
  width: 68px; height: 68px; border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.ig-page .igd-orbit-title {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.72em; font-weight: 700;
  color: var(--text-primary, #111827);
  text-align: center; max-width: 80px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin: 0;
}
`;

/**
 * renderTarget — Target / Radial diagrams
 * Variants: bullseye, radial, orbit
 */
export function renderTarget(items, variant, tone, columns, density) {
  const list = items.slice(0, 7);

  /* ── bullseye (SVG concentric circles) ── */
  if (variant === 'bullseye') {
    const n    = Math.min(Math.max(list.length, 2), 5);
    const data = list.slice(0, n);
    const cx   = 125, cy = 125, outerR = 110;
    const step = outerR / n;

    // Rings: render outermost first (i=n-1), innermost last (i=0)
    // items[0] = innermost/darkest, items[n-1] = outermost/lightest
    let rings = '', connectors = '';
    for (let i = n - 1; i >= 0; i--) {
      const r     = (i + 1) * step;
      const alpha = parseFloat((0.85 - i * (0.65 / Math.max(n - 1, 1))).toFixed(2));
      rings += `<circle cx="${cx}" cy="${cy}" r="${r}"
        fill="var(--accent)" opacity="${alpha}"/>`;

      // Number label in the annular band (at 12-o'clock position within band)
      const midR  = (i + 0.5) * step;
      const lx    = cx;
      const ly    = cy - midR;
      rings += `<text x="${lx}" y="${ly + 4}" text-anchor="middle"
        font-family="var(--font-heading,'Space Grotesk',sans-serif)"
        font-size="10" font-weight="700" fill="#fff" opacity="0.9">${i + 1}</text>`;

      // Connector line from right side of band to SVG right edge
      const lineX  = cx + midR * 0.8;
      const lineY  = ly;
      connectors += `<line x1="${lineX.toFixed(1)}" y1="${lineY.toFixed(1)}" x2="248" y2="${lineY.toFixed(1)}"
        stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 3" opacity="0.4"/>`;
    }

    const textItems = data.map((item, i) => {
      const title = esc(trunc(item.title || '', 25));
      const body  = esc(dgTruncateBody(item.body || '', density));
      const alpha = parseFloat((0.85 - i * (0.65 / Math.max(n - 1, 1))).toFixed(2));
      return `<div class="igd-bull-text-item">
        <div class="igd-bull-ring-badge" style="opacity:${alpha + 0.1}">${i + 1}</div>
        <div>
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div class="igd-bullseye-wrap">
      <div class="igd-bullseye-svg-col">
        <svg viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg">
          ${rings}${connectors}
        </svg>
      </div>
      <div class="igd-bullseye-text-col">${textItems}</div>
    </div>`;
  }

  /* ── radial ── */
  if (variant === 'radial') {
    const hub    = list[0];
    const spokes = list.slice(1);
    const n      = spokes.length;
    const cSize  = 280;
    const hubPx  = 80;
    const radius = (cSize / 2) - 55;
    const hubt   = esc(dgTruncateTitle(hub?.title || '', density));
    const hubb   = esc(dgTruncateBody(hub?.body || '', density));
    let spokesHtml = '';
    spokes.forEach((item, i) => {
      const angle   = (i / n) * 2 * Math.PI - Math.PI / 2;
      const cx      = cSize / 2;
      const cy      = cSize / 2;
      const ix      = cx + radius * Math.cos(angle);
      const iy      = cy + radius * Math.sin(angle);
      const spokeLen = radius - hubPx / 2;
      const spokeDeg = (angle * 180 / Math.PI);
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      spokesHtml += `
        <div class="igd-radial-spoke" style="
          width:${spokeLen}px;
          left:${cx + (hubPx / 2) * Math.cos(angle)}px;
          top:${cy + (hubPx / 2) * Math.sin(angle) - 1}px;
          transform:rotate(${spokeDeg}deg);transform-origin:0 50%">
        </div>
        <div class="igd-radial-item" style="left:${ix}px;top:${iy}px;max-width:88px">
          ${item.icon ? dgIconImg(item.icon, '', 20) : ''}
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>`;
    });
    return `<div class="igd-radial-wrap" style="width:${cSize}px;height:${cSize}px">
      <div class="igd-radial-hub" style="
        width:${hubPx}px;height:${hubPx}px;
        left:${cSize / 2}px;top:${cSize / 2}px;
        transform:translate(-50%,-50%)">
        <p class="igd-title">${hubt}</p>
        ${hubb ? `<p class="igd-body">${hubb}</p>` : ''}
      </div>
      ${spokesHtml}
    </div>`;
  }

  /* ── orbit — fixed NSEW positions, max 4 orbital items ── */
  if (variant === 'orbit') {
    const hub     = list[0];
    const orbital = list.slice(1, 5); // max 4 orbital items
    if (list.length > 5) console.warn('[smart-diagrams] orbit: more than 4 orbital items — only rendering first 4');

    const n       = orbital.length;
    const cSize   = 300;
    const cx      = cSize / 2;  // 150
    const cy      = cSize / 2;  // 150
    const hubR    = 45;
    const orbDist = 105; // distance from center to orbital center
    const orbR    = 34;

    // NSEW positions (for up to 4 items)
    const NSEW_ANGLES = [-Math.PI / 2, 0, Math.PI / 2, Math.PI]; // N, E, S, W

    const hubt = esc(trunc(hub?.title || '', 20));
    const hubb = esc(dgTruncateBody(hub?.body || '', density));

    // SVG background: dashed orbit path ring
    const svgBg = `<svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none" viewBox="0 0 ${cSize} ${cSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${orbDist}" fill="none"
        stroke="var(--card-border,#e5e7eb)" stroke-dasharray="6 4" stroke-width="1.5"/>
    </svg>`;

    const orbitItems = orbital.map((item, i) => {
      const angle = NSEW_ANGLES[i];
      const ix    = cx + orbDist * Math.cos(angle);
      const iy    = cy + orbDist * Math.sin(angle);
      const title = esc(trunc(item.title || '', 20));
      return `<div class="igd-orbit-item" style="left:${ix}px;top:${iy}px">
        <div class="igd-orbit-circle" style="opacity:0.85">
          ${item.icon ? dgIconImg(item.icon, '', 28) : ''}
        </div>
        <p class="igd-orbit-title">${title}</p>
      </div>`;
    }).join('');

    return `<div class="igd-orbit-wrap" style="width:${cSize}px;height:${cSize}px;position:relative">
      ${svgBg}
      <div class="igd-radial-hub" style="
        width:${hubR * 2}px;height:${hubR * 2}px;
        left:${cx}px;top:${cy}px;
        transform:translate(-50%,-50%);
        font-size:0.9em">
        ${hub?.icon ? dgIconImg(hub.icon, '', 24) : ''}
        <p class="igd-title" style="color:#fff;font-size:0.76em">${hubt}</p>
        ${hubb ? `<p class="igd-body" style="color:rgba(255,255,255,0.85);font-size:0.62em">${hubb}</p>` : ''}
      </div>
      ${orbitItems}
    </div>`;
  }

  return renderTarget(items, 'radial', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   FAMILY 3 — HIERARCHY
   Variants: org-chart, pyramid-diagram, nested-diamonds
   Item roles:
     org-chart       — items[0] = root, items[1..] = children
     pyramid-diagram — items[0] = apex (top/darkest), items[n-1] = base (lightest)
     nested-diamonds — items[0] = smallest top, items[n-1] = largest bottom
═══════════════════════════════════════════════════════════════ */

export const HIERARCHY_CSS = `
/* ── org-chart ── */
.ig-page .igd-org {
  display: flex; flex-direction: column; align-items: center;
  padding: 8px;
}
.ig-page .igd-org-node {
  background: var(--card-bg, #fff);
  border: 2px solid var(--accent);
  border-radius: var(--radius-card, 10px);
  padding: 10px 16px;
  text-align: center;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden;
  min-width: 80px; max-width: 140px;
}
.ig-page .igd-org-root-node {
  background: var(--accent);
  border-color: var(--accent);
}
.ig-page .igd-org-root-node .igd-title { color: #fff; }
.ig-page .igd-org-root-node .igd-body  { color: rgba(255,255,255,0.85); }
.ig-page .igd-org-connector-v {
  width: 2px; height: 22px;
  background: var(--accent-soft, rgba(37,99,235,.3));
  margin: 0 auto;
}
.ig-page .igd-org-children-row {
  display: flex; gap: 20px; position: relative;
  padding-top: 22px;
}
.ig-page .igd-org-children-row::before {
  content: ''; position: absolute;
  top: 0; left: 50%;
  width: 2px; height: 22px;
  background: var(--accent-soft, rgba(37,99,235,.3));
  transform: translateX(-50%);
}
.ig-page .igd-org-h-bar {
  position: absolute;
  top: 0; height: 2px;
  background: var(--accent-soft, rgba(37,99,235,.3));
}
.ig-page .igd-org-child-wrap {
  display: flex; flex-direction: column; align-items: center;
  position: relative; gap: 0;
}
.ig-page .igd-org-child-wrap::before {
  content: ''; width: 2px; height: 22px;
  background: var(--accent-soft, rgba(37,99,235,.3));
}

/* ── pyramid-diagram (SVG trapezoid bands + right text column) ── */
.ig-page .igd-pyrd-wrap {
  display: flex; align-items: center; gap: 16px; padding: 8px;
}
.ig-page .igd-pyrd-svg-col {
  flex: 0 0 160px;
}
.ig-page .igd-pyrd-svg-col svg { width: 100%; height: auto; }
.ig-page .igd-pyrd-text-col {
  flex: 1; display: flex; flex-direction: column; gap: 6px;
}
.ig-page .igd-pyrd-text-item {
  display: flex; align-items: flex-start; gap: 8px;
}
.ig-page .igd-pyrd-swatch {
  width: 12px; height: 12px; border-radius: 2px;
  flex-shrink: 0; margin-top: 3px;
}
.ig-page .igd-pyrd-text-item .igd-title { font-size: 0.82em; }
.ig-page .igd-pyrd-text-item .igd-body  { font-size: 0.72em; }

/* ── nested-diamonds (SVG + right text column) ── */
.ig-page .igd-ndiam-wrap {
  display: flex; align-items: center; gap: 16px; padding: 8px;
}
.ig-page .igd-ndiam-svg-col {
  flex: 0 0 160px; display: flex; align-items: center; justify-content: center;
}
.ig-page .igd-ndiam-svg-col svg { width: 100%; height: auto; }
.ig-page .igd-ndiam-text-col {
  flex: 1; display: flex; flex-direction: column; gap: 8px;
}
.ig-page .igd-ndiam-text-item {
  display: flex; align-items: flex-start; gap: 8px; max-width: 200px;
}
.ig-page .igd-ndiam-badge {
  width: 20px; height: 20px; border-radius: 3px;
  flex-shrink: 0; margin-top: 2px;
  transform: rotate(45deg);
  background: var(--accent);
}
.ig-page .igd-ndiam-text-item .igd-title { font-size: 0.82em; }
.ig-page .igd-ndiam-text-item .igd-body  { font-size: 0.72em; }
`;

/**
 * renderHierarchy — Hierarchy / structure diagrams
 * Variants: org-chart, pyramid-diagram, nested-diamonds
 */
export function renderHierarchy(items, variant, tone, columns, density) {
  const list = items.slice(0, 7);

  /* ── org-chart ── */
  if (variant === 'org-chart') {
    const root     = list[0];
    const children = list.slice(1, 7);
    const n        = children.length;
    const rTitle   = esc(trunc(root?.title || '', 25));
    const rBody    = esc(dgTruncateBody(root?.body || '', density));

    // Compute horizontal bar extents: spans center of first child to center of last child
    // With N children in flex gap:20px, each takes equal width.
    // Approximately: left = 50%/N, right = 50%/N (from each edge to center of edge child)
    const halfUnit = n > 1 ? `${(100 / (n * 2)).toFixed(1)}%` : '50%';

    const childNodes = children.map(item => {
      const title = esc(trunc(item.title || '', 25));
      const body  = esc(dgTruncateBody(item.body || '', density));
      return `<div class="igd-org-child-wrap">
        <div class="igd-org-node">
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div class="igd-org">
      <div class="igd-org-node igd-org-root-node">
        <p class="igd-title">${rTitle}</p>
        ${rBody ? `<p class="igd-body">${rBody}</p>` : ''}
      </div>
      ${children.length ? `
        <div class="igd-org-connector-v"></div>
        <div class="igd-org-children-row">
          <div class="igd-org-h-bar" style="left:${halfUnit};right:${halfUnit}"></div>
          ${childNodes}
        </div>` : ''}
    </div>`;
  }

  /* ── pyramid-diagram (SVG trapezoid bands, top=apex/darkest) ── */
  if (variant === 'pyramid-diagram') {
    const n    = Math.min(list.length, 6) || 1;
    const data = list.slice(0, n);

    // SVG triangle: apex at (90, 0), base at (0, 200) and (180, 200)
    // Band i (0=top/apex, n-1=bottom/base)
    let bands = '';
    for (let i = 0; i < n; i++) {
      const top_y = (i / n) * 200;
      const bot_y = ((i + 1) / n) * 200;
      const tl    = 90 - top_y / 2;
      const tr    = 90 + top_y / 2;
      const bl    = 90 - bot_y / 2;
      const br    = 90 + bot_y / 2;
      // top=darkest (i=0), bottom=lightest (i=n-1)
      const alpha = parseFloat((0.85 - i * (0.65 / Math.max(n - 1, 1))).toFixed(2));
      bands += `<polygon points="${tl.toFixed(1)},${top_y.toFixed(1)} ${tr.toFixed(1)},${top_y.toFixed(1)} ${br.toFixed(1)},${bot_y.toFixed(1)} ${bl.toFixed(1)},${bot_y.toFixed(1)}"
        fill="var(--accent)" opacity="${alpha}"/>`;
      // Separator line between bands (except after last)
      if (i < n - 1) {
        bands += `<line x1="${bl.toFixed(1)}" y1="${bot_y.toFixed(1)}" x2="${br.toFixed(1)}" y2="${bot_y.toFixed(1)}"
          stroke="rgba(255,255,255,0.4)" stroke-width="1"/>`;
      }
    }

    const textItems = data.map((item, i) => {
      const title = esc(trunc(item.title || '', 25));
      const body  = esc(dgTruncateBody(item.body || '', density));
      const alpha = parseFloat((0.85 - i * (0.65 / Math.max(n - 1, 1))).toFixed(2));
      return `<div class="igd-pyrd-text-item">
        <div class="igd-pyrd-swatch" style="background:var(--accent);opacity:${alpha}"></div>
        <div>
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div class="igd-pyrd-wrap">
      <div class="igd-pyrd-svg-col">
        <svg viewBox="0 0 180 205" xmlns="http://www.w3.org/2000/svg">${bands}</svg>
      </div>
      <div class="igd-pyrd-text-col">${textItems}</div>
    </div>`;
  }

  /* ── nested-diamonds (SVG overlapping diamonds, top=smallest) ── */
  if (variant === 'nested-diamonds') {
    const n    = Math.min(Math.max(list.length, 2), 4);
    const data = list.slice(0, n);

    // Diamond sizes: top smallest, bottom largest
    const sizes    = Array.from({ length: n }, (_, i) => 65 + i * 30); // 65, 95, 125, 155
    const overlap  = 0.42; // each diamond's center is offset 58% of its height from prev
    const svgW     = 160;

    // Compute diamond center_y positions
    const centerYs = [];
    let y = sizes[0] / 2;
    for (let i = 0; i < n; i++) {
      centerYs.push(y);
      if (i < n - 1) y += sizes[i] * (1 - overlap);
    }
    const svgH = Math.ceil(centerYs[n - 1] + sizes[n - 1] / 2) + 4;
    const cx   = svgW / 2;

    let diamonds = '';
    for (let i = 0; i < n; i++) {
      const s     = sizes[i] / 2; // half-size (half-diagonal)
      const dy    = centerYs[i];
      // top=lightest (i=0), bottom=darkest (i=n-1)
      const alpha = parseFloat((0.25 + i * (0.55 / Math.max(n - 1, 1))).toFixed(2));
      diamonds += `<polygon
        points="${cx},${(dy - s).toFixed(1)} ${(cx + s).toFixed(1)},${dy.toFixed(1)} ${cx},${(dy + s).toFixed(1)} ${(cx - s).toFixed(1)},${dy.toFixed(1)}"
        fill="var(--accent)" opacity="${alpha}"/>`;
      // Item number label inside diamond
      diamonds += `<text x="${cx}" y="${(dy + 4).toFixed(1)}" text-anchor="middle"
        font-family="var(--font-heading,'Space Grotesk',sans-serif)"
        font-size="11" font-weight="700" fill="#fff" opacity="0.85">${i + 1}</text>`;
    }

    const textItems = data.map((item, i) => {
      const title = esc(trunc(item.title || '', 25));
      const body  = esc(dgTruncateBody(item.body || '', density));
      const alpha = parseFloat((0.25 + i * (0.55 / Math.max(n - 1, 1))).toFixed(2));
      return `<div class="igd-ndiam-text-item">
        <div class="igd-ndiam-badge" style="opacity:${alpha + 0.15}"></div>
        <div>
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div class="igd-ndiam-wrap">
      <div class="igd-ndiam-svg-col">
        <svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">${diamonds}</svg>
      </div>
      <div class="igd-ndiam-text-col">${textItems}</div>
    </div>`;
  }

  return renderHierarchy(items, 'org-chart', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   FAMILY 4 — VENN
   Variants: venn-diagram, linear-venn, linear-venn-filled
   Item roles:
     venn-diagram       — 2 or 3 items = overlapping circles
     linear-venn        — 2–5 items = horizontal outline circles in a row
     linear-venn-filled — 2–5 items = horizontal filled circles in a row
═══════════════════════════════════════════════════════════════ */

export const VENN_CSS = `
/* ── venn-diagram ── */
.ig-page .igd-venn-svg-wrap {
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.ig-page .igd-venn-svg-wrap svg { width: 100%; height: auto; max-width: 420px; }

/* ── linear-venn shared ── */
.ig-page .igd-linvenn-wrap {
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; padding: 8px 4px;
}
.ig-page .igd-linvenn-wrap svg { width: 100%; height: auto; }
`;

/**
 * renderVenn — Venn / Relationship diagrams
 * Variants: venn-diagram, linear-venn, linear-venn-filled
 */
export function renderVenn(items, variant, tone, columns, density) {
  const list = items.slice(0, 5);

  /* ── venn-diagram (classic overlapping circles, 2–3 items) ── */
  if (variant === 'venn-diagram') {
    const n = Math.min(Math.max(list.length, 2), 3);
    const data = list.slice(0, n);

    if (n === 2) {
      const r   = 110;
      const gap = 90; // center-to-center (gives ~40% overlap: 2r-gap=130, /2r=0.59... ok, ~40% of radius)
      const c1x = 200 - gap / 2;
      const c2x = 200 + gap / 2;
      const cy  = 150;
      const t0  = esc(trunc(data[0]?.title || '', 22));
      const t1  = esc(trunc(data[1]?.title || '', 22));
      return `<div class="igd-venn-svg-wrap">
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${c1x}" cy="${cy}" r="${r}" fill="var(--accent)" opacity="0.35"/>
          <circle cx="${c2x}" cy="${cy}" r="${r}" fill="var(--accent)" opacity="0.55"/>
          <text x="${c1x - 32}" y="${cy + 5}" text-anchor="middle"
            font-family="var(--font-heading,'Space Grotesk',sans-serif)"
            font-size="13" font-weight="700" fill="var(--text-primary,#111827)">${t0}</text>
          <text x="${c2x + 32}" y="${cy + 5}" text-anchor="middle"
            font-family="var(--font-heading,'Space Grotesk',sans-serif)"
            font-size="13" font-weight="700" fill="var(--text-primary,#111827)">${t1}</text>
          <text x="200" y="${cy + 5}" text-anchor="middle"
            font-family="var(--font-body,'Plus Jakarta Sans',sans-serif)"
            font-size="10" fill="var(--text-secondary,#6b7280)" opacity="0.8">∩</text>
        </svg>
      </div>`;
    }

    // 3-circle triangle arrangement
    const r3  = 95;
    // Triangle of centers: equilateral, side ≈ 140px
    const side = 138;
    const ax = 200, ay = 110;
    const bx = 200 - side / 2, by = 110 + side * 0.866;
    const cx3 = 200 + side / 2, cy3 = by;
    const ta = esc(trunc(data[0]?.title || '', 18));
    const tb = esc(trunc(data[1]?.title || '', 18));
    const tc = esc(trunc(data[2]?.title || '', 18));
    return `<div class="igd-venn-svg-wrap">
      <svg viewBox="0 0 400 330" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${ax}" cy="${ay}" r="${r3}" fill="var(--accent)" opacity="0.30"/>
        <circle cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" r="${r3}" fill="var(--accent)" opacity="0.45"/>
        <circle cx="${cx3.toFixed(0)}" cy="${cy3.toFixed(0)}" r="${r3}" fill="var(--accent)" opacity="0.60"/>
        <text x="${ax}" y="${ay - 55}" text-anchor="middle"
          font-family="var(--font-heading,'Space Grotesk',sans-serif)"
          font-size="12" font-weight="700" fill="var(--text-primary,#111827)">${ta}</text>
        <text x="${(bx - 38).toFixed(0)}" y="${(by + 45).toFixed(0)}" text-anchor="end"
          font-family="var(--font-heading,'Space Grotesk',sans-serif)"
          font-size="12" font-weight="700" fill="var(--text-primary,#111827)">${tb}</text>
        <text x="${(cx3 + 38).toFixed(0)}" y="${(cy3 + 45).toFixed(0)}" text-anchor="start"
          font-family="var(--font-heading,'Space Grotesk',sans-serif)"
          font-size="12" font-weight="700" fill="var(--text-primary,#111827)">${tc}</text>
        <text x="200" y="${(ay + (by - ay) * 0.5 + 8).toFixed(0)}" text-anchor="middle"
          font-family="var(--font-body,'Plus Jakarta Sans',sans-serif)"
          font-size="9" fill="var(--text-secondary,#6b7280)" opacity="0.7">∩</text>
      </svg>
    </div>`;
  }

  /* ── linear-venn (outline circles in a row) ── */
  if (variant === 'linear-venn') {
    const n    = Math.min(Math.max(list.length, 2), 5);
    const data = list.slice(0, n);
    const r    = 55;
    const step = r * 1.4; // center-to-center (30% overlap on diameter = 0.3*2r=33, step=2r-33=77... approx)
    const totalW = 2 * r + (n - 1) * step;
    const vbW    = Math.max(totalW + 20, 200);
    const vbH    = 2 * r + 50; // +50 for text below
    const startX = (vbW - totalW) / 2 + r;
    const cy2    = r + 4;

    let circles = '', labels = '';
    for (let i = 0; i < n; i++) {
      const x     = startX + i * step;
      const title = esc(trunc(data[i]?.title || '', 15));
      const body  = esc(trunc(data[i]?.body || '', 18));
      circles += `<circle cx="${x.toFixed(1)}" cy="${cy2}" r="${r}"
        fill="none" stroke="var(--accent)" stroke-width="2" opacity="0.8"/>`;
      labels += `<text x="${x.toFixed(1)}" y="${cy2 - 4}" text-anchor="middle"
        font-family="var(--font-heading,'Space Grotesk',sans-serif)"
        font-size="11" font-weight="700" fill="var(--text-primary,#111827)">${title}</text>`;
      if (body) {
        labels += `<text x="${x.toFixed(1)}" y="${cy2 + 13}" text-anchor="middle"
          font-family="var(--font-body,'Plus Jakarta Sans',sans-serif)"
          font-size="9" fill="var(--text-secondary,#6b7280)">${body}</text>`;
      }
    }

    return `<div class="igd-linvenn-wrap">
      <svg viewBox="0 0 ${vbW.toFixed(0)} ${vbH}" xmlns="http://www.w3.org/2000/svg">
        ${circles}${labels}
      </svg>
    </div>`;
  }

  /* ── linear-venn-filled (filled circles in a row) ── */
  if (variant === 'linear-venn-filled') {
    const n    = Math.min(Math.max(list.length, 2), 5);
    const data = list.slice(0, n);
    const r    = 55;
    const step = r * 1.4;
    const totalW = 2 * r + (n - 1) * step;
    const vbW    = Math.max(totalW + 20, 200);
    const vbH    = 2 * r + 8;
    const startX = (vbW - totalW) / 2 + r;
    const cy2    = r + 4;

    let circles = '', labels = '';
    for (let i = 0; i < n; i++) {
      const x     = startX + i * step;
      const alpha = parseFloat((0.35 + i * (0.45 / Math.max(n - 1, 1))).toFixed(2));
      const title = esc(trunc(data[i]?.title || '', 15));
      const body  = esc(trunc(data[i]?.body || '', 18));
      circles += `<circle cx="${x.toFixed(1)}" cy="${cy2}" r="${r}"
        fill="var(--accent)" opacity="${alpha}"/>`;
      labels += `<text x="${x.toFixed(1)}" y="${cy2 - 4}" text-anchor="middle"
        font-family="var(--font-heading,'Space Grotesk',sans-serif)"
        font-size="11" font-weight="700" fill="#fff">${title}</text>`;
      if (body) {
        labels += `<text x="${x.toFixed(1)}" y="${cy2 + 13}" text-anchor="middle"
          font-family="var(--font-body,'Plus Jakarta Sans',sans-serif)"
          font-size="9" fill="rgba(255,255,255,0.85)">${body}</text>`;
      }
    }

    return `<div class="igd-linvenn-wrap">
      <svg viewBox="0 0 ${vbW.toFixed(0)} ${vbH}" xmlns="http://www.w3.org/2000/svg">
        ${circles}${labels}
      </svg>
    </div>`;
  }

  return renderVenn(items, 'venn-diagram', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   FAMILY 5 — PROCESS
   Variants: infinity-loop
   Item roles:
     infinity-loop — exactly 4 items: [0]=TL, [1]=TR, [2]=BL, [3]=BR
═══════════════════════════════════════════════════════════════ */

export const PROCESS_CSS = `
/* ── infinity-loop ── */
.ig-page .igd-inf-outer {
  display: grid;
  grid-template-areas: "tl svg tr" "bl svg br";
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px 12px;
  padding: 12px;
  min-height: 190px;
  align-items: center;
}
.ig-page .igd-inf-svg-area {
  grid-area: svg;
  display: flex; align-items: center; justify-content: center;
}
.ig-page .igd-inf-svg-area svg { width: 100%; height: auto; }
.ig-page .igd-inf-box-tl { grid-area: tl; text-align: right; }
.ig-page .igd-inf-box-tr { grid-area: tr; }
.ig-page .igd-inf-box-bl { grid-area: bl; text-align: right; }
.ig-page .igd-inf-box-br { grid-area: br; }
.ig-page .igd-inf-box {
  display: flex; flex-direction: column; gap: 2px;
}
.ig-page .igd-inf-dot {
  display: inline-block;
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent); opacity: 0.7;
  flex-shrink: 0; margin-top: 5px;
}
.ig-page .igd-inf-box .igd-title { font-size: 0.82em; }
`;

/**
 * renderProcess — Process / Motion / Flow diagrams
 * Variants: infinity-loop (exactly 4 items)
 */
export function renderProcess(items, variant, tone, columns, density) {

  /* ── infinity-loop (SVG lemniscate + 4 corner text boxes) ── */
  if (variant === 'infinity-loop') {
    // Always use exactly 4 items, pad if needed
    const data = [0, 1, 2, 3].map(i => items[i] || { title: `Item ${i + 1}`, body: '' });
    const tlT = esc(trunc(data[0].title || '', 25));
    const trT = esc(trunc(data[1].title || '', 25));
    const blT = esc(trunc(data[2].title || '', 25));
    const brT = esc(trunc(data[3].title || '', 25));

    // SVG infinity/lemniscate using cubic bezier curves
    // viewBox: 0 0 400 200, center at (200, 100)
    // Two loops: right loop center ~(290,100), left loop center ~(110,100)
    const infPath = `M 200,100
      C 200,42 310,42 310,100
      C 310,158 200,158 200,100
      C 200,42 90,42 90,100
      C 90,158 200,158 200,100 Z`;

    const svgHtml = `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="infGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:var(--accent);stop-opacity:0.55"/>
          <stop offset="50%" style="stop-color:var(--accent);stop-opacity:0.75"/>
          <stop offset="100%" style="stop-color:var(--accent);stop-opacity:0.60"/>
        </linearGradient>
      </defs>
      <path d="${infPath}" fill="url(#infGrad)"/>
      <path d="${infPath}" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.4"/>
    </svg>`;

    return `<div class="igd-inf-outer">
      <div class="igd-inf-box-tl igd-inf-box">
        <p class="igd-title">${tlT}</p>
        <span class="igd-inf-dot" style="align-self:flex-end"></span>
      </div>
      <div class="igd-inf-box-tr igd-inf-box">
        <p class="igd-title">${trT}</p>
        <span class="igd-inf-dot"></span>
      </div>
      <div class="igd-inf-svg-area">${svgHtml}</div>
      <div class="igd-inf-box-bl igd-inf-box">
        <span class="igd-inf-dot" style="align-self:flex-end"></span>
        <p class="igd-title">${blT}</p>
      </div>
      <div class="igd-inf-box-br igd-inf-box">
        <span class="igd-inf-dot"></span>
        <p class="igd-title">${brT}</p>
      </div>
    </div>`;
  }

  // fallback
  return renderProcess(items, 'infinity-loop', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   FAMILY 6 — BUSINESS
   Variants: swot, competitive-map, chain
   Item roles:
     swot           — items[0]=Strengths, items[1]=Weaknesses,
                      items[2]=Opportunities, items[3]=Threats
     competitive-map — items[0..n-1] positioned on a 2-axis grid
     chain          — items[0..5] = sequential chain links (min 2, max 6)
═══════════════════════════════════════════════════════════════ */

export const BUSINESS_CSS = `
/* ── swot ── */
.ig-page .igd-swot {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 3px; border-radius: var(--radius-card, 10px); overflow: hidden;
  border: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igd-swot-cell {
  padding: 12px 14px; overflow: hidden; min-height: 80px;
}
.ig-page .igd-swot-cell--s { background: rgba(16, 185, 129, 0.12); }
.ig-page .igd-swot-cell--w { background: rgba(239,  68,  68, 0.10); }
.ig-page .igd-swot-cell--o { background: rgba(59, 130, 246, 0.10); }
.ig-page .igd-swot-cell--t { background: rgba(245, 158,  11, 0.10); }
.ig-page .igd-swot-hdr {
  display: inline-flex; align-items: center; gap: 6px;
  margin-bottom: 6px;
}
.ig-page .igd-swot-badge {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.72em; font-weight: 800; color: #fff;
  flex-shrink: 0;
}
.ig-page .igd-swot-cell--s .igd-swot-badge { background: #10B981; }
.ig-page .igd-swot-cell--w .igd-swot-badge { background: #EF4444; }
.ig-page .igd-swot-cell--o .igd-swot-badge { background: #3B82F6; }
.ig-page .igd-swot-cell--t .igd-swot-badge { background: #F59E0B; }
.ig-page .igd-swot-cell-name {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.75em; font-weight: 700;
}
.ig-page .igd-swot-cell--s .igd-swot-cell-name { color: #065F46; }
.ig-page .igd-swot-cell--w .igd-swot-cell-name { color: #991B1B; }
.ig-page .igd-swot-cell--o .igd-swot-cell-name { color: #1D4ED8; }
.ig-page .igd-swot-cell--t .igd-swot-cell-name { color: #92400E; }

/* ── competitive-map ── */
.ig-page .igd-compmap {
  padding: 8px;
}
.ig-page .igd-cm-grid-wrap {
  position: relative;
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: var(--radius-card, 10px);
  overflow: hidden;
  background: var(--card-bg, #fff);
}
.ig-page .igd-cm-grid {
  position: relative; width: 100%; aspect-ratio: 1.4;
}
.ig-page .igd-cm-xline {
  position: absolute;
  left: 0; right: 0; top: 50%;
  height: 1px; background: var(--card-border, #e5e7eb);
}
.ig-page .igd-cm-yline {
  position: absolute;
  top: 0; bottom: 0; left: 50%;
  width: 1px; background: var(--card-border, #e5e7eb);
}
.ig-page .igd-cm-dot {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
}
.ig-page .igd-cm-dot-circle {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent, #2563EB);
  box-shadow: 0 0 0 3px var(--accent-soft, rgba(37,99,235,.2));
}
.ig-page .igd-cm-dot .igd-title {
  font-size: 0.65em; white-space: nowrap; max-width: 70px;
  overflow: hidden; text-overflow: ellipsis;
  background: var(--card-bg, #fff);
  padding: 1px 4px; border-radius: 4px;
  border: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igd-cm-axis-label {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.62em; color: var(--text-secondary, #6b7280);
  text-align: center; padding: 2px 8px;
}
.ig-page .igd-cm-axis-row {
  display: flex; justify-content: space-between; padding: 0 4px;
}

/* ── chain diagram ── */
.ig-page .igd-chain-wrap {
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; padding: 8px 4px;
}
.ig-page .igd-chain-wrap svg { width: 100%; height: auto; }
`;

/**
 * renderBusiness — Business / Framework diagrams
 * Variants: swot, competitive-map, chain
 */
export function renderBusiness(items, variant, tone, columns, density) {
  const list = items.slice(0, 9);

  /* ── swot ── */
  if (variant === 'swot') {
    const swotItems = [0, 1, 2, 3].map(i => list[i] || { title: ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'][i], body: '' });
    const swotMeta  = [
      { cls: 's', letter: 'S', name: 'Strengths' },
      { cls: 'w', letter: 'W', name: 'Weaknesses' },
      { cls: 'o', letter: 'O', name: 'Opportunities' },
      { cls: 't', letter: 'T', name: 'Threats' },
    ];
    const cells = swotItems.map((item, i) => {
      const { cls, letter, name } = swotMeta[i];
      const title = esc(dgTruncateTitle(item.title || name, density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      return `<div class="igd-swot-cell igd-swot-cell--${cls}">
        <div class="igd-swot-hdr">
          <div class="igd-swot-badge">${letter}</div>
          <span class="igd-swot-cell-name">${esc(name)}</span>
        </div>
        <p class="igd-title">${title}</p>
        ${body ? `<p class="igd-body">${body}</p>` : ''}
      </div>`;
    }).join('');
    return `<div class="igd-swot">${cells}</div>`;
  }

  /* ── competitive-map ── */
  if (variant === 'competitive-map') {
    const POSITIONS = [
      { x: 72, y: 25 }, { x: 25, y: 70 }, { x: 65, y: 68 }, { x: 28, y: 26 },
      { x: 55, y: 44 }, { x: 38, y: 55 }, { x: 78, y: 50 }, { x: 20, y: 42 },
    ];
    const dots = list.map((item, i) => {
      const pos   = POSITIONS[i % POSITIONS.length];
      const title = esc(dgTruncateTitle(item.title || '', density));
      return `<div class="igd-cm-dot" style="left:${pos.x}%;top:${pos.y}%">
        <div class="igd-cm-dot-circle"></div>
        <p class="igd-title">${title}</p>
      </div>`;
    }).join('');
    return `<div class="igd-compmap">
      <div class="igd-cm-grid-wrap">
        <div class="igd-cm-grid">
          <div class="igd-cm-xline"></div>
          <div class="igd-cm-yline"></div>
          ${dots}
        </div>
      </div>
      <div class="igd-cm-axis-row">
        <span class="igd-cm-axis-label">← Low</span>
        <span class="igd-cm-axis-label" style="font-weight:600">Value / Position</span>
        <span class="igd-cm-axis-label">High →</span>
      </div>
    </div>`;
  }

  /* ── chain diagram (SVG horizontal interlocking chain links) ── */
  if (variant === 'chain') {
    const n      = Math.min(Math.max(list.length, 2), 6);
    const data   = list.slice(0, n);
    const linkW  = 80;   // link width
    const linkH  = 50;   // link height
    const rx     = 25;   // corner radius (makes it look oval/pill)
    const overlapPx = linkW * 0.30; // 30% overlap
    const step   = linkW - overlapPx; // center-to-center x advance = 56px
    const totalW = linkW + (n - 1) * step;
    const vbW    = 500;
    const vbH    = 150;
    const startX = (vbW - totalW) / 2; // left edge of first link
    const linkTop = (vbH - linkH) / 2; // y position of link top = 50

    let links = '', titleLabels = '';
    for (let i = 0; i < n; i++) {
      const lx    = startX + i * step;
      const lCx   = lx + linkW / 2; // link center x
      const alpha = parseFloat((0.35 + i * (0.40 / Math.max(n - 1, 1))).toFixed(2));
      links += `<rect x="${lx.toFixed(1)}" y="${linkTop}" width="${linkW}" height="${linkH}" rx="${rx}"
        fill="var(--accent)" opacity="${alpha}"/>`;

      const title = esc(trunc(data[i]?.title || '', 25));
      const above = i % 2 === 0;
      const ty    = above ? 22 : 138;
      titleLabels += `<text x="${lCx.toFixed(1)}" y="${ty}" text-anchor="middle"
        font-family="var(--font-heading,'Space Grotesk',sans-serif)"
        font-size="11" font-weight="700" fill="var(--text-primary,#111827)">${title}</text>`;

      // Small connector dot between title and link
      const dotY = above ? 28 : 132;
      const dotDir = above ? 1 : -1;
      titleLabels += `<circle cx="${lCx.toFixed(1)}" cy="${(dotY + dotDir * 4).toFixed(1)}" r="2.5"
        fill="var(--accent)" opacity="0.6"/>`;
    }

    return `<div class="igd-chain-wrap">
      <svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg">
        ${links}${titleLabels}
      </svg>
    </div>`;
  }

  return renderBusiness(items, 'swot', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   COMBINED DIAGRAM CSS EXPORT
   All families concatenated — injected once by renderer.js
═══════════════════════════════════════════════════════════════ */

export const DIAGRAM_CSS = [
  ROAD_CSS,
  TARGET_CSS,
  HIERARCHY_CSS,
  VENN_CSS,
  PROCESS_CSS,
  BUSINESS_CSS,
].join('\n');

/* ═══════════════════════════════════════════════════════════════
   DIAGRAM FAMILIES REGISTRY
   Mirrors LAYOUT_FAMILIES from smart-layouts.js
═══════════════════════════════════════════════════════════════ */

export const DIAGRAM_FAMILIES = {
  road:      renderRoad,
  target:    renderTarget,
  hierarchy: renderHierarchy,
  venn:      renderVenn,
  process:   renderProcess,
  business:  renderBusiness,
};

/* Variant → family lookup (18 diagram variants) */
export const DIAGRAM_VARIANT_FAMILY_MAP = {
  // road
  'road-horizontal':     'road',
  'road-vertical':       'road',
  'journey-map':         'road',
  'experience-map':      'road',
  // target
  'bullseye':            'target',
  'radial':              'target',
  'orbit':               'target',
  // hierarchy
  'org-chart':           'hierarchy',
  'pyramid-diagram':     'hierarchy',
  'nested-diamonds':     'hierarchy',
  // venn
  'venn-diagram':        'venn',
  'linear-venn':         'venn',
  'linear-venn-filled':  'venn',
  // process
  'infinity-loop':       'process',
  // business
  'swot':                'business',
  'competitive-map':     'business',
  'chain':               'business',
};

/**
 * Render a diagram section using the appropriate family function.
 * Mirrors renderSection() from smart-layouts.js.
 *
 * @param {object} section — content group from content-v1 JSON
 *   { archetype, items, variant?, columns?, style? }
 * @param {string} [tone]  — 'professional' | 'bold' | 'minimal' | 'playful'
 * @returns {string} HTML string, or null if variant is unknown (caller falls back)
 */
export function renderDiagramSection(section, tone = 'professional') {
  const { items = [], variant = '', columns = 3, style: density = 'standard' } = section;
  const family = DIAGRAM_VARIANT_FAMILY_MAP[variant];
  if (!family) return null; // not a diagram variant — let layouts handle it
  const fn = DIAGRAM_FAMILIES[family];
  if (!fn) return null;
  return fn(items, variant, tone, columns, density);
}
