# Infogr.ai v3 — Codebase Index

> Read this file at the start of every session instead of reading individual files.
> Only read a specific file when you are about to edit it.
> Last updated: 2026-04-28

---

## Architecture Overview

AI returns **JSON only** → `prompt-builder.js` builds the prompt → Anthropic API → `schema.js` validates → `renderer.js` fills the HTML template → injected as `srcdoc` into iframe → `editor.js` is injected into the iframe for object editing.

Phase 1 layouts: `mixed-grid`, `steps-guide`

---

## File Map

### `prompt-builder.js`
**Exports:** `buildPrompt({ topic, layoutId, tone, size })`, `detectLayout(topic)`, `TONE_GUIDES`

- `buildPrompt()` returns `{ system, messages, cacheKey }` for Anthropic API
- Static system block is prompt-cached (`cache_control: ephemeral`)
- **Icons:** AI picks freely from Icons8 100k+ icons — NO approved list. Lowercase hyphenated names. Renderer handles missing icons with onerror fallback.
- **Card density** (mixed-grid only): injected into user message. Logic:
  - square → `compact` (4–6 words/bullet)
  - landscape → `standard` (13–17 words/bullet, targets 15)
  - portrait + minimal → `standard`; portrait + other → `detailed` (23–27 words)
  - a4 + minimal → `compact`; a4 + other → `standard`
- `detectLayout()` returns `'mixed-grid'` as default; maps keywords like "steps/how to/guide" → `steps-guide`
- `TONE_GUIDES`: `professional`, `bold`, `minimal`, `playful` — full descriptions, not just labels

---

### `renderer.js`
**Exports:** `fillTemplate(json, layoutId, tone, size, accentColor)`, `fillTemplateAsync(...)`, `initRenderer()`, `iconUrl(name, size)`, `escapeHtml(str)`, `TONE_ACCENT_DEFAULTS`

- `initRenderer()` — call once on startup; pre-fetches + caches both templates
- `fillTemplate()` — synchronous after init; parses template HTML into DOM, fills data-slot elements, returns `doc.documentElement.outerHTML`
- **Icons8 URL:** `https://img.icons8.com/3d-fluency/{size}/{name}.png` via `/api/proxy?url=`
- **LOCAL_SVG_MAP** — 25 icons embedded as inline SVG data URIs (instant, no network): `folder, gear, settings, home, brain, rocket, briefcase, database, search, mail, smartphone, cloud-storage, shield, calendar-3, chart-increasing, star, key, lock, user-group, idea, target, checklist, dollar-coin, lightning-bolt, checkmark`
- `renderIconHtml(name, cssClass, px)` — returns inline SVG (if local) or `<img onerror fallback>` (if remote)
- **onerror fallback** — soft gray circle SVG shown when icon name doesn't exist on Icons8
- `computeCardDensity(json, sizeId, toneId)` — same logic as prompt-builder.js; honours AI-declared `card_density` first
- `TONE_ACCENT_DEFAULTS`: professional=#2563EB, bold=#F59E0B, minimal=#0F766E, playful=#7C3AED
- `applyTone()` sets `data-tone` on `.ig-page`, injects `--accent` CSS var override if `accentColor` passed
- `applySize()` sets `data-size` on `.ig-page`

**mixed-grid slots:** `label`, `title`, `subtitle`, `hero-icon` (img), `stats-loop`, `cards-loop`, `callout-title`, `callout-body`, `footer-brand`
**steps-guide slots:** `label`, `title`, `subtitle`, `hero-icon` (img), `steps-loop`, `stats-loop`, `callout-title`, `callout-body`, `footer-brand`

---

### `schema.js`
**Exports:** `validateSchema(json, layoutId)`, `extractJsonFromResponse(rawText)`, `sanitiseJson(json, layoutId)`

- `validateSchema()` returns `{ valid, errors, fixed }` — auto-corrects common issues
- **No icon list validation** — icons are free-form strings; only checks non-empty. Missing icon → defaults to `'star'`
- Truncates oversized string fields to schema maxLength
- Validates stats (exactly 3), cards (exactly 3, with 3 bullets each), sections (2–6)
- `extractJsonFromResponse()` strips markdown fences then parses JSON; returns null on failure

---

### `editor.js`
Injected into every v3 iframe by `preprocessHTMLv3()` in app.js. Self-contained IIFE — no imports.

