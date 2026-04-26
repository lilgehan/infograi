/**
 * Infogr.ai v3 — Object Editor
 *
 * Loaded as a regular <script> in the main page (index.html).
 * Scoped to #editCanvas — only fires on elements inside that div.
 * Adds PowerPoint-style object editing: click to select, drag to move,
 * corner handles to resize, double-click to edit text, arrow keys to nudge.
 *
 * ── Object hierarchy (what gets selected) ───────────────────────
 *   Icons   → img[data-icon="true"], svg[data-icon="true"]
 *             (take priority: click on icon inside a card selects the icon)
 *   Groups  → .ig-stat, .ig-card, .ig-step, .ig-callout, .ig-header, .ig-footer
 *             (click anywhere in the group selects the whole group)
 *
 * ── Interaction model ────────────────────────────────────────────
 *   Hover                → dashed blue outline preview
 *   Single click         → select object (blue border + 4 corner handles)
 *   Drag while selected  → move object via transform:translate()
 *   Corner handle drag   → resize object
 *   Double-click group   → enter text editing (contenteditable re-enabled)
 *   Escape in edit mode  → exit to selected mode
 *   Escape in sel mode   → deselect
 *   Arrow keys (sel)     → nudge 1px; Shift+Arrow = 10px
 *
 * ── Architecture ─────────────────────────────────────────────────
 *   Objects keep their original flexbox/grid positions.
 *   Movement is applied as transform:translate() so the original
 *   layout space is preserved — neighbouring elements don't reflow.
 *   This matches how Canva and Keynote handle single-element nudging.
 *
 *   ContentEditable on text elements is FROZEN while an object is in
 *   "selected" mode (prevents accidental typing on single-click).
 *   It is restored when entering "edit" mode (double-click) or when
 *   the element is deselected.
 */
