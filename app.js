/* ============================================================
   Infogr.ai v2.0 — Full HTML Generation Architecture
   - One-shot HTML via Claude claude-sonnet-4-6 (max_tokens: 16000)
   - Iframe renderer (srcdoc)
   - Icons8 Fluency illustrated icons + Clearbit brand logos
   - Live accent color injection into iframe
   - Edit mode (contenteditable toggle)
   - Export: PNG, PDF, HTML
   ============================================================ */

// ── STATE ──────────────────────────────────────────────────
const STATE = {
  apiKey:      '',
  topic:       '',
  layout:      'auto',
  tone:        'professional',
  size:        'a4',
  accent:      '#2563EB',
  currentHTML: null,   // last generated HTML string
  editMode:    false,
};

const TONE_COLORS = {
  professional: '#2563EB',
  bold:         '#DC2626',
  minimal:      '#0F766E',
  playful:      '#7C3AED',
};

const SIZES = {
  a4:        { w: 800,  h: 1131, label: 'A4',   sections: '6-8' },
  portrait:  { w: 800,  h: 1422, label: '9:16', sections: '7-9' },
  square:    { w: 800,  h: 800,  label: '1:1',  sections: '4-5' },
  landscape: { w: 1100, h: 800,  label: '16:9', sections: '3-4' },
};

const LAYOUTS = [
  { id: 'auto',        name: 'Auto (AI picks)', thumb: 'auto'       },
  { id: 'steps-guide', name: 'Steps Guide',     thumb: 'steps'      },
  { id: 'mixed-grid',  name: 'Mixed Grid',      thumb: 'grid'       },
  { id: 'timeline',    name: 'Timeline',        thumb: 'timeline'   },
  { id: 'funnel',      name: 'Funnel',          thumb: 'funnel'     },
  { id: 'comparison',  name: 'Comparison',      thumb: 'comparison' },
  { id: 'flowchart',   name: 'Flowchart',       thumb: 'flowchart'  },
];

