/* ============================================================
   Infogr.ai v1.0 — Application Logic
   - Agent call + JSON validator + retry
   - DOMParser-based renderer (no regex)
   - Click-to-edit text, drag-to-reorder, asset swap
   - Export: PNG, SVG, PDF, HTML snapshot
   ============================================================ */

// ── STATE ──────────────────────────────────────────────────
const STATE = {
  apiKey: '',
  topic: '',
  layout: 'auto',
  tone: 'professional',
  size: 'a4',
  accent: '#2563EB',
  plan: null,           // current rendered plan
  assetCatalog: null,   // loaded from /assets/catalog.json
  blockCache: {},       // blockId -> HTML string
  layoutCache: {},      // layoutId -> HTML string
  assetCache: {},       // assetId -> SVG string
};

const TONE_COLORS = {
  professional: '#2563EB',
  bold:         '#DC2626',
  minimal:      '#0F766E',
  playful:      '#7C3AED',
};

const SIZES = {
  a4:        { w: 800,  h: 1131, label: 'A4',   ratio: '1:1.414' },
  portrait:  { w: 800,  h: 1422, label: '9:16', ratio: '9:16'    },
  square:    { w: 800,  h: 800,  label: '1:1',  ratio: '1:1'     },
  landscape: { w: 1100, h: 800,  label: '16:9', ratio: '16:9'    },
};

const LAYOUTS = [
  { id: 'auto',         name: 'Auto (AI picks)', thumb: 'auto' },
  { id: 'steps-guide',  name: 'Steps Guide',  thumb: 'steps' },
  { id: 'mixed-grid',   name: 'Mixed Grid',   thumb: 'grid' },
  { id: 'timeline',     name: 'Timeline',     thumb: 'timeline' },
  { id: 'funnel',       name: 'Funnel',       thumb: 'funnel' },
  { id: 'comparison',   name: 'Comparison',   thumb: 'comparison' },
  { id: 'flowchart',    name: 'Flowchart',    thumb: 'flowchart' },
];

// Block registry — single source of truth for valid block IDs and their slots
const BLOCK_REGISTRY = {
  'header-hero':          { slots: ['pretitle', 'title_line1', 'title_line2', 'title_accent'],     assets: ['icon', 'decorative'] },
  'header-simple':        { slots: ['title', 'subtitle'],                                            assets: [] },
  'section-divider':      { slots: ['label', 'title', 'body'],                                       assets: [] },
  'prerequisites-strip':  { slots: ['label', 'items'],                                               assets: [] },
  'stat-quartet':         { slots: ['stats'],                                                        assets: [] },
  'step-row':             { slots: ['number', 'title', 'body', 'body2'],                             assets: ['icon', 'logo'] },
  'step-row-compact':     { slots: ['number', 'title', 'body'],                                      assets: ['icon'] },
  'callout-tip':          { slots: ['label', 'body'],                                                assets: [] },
  'callout-warning':      { slots: ['label', 'body'],                                                assets: [] },
  'quote-block':          { slots: ['quote', 'attribution'],                                         assets: [] },
  'two-col-equal':        { slots: ['col1_title', 'col1_bullets', 'col2_title', 'col2_bullets'],     assets: ['col1_icon', 'col2_icon'] },
  'two-col-wide-narrow':  { slots: ['wide_title', 'wide_bullets', 'wide_note', 'narrow_label', 'narrow_items'], assets: ['wide_icon', 'narrow_icon'] },
  'three-card-grid':      { slots: ['cards'],                                                        assets: [] },
  'funnel-layer':         { slots: ['layer', 'label', 'sub'],                                        assets: ['icon'] },
  'comparison-row':       { slots: ['from', 'arrow_label', 'to'],                                    assets: [] },
  'timeline-node':        { slots: ['side', 'date', 'title'],                                        assets: [] },
  'acronym-row':          { slots: ['letter', 'word', 'detail'],                                     assets: [] },
  'footer-tagline':       { slots: ['label', 'text_lead', 'text_accent'],                            assets: [] },
  'footer-brand':         { slots: ['brand', 'tagline', 'cta'],                                      assets: [] },
};