**Selectors:**
- **Tier 1 (individual):** `.ig-card-title`, `.ig-card-bullet`, `.ig-stat-num`, `.ig-stat-label`, `.ig-step-title`, `.ig-step-body-text`, `.ig-callout-title`, `.ig-callout-body`, `.ig-title`, `.ig-subtitle`, `.ig-label`, `.ig-label-pill`, `.ig-footer-brand`
- **Tier 2 (groups):** `.ig-stat`, `.ig-card`, `.ig-step`, `.ig-callout`, `.ig-header`, `.ig-footer`
- **Icons:** `img[data-icon="true"]`, `svg[data-icon="true"]`

**State:** `sel` (selected el), `ovl` (overlay div), `mode` (`off|sel|edit`), `isIcon`, `dragging`, `overflowParents[]`

**Key behaviors:**
- Movement via `transform: translate()` — original layout space preserved, no reflow
- `contenteditable` FROZEN in `sel` mode, restored in `edit` mode
- `overflowParents` — on select, walks DOM up to `.ig-page`, sets `overflow:hidden` ancestors to `visible` so dragged elements aren't clipped. Restored on deselect.
- `caretAtStart(el)` helper — detects cursor at position 0 using Range API; used for smart bullet deletion
- **Backspace** in edit mode on `.ig-card-bullet`: deletes bullet if `caretAtStart()` is true (even with text present), focuses sibling
- Arrow keys: nudge 1px (Shift = 10px) when in `sel` mode
- Escape: `edit` → `sel`, `sel` → deselect
- Double-click group → enter `edit` mode on the text element inside

---

### `objects/base.js`
**Exports:** `BaseObject`

Properties: `id` (auto-gen), `type`, `x`, `y`, `width`, `height`, `zIndex`, `visible`, `locked`
Methods: `toJSON()`, `fromJSON()`, `translate(dx, dy)`, `resize(w, h)`, `clone(offsetX, offsetY)`

---

### `objects/TextBox.js`
**Exports:** `TextBox extends BaseObject`

Font: **Plus Jakarta Sans** only. Props: `text`, `fontFamily`, `fontSize` (14), `fontWeight` (400), `color`, `textAlign`, `lineHeight` (1.55), `maxLines` (0=no clamp), `isBullet`
`toHTML()` renders `<div>` or bullet `<ul>/<li>` with inline styles.

---

### `objects/TitleBox.js`
**Exports:** `TitleBox extends BaseObject`

Font: **Space Grotesk** ALWAYS. Props: `text`, `fontSize` (32), `fontWeight` (700), `color`, `textAlign`, `maxLines` (2), `gradient` (false), `tag` (h1/h2/h3)
`gradient:true` applies accent gradient text effect.

---

### `objects/IconObject.js`
**Exports:** `IconObject extends BaseObject`

`ICONS8_BASE = 'https://img.icons8.com/3d-fluency'`
Props: `iconName` (any Icons8 name), `size` (72), `alt`, `useProxy` (true), `proxyBase` ('/api/proxy?url=')
`rawUrl(px)`, `proxiedUrl(px)`, `src` getter
`toHTML()` renders `<img>` with onerror fallback (initials-in-circle SVG)

---

### `objects/StatBlock.js`
**Exports:** `StatBlock extends BaseObject`

Icon URL base: `https://img.icons8.com/3d-fluency/96`
Renders `.ig-stat` structure: icon wrap + number + label

---

### `objects/Container.js`
**Exports:** `Container extends BaseObject`

Styled `<div class="ig-container">` wrapper. Props: `backgroundColor`, `borderColor`, `borderWidth`, `borderStyle`, `borderRadius`, `shadow`, `padding`, `children`, `display`, `flexDirection`, `gap`, `alignItems`

---

### `objects/Divider.js`
**Exports:** `Divider extends BaseObject`

Horizontal or vertical separator. Props: `orientation` (horizontal), `color` (var(--divider)), `thickness` (1px), `length` (100%), `margin`

---

## Templates

### `templates/mixed-grid/template.html`
Slots: `label`, `title`, `subtitle`, `hero-icon`, `stats-loop`, `cards-loop`, `callout-title`, `callout-body`, `footer-brand`

Card density CSS classes on `.ig-card`:
- `.ig-card--compact` — gap: 4px (bullets 4–6 words)
- `.ig-card--standard` — gap: 6px (bullets 13–17 words)
- `.ig-card--detailed` — gap: 8px (bullets 23–27 words)

No `max-height` on bullets — removed. Card-level `overflow:hidden` handles genuine overflow.
Landscape override: `font-size: 11.5px` on bullets (no max-height).

---

### `templates/steps-guide/template.html`
Slots: `label`, `title`, `subtitle`, `hero-icon`, `steps-loop`, `stats-loop`, `callout-title`, `callout-body`, `footer-brand`

