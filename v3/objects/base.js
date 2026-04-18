/**
 * Infogr.ai v3 — Base Object
 *
 * All canvas objects extend this class.
 * Provides: id, type, position, size, stacking, visibility, lock.
 *
 * Phase 1: properties are stored; Canvas interactions (move/resize) come in Phase 4 (Fabric.js).
 */

let _idCounter = 0;

function generateId(prefix = 'obj') {
  return `${prefix}-${Date.now()}-${++_idCounter}`;
}

export class BaseObject {
  /**
   * @param {object} props
   * @param {string}  [props.id]       — auto-generated if omitted
   * @param {string}   props.type      — object type string, set by subclass
   * @param {number}  [props.x]        — px from left edge of canvas (default 0)
   * @param {number}  [props.y]        — px from top edge of canvas (default 0)
   * @param {number}  [props.width]    — px (default 100)
   * @param {number}  [props.height]   — px (default 100)
   * @param {number}  [props.zIndex]   — stacking order (default 0)
   * @param {boolean} [props.visible]  — (default true)
   * @param {boolean} [props.locked]   — prevents move/resize in canvas editor (default false)
   */
  constructor(props = {}) {
    this.id      = props.id      ?? generateId(props.type ?? 'obj');
    this.type    = props.type    ?? 'BaseObject';
    this.x       = props.x      ?? 0;
    this.y       = props.y      ?? 0;
    this.width   = props.width  ?? 100;
    this.height  = props.height ?? 100;
    this.zIndex  = props.zIndex ?? 0;
    this.visible = props.visible ?? true;
    this.locked  = props.locked  ?? false;
  }

  /** Returns a plain-object snapshot for JSON serialisation. */
  toJSON() {
    return {
      id:      this.id,
      type:    this.type,
      x:       this.x,
      y:       this.y,
      width:   this.width,
      height:  this.height,
      zIndex:  this.zIndex,
      visible: this.visible,
      locked:  this.locked,
    };
  }

  /**
   * Reconstructs an object from a toJSON() snapshot.
   * Subclasses override this to restore their own properties.
   * @param {object} json
   * @returns {BaseObject}
   */
  static fromJSON(json) {
    return new BaseObject(json);
  }

  /** Move the object by a delta. */
  translate(dx, dy) {
    if (this.locked) return this;
    this.x += dx;
    this.y += dy;
    return this;
  }

  /** Resize the object (minimum 10px). */
  resize(width, height) {
    if (this.locked) return this;
    this.width  = Math.max(10, width);
    this.height = Math.max(10, height);
    return this;
  }

  /** Create a duplicate with a new id, offset slightly. */
  clone(offsetX = 16, offsetY = 16) {
    const data = this.toJSON();
    delete data.id;
    data.x += offsetX;
    data.y += offsetY;
    return new this.constructor(data);
  }
}