// ── DOM ────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ── INIT ───────────────────────────────────────────────────
window.addEventListener('load', async () => {
  // Restore API key
  const k = localStorage.getItem('infograi_key');
  if (k) { $('apiKey').value = k; $('apiDot').className = 'api-dot ok'; }

  // Wire API key input
  $('apiKey').addEventListener('input', (e) => {
    const v = e.target.value.trim();
    if (v.startsWith('sk-ant') && v.length > 20) {
      $('apiDot').className = 'api-dot ok';
      localStorage.setItem('infograi_key', v);
    } else {
      $('apiDot').className = 'api-dot';
      localStorage.removeItem('infograi_key');
    }
  });

  // Wire layout picker
  renderLayoutPicker();

  // Wire tone chips
  $$('#toneRow .chip').forEach(el => {
    el.addEventListener('click', () => {
      $$('#toneRow .chip').forEach(b => b.classList.remove('on'));
      el.classList.add('on');
      STATE.tone = el.dataset.tone;
      STATE.accent = TONE_COLORS[STATE.tone];
      $('accentPicker').value = STATE.accent;
      applyToneToCanvas();
    });
  });

  // Wire size buttons
  $$('#sizeRow .sz-btn').forEach(el => {
    el.addEventListener('click', () => {
      $$('#sizeRow .sz-btn').forEach(b => b.classList.remove('on'));
      el.classList.add('on');
      STATE.size = el.dataset.size;
      applySizeToCanvas();
    });
  });

  // Generate button
  $('genBtn').addEventListener('click', generate);

  // Export buttons
  $('btnPNG').addEventListener('click', exportPNG);
  $('btnSVG').addEventListener('click', exportSVG);
  $('btnPDF').addEventListener('click', exportPDF);
  $('btnHTML').addEventListener('click', exportHTML);

  // Accent picker
  $('accentPicker').addEventListener('input', (e) => {
    STATE.accent = e.target.value;
    const canvas = document.querySelector('.ig-canvas');
    if (canvas) {
      canvas.style.setProperty('--accent', STATE.accent);
      canvas.style.setProperty('--accent-soft', hexToAlpha(STATE.accent, 0.12));
    }
  });

  // Load asset catalog
  try {
    const r = await fetch('assets/catalog.json');
    STATE.assetCatalog = await r.json();
  } catch (e) {
    console.warn('Asset catalog not loaded:', e);
    STATE.assetCatalog = { icons: {}, logos: {}, decorative: {} };
  }

  // Asset popover wiring
  setupAssetPopover();

  // Click outside to close popover
  document.addEventListener('click', (e) => {
    const pop = $('assetPopover');
    if (pop.style.display === 'block' && !pop.contains(e.target) && !e.target.closest('[data-asset-slot]')) {
      pop.style.display = 'none';
    }
  });
});

// ── LAYOUT PICKER ──────────────────────────────────────────
function renderLayoutPicker() {
  const grid = $('layoutGrid');
  grid.innerHTML = LAYOUTS.map((l, i) => `
    <div class="tpl-card ${i === 0 ? 'on' : ''}" data-layout="${l.id}">
      ${layoutThumb(l.thumb)}
      <div class="tpl-name">${l.name}</div>
    </div>
  `).join('');
  grid.querySelectorAll('.tpl-card').forEach(el => {
    el.addEventListener('click', () => {
      // Click an already-selected non-auto tile to deselect (falls back to auto)
      if (el.classList.contains('on') && el.dataset.layout !== 'auto') {
        el.classList.remove('on');
        const autoCard = grid.querySelector('[data-layout="auto"]');
        if (autoCard) autoCard.classList.add('on');
        STATE.layout = 'auto';
        return;
      }
      grid.querySelectorAll('.tpl-card').forEach(b => b.classList.remove('on'));
      el.classList.add('on');
      STATE.layout = el.dataset.layout;
    });
  });
}

function layoutThumb(kind) {
  const thumbs = {
    auto: `<svg viewBox="0 0 80 58"><rect width="80" height="58" fill="#F5F5F5" rx="3"/><text x="40" y="22" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="11" fill="#E05A2B">AUTO</text><text x="40" y="38" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#1A2744">✨ AI decides</text><circle cx="16" cy="48" r="2" fill="#E05A2B"/><circle cx="40" cy="48" r="2" fill="#E05A2B"/><circle cx="64" cy="48" r="2" fill="#E05A2B"/></svg>`,
    steps: `<svg viewBox="0 0 80 58"><rect width="80" height="58" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="10" rx="2" fill="#1A2744"/><circle cx="13" cy="23" r="4" fill="#E05A2B"/><rect x="20" y="20" width="42" height="3" rx="1" fill="#ccc"/><circle cx="13" cy="37" r="4" fill="#1A2744"/><rect x="20" y="34" width="38" height="3" rx="1" fill="#ccc"/><circle cx="13" cy="51" r="4" fill="#E05A2B"/><rect x="20" y="48" width="34" height="3" rx="1" fill="#ccc"/></svg>`,
    grid: `<svg viewBox="0 0 80 58"><rect width="80" height="58" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="10" rx="2" fill="#1A2744"/><rect x="4" y="17" width="34" height="18" rx="2" fill="#E05A2B" opacity="0.8"/><rect x="42" y="17" width="34" height="18" rx="2" fill="#1A2744" opacity="0.8"/><rect x="4" y="38" width="21" height="16" rx="2" fill="white" stroke="#ddd" stroke-width="0.5"/><rect x="29" y="38" width="21" height="16" rx="2" fill="white" stroke="#ddd" stroke-width="0.5"/><rect x="55" y="38" width="21" height="16" rx="2" fill="white" stroke="#ddd" stroke-width="0.5"/></svg>`,
    timeline: `<svg viewBox="0 0 80 58"><rect width="80" height="58" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="10" rx="2" fill="#1A2744"/><line x1="40" y1="18" x2="40" y2="56" stroke="#E05A2B" stroke-width="1.5"/><circle cx="40" cy="22" r="3" fill="#E05A2B"/><rect x="44" y="18" width="28" height="8" rx="2" fill="#c2e5ff"/><circle cx="40" cy="36" r="3" fill="#1A2744"/><rect x="8" y="32" width="28" height="8" rx="2" fill="#c2e5ff"/></svg>`,
    funnel: `<svg viewBox="0 0 80 58"><rect width="80" height="58" fill="#F5F5F5" rx="3"/><polygon points="8,10 72,10 65,22 15,22" fill="#E05A2B" opacity="0.9"/><polygon points="15,24 65,24 58,36 22,36" fill="#E05A2B" opacity="0.7"/><polygon points="22,38 58,38 52,50 28,50" fill="#E05A2B" opacity="0.5"/></svg>`,
    comparison: `<svg viewBox="0 0 80 58"><rect width="80" height="58" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="10" rx="2" fill="#1A2744"/><rect x="4" y="17" width="33" height="37" rx="2" fill="#FEE2E2" stroke="#FECACA" stroke-width="0.5"/><rect x="43" y="17" width="33" height="37" rx="2" fill="#DCFCE7" stroke="#BBF7D0" stroke-width="0.5"/></svg>`,
    flowchart: `<svg viewBox="0 0 80 58"><rect width="80" height="58" fill="#F5F5F5" rx="3"/><rect x="28" y="2" width="24" height="9" rx="4" fill="#ffecbd"/><rect x="22" y="17" width="36" height="9" rx="2" fill="#c2e5ff"/><path d="M40 32 L52 38 L40 44 L28 38 Z" fill="#dcccff"/><rect x="22" y="50" width="36" height="7" rx="3" fill="#ffecbd"/></svg>`,
  };
  return thumbs[kind] || '';
}

