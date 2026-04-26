/**
 * Infogr.ai v3 — Smart Diagram Render Functions (Layer 2, Phase 4)
 *
 * Diagrams visualize RELATIONSHIPS, HIERARCHY, and MOVEMENT.
 * Different from Smart Layouts which organize content into grids/lists.
 *
 * All diagrams: pure HTML+CSS — no SVG diagram shapes, no canvas,
 * no external libraries. Icons use inline SVG (same as smart-layouts.js).
 *
 * Families:
 *   Road      — road-horizontal, road-vertical, journey-map, experience-map
 *   Target    — bullseye, radial, orbit, sunburst
 *   Hierarchy — org-chart, tree-horizontal, pyramid-diagram, nested-boxes
 *   Venn      — venn-2, venn-3, overlapping-sets, matrix-2x2
 *   Process   — circular-flow, swimlane, branching, infinity-loop
 *   Business  — swot, competitive-map, value-chain, bmc
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
  left: 0; right: 0; top: 50%;
  height: 3px;
  background: var(--card-border, #e5e7eb);
  transform: translateY(-50%);
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
      const title = esc(dgTruncateTitle(item.title || '', density));
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
    const stageRow = stages.map((item, i) => {
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
   Variants: bullseye, radial, orbit, sunburst
   Item roles:
     bullseye  — items[0] = center/most important, items[n-1] = outermost
     radial    — items[0] = center hub, items[1..] = spokes
     orbit     — items[0] = center, items[1..] = orbiting items
     sunburst  — items[0] = center, items[1..] = radiating segments
═══════════════════════════════════════════════════════════════ */

export const TARGET_CSS = `
/* ── bullseye ── */
.ig-page .igd-bullseye-wrap {
  display: flex; align-items: center; gap: 20px;
  padding: 12px;
}
.ig-page .igd-bullseye-diagram {
  position: relative;
  flex-shrink: 0;
}
.ig-page .igd-bull-ring {
  position: absolute;
  border-radius: 50%;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid var(--accent);
  opacity: 0.9;
  display: flex; align-items: center; justify-content: center;
  text-align: center;
}
.ig-page .igd-bull-ring--center {
  background: var(--accent);
  border-color: var(--accent);
}
.ig-page .igd-bull-ring--center .igd-title { color: #fff; font-size: 0.72em; }
.ig-page .igd-bull-legend {
  flex: 1; display: flex; flex-direction: column; gap: 8px;
}
.ig-page .igd-bull-leg-item {
  display: flex; align-items: center; gap: 8px;
}
.ig-page .igd-bull-leg-dot {
  width: 10px; height: 10px; border-radius: 50%;
  flex-shrink: 0;
}
.ig-page .igd-bull-leg-item .igd-title { font-size: 0.82em; }
.ig-page .igd-bull-leg-item .igd-body  { font-size: 0.7em; }

/* ── radial / orbit / sunburst shared ── */
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

/* ── orbit ring ── */
.ig-page .igd-orbit-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px dashed var(--card-border, #e5e7eb);
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 0;
}

/* ── sunburst ray items ── */
.ig-page .igd-sunburst-item {
  position: absolute;
  display: flex; align-items: center;
  transform: translate(-50%, -50%);
  z-index: 2;
}
.ig-page .igd-sunburst-card {
  background: var(--accent-soft, rgba(37,99,235,.1));
  border: 1px solid var(--accent);
  border-radius: var(--radius-card, 10px);
  padding: 6px 10px; text-align: center;
  max-width: 90px; overflow: hidden;
}
.ig-page .igd-sunburst-card .igd-title { color: var(--accent); font-size: 0.75em; }
`;

/**
 * renderTarget — Target / Radial diagrams
 * Variants: bullseye, radial, orbit, sunburst
 */
