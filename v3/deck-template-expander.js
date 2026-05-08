/**
 * Infogr.ai v3 — Deck Template Expander (Phase 7.1A)
 *
 * Takes a deck template JSON (from `v3/deck-templates/*.json`) plus an optional
 * sample data map, and returns a fully populated deck object that the renderer
 * can display end-to-end.
 *
 * Used in two contexts:
 *   1. Visual preview in the deck-template gallery — calls with default
 *      sample data so the user can SEE the template before applying it.
 *   2. Phase 7.1B+ AI generation — calls with AI-generated sample data so
 *      the result is the user's actual customized deck.
 *
 * The expander handles three layout shapes from the schema:
 *   • simple (single block in 'content' zone)
 *   • comparison (left + right blocks for C1-style two-column slides)
 *   • three-column team (separate block per col1/col2/col3 on C4)
 *
 * Pattern interpolation: `{key}` placeholders in contentSchema patterns are
 * replaced from sampleData; missing keys render as `[key]` so they're visible.
 */

import { createDeck, addSlide, addBlock, withSlide } from './slide-deck.js';

/* ─────────────────────────────────────────
   DEFAULT SAMPLE DATA (used for gallery preview)
───────────────────────────────────────── */

export const DEFAULT_SAMPLE_DATA = {
  topic:               'Q4 Strategy',
  audience:            'Board of Directors',
  period:              'Q4 2026',
  client_name:         'Acme Corp',
  firm_name:           'GehanTech',
  start_date:          'November 2026',
  date:                'May 2026',
  pm_email:            'lily@gehantech.com',
  pm_phone:            '+1 (310) 488-4146',
  contact_email:       'lily@gehantech.com',
  project_name:        'Customer Data Platform',
  process_name:        'Order Fulfillment',
  solution_short_name: 'Smart Routing 2.0',
  phase_one_label:     'Phase 1 Pilot',
  priority_one:        'Margin Improvement Initiative',
};

/* ─────────────────────────────────────────
   SAMPLE ITEMS (per behaviorRules.itemType)
   These are the placeholder items used when expanding a template for
   preview. Phase 7.1B+ replaces them with AI-generated content.
───────────────────────────────────────── */