// ── AGENT ──────────────────────────────────────────────────
async function generate() {
  const apiKey = $('apiKey').value.trim();
  const topic = $('promptIn').value.trim();
  if (!apiKey) { alert('Please enter your Anthropic API key.'); return; }
  if (!topic) { alert('Please describe your document topic.'); return; }

  STATE.apiKey = apiKey;
  STATE.topic = topic;

  const btn = $('genBtn');
  btn.disabled = true;
  btn.classList.add('loading');
  $('toolbar').style.display = 'none';

  showProgress(['Analyzing topic...', 'Designing layout...', 'Fetching blocks...', 'Resolving assets...', 'Rendering document...'], 0);

  try {
    updateProgress(0);
    let plan = await callAgent(topic);

    updateProgress(1);
    plan = validatePlan(plan);

    updateProgress(2);
    await preloadBlocks(plan.blocks);

    updateProgress(3);
    await preloadAssets(plan);

    updateProgress(4);
    await renderPlan(plan);

    STATE.plan = plan;
    $('toolbar').style.display = 'flex';
    $('accentPicker').value = plan.theme?.accent || STATE.accent;

  } catch (err) {
    console.error(err);
    $('outputWrap').innerHTML = `
      <div class="empty">
        <div class="empty-ico">⚠</div>
        <div class="empty-ttl">Generation failed</div>
        <div class="empty-sub">${err.message || String(err)}</div>
      </div>`;
  }

  btn.disabled = false;
  btn.classList.remove('loading');
}

async function callAgent(topic, retryWithCorrection = false, prevResponse = '') {
  const canvas = SIZES[STATE.size];
  const prompt = buildAgentPrompt(topic, canvas, retryWithCorrection, prevResponse);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': STATE.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      // Sonnet 4.6 — matches Opus quality for structured JSON at a fraction of the cost.
      model: 'claude-sonnet-4-6',
      max_tokens: 12000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(`API error: ${data.error.message}`);
  if (!data.content || !data.content[0]) throw new Error('Empty response from API');

  const text = data.content[0].text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    if (!retryWithCorrection) {
      console.warn('First JSON parse failed, retrying with correction...');
      return callAgent(topic, true, text);
    }
    throw new Error(`Agent returned invalid JSON: ${e.message}`);
  }
}

