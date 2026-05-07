# Deck Template Schema (v1.0)

> Specification for files in `v3/deck-templates/`. Each `.json` file in this directory describes ONE deck template — a fully-specified multi-slide deck structure that the AI generator either fills in directly (Tier 1 match) or decomposes into reusable pages for cross-template composition (Tier 2-3).
>
> Created: 2026-05-05 — Phase 7.1A.
> See `ROADMAP.md` Phase 7 + the Path E synthesis discussion for rationale.

---

## File structure

One file per template. Filename matches the template's `id` field. Example: `executive-summary.json`.

Top-level structure:

```jsonc
{
  "$schema": "1.0",
  "id":          "executive-summary",       // unique kebab-case
  "name":        "Executive Summary",       // human-readable display name
  "description": "Concise board-level briefing covering context, current state, priorities, and outlook.",
  "category":    "Strategy",                 // one of: Strategy | Consulting | Pitch | Operations | Marketing | HR | Reporting | Education | Sales | Compliance
  "useCases":    [...],                      // array of strings — semantic match keywords
  "tags":        [...],                      // array of strings — fine-grained search tags
  "fitsTones":   [...],                      // subset of: ['professional', 'bold', 'minimal', 'playful']
  "recommendedLength": [5, 8],               // [min, max] page count
  "narrativeArc":      "context → state → priorities → outlook → close",
  "thumbnailHint":     "minimalist with bold typography",   // for future preview generation
  "pages":             [ /* array of Page objects, see below */ ]
}
```

---

## Page object schema