const SAMPLE_ITEMS = {
  /* metric — used by circle-stats which fills the donut from a numeric
     percentage. Values MUST be 0–100 or 0%–100%. Any '$', '×', '+/-' or
     letters here will fail the percentage validator and the ring will
     render unfilled. Titles are normalised to two words each so the row
     reads as a balanced trio (Gamma rule). Bodies are short, similar
     length, optional. */
  metric: [
    { number: '90%', title: 'Cycle reduction',    body: 'Quote-to-cash speed.' },
    { number: '92%', title: 'Customer retention', body: 'Holding above target.' },
    { number: '76%', title: 'Plan completion',    body: 'Three months progress.' },
  ],
  rationale: [
    { title: 'Market shift',        body: 'Customer expectations have moved upmarket while internal capability has stayed flat.' },
    { title: 'Capacity gap',        body: 'Current operations cannot absorb forecasted Q4 demand without intervention.' },
    { title: 'Decision pending',    body: 'Leadership committed to a direction by end of month — this deck supports that decision.' },
  ],
  priority: [
    { title: 'Operational excellence', body: 'Reduce friction in the customer journey end to end.' },
    { title: 'Revenue growth',         body: 'Expand into the mid-market segment with a focused go-to-market.' },
    { title: 'Talent investment',      body: 'Hire 4 senior roles in product and engineering by end of Q1.' },
    { title: 'Brand authority',        body: 'Establish thought leadership through 12 published pieces this quarter.' },
  ],
  phase: [
    { title: 'Discover', body: 'Map current state and identify friction points (Weeks 1-2).' },
    { title: 'Design',   body: 'Define target state and design the transition (Weeks 3-4).' },
    { title: 'Build',    body: 'Execute the transformation in deliverable phases (Weeks 5-10).' },
    { title: 'Measure',  body: 'Track outcomes and feed learnings back into the loop (Weeks 11-12).' },
  ],
  'team-group': [
    { title: 'Project Leadership', body: 'Strategic oversight and executive sponsorship to ensure alignment with business priorities.' },
    { title: 'Delivery Team',      body: 'Subject matter experts and specialists driving day-to-day execution and deliverables.' },
    { title: 'Key Stakeholders',   body: 'Cross-functional partners providing input, feedback, and organizational support.' },
  ],
  objective: [
    { title: 'Reduce cycle time', body: 'Bring quote-to-cash from 14 days down to 3 days.' },
    { title: 'Increase throughput', body: 'Deliver 3x current capacity without proportional headcount growth.' },
    { title: 'Improve quality',     body: 'Reduce defects-per-million by 60% across customer-facing touchpoints.' },
    { title: 'Build capability',    body: 'Equip the operations team with playbooks and tooling that outlast the engagement.' },
  ],
  'communication-channel': [
    { title: 'Weekly sync',        body: 'Tuesdays 10am PT — full team, status + blockers, 30 minutes.' },
    { title: 'Steering committee', body: 'Bi-weekly — leadership decisions, strategic alignment.' },
    { title: 'Slack channel',      body: 'Always-on, ad-hoc questions, decisions logged in Notion.' },
    { title: 'Escalation path',    body: 'PM to Sponsor to Steering Committee within 24h for blockers.' },
  ],
  role: [
    { title: 'Project Sponsor',     body: 'Owns business outcomes and final sign-off authority.' },
    { title: 'Project Lead',        body: 'Drives day-to-day execution, owns timeline and risks.' },
    { title: 'Workstream Owners',   body: 'Each owns one of the four delivery phases end-to-end.' },
    { title: 'Subject Matter Experts', body: 'Provide functional expertise on demand throughout the engagement.' },
  ],
  milestone: [
    { title: 'Weeks 1-2',  body: 'Stakeholder interviews + current-state diagnostic complete.' },
    { title: 'Weeks 3-6',  body: 'Target operating model designed and validated with leadership.' },
    { title: 'Weeks 7-10', body: 'Phase 1 pilot live; first results measured.' },
    { title: 'Weeks 11-12',body: 'Roll-out playbook delivered; transition to operations team.' },
  ],
  'pain-point': [
    { title: 'Manual handoffs',       body: '7 manual handoffs between intake and fulfillment, each a source of delay and error.' },
    { title: 'Siloed data',           body: 'Customer data lives in 4 systems with no single source of truth — inconsistent decisions.' },
    { title: 'Reactive prioritization', body: 'Team responds to whatever is loudest, not what is most valuable. Strategic work waits.' },
  ],
  'process-step': [
    { title: 'Intake',       body: 'Customer request received via email or web form. Manually triaged.' },
    { title: 'Routing',      body: 'Routed to specialist by intake clerk. Average wait 8 hours.' },
    { title: 'Resolution',   body: 'Specialist works the request. Average resolution 2 days.' },
    { title: 'Confirmation', body: 'Outcome communicated back via email. No tracking afterwards.' },
  ],
  'expected-impact-metric': [
    { title: '-60%',  body: 'Cycle time reduction' },
    { title: '$2.1M', body: 'Annual savings unlocked' },
    { title: '+45%',  body: 'Throughput improvement' },
  ],
  'benefit-metric': [
    { title: '-50% cycle',     body: 'Realized in pilot Phase 1, sustained across full rollout.' },
    { title: '+30% throughput', body: 'Same team, smarter routing, more output.' },
    { title: '-$800K cost',    body: 'Annualized savings from reduced rework and overtime.' },
    { title: '+12 NPS',        body: 'Customer satisfaction lift from faster, more accurate response.' },
  ],
  action: [
    { title: 'Confirm stakeholder list', body: 'PM owner, due Friday this week.' },
    { title: 'Schedule kickoff sessions', body: 'Workstream leads, due next Monday.' },
    { title: 'Set up shared workspace',  body: 'PM owner, due Friday this week.' },
  ],
  // Two-column comparison "what's working / what isn't"
  'compare-positive': [
    { title: '', body: 'Quote-to-cash cycle improved 40% over the past two quarters.' },
    { title: '', body: 'Customer satisfaction sustained above 92% despite headcount freeze.' },
    { title: '', body: 'New product line tracking 15% above plan three months in.' },
  ],
  'compare-negative': [
    { title: '', body: 'Cross-functional handoffs still produce 5-7 day delays in delivery.' },
    { title: '', body: 'Mid-market segment win rate has stalled at 22% for two quarters.' },
    { title: '', body: 'Engineering recruiting cycle averaging 95 days, well above target.' },
  ],
  'compare-risk': [
    { title: '', body: 'Stakeholder availability conflicts during Q3 holiday period.' },
    { title: '', body: 'Single source of historical data — risk of analysis bottleneck.' },
    { title: '', body: 'Tooling decisions need vendor approval, lead time uncertain.' },
  ],
  'compare-mitigation': [
    { title: '', body: 'Lock interview slots in week 1; designate backup approvers.' },
    { title: '', body: 'Parallel discovery streams; deploy junior analyst to cross-check.' },
    { title: '', body: 'Pre-engage vendor; have backup tool option vetted by week 2.' },
  ],
  'compare-investment': [
    { title: '', body: '$220K consulting fees over 12 weeks (blended team).' },
    { title: '', body: 'Software platform: $48K annual + 6 weeks integration.' },
    { title: '', body: 'Internal time: ~0.5 FTE across operations and IT.' },
  ],
  'compare-return': [
    { title: '', body: '$2.1M annualized savings starting Q1 of next year.' },
    { title: '', body: '+30% throughput without proportional headcount growth.' },
    { title: '', body: 'Payback period: 4.5 months from end of pilot.' },
  ],
  // Default fallback
  default: [
    { title: 'Item one',   body: 'Description for the first item.' },
    { title: 'Item two',   body: 'Description for the second item.' },
    { title: 'Item three', body: 'Description for the third item.' },
    { title: 'Item four',  body: 'Description for the fourth item.' },
  ],
};