function buildAgentPrompt(topic, canvas, retry, prevResponse) {
  const blockCatalog = Object.entries(BLOCK_REGISTRY).map(([id, def]) => {
    const slotList = def.slots.join(', ');
    const assetList = def.assets.length ? ` | assets: ${def.assets.join(', ')}` : '';
    return `- ${id}: slots [${slotList}]${assetList}`;
  }).join('\n');

  const iconIndex = STATE.assetCatalog?.icons
    ? Object.entries(STATE.assetCatalog.icons).map(([name, def]) => `${name}(${(def.tags || []).join('/')})`).join(', ')
    : '';

  const logoIndex = STATE.assetCatalog?.logos
    ? Object.keys(STATE.assetCatalog.logos).join(', ')
    : '';

  const decoIndex = STATE.assetCatalog?.decorative
    ? Object.keys(STATE.assetCatalog.decorative).join(', ')
    : '';

  const retryHeader = retry
    ? `\n\nYOUR PREVIOUS RESPONSE WAS NOT VALID JSON. Here is what you returned:\n---\n${prevResponse.slice(0, 1000)}\n---\nReturn ONLY valid JSON matching the schema below. No markdown, no explanation.\n\n`
    : '';

  const layoutDirective = STATE.layout === 'auto'
    ? `LAYOUT: AUTO — You choose the single best layout from the list below, based on the TOPIC's nature. Prefer picking an existing layout; only diverge if none fit, in which case assemble a custom block sequence using blocks from the catalog. Report your chosen layout id in the "layout" field.
Candidates (pick one):
  • steps-guide    — sequential how-to, tutorial, process, playbook
  • mixed-grid     — overview, explainer, "what is X" article, feature roundup
  • timeline       — history, roadmap, evolution, chronology, milestones
  • funnel         — stages, conversion, tiers, hierarchy, narrowing progression
  • comparison     — X vs Y, before/after, pros/cons, old way vs new way
  • flowchart      — decision tree, branching workflow, if-then logic`
    : `LAYOUT: ${STATE.layout} — use this layout as the primary structural template (see LAYOUT RECIPES below).`;

  return `${retryHeader}You are a senior infographic designer + subject-matter researcher producing a professional, Figma/Canva-grade document.

Your job has TWO phases (do them internally, output only the JSON):

PHASE 1 — SILENT RESEARCH (think before writing):
  • Brainstorm everything a knowledgeable expert would include on this topic: definitions, key numbers, named tools, real-world examples, step-by-step procedures, common pitfalls, best practices, notable people or companies, historical context, counter-intuitive facts.
  • Gather concrete specifics: real statistics, named frameworks, exact versions, dates, price points, named products.
  • Identify the document's single sharpest thesis — what is the ONE insight a reader should walk away with?

PHASE 2 — DESIGN THE DOCUMENT:
  • Translate your research into 14-18 blocks of dense, specific content.
  • Every slot must be filled with real, specific, non-generic copy. No Lorem Ipsum. No "your content here". No vague filler.
  • Facts > adjectives. Numbers > hand-waving. Named things > abstractions.

TOPIC: ${topic}
${layoutDirective}
TONE: ${STATE.tone}
CANVAS: ${canvas.w}x${canvas.h} (${canvas.label})

AVAILABLE BLOCKS (pick by id — only these ids are valid):
${blockCatalog}

AVAILABLE ICONS (semantic names — pick the closest match by tag):
${iconIndex}

AVAILABLE BRAND LOGOS (use when topic mentions these brands):
${logoIndex}

AVAILABLE DECORATIVE SHAPES:
${decoIndex}

LAYOUT RECIPES (starting points — enrich with extra blocks as needed):
- steps-guide:  header-hero → prerequisites-strip → section-divider → 6-9 step-row → 2-3 callout-tip → callout-warning → quote-block → footer-tagline → footer-brand
- mixed-grid:   header-hero → section-divider → stat-quartet → two-col-equal → three-card-grid → quote-block → callout-tip → section-divider → three-card-grid → footer-tagline → footer-brand
- timeline:     header-hero → section-divider → 6-8 timeline-node (alternating side) → stat-quartet → callout-tip → footer-tagline → footer-brand
- funnel:       header-hero → stat-quartet → 5 funnel-layer (layer 1→5) → three-card-grid → callout-tip → footer-tagline → footer-brand
- comparison:   header-hero → two-col-equal → 4-5 comparison-row → section-divider → three-card-grid → quote-block → footer-tagline → footer-brand
- flowchart:    header-hero → step-row → comparison-row → step-row → callout-tip → step-row → comparison-row → three-card-grid → footer-tagline → footer-brand

UNIVERSAL RULES:
1. Always start with header-hero. Always end with footer-tagline + footer-brand.
2. Target 14-18 blocks. MINIMUM 12. Richness wins.
3. Mix block types. A good infographic alternates dense text with visual variety (stats, cards, callouts, comparisons) — never 10 of the same block in a row.
4. Every text slot contains real, topic-specific copy. Concrete numbers, named tools, specific tactics, exact versions.
5. Body text in step-row: 2 short paragraphs (body + body2), each 1-2 sentences. Keep lines tight so text fits without overflow.
6. Titles and headings: ≤ 60 characters. Bullets: ≤ 80 characters each. Step bodies: ≤ 180 chars each.
7. Every icon reference must match a name from the ICONS list EXACTLY. If no perfect match, pick the closest by tag.
8. If topic names a listed brand (claude, github, notion, slack, figma, vercel, openai, etc.), use that LOGO in the header-hero "icon" slot.
9. For stat-quartet: exactly 4 stats, each with {number (e.g. "87%", "3.2x", "$240B"), label, sub, icon}.
10. For three-card-grid: exactly 3 cards, each with {title, bullets: [3 strings], icon}.
11. For prerequisites-strip: exactly 4 items, each {text, icon}.
12. For two-col-equal: 4-6 bullets per column.
13. For funnel-layer: set "layer" to 1-5 (numeric).
14. For timeline-node: set "side" to "left" or "right", alternating.
15. For acronym-row: "letter" is a single uppercase letter; use a set (e.g. S-E-R-V-E, S-M-A-R-T).
16. Write in active voice. No filler ("in today's world", "it's important to note", "at the end of the day"). Cut every word you can.
17. Tone presets: professional = authoritative + crisp; bold = punchy + declarative; minimal = spare + elegant; playful = warm + specific-not-cute.

OUTPUT — return ONLY valid JSON, no prose, no markdown fences:
{
  "title": "specific title — the real thesis of the doc",
  "subtitle": "optional one-line subtitle",
  "layout": "one of: steps-guide | mixed-grid | timeline | funnel | comparison | flowchart | custom",
  "theme": { "accent": "#hex matching the tone" },
  "brand": { "name": "brand or author", "tagline": "url or tagline", "cta": "Follow for more →" },
  "blocks": [
    { "id": "block-id-from-catalog", "props": { "slot_name": "real specific content", "icon": "icon-name" } }
  ]
}`;
}

