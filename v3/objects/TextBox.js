/**
 * Infogr.ai v3 — TextBox Object
 *
 * Body text, bullet text, captions, labels.
 * Uses Plus Jakarta Sans exclusively.
 * NOT for hero titles (use TitleBox for those).
 */

import { BaseObject } from './base.js';

export class TextBox extends BaseObject {
  /**
   * @param {object} props — extends BaseObject props, plus:
   * @param {string}  [props.text]        — text content (may include newlines for bullets)
   * @param {string}  [props.fontFamily]  — 'Plus Jakarta Sans' (default, keep it)
   * @param {number}  [props.fontSize]    — px (default 14)
   * @param {string}  [props.fontWeight]  — '300'|'400'|'500'|'600'|'700'|'800' (default '400')
   * @param {string}  [props.color]       — CSS color (default uses --text-primary CSS var)
   * @param {string}  [props.textAlign]   — 'left'|'center'|'right' (default 'left')
   * @param {number}  [props.lineHeight]  — unitless multiplier (default 1.55)
   * @param {number}  [props.maxLines]    — webkit-line-clamp value, 0 = no clamp (default 0)
   * @param {boolean} [props.isBullet]    — if true, render text lines as bullet list (default false)
   */
  constructor(props = {}) {
    super({ ...props, type: 'TextBox' });

    this.text       = props.text       ?? '';
    this.fontFamily = props.fontFamily ?? 'Plus Jakarta Sans';
    this.fontSize   = props.fontSize   ?? 14;
    this.fontWeight = props.fontWeight ?? '400';
    this.color      = props.color      ?? 'var(--text-primary)';
    this.textAlign  = props.textAlign  ?? 'left';
    this.lineHeight = props.lineHeight ?? 1.55;
    this.maxLines   = props.maxLines   ?? 0;
    this.isBullet   = props.isBullet   ?? false;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      text:       this.text,
      fontFamily: this.fontFamily,
      fontSize:   this.fontSize,
      fontWeight: this.fontWeight,
      color:      this.color,
      textAlign:  this.textAlign,
      lineHeight: this.lineHeight,
      maxLines:   this.maxLines,
      isBullet:   this.isBullet,
    };
  }

  static fromJSON(json) {
    return new TextBox(json);
  }

  /**
   * Render this object to an HTML string for use in a template slot.
   * @returns {string} HTML
   */
  toHTML() {
    const clamp = this.maxLines > 0
      ? `overflow:hidden;display:-webkit-box;-webkit-line-clamp:${this.maxLines};-webkit-box-orient:vertical;`
      : '';

    const style = [
      `font-family:'${this.fontFamily}',sans-serif`,
      `font-size:${this.fontSize}px`,
      `font-weight:${this.fontWeight}`,
      `color:${this.color}`,
      `text-align:${this.textAlign}`,
      `line-height:${this.lineHeight}`,
    ].join(';');

    if (this.isBullet) {
      const lines = this.text.split('\n').filter(Boolean);
      const items = lines.map(l =>
        `<li style="padding-left:14px;position:relative;${clamp}">${escapeHtml(l)}</li>`
      ).join('');
      return `<ul style="${style};list-style:none;margin:0;padding:0;" data-object-id="${this.id}">${items}</ul>`;
    }

    return `<div style="${style};${clamp}" data-object-id="${this.id}">${escapeHtml(this.text)}</div>`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
