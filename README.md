# Infogr.ai — AI Infographic Generator

Describe a topic. Get a professional, Figma/Canva-grade document you can edit in-place and export as PNG, SVG, PDF, or HTML.

## How it works

Three-layer architecture:

- **Layouts** — six structural recipes (steps, grid, timeline, funnel, comparison, flowchart) plus an Auto mode where the AI picks or invents the best fit.
- **Blocks** — 19 HTML/CSS components (headers, stat quartets, step rows, callouts, comparison rows, timeline nodes, and more) with named content slots.
- **Assets** — a curated SVG library (48 icons, 15 brand logos, 7 decoratives) the AI references by semantic name.

The AI returns a structured JSON plan. The renderer injects content into blocks via DOMParser and fills asset slots from the catalog. No free-form HTML generation, no regex, no surprises.

## Running it

Open `index.html` directly, or serve it with any static server. Paste your Anthropic API key, describe your topic, pick a layout (or leave on Auto), hit Generate.

The tool calls `claude-sonnet-4-6` by default — matches Opus-grade output quality for structured generation at a fraction of the cost.

## Editing

Every generated block is click-to-edit. Drag the left-edge handle to reorder blocks. Click any icon or logo to swap from the asset library. Change the accent color live with the color picker in the toolbar.

## Exporting

Four formats, one click each:
- **PNG** — 2× pixel density, transparent background preserved.
- **SVG** — vector, scalable, with fonts embedded.
- **PDF** — single page, A4 scaled to match canvas ratio.
- **HTML** — self-contained snapshot with inline CSS.

## Project structure

```
index.html         ← app shell
app.js             ← state, agent call, renderer, editor, exports
styles.css         ← design tokens + block styles + dynamic sizing
blocks/            ← 19 HTML partials (one per block type)
assets/
  catalog.json     ← the index the agent consults
  icons/           ← 48 Phosphor-style icons (currentColor)
  logos/           ← 15 brand marks
  decorative/      ← 7 abstract shapes
legacy/            ← preserved v0.3 SVG-stack code
vercel.json        ← static deploy config
```

## Deploy

Vercel (or any static host). Push to `main`, connect the repo, done. No build step required.