// ── VALIDATOR ──────────────────────────────────────────────
function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') throw new Error('Plan is not an object');
  if (!Array.isArray(plan.blocks)) throw new Error('Plan has no blocks array');
  if (plan.blocks.length === 0) throw new Error('Plan has zero blocks');

  // Filter to valid block IDs only
  plan.blocks = plan.blocks.filter(b => BLOCK_REGISTRY[b.id]);

  // Default theme
  plan.theme = plan.theme || {};
  if (!plan.theme.accent) plan.theme.accent = TONE_COLORS[STATE.tone];

  // Ensure strings are strings
  plan.blocks.forEach(b => {
    b.props = b.props || {};
  });

  return plan;
}

// ── BLOCK + LAYOUT + ASSET LOADERS ─────────────────────────
async function fetchBlock(blockId) {
  if (STATE.blockCache[blockId]) return STATE.blockCache[blockId];
  const r = await fetch(`blocks/${blockId}.html`);
  if (!r.ok) throw new Error(`Block not found: ${blockId}`);
  const html = await r.text();
  STATE.blockCache[blockId] = html;
  return html;
}

async function fetchAsset(type, name) {
  const key = `${type}/${name}`;
  if (STATE.assetCache[key]) return STATE.assetCache[key];
  const def = STATE.assetCatalog?.[type]?.[name];
  if (!def) return null;
  try {
    const r = await fetch(`assets/${def.path}`);
    if (!r.ok) return null;
    const svg = await r.text();
    STATE.assetCache[key] = svg;
    return svg;
  } catch {
    return null;
  }
}

async function preloadBlocks(blocks) {
  const ids = [...new Set(blocks.map(b => b.id))];
  await Promise.all(ids.map(id => fetchBlock(id).catch(() => null)));
}

async function preloadAssets(plan) {
  const tasks = [];
  for (const block of plan.blocks) {
    walkAssetRefs(block.props, (type, name) => {
      tasks.push(fetchAsset(type, name));
    });
  }
  await Promise.all(tasks);
}

function walkAssetRefs(obj, fn) {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, val] of Object.entries(obj)) {
    if (Array.isArray(val)) {
      val.forEach(item => walkAssetRefs(item, fn));
    } else if (val && typeof val === 'object') {
      walkAssetRefs(val, fn);
    } else if (typeof val === 'string') {
      // Detect asset references by key convention
      if (key === 'icon' || key === 'col1_icon' || key === 'col2_icon' || key === 'wide_icon' || key === 'narrow_icon') {
        fn('icons', val);
        // Also try logos
        fn('logos', val);
      } else if (key === 'logo') {
        fn('logos', val);
      } else if (key === 'decorative') {
        fn('decorative', val);
      }
    }
  }
}

function resolveAssetSVG(name) {
  // Try icons, then logos, then decorative
  return STATE.assetCache[`icons/${name}`] ||
         STATE.assetCache[`logos/${name}`] ||
         STATE.assetCache[`decorative/${name}`] ||
         null;
}

// ── RENDERER ───────────────────────────────────────────────
async function renderPlan(plan) {
  const canvas = document.createElement('div');
  canvas.className = 'ig-canvas';
  canvas.setAttribute('data-tone', STATE.tone);
  canvas.setAttribute('data-size', STATE.size);

  // Apply accent
  const accent = plan.theme?.accent || STATE.accent;
  STATE.accent = accent;
  canvas.style.setProperty('--accent', accent);
  canvas.style.setProperty('--accent-soft', hexToAlpha(accent, 0.12));
  canvas.style.setProperty('--accent-dark', darken(accent, 0.2));

  const blocksWrap = document.createElement('div');
  blocksWrap.className = 'ig-blocks';

  // Render each block
  for (const blockData of plan.blocks) {
    const el = await renderBlock(blockData, plan);
    if (el) blocksWrap.appendChild(el);
  }

  canvas.appendChild(blocksWrap);

  // Mount
  $('outputWrap').innerHTML = '';
  $('outputWrap').appendChild(canvas);

  // Wire editor
  wireEditor(canvas);
}

async function renderBlock(blockData, plan) {
  const { id, props } = blockData;
  const def = BLOCK_REGISTRY[id];
  if (!def) return null;

  const html = STATE.blockCache[id];
  if (!html) return null;

  // Parse the block HTML into a DOM element
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const el = doc.body.firstElementChild;
  if (!el) return null;

  // Fill text slots
  fillBlockSlots(el, id, props, plan);

  // Fill asset slots
  fillBlockAssets(el, id, props);

  return el;
}