(function () {
  'use strict';

  /* ── Selectors ──────────────────────────────────────────── */

  /**
   * Selectable elements — two tiers, both in one selector.
   * findObj() walks UP the DOM, so the most specific (innermost) match wins.
   *
   * Tier 1 — individual text boxes (take priority over their parent group):
   *   .ig-card-title, .ig-card-bullet      — each card text box is independently movable
   *   .ig-stat-num, .ig-stat-label         — stat number and label independently
   *   .ig-step-title, .ig-step-body-text   — step title and body independently
   *   .ig-callout-title, .ig-callout-body  — callout text boxes
   *   .ig-title, .ig-subtitle, .ig-label   — header text boxes
   *   .ig-footer-brand                     — footer text
   *
   * Tier 2 — group containers (selected when clicking non-text areas):
   *   .ig-stat, .ig-card, .ig-step, .ig-callout, .ig-header, .ig-footer
   */
  var GRP = [
    // ── Tier 1: individual text boxes (legacy chrome + igs-* smart-layout text) ──
    // Chrome
    '.ig-title', '.ig-subtitle', '.ig-label', '.ig-label-pill', '.ig-footer-brand',
    '.ig-callout-title', '.ig-callout-body',
    '.ig-stat-num', '.ig-stat-label',
    // Legacy (v2 compat)
    '.ig-card-title', '.ig-card-bullet',
    '.ig-step-title', '.ig-step-body-text',
    // Boxes
    '.igs-title', '.igs-body', '.igs-circle-num', '.igs-labeled-tag',
    // Bullets
    '.igs-bl-title', '.igs-bl-body', '.igs-bl-num',
    // Sequence
    '.igs-tl-title', '.igs-tl-label', '.igs-tl-body',
    '.igs-mtl-title', '.igs-mtl-body',
    '.igs-mtlb-title', '.igs-mtlb-body',
    '.igs-arrow-title', '.igs-arrow-body',
    '.igs-pill', '.igs-slant-body',
    // Numbers
    '.igs-stat-num', '.igs-stat-label',
    '.igs-bar-stat-label', '.igs-bar-stat-num',
    '.igs-star-title', '.igs-star-score',
    '.igs-dotgrid-label',
    '.igs-dotline-title', '.igs-dotline-num',
    '.igs-cbl-title', '.igs-cbl-body',
    '.igs-cel-title', '.igs-cel-body',
    // Circles
    '.igs-cycle-title', '.igs-cycle-body',
    '.igs-flower-title', '.igs-flower-body',
    '.igs-circle-title', '.igs-circle-body',
    '.igs-ring-title', '.igs-ring-body',
    '.igs-semi-title', '.igs-semi-body',
    // Quotes
    '.igs-qbox-text', '.igs-qbox-attr',
    '.igs-bubble-box', '.igs-bubble-attr',
    // Steps
    '.igs-stair-title', '.igs-stair-body',
    '.igs-step-title', '.igs-step-body',
    '.igs-boxstep-title', '.igs-boxstep-body',
    '.igs-arrowstep-title', '.igs-arrowstep-body',
    '.igs-stepicon-title', '.igs-stepicon-body',
    '.igs-pyramid-title', '.igs-pyramid-body',
    '.igs-funnel-title', '.igs-funnel-body',
    // ── Tier 2: group containers (move/resize whole block) ──
    // Chrome groups
    '.ig-callout', '.ig-header', '.ig-footer',
    '.ig-stat', '.ig-card', '.ig-step',
    // Boxes containers
    '.igs-solid', '.igs-outline', '.igs-sideline', '.igs-sidelinetext',
    '.igs-topline', '.igs-topcircle', '.igs-joined', '.igs-leaf',
    '.igs-labeled-wrap', '.igs-alt',
    // Bullets containers
    '.igs-bl-large', '.igs-bl-small', '.igs-bl-arrow', '.igs-bl-process', '.igs-bl-boxsmall',
    // Sequence containers
    '.igs-tl-item', '.igs-mtl-item', '.igs-mtlb-item', '.igs-arrow-item', '.igs-slant-item',
    // Numbers containers
    '.igs-stat-item', '.igs-circle-stat-item', '.igs-bar-stat-item', '.igs-star-item',
    '.igs-dotgrid-item', '.igs-dotline-item', '.igs-cbl-item', '.igs-cel-item',
    // Circles containers
    '.igs-cycle-item', '.igs-flower-petal', '.igs-flower-center',
    '.igs-circle-item', '.igs-ring-item', '.igs-semi-item',
    // Quotes containers
    '.igs-qbox-item', '.igs-bubble-item',
    // Steps containers
    '.igs-stair-item', '.igs-step-item', '.igs-boxstep-item', '.igs-arrowstep-item',
    '.igs-stepicon-item', '.igs-pyramid-item', '.igs-funnel-item',
  ].join(', ');

  /** Icon elements (take priority over everything on click) */
  var ICO = 'img[data-icon="true"], svg[data-icon="true"]';

  /* ── State ──────────────────────────────────────────────── */

  var sel      = null;    // currently selected element
  var ovl      = null;    // selection-overlay <div>
  var mode     = 'off';   // 'off' | 'sel' | 'edit'
  var isIcon   = false;   // whether selected element is an icon

  // drag
  var dragging = false;
  var startMX  = 0, startMY  = 0;   // mouse coords at drag start
  var origTX   = 0, origTY   = 0;   // element translate at drag start

  // resize
  var resizing = false;
  var rzHandle = '';
  var startW   = 0, startH   = 0;   // element size at resize start

  // hover
  var hovered  = null;

  // overflow parents — elements between sel and .ig-page whose overflow we temporarily set to visible
  var overflowParents = [];

  /* ── Helpers ────────────────────────────────────────────── */

  /**
   * Returns true if the text cursor is at position 0 inside el
   * (before the very first character, regardless of whether el has text).
   * Used to decide whether Backspace should delete the whole element.
   */
  function caretAtStart(el) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    var range = sel.getRangeAt(0);
    if (!range.collapsed) return false; // text is selected, not just a cursor
    // Build a range from el's start to the cursor — if it has no text, cursor is at start
    try {
      var test = document.createRange();
      test.selectNodeContents(el);
      test.setEnd(range.startContainer, range.startOffset);
      return test.toString().length === 0;
    } catch (e) {
      return false;
    }
  }

  /** Read current transform:translate() values in px */
  function getTr(el) {
    var m = (el.style.transform || '').match(
      /translate\(\s*([^,px]+)px\s*,\s*([^)px]+)px\s*\)/
    );
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0, 0];
  }

  /** Reposition the overlay to match the selected element's rect */
  function posOverlay() {
    if (!ovl || !sel) return;
    var r = sel.getBoundingClientRect();
    ovl.style.left   = r.left   + 'px';
    ovl.style.top    = r.top    + 'px';
    ovl.style.width  = r.width  + 'px';
    ovl.style.height = r.height + 'px';
  }

  /* ── Resize handle factory ──────────────────────────────── */

  function mkHandle(dir, t, l, r, b) {
    var d = document.createElement('div');
    d.dataset.h = dir;
    d.style.cssText = [
      'position:absolute',
      'width:10px', 'height:10px',
      'background:#2563EB',
      'border:2px solid #fff',
      'border-radius:2px',
      'pointer-events:all',
      'z-index:10001',
      'box-sizing:border-box',
      'cursor:' + dir + '-resize',
    ].join(';');
    if (t !== null) d.style.top    = t;
    if (l !== null) d.style.left   = l;
    if (r !== null) d.style.right  = r;
    if (b !== null) d.style.bottom = b;
    d.addEventListener('mousedown', function (e) {
      e.stopPropagation();
      e.preventDefault();
      resizing = true;
      rzHandle = dir;
      startMX  = e.clientX;
      startMY  = e.clientY;
      startW   = sel.offsetWidth;
      startH   = sel.offsetHeight;
    });
    return d;
  }

  /* ── Build selection overlay ────────────────────────────── */

  function buildOverlay() {
    var o = document.createElement('div');
    o.id = 'ig-obj-overlay';
    o.style.cssText = [
      'position:fixed',
      'border:2px solid #2563EB',
      'pointer-events:none',
      'z-index:10000',
      'box-sizing:border-box',
      'border-radius:2px',
      'transition:none',
    ].join(';');

    // 4 corner handles
    o.appendChild(mkHandle('nw', '-5px', '-5px',  null,   null));
    o.appendChild(mkHandle('ne', '-5px',  null,  '-5px',  null));
    o.appendChild(mkHandle('se',  null,   null,  '-5px', '-5px'));
    o.appendChild(mkHandle('sw',  null,  '-5px',  null,  '-5px'));

    // Hint label (only for group elements, not icons)
    if (!isIcon) {
      var tip = document.createElement('div');
      tip.style.cssText = [
        'position:absolute',
        'top:-22px', 'left:-2px',
        'background:#2563EB',
        'color:#fff',
        'font-size:9px',
        'font-family:system-ui,-apple-system,sans-serif',
        'font-weight:500',
        'padding:3px 8px',
        'border-radius:3px 3px 0 0',
        'white-space:nowrap',
        'pointer-events:none',
        'letter-spacing:0.02em',
      ].join(';');
      tip.textContent = 'Drag to move  ·  Double-click to edit';
      o.appendChild(tip);
    }

    return o;
  }

  /* ── ContentEditable freezing / thawing ─────────────────── */
  // While an object is in "sel" mode, all text within it is frozen
  // (contenteditable="false") to prevent accidental editing on click.
  // Thawing restores them when entering "edit" mode or on deselect.

  function freezeText(el) {
    // Direct contenteditable on the element itself
    if (el.getAttribute('contenteditable') === 'true') {
      el.setAttribute('data-ce-frozen', 'true');
      el.setAttribute('contenteditable', 'false');
    }
    // All descendant contenteditable elements
    el.querySelectorAll('[contenteditable="true"]').forEach(function (c) {
      c.setAttribute('data-ce-frozen', 'true');
      c.setAttribute('contenteditable', 'false');
    });
  }

  function thawText(el) {
    if (el.getAttribute('data-ce-frozen')) {
      el.removeAttribute('data-ce-frozen');
      el.setAttribute('contenteditable', 'true');
    }
    el.querySelectorAll('[data-ce-frozen]').forEach(function (c) {
      c.removeAttribute('data-ce-frozen');
      c.setAttribute('contenteditable', 'true');
    });
  }

  /* ── Select ─────────────────────────────────────────────── */

  function doSelect(el, iconEl) {
    if (sel === el && (mode === 'sel' || mode === 'edit')) return;
    doDesel();

    sel    = el;
    isIcon = !!iconEl;
    mode   = 'sel';

    // Ensure element can receive transforms cleanly
    var pos = window.getComputedStyle(el).position;
    if (pos === 'static') el.style.position = 'relative';
    el.style.zIndex  = '5';
    el.style.cursor  = 'move';
    el.style.outline = 'none';

    // Make overflow-hidden ancestors visible so the dragged element isn't clipped.
    // Walk up from el to (but not including) .ig-page and collect every overflow:hidden parent.
    // Restored in doDesel().
    overflowParents = [];
    var op = el.parentElement;
    while (op && !op.classList.contains('ig-page')) {
      if (window.getComputedStyle(op).overflow === 'hidden') {
        overflowParents.push({ el: op, prev: op.style.overflow });
        op.style.overflow = 'visible';
      }
      op = op.parentElement;
    }

    // Freeze text editing while in sel mode
    if (!isIcon) freezeText(el);

    // Build and attach overlay
    ovl = buildOverlay();
    document.body.appendChild(ovl);
    posOverlay();
  }

  /* ── Deselect ────────────────────────────────────────────── */

  function doDesel() {
    if (ovl) { ovl.remove(); ovl = null; }
    if (sel) {
      if (!isIcon) thawText(sel);
      sel.style.cursor = '';
      sel.style.zIndex = '';
    }
    // Restore overflow on parents we made visible
    overflowParents.forEach(function (op) { op.el.style.overflow = op.prev; });
    overflowParents = [];
    sel      = null;
    isIcon   = false;
    mode     = 'off';
    dragging = false;
    resizing = false;
  }

  /* ── Enter text-edit mode ───────────────────────────────── */

  function enterEdit() {
    if (!sel || isIcon) return;
    thawText(sel); // re-enable contenteditable on all children
    mode = 'edit';
    sel.style.cursor = 'text';
    if (ovl) ovl.style.display = 'none'; // hide handles while editing

    // Focus the first editable text element
    var focusEl = (sel.getAttribute('contenteditable') === 'true')
      ? sel
      : sel.querySelector('[contenteditable="true"]');

    if (focusEl) {
      focusEl.focus();
      // Place cursor at end of content
      try {
        var range = document.createRange();
        range.selectNodeContents(focusEl);
        range.collapse(false);
        var s = window.getSelection();
        if (s) { s.removeAllRanges(); s.addRange(range); }
      } catch (e) {}
    }
  }

  /* ── Exit text-edit mode → back to sel ─────────────────── */

  function exitEdit() {
    if (mode !== 'edit') return;
    freezeText(sel);
    mode = 'sel';
    sel.style.cursor = 'move';
    if (ovl) ovl.style.display = '';
    // Blur any focused text element
    var active = document.activeElement;
    if (active && sel.contains(active)) active.blur();
  }

  /* ── Find selectable ancestor ───────────────────────────── */
  // Icons take priority: clicking an icon inside a card selects the icon,
  // not the card. Walk up twice: once for icons, once for groups.

  function findObj(target) {
    // Only operate inside the edit canvas (not toolbar, sidebar, etc.)
    var canvas = document.getElementById('editCanvas');
    if (!canvas || !canvas.contains(target)) return null;

    // Pass 1: look for icon
    var el = target;
    while (el && el !== canvas) {
      if (el.matches && el.matches(ICO)) return { el: el, icon: true };
      el = el.parentElement;
    }
    // Pass 2: look for group
    el = target;
    while (el && el !== canvas) {
      if (el.matches && el.matches(GRP)) return { el: el, icon: false };
      el = el.parentElement;
    }
    return null;
  }

  /* ── EVENT LISTENERS ────────────────────────────────────── */

  // ── mousedown (capture phase: runs before native focus/click) ──
  document.addEventListener('mousedown', function (e) {
    // Resize handle: its own listener handles it
    if (e.target && e.target.dataset && e.target.dataset.h) return;

    var found = findObj(e.target);

    if (!found) {
      // Clicked on blank canvas
      if (mode === 'edit') exitEdit();
      doDesel();
      return;
    }

    var el = found.el;

    // If we're currently editing THIS element, let the browser handle it
    // (allows normal text cursor placement and selection)
    if (mode === 'edit' && sel === el) return;

    // If editing a DIFFERENT element, exit edit and desel before selecting new
    if (mode === 'edit' && sel !== el) {
      exitEdit();
      doDesel();
    }

    // Select the found element
    doSelect(el, found.icon);

    // Prevent browser from placing a text cursor on single-click
    // (we only want text editing on explicit double-click)
    if (!found.icon) {
      e.preventDefault();
    }

    // Prime the drag
    dragging = true;
    startMX  = e.clientX;
    startMY  = e.clientY;
    var t    = getTr(el);
    origTX   = t[0];
    origTY   = t[1];
    el.style.cursor = 'grabbing';

  }, true); // capture = true: runs before focus handlers

  // ── dblclick: enter text edit mode ──
  document.addEventListener('dblclick', function (e) {
    var found = findObj(e.target);
    if (!found || found.icon) return;
    e.preventDefault();
    if (sel !== found.el) doSelect(found.el, false);
    enterEdit();
  }, true);

  // ── mousemove: drag or resize ──
  document.addEventListener('mousemove', function (e) {
    if (dragging && sel && !resizing) {
      var tx = origTX + (e.clientX - startMX);
      var ty = origTY + (e.clientY - startMY);
      sel.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
      posOverlay();
    }

    if (resizing && sel) {
      var dx = e.clientX - startMX;
      var dy = e.clientY - startMY;
      var w  = startW;
      var h  = startH;
      if (rzHandle.includes('e')) w = Math.max(40, startW + dx);
      if (rzHandle.includes('s')) h = Math.max(20, startH + dy);
      if (rzHandle.includes('w')) w = Math.max(40, startW - dx);
      if (rzHandle.includes('n')) h = Math.max(20, startH - dy);
      sel.style.width    = w + 'px';
      sel.style.height   = h + 'px';
      sel.style.overflow = 'visible'; // let content show while resizing
      posOverlay();
    }
  });

  // ── mouseup: finish drag or resize ──
  document.addEventListener('mouseup', function () {
    dragging = false;
    resizing = false;
    rzHandle = '';
    if (sel && mode === 'sel') sel.style.cursor = 'move';
  });

  // ── keydown: Escape, arrow keys ──
  document.addEventListener('keydown', function (e) {
    if (!sel) return;

    if (e.key === 'Escape') {
      if (mode === 'edit') exitEdit();
      else doDesel();
      return;
    }

    // ── Bullet deletion in edit mode ──────────────────────────
    // Backspace at the very start of a bullet (cursor before the first
    // character, whether the bullet has text or not) removes the entire
    // <li> including its content — same as PowerPoint / Keynote behaviour.
    //
    // Normal Backspace anywhere else in the bullet works as usual
    // (deletes the character to the left).
    if (mode === 'edit' && e.key === 'Backspace') {
      var active = document.activeElement;
      if (
        active &&
        active.tagName === 'LI' &&
        active.classList.contains('ig-card-bullet') &&
        caretAtStart(active)
      ) {
        e.preventDefault();
        // Move focus to previous bullet; fall back to next if this is the first
        var focusTarget = active.previousElementSibling || active.nextElementSibling;
        active.remove();
        if (focusTarget) {
          focusTarget.focus();
          try {
            var r = document.createRange();
            r.selectNodeContents(focusTarget);
            r.collapse(false); // place cursor at end of that bullet
            var s = window.getSelection();
            if (s) { s.removeAllRanges(); s.addRange(r); }
          } catch (ex) {}
        }
        return; // handled — skip browser default
      }
      // Cursor is not at start → let browser handle (delete char to the left)
      return;
    }

    if (mode !== 'sel') return;

    // Arrow-key nudge (does not conflict with typing in edit mode)
    var step   = e.shiftKey ? 10 : 1;
    var t      = getTr(sel);
    var tx     = t[0];
    var ty     = t[1];
    var moved  = false;

    if (e.key === 'ArrowLeft')  { tx -= step; moved = true; }
    if (e.key === 'ArrowRight') { tx += step; moved = true; }
    if (e.key === 'ArrowUp')    { ty -= step; moved = true; }
    if (e.key === 'ArrowDown')  { ty += step; moved = true; }

    if (moved) {
      e.preventDefault();
      sel.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
      posOverlay();
    }
  });

  // ── scroll / resize: keep overlay in sync ──
  document.addEventListener('scroll', posOverlay, true);
  window.addEventListener('resize', posOverlay);

  /* ── Hover highlights ───────────────────────────────────── */
  // A dashed outline shows which element will be selected on next click.

  document.addEventListener('mouseover', function (e) {
    var found = findObj(e.target);
    if (!found) {
      if (hovered) { hovered.style.outline = ''; hovered.style.cursor = ''; hovered = null; }
      return;
    }
    var el = found.el;
    if (el === sel) return; // already selected — don't add hover ring on top
    if (hovered && hovered !== el) {
      hovered.style.outline = '';
      hovered.style.cursor  = '';
    }
    hovered = el;
    hovered.style.outline = '1px dashed rgba(37,99,235,0.45)';
    hovered.style.cursor  = 'move';
  });

  document.addEventListener('mouseout', function (e) {
    if (hovered && hovered !== sel) {
      hovered.style.outline = '';
      hovered.style.cursor  = '';
      hovered = null;
    }
  });

})();