/* ─────────────────────────────────────────
   PATTERN INTERPOLATION
───────────────────────────────────────── */

function fillPattern(pattern, data) {
  if (!pattern) return '';
  return String(pattern).replace(/\{(\w+)\}/g, (_, k) => data[k] || `[${k}]`);
}

/* ─────────────────────────────────────────
   ITEM GENERATION
───────────────────────────────────────── */

function generateItems(itemType, count) {
  const sample = SAMPLE_ITEMS[itemType] || SAMPLE_ITEMS.default;
  if (count <= sample.length) return sample.slice(0, count).map(it => ({ ...it }));
  // Pad with default items if more needed than provided.
  const out = sample.map(it => ({ ...it }));
  while (out.length < count) {
    out.push({ title: `Item ${out.length + 1}`, body: 'Sample content for this item.' });
  }
  return out;
}

/* ─────────────────────────────────────────
   COLUMN COUNT HEURISTIC
   Maps a diagram variant to its natural column count.
───────────────────────────────────────── */

const ONE_COLUMN_VARIANTS = new Set([
  'arrow-bullets', 'process-steps', 'small-bullets', 'large-bullets',
  'solid-box-small-bullets',
]);

function pickColumns(variant, itemCount) {
  if (ONE_COLUMN_VARIANTS.has(variant)) return 1;
  return Math.max(1, itemCount);
}

/* ─────────────────────────────────────────
   PAGE EXPANSION
───────────────────────────────────────── */