Each entry in `pages` describes one slide. Pages are decomposed into 5 layers per Path E (the synthesis of Lily's 4-tier matching idea + the composition-grammar formalization).

```jsonc
{
  "id": "executive-summary_01_title",
  // Stable unique id. Convention: `{templateId}_{NN}_{role}`. Used by Tier 2
  // cross-template page composition for retrieval and dedup.

  "narrativeRole": "title",
  // L3 — what this slide IS. Controlled vocabulary (see roles list below).

  "compositionGrammar": "split-hero-left",
  // L1 — the layout pattern. References an entry in the composition-grammar
  // registry (to be built in Phase 7.1B). For Phase 7.1A, we use these names
  // as labels — the registry will be extracted from the patterns we observe
  // across the first 10 templates, so don't over-invent.

  "pageTemplateId": "A2",
  // L0 — the underlying page primitive (one of A1-E6 from slide-templates.js).
  // The composition grammar maps to a page template plus zone overrides.

  "contentSchema": {
    "title":    { "type": "string", "required": true,  "pattern": "{topic} — Executive Summary" },
    "subtitle": { "type": "string", "required": false, "pattern": "{period} | Prepared for {audience}" }
  },
  // L4 — what data this page expects. Used by the AI to generate / validate
  // the customized content. `pattern` strings show the AI how the content
  // should read; placeholders like {topic} are replaced from the user's
  // input or from earlier slides' context.

  "behaviorRules": {
    "titleStyle": "large-display",
    "narrativeBridge": "Sets the framing for the entire briefing"
  },
  // L5 — constraints + guidance. Free-form key/value. The AI reads this as
  // hints when customizing content. Keys we use in the first 10 templates:
  //   titleStyle:        'large-display' | 'compact' | 'subdued'
  //   narrativeBridge:   string — what role this slide plays in the deck arc
  //   diagramFamily:     family id (boxes, bullets, sequence, ...)
  //   diagramVariant:    variant id (solid-boxes, timeline, ...)
  //   requiredItems:     int — exact item count for fixed-slot variants
  //   maxItems:          int — soft cap
  //   itemType:          string — semantic description of each item
  //   requiresImage:     boolean
  //   itemTitleMaxChars: int

  "tags": ["title", "intro", "framing"],
  // Fine-grained search tags. Used by Tier 2 cross-template page composition.

  "narrativePosition": "open",
  // 'open' | 'early' | 'middle' | 'late' | 'close'.
  // Helps Tier 2 maintain narrative flow when composing across templates.

  "linksWellWith": ["context", "state"]
  // Array of narrativeRole values. Suggests which roles can naturally follow
  // this page. Used by Tier 2 to maintain a coherent narrative when stitching
  // pages from different templates.
}
```

---

## Controlled vocabulary

### Narrative roles

The role describes WHAT the slide is for, independent of layout or style. Roles drive Tier 2 cross-template matching.

| Role | Purpose |
|---|---|
| `title` | Opening — topic, audience, period |
| `agenda` | What this deck will cover |
| `context` | Why this discussion matters now |
| `intro` | Sets up the audience or problem |
| `team` | Who's involved — roles, stakeholders, leadership |
| `state` | Current state of things — what is true today |
| `kpi` | Key metrics, numbers, dashboards |
| `problem` | Pain points, issues, gaps |
| `objectives` | Goals, scope, success criteria |
| `approach` | Methodology, framework, process steps |
| `solution` | Proposed approach to the problem |
| `comparison` | Side-by-side, before/after, options |
| `priorities` | What matters most, ranked |
| `journey` | Stages over time, timeline, roadmap |
| `roles` | Responsibilities, RACI, ownership |
| `risks` | Risks, dependencies, mitigations |
| `benefits` | Expected impact, value, ROI |
| `outlook` | Where things are heading, forecast |
| `quote` | Testimonial, key insight, manifesto statement |
| `cta` | Call to action, decision needed, next steps |
| `commit` | Asks for sign-off, agreement, alignment |
| `close` | Thank you, contact, end card |

### Composition grammars (Phase 7.1A starter set)

These names will become a formal registry in Phase 7.1B. For now they're labels referencing the layout pattern. The registry will be extracted from the patterns we observe in the first 10 templates.

| Grammar | What it is | Maps to page template |
|---|---|---|
| `split-hero-left` | Title / message left, supporting visual right | A2 / B2 |
| `centered-manifesto` | Single bold statement centered, no diagrams | A2 / A3 |
| `kpi-grid-three` | Three metrics in a row | A1 |
| `kpi-grid-four` | Four metrics in a row OR 2x2 | A1 / C5 |
| `timeline-horizontal-quarters` | 4-stage timeline across the page | A1 / B3 |
| `editorial-quote` | Large quote + attribution | E1 |
| `comparison-side-by-side` | Two columns, contrast layout | C1 / E3 |
| `bullets-with-icons` | Vertical list with icons, optional accent image | A1 / B1 |

### Tags (search vocabulary)

Free-form but use existing tags first. As of Phase 7.1A:
- Subject: `team`, `kpi`, `roadmap`, `process`, `risk`, `benefits`, `audience`, `framing`, `summary`, `proposal`, `recommendation`
- Audience: `board`, `executives`, `client`, `team`, `stakeholders`, `internal`, `external`
- Pace: `intro`, `core`, `deep-dive`, `transition`, `wrap`
- Domain: `consulting`, `product`, `marketing`, `sales`, `operations`, `strategy`, `compliance`

---

## Validation rules (enforced when loading a template)

1. `id` is unique across all templates.
2. `pages[].id` is unique within a template.
3. Every `pages[].narrativeRole` is in the controlled vocabulary.
4. Every `pages[].compositionGrammar` is in the starter set (Phase 7.1A) or registry (Phase 7.1B+).
5. Every `pages[].pageTemplateId` exists in `v3/slide-templates.js`.
6. `pages[].contentSchema` is well-formed JSON Schema-lite (type + required fields).
7. `pages[].linksWellWith` contains valid roles from the controlled vocabulary.
8. `recommendedLength[0]` <= `pages.length` <= `recommendedLength[1]` is loosely enforced (warning only — templates can have more or fewer pages than recommended).

---

## How AI uses this

### Tier 1 (whole-deck match)

AI sees the user's topic + tone + size, scores each template by `useCases` + `tags` + `fitsTones`, picks the best match, then customizes content per `contentSchema`.

### Tier 2 (cross-template page composition)

When no single template scores high enough, AI builds the deck from individual pages across templates. Page-level matching uses `narrativeRole` + `tags` + `compositionGrammar` + `narrativePosition`. `linksWellWith` constrains adjacency for narrative coherence.

### Tier 3 (hybrid — templates + generated)

If Tier 2 produces partial coverage (e.g., 8 of 12 needed roles found in the page library), the gaps are filled by rule-based generation using the standard composition rules from `SLIDE-DECK-PLAN.md` Section 7.4.

### Tier 4 (pure rule-based fallback)

For truly novel topics with no library matches at all, AI generates from scratch using the existing rule system.

---

## Conventions for writing template files

- Keep `description` and `useCases` concrete, not abstract. The AI matches on these.
- Page count: aim for 6-10 pages per template. Less than 5 risks insufficient narrative; more than 12 risks bloat.
- `contentSchema.pattern` strings are the single biggest lever for content quality. Write them like you'd write a fill-in-the-blank example.
- Don't reuse `narrativeRole` more than once per template unless absolutely necessary. The role taxonomy is rich enough to stay distinct.
- `narrativePosition` stays in order: `open` → `early` → `middle` → `late` → `close`.
- `linksWellWith` is forward-looking — it suggests what should come AFTER this page, not before.