Step structure: `.ig-step` → `.ig-step-num` + `.ig-step-icon-wrap` + `.ig-step-body` (`.ig-step-title` + `.ig-step-body-text`)
No `max-height` on `.ig-step-body-text` — removed.

---

## CSS Variables (both templates)

```
--accent          primary brand color (set per tone or via picker)
--accent-soft     rgba(accent, 0.08)
--text-primary    main text
--card-bg         card background
--card-border     card border
--card-shadow     card drop shadow
--divider         separator line color
--radius-card     card border radius (14px)
```

Tone defaults: professional=#2563EB, bold=#F59E0B, minimal=#0F766E, playful=#7C3AED

---

---

### `smart-layouts.js`
**Exports:** `BOXES_CSS`, `renderBoxes`, `BULLETS_CSS`, `renderBullets`, `SEQUENCE_CSS`, `renderSequence`, `NUMBERS_CSS`, `renderNumbers`, `CIRCLES_CSS`, `renderCircles`, `QUOTES_CSS`, `renderQuotes`, `STEPS_CSS`, `renderSteps`, `LAYOUT_FAMILIES`, `renderSection`

Layer 2 render functions — transform `items[]` arrays into HTML+CSS visualisations. Each family has a CSS string export and a render function.

**Item shape:** `{ title, body, icon, number }` — all optional. `number` is the primary display field for the Numbers family.

**Key helpers (module-level):**
- `truncateTitle(title, density)` / `truncateBody(body, density)` — adaptive text density
- `esc(str)` — HTML escape
- `parsePctFill(str)` — parses `"70%"` → `{pct:70, isPercent:true}`, `"70"` → `{pct:70, isPercent:false}`, `"$2.4M"` → `{pct:null, isPercent:false}`
- `toRad(deg)`, `arcPath(cx,cy,rOut,rIn,start,end,gap)`, `piePath(cx,cy,r,start,end,gap)`, `arcMid(cx,cy,r,start,end)` — SVG geometry helpers used by Circles family
- `segOpacity(i,n)` — ramps opacity 0.3→1.0 for SVG segment shading
- `splitLR(n)` — splits N items into [left, right] index arrays for side-by-side layout

**Numbers family render approach (item.number is PRIMARY):**
- `stats` — giant numbers in a horizontal row of equal columns separated by dividers
- `circle-stats` — SVG donut rings (stroke-dasharray fill); ring shown only for parseable percent/plain numbers
- `circle-bold-line` — same as circle-stats but stroke-width 12
- `circle-external-line` — same as circle-stats but adds an outer thin ring at r=46
- `bar-stats` — horizontal progress bars, stacked vertically; bar shown only when number is parseable
- `star-rating` — 1–5 stars with partial fill via CSS clip; score from item.number
- `dot-grid` — 10×10 dot matrix filled by percentage
- `dot-line` — single row of 10 dots; supports half-fill for values like "25%"

**Circles family render approach (SVG shape + text boxes):**
All variants render an inline SVG shape centred between two text-box columns. Segment shading uses opacity 0.3 (first) → 1.0 (last) on `var(--accent)`.
- `cycle` — donut wheel, N equal annular sectors
- `flower` — overlapping ellipse petals rotated around centre
- `circle` — full pie, N equal slices
- `ring` — concentric rings; numbers at 3-o'clock on each ring
- `semi-circle` — top-half donut arc, text boxes below

**Steps family render approach:**
- `staircase` — unchanged except min-height added and body text clamped to 2 lines
- `steps` — horizontal flexbox row; coloured top bar per cell (opacity decreasing per step)
- `box-steps` — horizontal bordered boxes connected by thin connector lines
- `arrow-steps` — horizontal chevron shapes (CSS clip-path), alternating accent/accent-soft
- `steps-with-icons` — horizontal icon circles on an accent-soft connecting line
- `pyramid` — inline SVG trapezoid bands (top=darkest, apex), text column to the right
- `vertical-funnel` — inline SVG inverted trapezoid bands (top=widest, darkest), text column to the right

**Quotes family:**
- `quote-boxes` — cards with oversized quotation mark; unchanged
- `speech-bubbles` — rounded-rect bubbles with CSS triangle tail (::after); odd items tail left, even items tail right

---

## Pending Work (as of 2026-04-28)

- **UnDraw illustration slot** — add `illustration` field to schemas + templates; AI picks slug from category-filtered list; renderer injects inline SVG with accent color
- **INFOGRAI-SPECS.md** — needs update with illustration architecture decisions (#10 in_progress)
- **New layouts** (Phase 2): timeline, funnel, comparison, flowchart