function expandPage(deck, page, sampleData, prevSlideId, customItemTypes, template) {
  const slideExtra = {};
  const cs = page.contentSchema || {};

  if (cs.title    && cs.title.pattern)    slideExtra.title    = fillPattern(cs.title.pattern,    sampleData);
  if (cs.subtitle && cs.subtitle.pattern) slideExtra.subtitle = fillPattern(cs.subtitle.pattern, sampleData);
  if (cs.ctaLabel && cs.ctaLabel.pattern) slideExtra.ctaLabel = fillPattern(cs.ctaLabel.pattern, sampleData);

  // Phase 8 Wave 1 — eyebrow pill + background decoration come from page
  // metadata. The eyebrow lives on the page (each slide has its own pill),
  // while decor can be either page-level (for slide-specific accents) or
  // template-level (for a deck-wide default).
  if (page.eyebrow) {
    slideExtra.eyebrow = {
      icon:  page.eyebrow.icon  || '',
      label: fillPattern(page.eyebrow.label || '', sampleData),
    };
  }
  if (page.decor)            slideExtra.decor = page.decor;
  else if (template.decor)   slideExtra.decor = template.decor;

  let nextDeck = addSlide(deck, page.pageTemplateId, prevSlideId, slideExtra);
  const slideId = nextDeck.slides[nextDeck.slides.length - 1].id;

  const rules = page.behaviorRules || {};

  // CASE 1 — comparison side-by-side (C1 with leftBlock + rightBlock).
  if (cs.leftBlock && cs.rightBlock) {
    const leftType  = (customItemTypes && customItemTypes.left)  || pickComparisonType(page, 'left');
    const rightType = (customItemTypes && customItemTypes.right) || pickComparisonType(page, 'right');
    const leftCount  = (cs.leftBlock.fields  && cs.leftBlock.fields.items  && cs.leftBlock.fields.items.length)  || 3;
    const rightCount = (cs.rightBlock.fields && cs.rightBlock.fields.items && cs.rightBlock.fields.items.length) || 3;

    nextDeck = withSlide(nextDeck, slideId, s => addBlock(s, {
      type: 'diagram',
      family: rules.diagramFamily || 'bullets',
      variant: rules.diagramVariant || 'small-bullets',
      items: generateItems(leftType, leftCount),
      columns: 1,
      density: 'standard',
      position: { zone: 'left' },
    }));
    nextDeck = withSlide(nextDeck, slideId, s => addBlock(s, {
      type: 'diagram',
      family: rules.diagramFamily || 'bullets',
      variant: rules.diagramVariant || 'small-bullets',
      items: generateItems(rightType, rightCount),
      columns: 1,
      density: 'standard',
      position: { zone: 'right' },
    }));
    return { deck: nextDeck, slideId };
  }

  // CASE 2 — three-column team grid on C4 (each item lands in its own column).
  if (page.pageTemplateId === 'C4' && cs.items && cs.items.length === 3 && rules.diagramFamily) {
    const items = generateItems(rules.itemType || 'team-group', 3);
    const zones = ['col1', 'col2', 'col3'];
    items.forEach((item, idx) => {
      nextDeck = withSlide(nextDeck, slideId, s => addBlock(s, {
        type: 'diagram',
        family: rules.diagramFamily,
        variant: rules.diagramVariant || 'solid-boxes-icons',
        items: [item],
        columns: 1,
        density: 'standard',
        position: { zone: zones[idx] },
      }));
    });
    return { deck: nextDeck, slideId };
  }

  // CASE 3 — default: single block in 'content' zone with N items.
  if (rules.diagramFamily && rules.diagramVariant && cs.items) {
    const itemType  = rules.itemType || 'default';
    const itemCount = rules.requiredItems || cs.items.length || 3;
    const items     = generateItems(itemType, itemCount);
    const columns   = pickColumns(rules.diagramVariant, items.length);

    nextDeck = withSlide(nextDeck, slideId, s => addBlock(s, {
      type: 'diagram',
      family: rules.diagramFamily,
      variant: rules.diagramVariant,
      items,
      columns,
      density: 'standard',
      position: { zone: 'content' },
    }));
  }

  return { deck: nextDeck, slideId };
}

/**
 * Map comparison sub-blocks to specific itemTypes. Looks at the leftBlock /
 * rightBlock title pattern (e.g., "Top risks" → 'compare-risk') so the sample
 * data reads naturally as "what's working vs what isn't" for the State page,
 * "Top risks vs Mitigations" for the Risks page, etc.
 */
function pickComparisonType(page, side) {
  const block = side === 'left' ? page.contentSchema.leftBlock : page.contentSchema.rightBlock;
  const titlePattern = (block && block.fields && block.fields.title && block.fields.title.pattern || '').toLowerCase();
  if (titlePattern.includes('working'))     return 'compare-positive';
  if (titlePattern.includes('attention'))   return 'compare-negative';
  if (titlePattern.includes('risk'))        return 'compare-risk';
  if (titlePattern.includes('mitigation'))  return 'compare-mitigation';
  if (titlePattern.includes('investment'))  return 'compare-investment';
  if (titlePattern.includes('return'))      return 'compare-return';
  return 'default';
}

/* ─────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────── */

/**
 * Expand a deck template into a deck object.
 *
 * @param {object} template — parsed deck template JSON
 * @param {object} [sampleData] — values for {key} placeholders. Defaults to DEFAULT_SAMPLE_DATA.
 * @param {object} [opts]
 * @param {string} [opts.tone] — overrides the template's default tone
 * @param {string} [opts.accentColor] — hex color
 * @returns {object} a deck (createDeck shape) ready to render
 */
export function expandTemplateToDeck(template, sampleData, opts) {
  if (!template || !Array.isArray(template.pages)) {
    throw new Error('expandTemplateToDeck: invalid template');
  }
  const data    = { ...DEFAULT_SAMPLE_DATA, ...(sampleData || {}) };
  const options = opts || {};
  const tone    = options.tone || (template.fitsTones && template.fitsTones[0]) || 'professional';
  const accent  = options.accentColor || '#2563EB';

  let deck = createDeck(template.name || template.id || 'Untitled', tone, accent);
  let prevSlideId = null;

  for (const page of template.pages) {
    const result = expandPage(deck, page, data, prevSlideId, undefined, template);
    deck = result.deck;
    prevSlideId = result.slideId;
  }

  return deck;
}