function fillBlockSlots(el, blockId, props, plan) {
  // Block-specific fillers
  switch (blockId) {
    case 'header-hero':
      setSlot(el, 'pretitle', props.pretitle);
      setSlot(el, 'title_line1', props.title_line1);
      setSlot(el, 'title_line2', props.title_line2);
      setSlot(el, 'title_accent', props.title_accent);
      break;

    case 'header-simple':
      setSlot(el, 'title', props.title);
      setSlot(el, 'subtitle', props.subtitle);
      break;

    case 'section-divider':
      setSlot(el, 'label', props.label);
      setSlot(el, 'title', props.title);
      setSlot(el, 'body', props.body);
      break;

    case 'prerequisites-strip':
      setSlot(el, 'label', props.label || 'PREREQUISITES');
      const preItems = Array.isArray(props.items) ? props.items.slice(0, 4) : [];
      const preContainer = el.querySelector('[data-slot="items"]');
      if (preContainer) {
        preContainer.innerHTML = preItems.map((item, i) => `
          <div class="ig-pre-item">
            <span data-asset-slot data-asset-type="icon" data-asset-name="${escAttr(item.icon || 'check-circle')}"></span>
            <span data-editable="true" contenteditable="true">${escHTML(item.text || '')}</span>
          </div>
        `).join('');
      }
      break;

    case 'stat-quartet':
      const stats = Array.isArray(props.stats) ? props.stats.slice(0, 4) : [];
      const statContainer = el.querySelector('[data-slot="stats"]');
      if (statContainer) {
        statContainer.innerHTML = stats.map((s, i) => `
          <div class="ig-stat ${i === 1 ? 'dark' : i === 3 ? 'accent' : ''}">
            <div class="ig-stat-icon"><span data-asset-slot data-asset-type="icon" data-asset-name="${escAttr(s.icon || 'chart-line-up')}"></span></div>
            <div class="ig-stat-number" data-editable="true" contenteditable="true">${escHTML(s.number || '')}</div>
            <div class="ig-stat-label" data-editable="true" contenteditable="true">${escHTML(s.label || '')}</div>
            <div class="ig-stat-sub" data-editable="true" contenteditable="true">${escHTML(s.sub || '')}</div>
          </div>
        `).join('');
      }
      break;

    case 'step-row':
    case 'step-row-compact':
      setSlot(el, 'number', props.number);
      setSlot(el, 'title', props.title);
      setSlot(el, 'body', props.body);
      if (blockId === 'step-row') setSlot(el, 'body2', props.body2);
      break;

    case 'callout-tip':
    case 'callout-warning':
      setSlot(el, 'label', props.label || (blockId === 'callout-tip' ? 'TIP' : 'WARNING'));
      setSlot(el, 'body', props.body);
      break;

    case 'quote-block':
      setSlot(el, 'quote', props.quote);
      setSlot(el, 'attribution', props.attribution);
      break;

    case 'two-col-equal':
      setSlot(el, 'col1_title', props.col1_title);
      setSlot(el, 'col2_title', props.col2_title);
      const b1 = Array.isArray(props.col1_bullets) ? props.col1_bullets : [];
      const b2 = Array.isArray(props.col2_bullets) ? props.col2_bullets : [];
      const c1 = el.querySelector('[data-slot="col1_bullets"]');
      const c2 = el.querySelector('[data-slot="col2_bullets"]');
      if (c1) c1.innerHTML = b1.map(t => `<li data-editable="true" contenteditable="true">${escHTML(t)}</li>`).join('');
      if (c2) c2.innerHTML = b2.map(t => `<li data-editable="true" contenteditable="true">${escHTML(t)}</li>`).join('');
      break;

    case 'two-col-wide-narrow':
      setSlot(el, 'wide_title', props.wide_title);
      setSlot(el, 'wide_note', props.wide_note);
      setSlot(el, 'narrow_label', props.narrow_label || 'KEY POINTS');
      const wb = Array.isArray(props.wide_bullets) ? props.wide_bullets : [];
      const ni = Array.isArray(props.narrow_items) ? props.narrow_items : [];
      const wbEl = el.querySelector('[data-slot="wide_bullets"]');
      const niEl = el.querySelector('[data-slot="narrow_items"]');
      if (wbEl) wbEl.innerHTML = wb.map(t => `<li data-editable="true" contenteditable="true">${escHTML(t)}</li>`).join('');
      if (niEl) niEl.innerHTML = ni.map(t => `<li data-editable="true" contenteditable="true">${escHTML(t)}</li>`).join('');
      break;

    case 'three-card-grid':
      const cards = Array.isArray(props.cards) ? props.cards.slice(0, 3) : [];
      const cardContainer = el.querySelector('[data-slot="cards"]');
      if (cardContainer) {
        cardContainer.innerHTML = cards.map((c, i) => {
          const bullets = Array.isArray(c.bullets) ? c.bullets : [];
          return `
            <div class="ig-card ${i === 1 ? 'dark' : ''}">
              <div class="ig-card-icon"><span data-asset-slot data-asset-type="icon" data-asset-name="${escAttr(c.icon || 'star')}"></span></div>
              <div class="ig-card-title" data-editable="true" contenteditable="true">${escHTML(c.title || '')}</div>
              <ul class="ig-card-body">
                ${bullets.map(b => `<li data-editable="true" contenteditable="true">${escHTML(b)}</li>`).join('')}
              </ul>
            </div>
          `;
        }).join('');
      }
      break;

    case 'funnel-layer':
      el.setAttribute('data-layer', String(props.layer || 1));
      setSlot(el, 'label', props.label);
      setSlot(el, 'sub', props.sub);
      break;

    case 'comparison-row':
      setSlot(el, 'from', props.from);
      setSlot(el, 'to', props.to);
      setSlot(el, 'arrow_label', props.arrow_label || 'TO');
      break;

    case 'timeline-node': {
      const side = props.side === 'right' ? 'right' : 'left';
      const leftPanel = el.querySelector('.ig-tl-panel.left');
      const rightPanel = el.querySelector('.ig-tl-panel.right');
      const activePanel = side === 'left' ? leftPanel : rightPanel;
      const emptyPanel = side === 'left' ? rightPanel : leftPanel;
      if (activePanel) {
        const dEl = activePanel.querySelector('[data-slot="date"]');
        const tEl = activePanel.querySelector('[data-slot="title"]');
        if (dEl) dEl.textContent = props.date == null ? '' : String(props.date);
        if (tEl) tEl.textContent = props.title == null ? '' : String(props.title);
      }
      if (emptyPanel) emptyPanel.classList.add('empty');
      break;
    }

    case 'acronym-row':
      setSlot(el, 'letter', props.letter);
      setSlot(el, 'word', props.word);
      setSlot(el, 'detail', props.detail);
      break;

    case 'footer-tagline':
      setSlot(el, 'label', props.label || 'THE REAL UNLOCK');
      setSlot(el, 'text_lead', props.text_lead);
      setSlot(el, 'text_accent', props.text_accent);
      break;

    case 'footer-brand':
      const b = plan.brand || {};
      setSlot(el, 'brand', props.brand || b.name || 'Infogr.ai');
      setSlot(el, 'tagline', props.tagline || b.tagline || '');
      setSlot(el, 'cta', props.cta || b.cta || 'Follow for more →');
      break;
  }
}