export function renderTarget(items, variant, tone, columns, density) {
  const list = items.slice(0, 7);

  /* ── bullseye ── */
  if (variant === 'bullseye') {
    const n = Math.max(list.length, 1);
    const outerPx = 220;
    const innerPx = Math.round(outerPx / n);
    // items[0] = center, items[n-1] = outermost
    // Render rings from outermost to innermost using z-index layering
    const alphas = Array.from({ length: n }, (_, i) =>
      parseFloat((0.12 + (i / Math.max(n - 1, 1)) * 0.28).toFixed(2))
    );
    let ringsHtml = '';
    for (let i = n - 1; i >= 0; i--) {
      const ringSize = Math.round(innerPx + (i / Math.max(n - 1, 1)) * (outerPx - innerPx));
      const isCenter = i === 0;
      const title = esc(dgTruncateTitle(list[i]?.title || '', density));
      ringsHtml += `<div class="igd-bull-ring${isCenter ? ' igd-bull-ring--center' : ''}"
        style="width:${ringSize}px;height:${ringSize}px;background:var(--accent,#2563EB);opacity:${alphas[i]};border-color:var(--accent,#2563EB)">
        ${isCenter ? `<p class="igd-title">${title}</p>` : ''}
      </div>`;
    }
    const legendItems = list.map((item, i) => {
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      const alpha = alphas[i];
      return `<div class="igd-bull-leg-item">
        <div class="igd-bull-leg-dot" style="background:var(--accent,#2563EB);opacity:${alpha + 0.5}"></div>
        <div>
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="igd-bullseye-wrap">
      <div class="igd-bullseye-diagram" style="width:${outerPx}px;height:${outerPx}px;flex-shrink:0">
        ${ringsHtml}
      </div>
      <div class="igd-bull-legend">${legendItems}</div>
    </div>`;
  }

  /* ── radial ── */
  if (variant === 'radial') {
    const hub    = list[0];
    const spokes = list.slice(1);
    const n      = spokes.length;
    const cSize  = 280; // container px
    const hubPx  = 80;
    const radius = (cSize / 2) - 55; // px from center
    const hubt   = esc(dgTruncateTitle(hub?.title || '', density));
    const hubb   = esc(dgTruncateBody(hub?.body || '', density));
    let spokesHtml = '';
    spokes.forEach((item, i) => {
      const angle   = (i / n) * 2 * Math.PI - Math.PI / 2;
      const cx      = cSize / 2;
      const cy      = cSize / 2;
      const ix      = cx + radius * Math.cos(angle);
      const iy      = cy + radius * Math.sin(angle);
      // spoke line from hub edge to item center
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

  /* ── orbit ── */
  if (variant === 'orbit') {
    const hub     = list[0];
    const orbital = list.slice(1);
    const n       = orbital.length;
    const cSize   = 280;
    const hubPx   = 80;
    const radius  = (cSize / 2) - 52;
    const hubt    = esc(dgTruncateTitle(hub?.title || '', density));
    const hubb    = esc(dgTruncateBody(hub?.body || '', density));
    let orbitsHtml = '';
    orbital.forEach((item, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const cx    = cSize / 2;
      const cy    = cSize / 2;
      const ix    = cx + radius * Math.cos(angle);
      const iy    = cy + radius * Math.sin(angle);
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      orbitsHtml += `<div class="igd-radial-item" style="left:${ix}px;top:${iy}px;max-width:82px">
        ${item.icon ? dgIconImg(item.icon, '', 18) : ''}
        <p class="igd-title">${title}</p>
        ${body ? `<p class="igd-body">${body}</p>` : ''}
      </div>`;
    });
    return `<div class="igd-radial-wrap" style="width:${cSize}px;height:${cSize}px">
      <div class="igd-orbit-ring" style="width:${radius * 2}px;height:${radius * 2}px"></div>
      <div class="igd-radial-hub" style="
        width:${hubPx}px;height:${hubPx}px;
        left:${cSize / 2}px;top:${cSize / 2}px;
        transform:translate(-50%,-50%)">
        <p class="igd-title">${hubt}</p>
        ${hubb ? `<p class="igd-body">${hubb}</p>` : ''}
      </div>
      ${orbitsHtml}
    </div>`;
  }

  /* ── sunburst ── */
  if (variant === 'sunburst') {
    const center  = list[0];
    const rays    = list.slice(1);
    const n       = rays.length;
    const cSize   = 280;
    const radius  = (cSize / 2) - 48;
    const centt   = esc(dgTruncateTitle(center?.title || '', density));
    const centb   = esc(dgTruncateBody(center?.body || '', density));
    let raysHtml  = '';
    rays.forEach((item, i) => {
      const angle  = (i / n) * 2 * Math.PI - Math.PI / 2;
      const cx     = cSize / 2;
      const cy     = cSize / 2;
      const ix     = cx + radius * Math.cos(angle);
      const iy     = cy + radius * Math.sin(angle);
      const title  = esc(dgTruncateTitle(item.title || '', density));
      const body   = esc(dgTruncateBody(item.body || '', density));
      raysHtml += `<div class="igd-sunburst-item" style="left:${ix}px;top:${iy}px">
        <div class="igd-sunburst-card">
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
      </div>`;
    });
    return `<div class="igd-radial-wrap" style="width:${cSize}px;height:${cSize}px">
      <div class="igd-radial-hub" style="
        width:90px;height:90px;
        left:${cSize / 2}px;top:${cSize / 2}px;
        transform:translate(-50%,-50%)">
        <p class="igd-title">${centt}</p>
        ${centb ? `<p class="igd-body">${centb}</p>` : ''}
      </div>
      ${raysHtml}
    </div>`;
  }

  return renderTarget(items, 'radial', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   FAMILY 3 — HIERARCHY
   Variants: org-chart, tree-horizontal, pyramid-diagram, nested-boxes
   Item roles:
     org-chart / tree-horizontal — items[0] = root, items[1..] = children
     pyramid-diagram — items[0] = apex (top/most important), items[n-1] = base
     nested-boxes — items[0] = outermost layer, items[n-1] = innermost
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
  display: flex; gap: 12px; position: relative;
  padding-top: 22px;
}
.ig-page .igd-org-children-row::before {
  content: ''; position: absolute;
  top: 0; left: 50%; right: auto;
  width: 0; height: 22px;
  border-left: 2px solid var(--accent-soft, rgba(37,99,235,.3));
}
.ig-page .igd-org-children-row::after {
  content: ''; position: absolute;
  top: 0; left: 10%; right: 10%;
  height: 2px;
  background: var(--accent-soft, rgba(37,99,235,.3));
}
.ig-page .igd-org-child-wrap {
  display: flex; flex-direction: column; align-items: center;
  padding-top: 0; position: relative; gap: 0;
}
.ig-page .igd-org-child-wrap::before {
  content: ''; width: 2px; height: 22px;
  background: var(--accent-soft, rgba(37,99,235,.3));
}

/* ── tree-horizontal ── */
.ig-page .igd-tree-h {
  display: flex; align-items: center; gap: 0; padding: 8px;
}
.ig-page .igd-tree-h-root {
  display: flex; flex-direction: column;
  align-items: flex-end; margin-right: 0;
}
.ig-page .igd-tree-h-connector {
  width: 28px; flex-shrink: 0;
  position: relative; align-self: stretch;
  display: flex; align-items: center;
}
.ig-page .igd-tree-h-connector::before {
  content: ''; position: absolute;
  top: 0; bottom: 0; left: 50%;
  width: 2px;
  background: var(--accent-soft, rgba(37,99,235,.3));
}
.ig-page .igd-tree-h-connector::after {
  content: ''; position: absolute;
  top: 50%; left: 50%;
  width: 14px; height: 2px;
  background: var(--accent-soft, rgba(37,99,235,.3));
}
.ig-page .igd-tree-h-children {
  display: flex; flex-direction: column; gap: 8px;
}
.ig-page .igd-tree-h-child {
  display: flex; align-items: center; gap: 0;
}
.ig-page .igd-tree-h-branch {
  width: 14px; height: 2px;
  background: var(--accent-soft, rgba(37,99,235,.3));
  flex-shrink: 0;
}

/* ── pyramid-diagram ── */
.ig-page .igd-pyrd {
  display: flex; flex-direction: column;
  align-items: center; gap: 2px; padding: 8px 0;
}
.ig-page .igd-pyrd-level {
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
  padding: 8px 16px; text-align: center;
  min-height: 42px; overflow: hidden;
  transition: width 0.2s;
}

/* ── nested-boxes ── */
.ig-page .igd-nested {
  padding: 10px;
  border-radius: var(--radius-card, 10px);
  border: 2px solid var(--accent);
  position: relative;
}
.ig-page .igd-nested-label {
  margin-bottom: 8px;
}
.ig-page .igd-nested .igd-nested {
  border-color: var(--accent);
  opacity: 0.85;
}
`;

/**
 * renderHierarchy — Hierarchy / structure diagrams
 * Variants: org-chart, tree-horizontal, pyramid-diagram, nested-boxes
 */
export function renderHierarchy(items, variant, tone, columns, density) {
  const list = items.slice(0, 7);

  /* ── org-chart ── */
  if (variant === 'org-chart') {
    const root     = list[0];
    const children = list.slice(1);
    const rTitle   = esc(dgTruncateTitle(root?.title || '', density));
    const rBody    = esc(dgTruncateBody(root?.body || '', density));
    const childNodes = children.map(item => {
      const title = esc(dgTruncateTitle(item.title || '', density));
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
        <div class="igd-org-children-row">${childNodes}</div>` : ''}
    </div>`;
  }

  /* ── tree-horizontal ── */
  if (variant === 'tree-horizontal') {
    const root     = list[0];
    const children = list.slice(1);
    const rTitle   = esc(dgTruncateTitle(root?.title || '', density));
    const rBody    = esc(dgTruncateBody(root?.body || '', density));
    const childNodes = children.map(item => {
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      return `<div class="igd-tree-h-child">
        <div class="igd-tree-h-branch"></div>
        <div class="igd-org-node">
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="igd-tree-h">
      <div class="igd-tree-h-root">
        <div class="igd-org-node igd-org-root-node">
          <p class="igd-title">${rTitle}</p>
          ${rBody ? `<p class="igd-body">${rBody}</p>` : ''}
        </div>
      </div>
      ${children.length ? `
        <div class="igd-tree-h-connector"></div>
        <div class="igd-tree-h-children">${childNodes}</div>` : ''}
    </div>`;
  }

  /* ── pyramid-diagram ── */
  if (variant === 'pyramid-diagram') {
    // items[0] = apex (narrowest), items[n-1] = base (widest)
    const n = list.length || 1;
    const levels = list.map((item, i) => {
      const pct   = Math.round(20 + (i / Math.max(n - 1, 1)) * 80);
      const alpha = parseFloat((0.15 + (i / Math.max(n - 1, 1)) * 0.65).toFixed(2));
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      return `<div class="igd-pyrd-level" style="
        width:${pct}%;
        background:var(--accent,#2563EB);
        opacity:${alpha + 0.2};
        clip-path:polygon(${5 + (i / Math.max(n - 1, 1)) * 0}% 0,${100 - (5 + (i / Math.max(n - 1, 1)) * 0)}% 0,100% 100%,0 100%)">
        <p class="igd-title" style="color:#fff">${title}</p>
        ${body ? `<p class="igd-body" style="color:rgba(255,255,255,0.85)">${body}</p>` : ''}
      </div>`;
    }).join('');
    return `<div class="igd-pyrd">${levels}</div>`;
  }

  /* ── nested-boxes ── */
  if (variant === 'nested-boxes') {
    // items[0] = outermost, items[n-1] = innermost
    const n = list.length;
    // Build from inside out (innermost first), then wrap
    let inner = '';
    for (let i = n - 1; i >= 0; i--) {
      const item  = list[i];
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      const alpha = parseFloat((0.15 + ((n - 1 - i) / Math.max(n - 1, 1)) * 0.55).toFixed(2));
      const isInnermost = i === n - 1;
      inner = `<div class="igd-nested" style="border-color:var(--accent,#2563EB);background:rgba(var(--accent-rgb,37,99,235),${alpha})">
        <div class="igd-nested-label">
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
        ${inner}
      </div>`;
    }
    return inner;
  }

  return renderHierarchy(items, 'org-chart', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   FAMILY 4 — VENN
   Variants: venn-2, venn-3, overlapping-sets, matrix-2x2
   Item roles:
     venn-2       — items[0] = left circle, items[1] = right circle
     venn-3       — items[0,1,2] = three circles; overlap from body text
     overlapping-sets — items[0] = left set, items[1] = right set
     matrix-2x2   — items[0]=TL, items[1]=TR, items[2]=BL, items[3]=BR
═══════════════════════════════════════════════════════════════ */

export const VENN_CSS = `
/* ── venn shared ── */
.ig-page .igd-venn-wrap {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center;
}

/* ── venn-2 ── */
.ig-page .igd-venn2 {
  position: relative; height: 200px; width: 100%;
  display: flex; align-items: center;
}
.ig-page .igd-v2-circle {
  position: absolute;
  width: 160px; height: 160px;
  border-radius: 50%;
  background: var(--accent, #2563EB);
  top: 50%; transform: translateY(-50%);
  opacity: 0.25;
}
.ig-page .igd-v2-circle--left  { left: 10%; }
.ig-page .igd-v2-circle--right { right: 10%; }
.ig-page .igd-v2-left-label {
  position: absolute; left: 4%; top: 50%;
  transform: translateY(-50%);
  width: 28%; text-align: center;
  z-index: 1;
}
.ig-page .igd-v2-right-label {
  position: absolute; right: 4%; top: 50%;
  transform: translateY(-50%);
  width: 28%; text-align: center;
  z-index: 1;
}
.ig-page .igd-v2-overlap-label {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  text-align: center; z-index: 1;
  max-width: 80px;
}

/* ── venn-3 ── */
.ig-page .igd-venn3 {
  position: relative; height: 240px; width: 100%;
}
.ig-page .igd-v3-circle {
  position: absolute;
  width: 140px; height: 140px;
  border-radius: 50%;
  background: var(--accent, #2563EB);
  opacity: 0.22;
}
.ig-page .igd-v3-circle--a { top:  8px; left: 50%; transform: translateX(-50%); }
.ig-page .igd-v3-circle--b { bottom: 8px; left: 20%; }
.ig-page .igd-v3-circle--c { bottom: 8px; right: 20%; }
.ig-page .igd-v3-label {
  position: absolute; text-align: center; z-index: 1;
  max-width: 90px;
}
.ig-page .igd-v3-label--a { top: 12px; left: 50%; transform: translateX(-50%); }
.ig-page .igd-v3-label--b { bottom: 12px; left: 8%; }
.ig-page .igd-v3-label--c { bottom: 12px; right: 8%; }
.ig-page .igd-v3-center {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -44%);
  text-align: center; z-index: 1;
}

/* ── overlapping-sets ── */
.ig-page .igd-overlap-sets {
  display: flex; align-items: center; justify-content: center;
  padding: 8px; gap: 0;
}
.ig-page .igd-ovlp-circle {
  width: 170px; height: 170px;
  border-radius: 50%;
  background: var(--accent, #2563EB);
  opacity: 0.22;
  position: absolute;
}
.ig-page .igd-ovlp-set {
  width: 150px; height: 150px;
  border-radius: 50%;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  text-align: center;
  padding: 24px 16px;
  box-sizing: border-box;
  z-index: 1;
}
.ig-page .igd-ovlp-set::before {
  content: ''; position: absolute; inset: 0;
  border-radius: 50%;
  background: var(--accent, #2563EB); opacity: 0.18;
}
.ig-page .igd-ovlp-set--left  { margin-right: -36px; }
.ig-page .igd-ovlp-set--right { margin-left: -36px; }
.ig-page .igd-ovlp-both {
  z-index: 2; text-align: center;
  position: relative; padding: 0 6px;
}

/* ── matrix-2x2 ── */
.ig-page .igd-matrix-wrap {
  padding: 8px 0;
}
.ig-page .igd-matrix-axis-row {
  display: flex; align-items: center; gap: 4px; margin-bottom: 4px;
}
.ig-page .igd-matrix-axis-label {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.65em; font-weight: 600; color: var(--text-secondary, #6b7280);
  text-transform: uppercase; letter-spacing: 0.04em;
  text-align: center; flex: 1;
}
.ig-page .igd-matrix-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 2px; border-radius: var(--radius-card, 10px); overflow: hidden;
  border: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igd-matrix-cell {
  background: var(--card-bg, #fff);
  padding: 14px 12px; overflow: hidden;
  border: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igd-matrix-cell--accent {
  background: var(--accent-soft, rgba(37,99,235,.08));
}
.ig-page .igd-matrix-y-wrap {
  display: flex; gap: 4px; align-items: stretch;
}
.ig-page .igd-matrix-y-label {
  writing-mode: vertical-rl; text-orientation: mixed;
  transform: rotate(180deg);
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.65em; font-weight: 600; color: var(--text-secondary, #6b7280);
  text-transform: uppercase; letter-spacing: 0.04em;
  text-align: center; padding: 4px 0;
  display: flex; align-items: center; justify-content: center;
  min-width: 18px;
}
`;

/**
 * renderVenn — Venn / Relationship / Matrix diagrams
 * Variants: venn-2, venn-3, overlapping-sets, matrix-2x2
 */
export function renderVenn(items, variant, tone, columns, density) {
  const list = items.slice(0, 8);

  /* ── venn-2 ── */
  if (variant === 'venn-2') {
    const left  = list[0] || {};
    const right = list[1] || {};
    const lt = esc(dgTruncateTitle(left.title  || '', density));
    const lb = esc(dgTruncateBody(left.body   || '', density));
    const rt = esc(dgTruncateTitle(right.title || '', density));
    const rb = esc(dgTruncateBody(right.body  || '', density));
    return `<div class="igd-venn-wrap">
      <div class="igd-venn2">
        <div class="igd-v2-circle igd-v2-circle--left"></div>
        <div class="igd-v2-circle igd-v2-circle--right"></div>
        <div class="igd-v2-left-label">
          <p class="igd-title">${lt}</p>
          ${lb ? `<p class="igd-body">${lb}</p>` : ''}
        </div>
        <div class="igd-v2-overlap-label">
          <p class="igd-label">Both</p>
        </div>
        <div class="igd-v2-right-label">
          <p class="igd-title">${rt}</p>
          ${rb ? `<p class="igd-body">${rb}</p>` : ''}
        </div>
      </div>
    </div>`;
  }

  /* ── venn-3 ── */
  if (variant === 'venn-3') {
    const a = list[0] || {};
    const b = list[1] || {};
    const c = list[2] || {};
    const at = esc(dgTruncateTitle(a.title || '', density));
    const ab = esc(dgTruncateBody(a.body  || '', density));
    const bt = esc(dgTruncateTitle(b.title || '', density));
    const bb = esc(dgTruncateBody(b.body  || '', density));
    const ct = esc(dgTruncateTitle(c.title || '', density));
    const cb = esc(dgTruncateBody(c.body  || '', density));
    return `<div class="igd-venn-wrap">
      <div class="igd-venn3">
        <div class="igd-v3-circle igd-v3-circle--a"></div>
        <div class="igd-v3-circle igd-v3-circle--b"></div>
        <div class="igd-v3-circle igd-v3-circle--c"></div>
        <div class="igd-v3-label igd-v3-label--a">
          <p class="igd-title">${at}</p>
          ${ab ? `<p class="igd-body">${ab}</p>` : ''}
        </div>
        <div class="igd-v3-label igd-v3-label--b">
          <p class="igd-title">${bt}</p>
          ${bb ? `<p class="igd-body">${bb}</p>` : ''}
        </div>
        <div class="igd-v3-label igd-v3-label--c">
          <p class="igd-title">${ct}</p>
          ${cb ? `<p class="igd-body">${cb}</p>` : ''}
        </div>
        <div class="igd-v3-center">
          <p class="igd-label">All</p>
        </div>
      </div>
    </div>`;
  }

  /* ── overlapping-sets ── */
  if (variant === 'overlapping-sets') {
    const left  = list[0] || {};
    const right = list[1] || {};
    const lt = esc(dgTruncateTitle(left.title  || '', density));
    const lb = esc(dgTruncateBody(left.body   || '', density));
    const rt = esc(dgTruncateTitle(right.title || '', density));
    const rb = esc(dgTruncateBody(right.body  || '', density));
    return `<div class="igd-venn-wrap">
      <div class="igd-overlap-sets">
        <div class="igd-ovlp-set igd-ovlp-set--left">
          <div>
            <p class="igd-title">${lt}</p>
            ${lb ? `<p class="igd-body">${lb}</p>` : ''}
          </div>
        </div>
        <div class="igd-ovlp-both">
          <p class="igd-label">∩</p>
        </div>
        <div class="igd-ovlp-set igd-ovlp-set--right">
          <div>
            <p class="igd-title">${rt}</p>
            ${rb ? `<p class="igd-body">${rb}</p>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ── matrix-2x2 ── */
  if (variant === 'matrix-2x2') {
    // items[0]=TL, items[1]=TR, items[2]=BL, items[3]=BR
    const cells = [0, 1, 2, 3].map(i => {
      const item  = list[i] || {};
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body  || '', density));
      const accent = (i === 1 || i === 2) ? ' igd-matrix-cell--accent' : '';
      return `<div class="igd-matrix-cell${accent}">
        <p class="igd-title">${title}</p>
        ${body ? `<p class="igd-body">${body}</p>` : ''}
      </div>`;
    }).join('');
    return `<div class="igd-matrix-wrap">
      <div class="igd-matrix-axis-row">
        <div style="width:18px;flex-shrink:0"></div>
        <div class="igd-matrix-axis-label">← Low</div>
        <div class="igd-matrix-axis-label">High →</div>
      </div>
      <div class="igd-matrix-y-wrap">
        <div class="igd-matrix-y-label">← Low · High →</div>
        <div class="igd-matrix-grid">${cells}</div>
      </div>
    </div>`;
  }

  return renderVenn(items, 'matrix-2x2', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   FAMILY 5 — PROCESS
   Variants: circular-flow, swimlane, branching, infinity-loop
   Item roles:
     circular-flow — items[0..n-1] flow in a circle (arrows between each)
     swimlane      — each item = a lane row
     branching     — items[0] = decision, items[1] = yes, items[2] = no,
                     items[3..] = further nodes
     infinity-loop — first half = left loop, second half = right loop
═══════════════════════════════════════════════════════════════ */

export const PROCESS_CSS = `
/* ── circular-flow ── */
.ig-page .igd-circ-flow {
  position: relative; margin: 0 auto;
}
.ig-page .igd-cf-node {
  position: absolute;
  background: var(--card-bg, #fff);
  border: 2px solid var(--accent);
  border-radius: var(--radius-card, 10px);
  padding: 8px 10px;
  text-align: center;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  transform: translate(-50%, -50%);
  overflow: hidden;
  max-width: 90px;
}
.ig-page .igd-cf-node .igd-title { font-size: 0.78em; }
.ig-page .igd-cf-node .igd-body  { font-size: 0.66em; }
.ig-page .igd-cf-arrow {
  position: absolute;
  color: var(--accent);
  font-size: 1.1em; font-weight: 700;
  transform: translate(-50%, -50%);
  z-index: 3; line-height: 1;
}

/* ── swimlane ── */
.ig-page .igd-swimlane {
  display: flex; flex-direction: column;
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: var(--radius-card, 10px); overflow: hidden;
}
.ig-page .igd-sw-lane {
  display: flex; align-items: stretch;
  border-bottom: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igd-sw-lane:last-child { border-bottom: none; }
.ig-page .igd-sw-num {
  width: 36px; min-width: 36px;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.82em; font-weight: 700; color: #fff;
  flex-shrink: 0;
}
.ig-page .igd-sw-content {
  padding: 10px 14px; flex: 1; overflow: hidden;
}
.ig-page .igd-sw-phase {
  display: inline-block;
  background: var(--accent-soft, rgba(37,99,235,.1));
  color: var(--accent);
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.62em; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px; border-radius: 10px; margin-bottom: 4px;
}

/* ── branching ── */
.ig-page .igd-branch {
  display: flex; flex-direction: column; align-items: center;
  padding: 8px; gap: 0;
}
.ig-page .igd-branch-node {
  background: var(--card-bg, #fff);
  border: 2px solid var(--accent);
  border-radius: var(--radius-card, 10px);
  padding: 10px 16px; text-align: center;
  box-shadow: var(--card-shadow, 0 1px 4px rgba(0,0,0,.08));
  overflow: hidden; max-width: 160px;
}
.ig-page .igd-branch-root-node {
  background: var(--accent); border-color: var(--accent);
}
.ig-page .igd-branch-root-node .igd-title { color: #fff; }
.ig-page .igd-branch-connector-v {
  width: 2px; height: 20px;
  background: var(--accent-soft, rgba(37,99,235,.3));
  margin: 0 auto;
}
.ig-page .igd-branch-arms {
  display: flex; gap: 16px; position: relative;
  padding-top: 0;
}
.ig-page .igd-branch-arms::before {
  content: ''; position: absolute;
  top: 0; left: 50%; right: auto;
  width: 0; height: 20px;
  border-left: 2px solid var(--accent-soft, rgba(37,99,235,.3));
}
.ig-page .igd-branch-arms::after {
  content: ''; position: absolute;
  top: 0; left: 15%; right: 15%;
  height: 2px;
  background: var(--accent-soft, rgba(37,99,235,.3));
}
.ig-page .igd-branch-arm {
  display: flex; flex-direction: column; align-items: center; gap: 0;
  padding-top: 0; position: relative;
}
.ig-page .igd-branch-arm::before {
  content: ''; width: 2px; height: 20px;
  background: var(--accent-soft, rgba(37,99,235,.3));
}
.ig-page .igd-branch-tag {
  display: inline-block;
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.62em; font-weight: 700;
  padding: 2px 8px; border-radius: 10px;
  margin-bottom: 4px;
}
.ig-page .igd-branch-tag--yes {
  background: rgba(16,185,129,0.15); color: #059669;
}
.ig-page .igd-branch-tag--no {
  background: rgba(239,68,68,0.15); color: #DC2626;
}
.ig-page .igd-branch-tag--else {
  background: var(--accent-soft, rgba(37,99,235,.1)); color: var(--accent);
}

/* ── infinity-loop ── */
.ig-page .igd-infinity {
  display: flex; align-items: center; justify-content: center;
  gap: 0; padding: 12px 8px;
}
.ig-page .igd-inf-loop {
  width: 160px; height: 120px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  background: var(--accent-soft, rgba(37,99,235,.08));
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 12px; gap: 4px; text-align: center;
  overflow: hidden;
  position: relative;
}
.ig-page .igd-inf-loop--left  { margin-right: -24px; z-index: 1; }
.ig-page .igd-inf-loop--right { margin-left: -24px; z-index: 1; }
.ig-page .igd-inf-loop-label {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.62em; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--accent); margin-bottom: 2px;
}
.ig-page .igd-inf-items {
  display: flex; flex-direction: column; gap: 3px; width: 100%;
}
`;

/**
 * renderProcess — Process / Motion / Flow diagrams
 * Variants: circular-flow, swimlane, branching, infinity-loop
 */
export function renderProcess(items, variant, tone, columns, density) {
  const list = items.slice(0, 8);

  /* ── circular-flow ── */
  if (variant === 'circular-flow') {
    const n      = list.length;
    const cSize  = 280;
    const radius = (cSize / 2) - 52;
    const positions = radialPositions(n, (radius / (cSize / 2)) * 50);
    const nodes = list.map((item, i) => {
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      const x     = positions[i].x;
      const y     = positions[i].y;
      return `<div class="igd-cf-node" style="left:${x}%;top:${y}%">
        <p class="igd-title">${title}</p>
        ${body ? `<p class="igd-body">${body}</p>` : ''}
      </div>`;
    }).join('');
    // Arrow indicators midway between each consecutive pair
    const arrows = list.map((_, i) => {
      const next = (i + 1) % n;
      const ax   = (positions[i].x + positions[next].x) / 2;
      const ay   = (positions[i].y + positions[next].y) / 2;
      return `<div class="igd-cf-arrow" style="left:${ax}%;top:${ay}%">›</div>`;
    }).join('');
    return `<div class="igd-circ-flow" style="width:${cSize}px;height:${cSize}px">
      ${nodes}${arrows}
    </div>`;
  }

  /* ── swimlane ── */
  if (variant === 'swimlane') {
    const lanes = list.map((item, i) => {
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      return `<div class="igd-sw-lane">
        <div class="igd-sw-num">${i + 1}</div>
        <div class="igd-sw-content">
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="igd-swimlane">${lanes}</div>`;
  }

  /* ── branching ── */
  if (variant === 'branching') {
    const root    = list[0];
    const yesNode = list[1];
    const noNode  = list[2];
    const rest    = list.slice(3);
    const rTitle  = esc(dgTruncateTitle(root?.title || 'Decision', density));
    const rBody   = esc(dgTruncateBody(root?.body || '', density));
    const yTitle  = esc(dgTruncateTitle(yesNode?.title || 'Yes path', density));
    const yBody   = esc(dgTruncateBody(yesNode?.body || '', density));
    const nTitle  = esc(dgTruncateTitle(noNode?.title || 'No path', density));
    const nBody   = esc(dgTruncateBody(noNode?.body || '', density));
    const extraArms = rest.map((item, i) => {
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      return `<div class="igd-branch-arm">
        <div class="igd-branch-tag igd-branch-tag--else">Path ${i + 3}</div>
        <div class="igd-branch-node">
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="igd-branch">
      <div class="igd-branch-node igd-branch-root-node">
        <p class="igd-title">${rTitle}</p>
        ${rBody ? `<p class="igd-body">${rBody}</p>` : ''}
      </div>
      <div class="igd-branch-connector-v"></div>
      <div class="igd-branch-arms">
        <div class="igd-branch-arm">
          <div class="igd-branch-tag igd-branch-tag--yes">Yes</div>
          <div class="igd-branch-node">
            <p class="igd-title">${yTitle}</p>
            ${yBody ? `<p class="igd-body">${yBody}</p>` : ''}
          </div>
        </div>
        <div class="igd-branch-arm">
          <div class="igd-branch-tag igd-branch-tag--no">No</div>
          <div class="igd-branch-node">
            <p class="igd-title">${nTitle}</p>
            ${nBody ? `<p class="igd-body">${nBody}</p>` : ''}
          </div>
        </div>
        ${extraArms}
      </div>
    </div>`;
  }

  /* ── infinity-loop ── */
  if (variant === 'infinity-loop') {
    const half    = Math.ceil(list.length / 2);
    const leftItems  = list.slice(0, half);
    const rightItems = list.slice(half);
    const leftHtml = leftItems.map(item => {
      const title = esc(dgTruncateTitle(item.title || '', density));
      return `<p class="igd-title" style="font-size:0.78em">${title}</p>`;
    }).join('');
    const rightHtml = rightItems.map(item => {
      const title = esc(dgTruncateTitle(item.title || '', density));
      return `<p class="igd-title" style="font-size:0.78em">${title}</p>`;
    }).join('');
    return `<div class="igd-infinity">
      <div class="igd-inf-loop igd-inf-loop--left">
        <div class="igd-inf-loop-label">Cycle A</div>
        <div class="igd-inf-items">${leftHtml}</div>
      </div>
      <div class="igd-inf-loop igd-inf-loop--right">
        <div class="igd-inf-loop-label">Cycle B</div>
        <div class="igd-inf-items">${rightHtml}</div>
      </div>
    </div>`;
  }

  return renderProcess(items, 'swimlane', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   FAMILY 6 — BUSINESS
   Variants: swot, competitive-map, value-chain, bmc
   Item roles:
     swot           — items[0]=Strengths, items[1]=Weaknesses,
                      items[2]=Opportunities, items[3]=Threats
     competitive-map — items[0..n-1] positioned on a 2-axis grid
     value-chain    — items[0..n-1] = sequential value-adding blocks
     bmc            — items[0..5] mapped to canvas blocks
                      [0]=Value Prop, [1]=Customer Segments,
                      [2]=Key Partners, [3]=Key Activities,
                      [4]=Revenue Streams, [5]=Cost Structure
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
.ig-page .igd-cm-y-labels {
  display: flex; flex-direction: column; justify-content: space-between;
  align-items: flex-end; padding: 4px 0;
}

/* ── value-chain ── */
.ig-page .igd-vchain {
  display: flex; align-items: stretch;
  gap: 0; overflow: hidden;
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: var(--radius-card, 10px);
}
.ig-page .igd-vc-item {
  flex: 1; position: relative; overflow: visible;
}
.ig-page .igd-vc-block {
  background: var(--card-bg, #fff);
  padding: 12px 14px 12px 10px;
  height: 100%; overflow: hidden;
  border-right: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igd-vc-item:last-child .igd-vc-block {
  border-right: none;
  background: var(--accent-soft, rgba(37,99,235,.08));
}
.ig-page .igd-vc-arrow {
  position: absolute;
  right: -11px; top: 50%;
  transform: translateY(-50%);
  width: 0; height: 0;
  border-top: 14px solid transparent;
  border-bottom: 14px solid transparent;
  border-left: 11px solid var(--card-border, #e5e7eb);
  z-index: 2;
}
.ig-page .igd-vc-arrow::after {
  content: '';
  position: absolute;
  top: -13px; left: -9px;
  width: 0; height: 0;
  border-top: 13px solid transparent;
  border-bottom: 13px solid transparent;
  border-left: 10px solid var(--card-bg, #fff);
}
.ig-page .igd-vc-item:last-child .igd-vc-arrow { display: none; }
.ig-page .igd-vc-step-num {
  font-family: var(--font-heading, 'Space Grotesk', sans-serif);
  font-size: 0.6em; font-weight: 700; color: var(--accent);
  text-transform: uppercase; letter-spacing: 0.04em;
  margin-bottom: 4px;
}

/* ── bmc ── */
.ig-page .igd-bmc {
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: var(--radius-card, 10px); overflow: hidden;
  background: var(--card-bg, #fff);
}
.ig-page .igd-bmc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  min-height: 200px;
}
.ig-page .igd-bmc-cell {
  padding: 10px 12px;
  border-right: 1px solid var(--card-border, #e5e7eb);
  border-bottom: 1px solid var(--card-border, #e5e7eb);
  overflow: hidden;
}
.ig-page .igd-bmc-cell:nth-child(5),
.ig-page .igd-bmc-cell:nth-child(10) { border-right: none; }
.ig-page .igd-bmc-cell:nth-child(6),
.ig-page .igd-bmc-cell:nth-child(7),
.ig-page .igd-bmc-cell:nth-child(8),
.ig-page .igd-bmc-cell:nth-child(9),
.ig-page .igd-bmc-cell:nth-child(10) { border-bottom: none; }
.ig-page .igd-bmc-cell-tag {
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.58em; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--accent);
  margin-bottom: 4px; display: block;
}
.ig-page .igd-bmc-cell--vp {
  background: var(--accent-soft, rgba(37,99,235,.08));
  grid-row: 1 / 3;
}
.ig-page .igd-bmc-footer {
  display: grid; grid-template-columns: 1fr 1fr;
  border-top: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igd-bmc-footer-cell {
  padding: 10px 12px; overflow: hidden;
}
.ig-page .igd-bmc-footer-cell:first-child {
  border-right: 1px solid var(--card-border, #e5e7eb);
}
.ig-page .igd-bmc-footer-cell .igd-bmc-cell-tag { display: block; }
`;

/**
 * renderBusiness — Business / Framework diagrams
 * Variants: swot, competitive-map, value-chain, bmc
 */
export function renderBusiness(items, variant, tone, columns, density) {
  const list = items.slice(0, 9);

  /* ── swot ── */
  if (variant === 'swot') {
    // items[0]=Strengths, items[1]=Weaknesses, items[2]=Opportunities, items[3]=Threats
    // Pad to 4 items
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
    // Pre-computed positions that spread items nicely across the grid
    const POSITIONS = [
      { x: 72, y: 25 }, // top-right (high/high)
      { x: 25, y: 70 }, // bottom-left (low/low)
      { x: 65, y: 68 }, // bottom-right (high/low)
      { x: 28, y: 26 }, // top-left (low/high)
      { x: 55, y: 44 }, // center-right
      { x: 38, y: 55 }, // center-left
      { x: 78, y: 50 }, // right-mid
      { x: 20, y: 42 }, // left-mid
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

  /* ── value-chain ── */
  if (variant === 'value-chain') {
    const chainItems = list.slice(0, 6);
    const blocks = chainItems.map((item, i) => {
      const title = esc(dgTruncateTitle(item.title || '', density));
      const body  = esc(dgTruncateBody(item.body || '', density));
      return `<div class="igd-vc-item">
        <div class="igd-vc-block">
          <div class="igd-vc-step-num">Step ${i + 1}</div>
          <p class="igd-title">${title}</p>
          ${body ? `<p class="igd-body">${body}</p>` : ''}
        </div>
        <div class="igd-vc-arrow"></div>
      </div>`;
    }).join('');
    return `<div class="igd-vchain">${blocks}</div>`;
  }

  /* ── bmc (Business Model Canvas, simplified) ── */
  if (variant === 'bmc') {
    // Canvas slots: Key Partners | Key Activities | Value Proposition | Customer Relationships | Customer Segments
    //              Key Partners  | Key Resources  | (VP spans 2 rows) | Channels               | (CS spans 2 rows)
    // Footer: Cost Structure | Revenue Streams
    const slots = [
      { key: 'Key Partners',       item: list[2] },
      { key: 'Key Activities',     item: list[3] },
      { key: 'Value Proposition',  item: list[0] },
      { key: 'Customer Relations', item: list[4] },
      { key: 'Customer Segments',  item: list[1] },
    ];
    // Row 2 (fill remaining for Key Resources & Channels)
    const row2 = [
      { key: 'Key Resources', item: list[5] || { title: 'Key Resources', body: '' } },
      { key: 'Channels',      item: list[5] || { title: 'Channels', body: '' } },
    ];
    const mainCells = slots.map(({ key, item }) => {
      const i = item || {};
      const title = esc(dgTruncateTitle(i.title || key, density));
      const body  = esc(dgTruncateBody(i.body || '', density));
      const vpClass = key === 'Value Proposition' ? ' igd-bmc-cell--vp' : '';
      return `<div class="igd-bmc-cell${vpClass}">
        <span class="igd-bmc-cell-tag">${esc(key)}</span>
        <p class="igd-title">${title}</p>
        ${body ? `<p class="igd-body">${body}</p>` : ''}
      </div>`;
    }).join('');
    const footerCost = list[6] || list[4] || { title: 'Cost Structure', body: '' };
    const footerRev  = list[7] || list[5] || { title: 'Revenue Streams', body: '' };
    return `<div class="igd-bmc">
      <div class="igd-bmc-grid">${mainCells}</div>
      <div class="igd-bmc-footer">
        <div class="igd-bmc-footer-cell">
          <span class="igd-bmc-cell-tag">Cost Structure</span>
          <p class="igd-title">${esc(dgTruncateTitle(footerCost.title || 'Cost Structure', density))}</p>
          ${footerCost.body ? `<p class="igd-body">${esc(dgTruncateBody(footerCost.body, density))}</p>` : ''}
        </div>
        <div class="igd-bmc-footer-cell">
          <span class="igd-bmc-cell-tag">Revenue Streams</span>
          <p class="igd-title">${esc(dgTruncateTitle(footerRev.title || 'Revenue Streams', density))}</p>
          ${footerRev.body ? `<p class="igd-body">${esc(dgTruncateBody(footerRev.body, density))}</p>` : ''}
        </div>
      </div>
    </div>`;
  }

  return renderBusiness(items, 'swot', tone, columns, density);
}

/* ═══════════════════════════════════════════════════════════════
   COMBINED DIAGRAM CSS EXPORT
   All 6 families concatenated — injected once by renderer.js
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

/* Variant → family lookup (all 24 diagram variants) */
export const DIAGRAM_VARIANT_FAMILY_MAP = {
  // road
  'road-horizontal':   'road',
  'road-vertical':     'road',
  'journey-map':       'road',
  'experience-map':    'road',
  // target
  'bullseye':          'target',
  'radial':            'target',
  'orbit':             'target',
  'sunburst':          'target',
  // hierarchy
  'org-chart':         'hierarchy',
  'tree-horizontal':   'hierarchy',
  'pyramid-diagram':   'hierarchy',
  'nested-boxes':      'hierarchy',
  // venn
  'venn-2':            'venn',
  'venn-3':            'venn',
  'overlapping-sets':  'venn',
  'matrix-2x2':        'venn',
  // process
  'circular-flow':     'process',
  'swimlane':          'process',
  'branching':         'process',
  'infinity-loop':     'process',
  // business
  'swot':              'business',
  'competitive-map':   'business',
  'value-chain':       'business',
  'bmc':               'business',
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
