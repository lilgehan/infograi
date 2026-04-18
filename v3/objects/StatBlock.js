/**
 * Infogr.ai v3 — StatBlock Object
 *
 * A number + label pair with an optional icon.
 * Very common in infographics — used in the stats row.
 *
 * Visual layout (horizontal, default):
 *   [ icon-wrap ] [ number ] [ label (below number) ]
 */

import { BaseObject } from './base.js';

export class StatBlock extends BaseObject {
  /**
   * @param {object} props — extends BaseObject props, plus:
   * @param {string}  [props.number]      — the big value: '94%', '5', '~15', '$2M' (default '—')
   * @param {string}  [props.label]       — what the number means (default '')
   * @param {string}  [props.iconName]    — Icons8 icon name for the icon-wrap (default null)
   * @param {string}  [props.accentColor] — color for the number (default 'var(--accent)')
   * @param {string}  [props.layout]      — 'horizontal' | 'vertical' (default 'horizontal')
   * @param {boolean} [props.useProxy]    — proxy icon URL (default true)
   */
  constructor(props = {}) {
    super({ ...props, type: 'StatBlock' });

    this.number      = props.number      ?? '—';
    this.label       = props.label       ?? '';
    this.iconName    = props.iconName    ?? null;
    this.accentColor = props.accentColor ?? 'var(--accent)';
    this.layout      = props.layout      ?? 'horizontal';
    this.useProxy    = props.useProxy    ?? true;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      number:      this.number,
      label:       this.label,
      iconName:    this.iconName,
      accentColor: this.accentColor,
      layout:      this.layout,
      useProxy:    this.useProxy,
    };
  }

  static fromJSON(json) {
    return new StatBlock(json);
  }

  /**
   * Build the icon <img> tag, or empty string if no icon.
   * @returns {string}
   */
  _iconHTML() {
    if (!this.iconName) return '';
    const base = 'https://img.icons8.com/fluency/96';
    const raw  = `${base}/${this.iconName}.png`;
    const src  = this.useProxy
      ? `/api/proxy?url=${encodeURIComponent(raw)}`
      : raw;

    return `<div class="ig-stat-icon-wrap" style="flex-shrink:0;width:40px;height:40px;border-radius:10px;background:var(--stat-icon-bg);display:flex;align-items:center;justify-content:center;overflow:hidden;">`
      + `<img src="${src}" alt="${this.iconName}" width="28" height="28" style="width:28px;height:28px;object-fit:contain;" data-icon="true" data-icon-name="${this.iconName}" />`
      + `</div>`;
  }

  /**
   * Render to HTML string — matches the .ig-stat class structure in template.html.
   * @returns {string}
   */
  toHTML() {
    const numStyle = [
      `font-family:'Space Grotesk',sans-serif`,
      `font-size:26px`,
      `font-weight:700`,
      `color:${this.accentColor}`,
      `line-height:1`,
      `letter-spacing:-0.02em`,
      `white-space:nowrap`,
    ].join(';');

    const labelStyle = [
      `font-family:'Plus Jakarta Sans',sans-serif`,
      `font-size:11.5px`,
      `font-weight:500`,
      `color:var(--text-secondary)`,
      `line-height:1.35`,
      `overflow:hidden`,
      `display:-webkit-box`,
      `-webkit-line-clamp:2`,
      `-webkit-box-orient:vertical`,
    ].join(';');

    const wrapStyle = [
      `background:var(--card-bg)`,
      `border:1px solid var(--card-border)`,
      `border-radius:var(--radius-card,14px)`,
      `box-shadow:var(--card-shadow)`,
      `padding:16px 18px`,
      `display:flex`,
      `align-items:center`,
      `gap:14px`,
      `overflow:hidden`,
    ].join(';');

    return `<div class="ig-stat" style="${wrapStyle}" data-object-id="${this.id}">`
      + this._iconHTML()
      + `<div class="ig-stat-text" style="min-width:0;display:flex;flex-direction:column;gap:2px;">`
      + `  <div class="ig-stat-num" style="${numStyle}">${escapeHtml(this.number)}</div>`
      + `  <div class="ig-stat-label" style="${labelStyle}">${escapeHtml(this.label)}</div>`
      + `</div>`
      + `</div>`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