function setSlot(root, slotName, value) {
  const el = root.querySelector(`[data-slot="${slotName}"]`);
  if (!el) return;
  const text = value == null ? '' : String(value);
  // Clear existing children and set text safely
  el.textContent = text;
}

function fillBlockAssets(root, blockId, props) {
  const slots = root.querySelectorAll('[data-asset-slot]');
  slots.forEach(slot => {
    // If already has a data-asset-name (from innerHTML injection), use that
    let name = slot.getAttribute('data-asset-name');
    if (!name) {
      name = pickAssetName(blockId, props, slot);
      slot.setAttribute('data-asset-name', name || '');
    }
    if (name) {
      const svg = resolveAssetSVG(name);
      slot.innerHTML = svg || fallbackSVG();
    }
  });
}

function pickAssetName(blockId, props, slot) {
  if (blockId === 'header-hero') return props.icon || props.logo;
  if (blockId === 'step-row' || blockId === 'step-row-compact') return props.logo || props.icon;
  if (blockId === 'two-col-equal') {
    // Differentiate by parent column class
    const card = slot.closest('.ig-tc-card');
    if (card && card.classList.contains('right')) return props.col2_icon || props.icon;
    return props.col1_icon || props.icon;
  }
  if (blockId === 'two-col-wide-narrow') {
    if (slot.closest('.ig-narrow')) return props.narrow_icon || props.icon;
    return props.wide_icon || props.icon;
  }
  if (blockId === 'funnel-layer') return props.icon;
  return props.icon || null;
}

function fallbackSVG() {
  return `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-width="16"/></svg>`;
}

// ── EDITOR ─────────────────────────────────────────────────
function wireEditor(canvas) {
  const blocksWrap = canvas.querySelector('.ig-blocks');

  // Add drag handles and delete buttons to each block
  $$('.ig-blocks > *', canvas).forEach((block, i) => {
    // Drag handle
    const handle = document.createElement('div');
    handle.className = 'ig-drag-handle';
    handle.textContent = '⋮⋮';
    block.appendChild(handle);
    // Delete button
    const del = document.createElement('button');
    del.className = 'ig-block-delete';
    del.textContent = '×';
    del.title = 'Remove this block';
    del.addEventListener('click', () => {
      if (confirm('Remove this block?')) block.remove();
    });
    block.appendChild(del);
  });

  // Sortable for reordering
  if (window.Sortable) {
    Sortable.create(blocksWrap, {
      handle: '.ig-drag-handle',
      animation: 180,
      ghostClass: 'ig-drag-ghost',
    });
  }

  // Asset click handler for swapping
  canvas.addEventListener('click', (e) => {
    const slot = e.target.closest('[data-asset-slot]');
    if (slot) {
      e.stopPropagation();
      openAssetPopover(slot);
    }
  });
}

// ── ASSET POPOVER ──────────────────────────────────────────
let activeAssetSlot = null;
let popoverTab = 'icons';

function setupAssetPopover() {
  $$('.ap-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.ap-tab').forEach(t => t.classList.remove('on'));
      tab.classList.add('on');
      popoverTab = tab.dataset.tab;
      renderAssetGrid();
    });
  });
  $('assetSearch').addEventListener('input', renderAssetGrid);
}

function openAssetPopover(slot) {
  activeAssetSlot = slot;
  const rect = slot.getBoundingClientRect();
  const pop = $('assetPopover');
  pop.style.left = Math.min(rect.left, window.innerWidth - 340) + 'px';
  pop.style.top = (rect.bottom + 8 + window.scrollY) + 'px';
  pop.style.display = 'block';
  renderAssetGrid();
}

