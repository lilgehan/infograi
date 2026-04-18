/**
 * Infogr.ai v3 — Divider Object
 *
 * A horizontal or vertical separator line between sections.
 * Used to create visual breathing room and hierarchy.
 */

import { BaseObject } from './base.js';

export class Divider extends BaseObject {
  /**
   * @param {object} props — extends BaseObject props, plus:
   * @param {string}  [props.orientation] — 'horizontal' | 'vertical' (default 'horizontal')
   * @param {string}  [props.color]       — CSS color (default 'var(--divider)')
   * @param {number}  [props.thickness]   — px (default 1)
   * @param {string}  [props.length]      — CSS length: '100%', '80%', '400px' (default '100%')
   * @param {string}  [props.margin]      — CSS margin shorthand (default '0')
   */
  constructor(props = {}) {
    super({ ...props, type: 'Divider' });

    this.orientation = props.orientation ?? 'horizontal';
    this.color       = props.color       ?? 'var(--divider)';
    this.thickness   = props.thickness   ?? 1;
    this.length      = props.length      ?? '100%';
    this.margin      = props.margin      ?? '0';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      orientation: this.orientation,
      color:       this.color,
      thickness:   this.thickness,
      length:      this.length,
      margin:      this.margin,
    };
  }

  static fromJSON(json) {
    return new Divider(json);
  }

  /**
   * Render to HTML string.
   * @returns {string}
   */
  toHTML() {
    const isH = this.orientation !== 'vertical';

    const style = isH
      ? [
          `width:${this.length}`,
          `height:${this.thickness}px`,
          `background:${this.color}`,
          `margin:${this.margin}`,
          `flex-shrink:0`,
          `border:none`,
        ].join(';')
      : [
          `height:${this.length}`,
          `width:${this.thickness}px`,
          `background:${this.color}`,
          `margin:${this.margin}`,
          `flex-shrink:0`,
          `border:none`,
          `align-self:stretch`,
        ].join(';');

    return `<div class="ig-divider" style="${style}" data-object-id="${this.id}" aria-hidden="true"></div>`;
  }
}
