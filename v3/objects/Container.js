/**
 * Infogr.ai v3 — Container Object
 *
 * A background section that visually groups other objects.
 * Used for cards, callout boxes, stat rows, header sections.
 *
 * In Phase 1: rendered as a styled <div> wrapper in templates.
 * In Phase 4 (Fabric.js): becomes a proper grouping canvas object.
 */

import { BaseObject } from './base.js';

export class Container extends BaseObject {
  /**
   * @param {object} props — extends BaseObject props, plus:
   * @param {string}  [props.backgroundColor] — CSS color or var() (default 'var(--card-bg)')
   * @param {string}  [props.borderColor]      — CSS color (default 'var(--card-border)')
   * @param {number}  [props.borderWidth]      — px (default 1)
   * @param {string}  [props.borderStyle]      — 'solid'|'dashed'|'none' (default 'solid')
   * @param {number}  [props.borderRadius]     — px or 'var(--radius-card)' (default 'var(--radius-card,14px)')
   * @param {string}  [props.shadow]           — CSS box-shadow (default 'var(--card-shadow)')
   * @param {string}  [props.padding]          — CSS padding shorthand (default '20px')
   * @param {string}  [props.children]         — inner HTML string (rendered by renderer) (default '')
   * @param {string}  [props.display]          — CSS display value (default 'flex')
   * @param {string}  [props.flexDirection]    — CSS flex-direction (default 'column')
   * @param {string}  [props.gap]              — CSS gap (default '12px')
   * @param {string}  [props.alignItems]       — CSS align-items (default 'flex-start')
   */
  constructor(props = {}) {
    super({ ...props, type: 'Container' });

    this.backgroundColor = props.backgroundColor ?? 'var(--card-bg)';
    this.borderColor     = props.borderColor     ?? 'var(--card-border)';
    this.borderWidth     = props.borderWidth     ?? 1;
    this.borderStyle     = props.borderStyle     ?? 'solid';
    this.borderRadius    = props.borderRadius    ?? 'var(--radius-card,14px)';
    this.shadow          = props.shadow          ?? 'var(--card-shadow)';
    this.padding         = props.padding         ?? '20px';
    this.children        = props.children        ?? '';
    this.display         = props.display         ?? 'flex';
    this.flexDirection   = props.flexDirection   ?? 'column';
    this.gap             = props.gap             ?? '12px';
    this.alignItems      = props.alignItems      ?? 'flex-start';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      backgroundColor: this.backgroundColor,
      borderColor:     this.borderColor,
      borderWidth:     this.borderWidth,
      borderStyle:     this.borderStyle,
      borderRadius:    this.borderRadius,
      shadow:          this.shadow,
      padding:         this.padding,
      children:        this.children,
      display:         this.display,
      flexDirection:   this.flexDirection,
      gap:             this.gap,
      alignItems:      this.alignItems,
    };
  }

  static fromJSON(json) {
    return new Container(json);
  }

  /**
   * Render to HTML string. Inner children are passed as an HTML string.
   * @param {string} [childrenHTML] — override this.children
   * @returns {string}
   */
  toHTML(childrenHTML) {
    const inner = childrenHTML ?? this.children;

    const style = [
      `background:${this.backgroundColor}`,
      `border:${this.borderWidth}px ${this.borderStyle} ${this.borderColor}`,
      `border-radius:${this.borderRadius}`,
      `box-shadow:${this.shadow}`,
      `padding:${this.padding}`,
      `display:${this.display}`,
      `flex-direction:${this.flexDirection}`,
      `gap:${this.gap}`,
      `align-items:${this.alignItems}`,
      `overflow:hidden`,
      `min-height:0`,
    ].join(';');

    return `<div class="ig-container" style="${style}" data-object-id="${this.id}">${inner}</div>`;
  }
}
