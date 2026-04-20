/**
 * Infogr.ai v3 — IconObject
 *
 * An Icons8 3D Fluency icon. The icon name is AI-chosen freely from Icons8's
 * 100,000+ icon library — no approved list. The renderer falls back gracefully
 * if a name doesn't exist.
 *
 * Size context guide (from INFOGRAI-SPECS):
 *   Hero / banner anchor       → 96–128px
 *   Section card anchor        → 72–80px (centered above text)
 *   Stats row                  → 36–40px
 *   Inline / small label       → 28–32px
 */

import { BaseObject } from './base.js';

const ICONS8_BASE = 'https://img.icons8.com/3d-fluency';

export class IconObject extends BaseObject {
  /**
   * @param {object} props — extends BaseObject props, plus:
   * @param {string}   props.iconName      — any Icons8 icon name (lowercase, hyphenated)
   * @param {number}  [props.size]         — px, square (default 72)
   * @param {string}  [props.alt]          — alt text for <img> (default = iconName)
   * @param {boolean} [props.useProxy]     — route through /api/proxy (default true)
   * @param {string}  [props.proxyBase]    — proxy path prefix (default '/api/proxy?url=')
   */
  constructor(props = {}) {
    super({ ...props, type: 'IconObject' });

    this.iconName  = props.iconName  ?? 'star';
    this.size      = props.size      ?? 72;
    this.alt       = props.alt       ?? this.iconName;
    this.useProxy  = props.useProxy  ?? true;
    this.proxyBase = props.proxyBase ?? '/api/proxy?url=';
  }

  /** Returns the raw Icons8 URL for this icon at the given px size. */
  rawUrl(px) {
    const s = px ?? this.size;
    return `${ICONS8_BASE}/${s}/${this.iconName}.png`;
  }

  /** Returns the proxied URL (safe for export, no CORS). */
  proxiedUrl(px) {
    return `${this.proxyBase}${encodeURIComponent(this.rawUrl(px))}`;
  }

  /** Returns the URL to use in templates (proxied if useProxy). */
  get src() {
    return this.useProxy ? this.proxiedUrl() : this.rawUrl();
  }

  toJSON() {
    return {
      ...super.toJSON(),
      iconName:  this.iconName,
      size:      this.size,
      alt:       this.alt,
      useProxy:  this.useProxy,
      proxyBase: this.proxyBase,
    };
  }

  static fromJSON(json) {
    return new IconObject(json);
  }

  /**
   * Render to an <img> HTML string.
   * @param {number} [overrideSize] — override px size
   * @returns {string} HTML
   */
  toHTML(overrideSize) {
    const px  = overrideSize ?? this.size;
    const url = this.useProxy ? this.proxiedUrl(px) : this.rawUrl(px);

    return `<img `
      + `src="${url}" `
      + `alt="${escapeAttr(this.alt)}" `
      + `width="${px}" height="${px}" `
      + `style="display:block;width:${px}px;height:${px}px;object-fit:contain;" `
      + `data-icon="true" `
      + `data-icon-name="${escapeAttr(this.iconName)}" `
      + `data-object-id="${this.id}" `
      + `onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,${makeFallbackSvg(this.iconName)}'" `
      + `/>`;
  }
}

/** Inline SVG initials fallback (same style as v2.x). */
function makeFallbackSvg(name) {
  const initial = (name || '?')[0].toUpperCase();
  const color   = '#2563EB';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'>`
    + `<circle cx='36' cy='36' r='36' fill='${color}' opacity='0.15'/>`
    + `<text x='36' y='44' font-family='Space Grotesk,sans-serif' font-weight='700' font-size='28' fill='${color}' text-anchor='middle'>${initial}</text>`
    + `</svg>`;
  return encodeURIComponent(svg);
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
