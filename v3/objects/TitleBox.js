/**
 * Infogr.ai v3 — TitleBox Object
 *
 * Hero titles and section headings.
 * ALWAYS Space Grotesk — this is a hard rule.
 * No body text in TitleBox — use TextBox for supporting copy.
 */

import { BaseObject } from './base.js';

export class TitleBox extends BaseObject {
  /**
   * @param {object} props — extends BaseObject props, plus:
   * @param {string}  [props.text]       — title text (1–2 lines max)
   * @param {number}  [props.fontSize]   — px (default 32)
   * @param {string}  [props.fontWeight] — '500'|'600'|'700' (default '700')
   * @param {string}  [props.color]      — CSS color (default uses --text-primary CSS var)
   * @param {string}  [props.textAlign]  — 'left'|'center'|'right' (default 'left')
   * @param {number}  [props.maxLines]   — webkit-line-clamp, 0 = no clamp (default 2)
   * @param {boolean} [props.gradient]   — bold-tone gradient text effect (default false)
   * @param {string}  [props.tag]        — HTML tag to use: 'h1'|'h2'|'h3' (default 'h1')
   */
  constructor(props = {}) {
    super({ ...props, type: 'TitleBox' });

    this.text       = props.text       ?? '';
    this.fontSize   = props.fontSize   ?? 32;
    this.fontWeight = props.fontWeight ?? '700';
    this.color      = props.color      ?? 'var(--text-primary)';
    this.textAlign  = props.textAlign  ?? 'left';
    this.maxLines   = props.maxLines   ?? 2;
    this.gradient   = props.gradient   ?? false;
    this.tag        = props.tag        ?? 'h1';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      text:       this.text,
      fontSize:   this.fontSize,
      fontWeight: this.fontWeight,
      color:      this.color,
      textAlign:  this.textAlign,
      maxLines:   this.maxLines,
      gradient:   this.gradient,
      tag:        this.tag,
    };
  }

  static fromJSON(json) {
    return new TitleBox(json);
  }

  /**
   * Render to HTML string.
   * @returns {string} HTML
   */
  toHTML() {
    const clamp = this.maxLines > 0
      ? `overflow:hidden;display:-webkit-box;-webkit-line-clamp:${this.maxLines};-webkit-box-orient:vertical;`
      : '';

    const gradientStyle = this.gradient
      ? `background:linear-gradient(135deg,var(--text-primary) 0%,var(--accent) 100%);`
      + `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`
      : '';

    const style = [
      `font-family:'Space Grotesk',sans-serif`,
      `font-size:${this.fontSize}px`,
      `font-weight:${this.fontWeight}`,
      `color:${this.color}`,
      `text-align:${this.textAlign}`,
      `line-height:1.18`,
      `letter-spacing:-0.02em`,
      `margin:0`,
    ].join(';');

    const tag = ['h1','h2','h3'].includes(this.tag) ? this.tag : 'h1';

    return `<${tag} style="${style};${clamp};${gradientStyle}" data-object-id="${this.id}">${escapeHtml(this.text)}</${tag}>`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