// ── DOM ────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ── INIT ───────────────────────────────────────────────────
window.addEventListener('load', () => {
  // Restore API key
  const k = localStorage.getItem('infograi_key');
  if (k) { $('apiKey').value = k; $('apiDot').className = 'api-dot ok'; }

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

  renderLayoutPicker();

  $$('#toneRow .chip').forEach(el => {
    el.addEventListener('click', () => {
      $$('#toneRow .chip').forEach(b => b.classList.remove('on'));
      el.classList.add('on');
      STATE.tone   = el.dataset.tone;
      STATE.accent = TONE_COLORS[STATE.tone];
      $('accentPicker').value = STATE.accent;
      applyAccentToFrame();
    });
  });

  $$('#sizeRow .sz-btn').forEach(el => {
    el.addEventListener('click', () => {
      $$('#sizeRow .sz-btn').forEach(b => b.classList.remove('on'));
      el.classList.add('on');
      STATE.size = el.dataset.size;
      applyFrameSize();
    });
  });

  $('genBtn').addEventListener('click', generate);
  $('btnPNG').addEventListener('click', exportPNG);
  $('btnPDF').addEventListener('click', exportPDF);
  $('btnHTML').addEventListener('click', exportHTML);
  $('btnEdit').addEventListener('click', toggleEditMode);

  $('accentPicker').addEventListener('input', (e) => {
    STATE.accent = e.target.value;
    applyAccentToFrame();
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
      if (el.classList.contains('on') && el.dataset.layout !== 'auto') {
        el.classList.remove('on');
        grid.querySelector('[data-layout="auto"]')?.classList.add('on');
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

// ── GENERATE ───────────────────────────────────────────────
async function generate() {
  const apiKey = $('apiKey').value.trim();
  const topic  = $('promptIn').value.trim();
  if (!apiKey) { alert('Please enter your Anthropic API key.'); return; }
  if (!topic)  { alert('Please describe your document topic.'); return; }

  STATE.apiKey   = apiKey;
  STATE.topic    = topic;
  STATE.editMode = false;

  const btn = $('genBtn');
  btn.disabled = true;
  btn.classList.add('loading');
  $('toolbar').style.display = 'none';

  showGenerating();

  try {
    const html = await callAgent(topic);
    STATE.currentHTML = html;
    renderHTML(html);
    $('toolbar').style.display = 'flex';
    updateEditButton();
  } catch (err) {
    console.error(err);
    showError(err.message || String(err));
  }

  btn.disabled = false;
  btn.classList.remove('loading');
}

// ── AGENT ──────────────────────────────────────────────────
async function callAgent(topic) {
  const sz     = SIZES[STATE.size];
  const prompt = buildPrompt(topic, sz);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-api-key':     STATE.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 16000,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`API error: ${data.error.message}`);
  if (!data.content?.[0]) throw new Error('Empty response from API');

  const text = data.content[0].text.trim()
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  if (!text.includes('<html') && !text.includes('<!DOCTYPE')) {
    throw new Error('Agent did not return valid HTML. Please try again.');
  }

  return text;
}

// ── PROMPT BUILDER ─────────────────────────────────────────
function buildPrompt(topic, sz) {

  const toneAccent = TONE_COLORS[STATE.tone];

  const toneGuides = {
    professional: `TONE — Professional (clean, authoritative, corporate-grade)
  Background: #FFFFFF main, #F8FAFC for alternating sections
  Accent CSS variable: --accent (${toneAccent}) — use for headers, borders, icon badges, highlights
  Text: #0F172A headings, #334155 body, #64748B captions
  Cards: white, 1px solid #E2E8F0 border, 8px radius, subtle box-shadow
  Feel: crisp lines, generous whitespace, data-forward`,

    bold: `TONE — Bold (dark, punchy, high-contrast)
  Background: #0F172A main, #1E293B cards/sections
  Accent CSS variable: --accent (${toneAccent}) — use for glowing borders, labels, stat numbers
  Text: #FFFFFF headings, #CBD5E1 body, #94A3B8 captions
  Labels: uppercase, accent color, letter-spacing 0.08em, 11px font-size
  Feel: editorial magazine, dark-mode-native, large impactful type`,

    minimal: `TONE — Minimal (editorial, spare, every pixel earns its place)
  Background: #FAFAF8 main, #F5F3EF alternating
  Accent CSS variable: --accent (${toneAccent}) — use sparingly (1px borders, underlines, one highlight element)
  Text: #1C1917 headings, #57534E body, #A8A29E captions
  Borders: 1px solid #E7E5E4 — no drop shadows, flat design
  Feel: refined, airy, typography-led — let content breathe`,

    playful: `TONE — Playful (warm, energetic, friendly — but data-rich, not childish)
  Background: #FFFBEB main, #FEF3C7 alternating sections
  Accent CSS variable: --accent (${toneAccent}) — use for headers, badges, highlights
  Text: #1C1917 headings, #44403C body
  Cards: rounded-2xl corners (16px), gentle box-shadows (0 2px 12px rgba(0,0,0,0.08))
  Secondary accent: #F59E0B amber for stat numbers, callout borders
  Feel: bright, motivated, premium learning content`,
  };

  const layoutDirective = STATE.layout === 'auto'
    ? `LAYOUT — Auto: choose the single best layout for this topic.
  • steps-guide   → numbered tutorial, how-to, process (sequential topics)
  • mixed-grid    → overview, explainer, feature roundup ("what is X")
  • timeline      → history, roadmap, chronology, milestones
  • funnel        → stages, tiers, conversion, narrowing hierarchy
  • comparison    → X vs Y, before/after, pros/cons
  • flowchart     → decision tree, branching workflow, if-then logic`
    : `LAYOUT — MANDATORY: You MUST use the "${STATE.layout}" layout pattern described below.`;

  const layoutRecipes = {
    'steps-guide': `STEPS-GUIDE pattern:
  Header (full-width, dark or accent bg): category label + main title (Syne, 36-40px) + subtitle
  Prerequisites strip: 3-4 small chips in a row, each with 24px icon + short label
  Numbered steps (5-8 steps): large step-number (56px, accent color) left + title + 2-sentence description right + optional 40px icon top-right
    Alternate white/very-light-accent row backgrounds
  Key stats strip: 3-4 boxes, each with big number + label + icon
  Callout box: left accent border, light bg, tip or warning text
  Footer: brand + attribution`,

    'mixed-grid': `MIXED-GRID pattern:
  Hero header (full-width): title (Syne, 40px) + subtitle + optional hero icon (64px) right-aligned
  Stats row: 3-4 equal boxes, each with big number (36px Syne) + label + 40px icon
  2-column feature section: wider left (title + 4-5 bullets + icon) + narrow right (key points or callout)
  3-column card grid: each card = 48px icon + bold title + 3 bullet points
  Quote or summary callout
  Footer`,

    'timeline': `TIMELINE pattern:
  Header with title + subtitle
  Central vertical bar (3px, accent color) centered horizontally
  5-7 alternating nodes left/right:
    Each node: circle dot (12px) on the bar + date label (accent color) + title (bold) + 1-sentence description
    Left nodes: text right-aligned ending at bar; right nodes: text left-aligned starting from bar
  Stats or summary row at bottom
  Footer`,

    'funnel': `FUNNEL pattern:
  Header with title + subtitle
  5 layers, each narrower than the previous (use border-width trick or clip-path):
    Colors: --accent at opacity 1.0, 0.85, 0.70, 0.55, 0.40
    Each: centered stage label (bold, white) + stage name + 1-line description on the right
  Outcome/result box below the funnel
  Footer`,

    'comparison': `COMPARISON pattern:
  Header framing the two options being compared
  2-column layout (side by side, equal width):
    Left column: red-tinted header (#FEE2E2) + "Before" or "Option A" label + 4-5 points
    Right column: green-tinted header (#DCFCE7) + "After" or "Option B" label + 4-5 points
  3-4 comparison rows between them: left point ←→ right point with arrow/divider in center
  Summary / recommendation section
  Footer`,

    'flowchart': `FLOWCHART pattern:
  Header
  Flowchart with connected elements (use flexbox columns + connector lines via ::after pseudo-elements or SVG):
    Rounded rectangles for process steps (accent bg, white text)
    Diamond shapes for decisions (rotate 45deg square, yellow/amber)
    Arrows with text labels between elements
  Legend or key
  Footer`,
  };

  const recipe = layoutRecipes[STATE.layout] || '';

  return `You are a world-class infographic designer. Generate a single, complete, beautiful, self-contained HTML infographic.

TOPIC: ${topic}
CANVAS: Exactly ${sz.w}px × ${sz.h}px — no overflow, no scrollbars
SECTIONS: ${sz.sections} visual sections to fill the canvas height perfectly

══════════════════════════════════════
CANVAS SIZE — ABSOLUTE RULE
══════════════════════════════════════
The root container (.ig-page) MUST be:
  width: ${sz.w}px;
  height: ${sz.h}px;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

Use flex-grow on sections to distribute vertical space perfectly.
If content would overflow, shrink fonts or shorten text — do NOT let the page scroll.
Body style: margin:0; background:#f0f2f5; display:flex; justify-content:center; align-items:flex-start; min-height:100vh;

══════════════════════════════════════
FONTS
══════════════════════════════════════
Include in <head>:
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

Use "Syne" for ALL main headings and section titles.
Use "Plus Jakarta Sans" for body text, bullets, labels, captions.

══════════════════════════════════════
CSS VARIABLES — required for live theming
══════════════════════════════════════
Define at :root:
  :root {
    --accent: ${toneAccent};
    --accent-soft: ${hexToAlpha(toneAccent, 0.12)};
  }
Use var(--accent) and var(--accent-soft) throughout for all accent-colored elements
(headers, borders, icon badges, stat numbers, highlights).
This allows the user to live-preview accent color changes.

══════════════════════════════════════
ILLUSTRATED ICONS — Icons8 Fluency (PRIMARY)
══════════════════════════════════════
Use colorful illustrated Icons8 Fluency icons for all content icons.
Pattern: <img src="https://img.icons8.com/fluency/96/{name}.png" width="{px}" height="{px}" alt="" loading="lazy">

Sizes: hero = 64px, section icons = 48px, card icons = 40px, inline/small = 24-32px

Icon name examples (use exact lowercase, hyphens):
rocket, idea, lightning-bolt, gear, calendar-3, user-group, shield, checkmark, star,
trophy, target, key, lock, internet, database, source-code, console, cloud-storage,
briefcase, dollar-coin, search, open-book, folder, link, chart-increasing, analytics,
pie-chart, clock, mail, smartphone, home, leaf, brain, artificial-intelligence,
robot-2, settings, teamwork, strategy, growth, workflow, checklist, approval,
time-management, deadline, project-management, meeting, handshake, networking,
statistics, report, presentation, resume, refresh, warning, info, layers,
color-palette, image, video, music, microphone, chat, collaboration, creativity

Pick the closest-matching name. Use 3-6 different icons spread across the document.
REQUIRED in footer: <small style="color:#94A3B8;font-size:10px;">Icons by <a href="https://icons8.com" style="color:inherit;text-decoration:none;">Icons8</a></small>

══════════════════════════════════════
BRAND LOGOS — Clearbit (use when topic names real brands)
══════════════════════════════════════
Pattern: <img src="https://logo.clearbit.com/{domain}" width="28" height="28" alt="{Brand}" style="border-radius:5px;object-fit:contain;" loading="lazy">

Domains: anthropic.com, github.com, notion.so, slack.com, figma.com, vercel.com,
openai.com, google.com, microsoft.com, apple.com, amazon.com, stripe.com,
discord.com, youtube.com, twitter.com, linear.app, airtable.com, zapier.com,
hubspot.com, salesforce.com, shopify.com, netflix.com, spotify.com

Use ONLY when the topic explicitly mentions these brands — max 3-4 logos total.

══════════════════════════════════════
${toneGuides[STATE.tone]}

══════════════════════════════════════
${layoutDirective}
${recipe}

══════════════════════════════════════
CONTENT QUALITY — NON-NEGOTIABLE
══════════════════════════════════════
1. Research first: gather real facts, specific numbers, named tools, exact versions, real examples.
2. Every text element contains specific, real, non-generic content. Zero filler.
3. Numbers beat adjectives: "saves 3.2 hrs/day" beats "saves lots of time".
4. Section titles: ≤ 50 chars, punchy. Body: 1-2 tight sentences. Bullets: ≤ 70 chars.
5. Active voice only. Cut every word you can.
6. Density: Canva/Gemini quality level — every section earns its space.

══════════════════════════════════════
EDIT MODE SUPPORT
══════════════════════════════════════
Add contenteditable="true" to EVERY text element: headings, paragraphs, list items, labels, numbers, captions.
This allows users to click and edit any text inline.

══════════════════════════════════════
OUTPUT
══════════════════════════════════════
Return ONLY the complete <!DOCTYPE html> document.
• All CSS in <style> inside <head>. No external stylesheets. No JavaScript.
• Beautiful, polished, pixel-perfect — publication-ready.
• The page must be visually complete and balanced at exactly ${sz.w}×${sz.h}px.

Do NOT include markdown fences, explanations, or any text before or after the HTML.`;
}

// ── RENDERER ───────────────────────────────────────────────
function renderHTML(html) {
  const sz    = SIZES[STATE.size];
  const frame = document.createElement('iframe');
  frame.id    = 'outputFrame';
  frame.style.cssText = `
    width:${sz.w}px; height:${sz.h}px;
    border:none; display:block;
    box-shadow:0 4px 40px rgba(0,0,0,0.18);
    border-radius:4px; flex-shrink:0;
  `;
  frame.srcdoc = html;

  const wrap = $('outputWrap');
  wrap.innerHTML = '';
  wrap.appendChild(frame);
}

function applyFrameSize() {
  const frame = $('outputFrame');
  if (!frame) return;
  const sz = SIZES[STATE.size];
  frame.style.width  = sz.w + 'px';
  frame.style.height = sz.h + 'px';
}

function applyAccentToFrame() {
  const frame = $('outputFrame');
  if (!frame?.contentDocument) return;
  const doc = frame.contentDocument;
  let styleEl = doc.getElementById('ig-accent-override');
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = 'ig-accent-override';
    doc.head?.appendChild(styleEl);
  }
  styleEl.textContent = `:root { --accent: ${STATE.accent}; --accent-soft: ${hexToAlpha(STATE.accent, 0.12)}; }`;
}

// ── EDIT MODE ──────────────────────────────────────────────
function toggleEditMode() {
  const frame = $('outputFrame');
  if (!frame?.contentDocument) return;

  STATE.editMode = !STATE.editMode;
  const doc = frame.contentDocument;

  let styleEl = doc.getElementById('ig-edit-style');
  if (STATE.editMode) {
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = 'ig-edit-style';
      doc.head?.appendChild(styleEl);
    }
    styleEl.textContent = `
      [contenteditable] {
        outline: 2px dashed rgba(37,99,235,0.4) !important;
        cursor: text !important;
        border-radius: 2px !important;
        min-width: 4px; min-height: 1em;
      }
      [contenteditable]:hover {
        outline: 2px dashed #2563EB !important;
        background: rgba(37,99,235,0.04) !important;
      }
      [contenteditable]:focus {
        outline: 2px solid #2563EB !important;
        background: rgba(37,99,235,0.06) !important;
      }`;
  } else if (styleEl) {
    styleEl.remove();
  }

  updateEditButton();
}

function updateEditButton() {
  const btn = $('btnEdit');
  if (!btn) return;
  if (STATE.editMode) {
    btn.textContent    = '✓ Editing';
    btn.style.background = '#2563EB';
    btn.style.color    = '#fff';
    btn.style.borderColor = '#2563EB';
  } else {
    btn.textContent    = '✏ Edit';
    btn.style.background = '';
    btn.style.color    = '';
    btn.style.borderColor = '';
  }
}

// ── EXPORT HELPERS ─────────────────────────────────────────
function slugify(s) {
  return (s || 'infograi').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function exportFilename(ext) {
  return `infograi-${slugify(STATE.topic)}.${ext}`;
}

function download(href, filename) {
  const a = document.createElement('a');
  a.href = href; a.download = filename;
  document.body.appendChild(a);
  a.click(); a.remove();
}

async function waitForFrame() {
  const frame = $('outputFrame');
  if (!frame) return null;
  await new Promise(resolve => {
    if (frame.contentDocument?.readyState === 'complete') { resolve(); return; }
    frame.addEventListener('load', resolve, { once: true });
  });
  // Extra settle time for images/fonts
  await new Promise(r => setTimeout(r, 600));
  return (
    frame.contentDocument?.querySelector('.ig-page') ||
    frame.contentDocument?.body?.firstElementChild ||
    frame.contentDocument?.body
  );
}

// ── EXPORT PNG ─────────────────────────────────────────────
async function exportPNG() {
  const el = await waitForFrame();
  if (!el) { alert('Nothing to export yet.'); return; }
  await document.fonts.ready;
  try {
    const dataUrl = await htmlToImage.toPng(el, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
    });
    download(dataUrl, exportFilename('png'));
  } catch (e) {
    alert('PNG export failed: ' + e.message + '\n\nTip: Export as HTML and screenshot in your browser for best results.');
  }
}

// ── EXPORT PDF ─────────────────────────────────────────────
async function exportPDF() {
  const el = await waitForFrame();
  if (!el) { alert('Nothing to export yet.'); return; }
  await document.fonts.ready;
  try {
    const dataUrl = await htmlToImage.toPng(el, { pixelRatio: 2, cacheBust: true });
    const img = new Image();
    img.onload = () => {
      const sz = SIZES[STATE.size];
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: sz.h > sz.w ? 'portrait' : 'landscape',
        unit:        'px',
        format:      [sz.w, sz.h],
        hotfixes:    ['px_scaling'],
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, sz.w, sz.h);
      pdf.save(exportFilename('pdf'));
    };
    img.src = dataUrl;
  } catch (e) {
    alert('PDF export failed: ' + e.message);
  }
}

// ── EXPORT HTML ────────────────────────────────────────────
function exportHTML() {
  const frame = $('outputFrame');
  if (!frame) { alert('Nothing to export yet.'); return; }
  let html;
  try {
    // Get live content (captures user edits made in edit mode)
    html = '<!DOCTYPE html>' + frame.contentDocument.documentElement.outerHTML;
  } catch {
    html = STATE.currentHTML;
  }
  if (!html) { alert('Nothing to export yet.'); return; }
  download('data:text/html;charset=utf-8,' + encodeURIComponent(html), exportFilename('html'));
}

// ── PROGRESS / ERROR UI ────────────────────────────────────
function showGenerating() {
  $('outputWrap').innerHTML = `
    <div class="loading-state">
      <div class="loading-ring"></div>
      <div class="loading-txt">Designer agent working…</div>
      <div class="loading-sub">Researching topic · Designing layout · Generating HTML<br>Usually 20–45 seconds</div>
    </div>`;
}

function showError(msg) {
  $('outputWrap').innerHTML = `
    <div class="empty">
      <div class="empty-ico">⚠</div>
      <div class="empty-ttl">Generation failed</div>
      <div class="empty-sub">${escHTML(msg)}</div>
    </div>`;
}

// ── UTILS ──────────────────────────────────────────────────
function escHTML(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hexToAlpha(hex, alpha) {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
