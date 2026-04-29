/**
 * Infogr.ai v3 — Layout Configuration Overrides
 *
 * This file stores approved template adjustments from the Gallery Editor.
 * When a layout is rendered, the render pipeline checks this config for
 * saved overrides (positions, sizes, fonts, connectors, added elements).
 *
 * Structure:
 * {
 *   "variant__itemCount": {
 *     overrides: { "css-selector-path": { left, top, width, fontSize, ... } },
 *     added: { textboxes: [...], icons: [...], connectors: [...], shapes: [...] },
 *     approved: true/false,
 *     savedAt: ISO string,
 *   }
 * }
 *
 * To update this file:
 * 1. Open gallery-editor.html
 * 2. Adjust the layout visually
 * 3. Click "Approve"
 * 4. Click "Export JSON"
 * 5. Paste the exported configs object here
 *
 * The render functions in smart-layouts.js and smart-diagrams.js
 * will import and apply these configs via applyLayoutConfig().
 */

// Start with empty configs — populated from gallery-editor.html exports
export const LAYOUT_CONFIGS = {};

/**
 * Apply saved config overrides to a rendered HTML container.
 * Call this after inserting rendered HTML into the DOM.
 *
 * @param {HTMLElement} container - The .ig-page element containing rendered output
 * @param {string} variant - The variant name (e.g., 'bullseye', 'solid-boxes')
 * @param {number} itemCount - Number of items rendered
 */
export function applyLayoutConfig(container, variant, itemCount) {
  const key = `${variant}__${itemCount}`;
  const cfg = LAYOUT_CONFIGS[key];
  if (!cfg) return;

  // Apply element overrides (position, font, size adjustments)
  if (cfg.overrides) {
    for (const [selector, props] of Object.entries(cfg.overrides)) {
      try {
        const el = container.querySelector(selector);
        if (!el) continue;
        for (const [prop, val] of Object.entries(props)) {
          if (prop === 'textContent') {
            el.textContent = val;
          } else {
            el.style[prop] = val;
          }
        }
      } catch (e) {
        // Selector may not match — silently skip
      }
    }
  }

  // Render added elements (text boxes, icons, shapes)
  if (cfg.added) {
    const parent = container;

    (cfg.added.textboxes || []).forEach(tb => {
      const div = document.createElement('div');
      div.textContent = tb.text;
      div.style.cssText = `position:absolute; left:${tb.x}px; top:${tb.y}px; width:${tb.width}px; min-height:${tb.height}px; font-size:${tb.fontSize}; font-weight:${tb.fontWeight}; font-family:${tb.fontFamily}; color:${tb.color}; text-align:${tb.textAlign}; padding:4px 6px;`;
      parent.appendChild(div);
    });

    (cfg.added.icons || []).forEach(ic => {
      const div = document.createElement('div');
      div.innerHTML = `<img src="" alt="" style="width:100%;height:100%;object-fit:contain;" data-icon="true">`;
      div.style.cssText = `position:absolute; left:${ic.x}px; top:${ic.y}px; width:${ic.width}px; height:${ic.height}px;`;
      parent.appendChild(div);
    });

    (cfg.added.shapes || []).forEach(sh => {
      const div = document.createElement('div');
      div.style.cssText = `position:absolute; left:${sh.x}px; top:${sh.y}px; width:${sh.width}px; height:${sh.height}px; background:${sh.fill}; border:${sh.strokeWidth}px solid ${sh.stroke}; border-radius:${sh.borderRadius || 0}px;`;
      parent.appendChild(div);
    });

    // Render connectors as SVG overlay
    if (cfg.added.connectors && cfg.added.connectors.length > 0) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;';
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', 'cfgArrow');
      marker.setAttribute('markerWidth', '8');
      marker.setAttribute('markerHeight', '6');
      marker.setAttribute('refX', '7');
      marker.setAttribute('refY', '3');
      marker.setAttribute('orient', 'auto');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M0,0 L8,3 L0,6 Z');
      path.setAttribute('fill', '#6b7280');
      marker.appendChild(path);
      defs.appendChild(marker);
      svg.appendChild(defs);

      cfg.added.connectors.forEach(cn => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', cn.x1);
        line.setAttribute('y1', cn.y1);
        line.setAttribute('x2', cn.x2);
        line.setAttribute('y2', cn.y2);
        line.setAttribute('stroke', cn.stroke || '#6b7280');
        line.setAttribute('stroke-width', cn.strokeWidth || 1.5);
        if (cn.dashArray) line.setAttribute('stroke-dasharray', cn.dashArray);
        if (cn.arrowHead === 'end' || cn.arrowHead === 'both') {
          line.setAttribute('marker-end', 'url(#cfgArrow)');
        }
        svg.appendChild(line);
      });

      parent.style.position = 'relative';
      parent.appendChild(svg);
    }
  }
}