function renderAssetGrid() {
  const pop = $('assetPopover');
  if (pop.style.display === 'none') return;
  const tab = popoverTab;
  const query = $('assetSearch').value.toLowerCase().trim();
  const catalog = STATE.assetCatalog?.[tab] || {};
  const names = Object.keys(catalog).filter(n => !query || n.toLowerCase().includes(query) || (catalog[n].tags || []).some(t => t.includes(query)));

  const grid = $('apGrid');
  grid.innerHTML = names.map(name => {
    const svg = STATE.assetCache[`${tab}/${name}`] || '';
    return `<div class="ap-item" data-asset-name="${escAttr(name)}" data-asset-type="${tab}" title="${escAttr(name)}">${svg || fallbackSVG()}</div>`;
  }).join('');

  grid.querySelectorAll('.ap-item').forEach(item => {
    item.addEventListener('click', async () => {
      const name = item.dataset.assetName;
      const type = item.dataset.assetType;
      await fetchAsset(type, name);
      if (activeAssetSlot) {
        activeAssetSlot.setAttribute('data-asset-name', name);
        activeAssetSlot.setAttribute('data-asset-type', type === 'icons' ? 'icon' : type);
        const svg = STATE.assetCache[`${type}/${name}`] || fallbackSVG();
        activeAssetSlot.innerHTML = svg;
      }
      $('assetPopover').style.display = 'none';
    });
  });
}

// ── TONE + SIZE + ACCENT APPLICATION ──────────────────────
function applyToneToCanvas() {
  const canvas = document.querySelector('.ig-canvas');
  if (!canvas) return;
  canvas.setAttribute('data-tone', STATE.tone);
  STATE.accent = TONE_COLORS[STATE.tone];
  canvas.style.setProperty('--accent', STATE.accent);
  canvas.style.setProperty('--accent-soft', hexToAlpha(STATE.accent, 0.12));
}

function applySizeToCanvas() {
  const canvas = document.querySelector('.ig-canvas');
  if (!canvas) return;
  canvas.setAttribute('data-size', STATE.size);
}

// ── EXPORT ─────────────────────────────────────────────────
function currentCanvas() {
  return document.querySelector('.ig-canvas');
}

function slugify(s) {
  return (s || 'infograi').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function exportFilename(ext) {
  return `infograi-${slugify(STATE.plan?.title || STATE.topic)}.${ext}`;
}

async function exportPNG() {
  const el = currentCanvas();
  if (!el) return;
  await document.fonts.ready;
  try {
    const dataUrl = await htmlToImage.toPng(el, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: getComputedStyle(el).backgroundColor || '#fff',
    });
    download(dataUrl, exportFilename('png'));
  } catch (e) {
    alert('PNG export failed: ' + e.message);
  }
}

async function exportSVG() {
  const el = currentCanvas();
  if (!el) return;
  try {
    const svg = await htmlToImage.toSvg(el);
    download(svg, exportFilename('svg'));
  } catch (e) {
    alert('SVG export failed: ' + e.message);
  }
}

async function exportPDF() {
  const el = currentCanvas();
  if (!el) return;
  await document.fonts.ready;
  try {
    const dataUrl = await htmlToImage.toPng(el, { pixelRatio: 2, cacheBust: true });
    const img = new Image();
    img.onload = () => {
      const pdfWidth = 595; // A4 portrait pts
      const pdfHeight = (img.height / img.width) * pdfWidth;
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'pt',
        format: [pdfWidth, pdfHeight],
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(exportFilename('pdf'));
    };
    img.src = dataUrl;
  } catch (e) {
    alert('PDF export failed: ' + e.message);
  }
}

function exportHTML() {
  const el = currentCanvas();
  if (!el) return;
  const css = [...document.styleSheets]
    .map(ss => {
      try { return [...ss.cssRules].map(r => r.cssText).join('\n'); }
      catch { return ''; }
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escHTML(STATE.plan?.title || 'Infogr.ai export')}</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${css}
body { margin: 0; background: #f5f5f5; display: flex; justify-content: center; padding: 40px; }
</style>
</head>
<body>
${el.outerHTML}
</body>
</html>`;

  download('data:text/html;charset=utf-8,' + encodeURIComponent(html), exportFilename('html'));
}

function download(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ── PROGRESS UI ────────────────────────────────────────────
function showProgress(steps, active) {
  const stepsHTML = steps.map((s, i) => `
    <div class="ps ${i < active ? 'done' : i === active ? 'active' : ''}">
      <div class="ps-dot"></div>${s}
    </div>`).join('');
  $('outputWrap').innerHTML = `
    <div class="loading-state">
      <div class="loading-ring"></div>
      <div class="loading-txt">Designer agent working…</div>
      <div class="loading-sub">This usually takes 15 to 45 seconds</div>
      <div class="progress-steps">${stepsHTML}</div>
    </div>`;
}

function updateProgress(active) {
  $$('.ps').forEach((el, i) => {
    el.className = `ps ${i < active ? 'done' : i === active ? 'active' : ''}`;
  });
}

// ── UTILS ──────────────────────────────────────────────────
function escHTML(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) { return escHTML(s).replace(/"/g, '&quot;'); }

function hexToAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex, amount) {
  const h = hex.replace('#', '');
  let r = parseInt(h.substring(0, 2), 16);
  let g = parseInt(h.substring(2, 4), 16);
  let b = parseInt(h.substring(4, 6), 16);
  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
