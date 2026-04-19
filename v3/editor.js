/**
 * Infogr.ai v3 — Object Editor
 *
 * Injected into every v3 infographic iframe by preprocessHTMLv3().
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

  /** Elements selectable as draggable groups */
  var GRP = '.ig-stat, .ig-card, .ig-step, .ig-callout, .ig-header, .ig-footer';

  /** Icon elements (take priority over groups on click) */
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

  /* ── Helpers ────────────────────────────────────────────── */

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
    // Pass 1: look for icon
    var el = target;
    while (el && el !== document.body) {
      if (el.matches && el.matches(ICO)) return { el: el, icon: true };
      el = el.parentElement;
    }
    // Pass 2: look for group
    el = target;
    while (el && el !== document.body) {
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
