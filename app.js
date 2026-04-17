/* ============================================================
   Infogr.ai v2.1
   - Streaming API (Anthropic SSE) + prompt caching
   - Ribbon toolbar (document.execCommand on iframe)
   - Pinch-to-zoom + +/− buttons
   - PNG/PDF export with base64 image prefetch (CORS fix)
   - Light app theme, Space Grotesk fonts
   - Icons8 Fluency 72-96px + Clearbit/SimpleIcons logos
   ============================================================ */

// ── STATE ──────────────────────────────────────────────────
const STATE = {
  apiKey:      '',
  topic:       '',
  layout:      'auto',
  tone:        'professional',
  size:        'a4',
  accent:      '#2563EB',
  currentHTML: null,
  savedRange:  null,   // saved iframe text selection for ribbon color picker
  zoomLevel:   1.0,
};

const TONE_COLORS = {
  professional: '#2563EB',
  bold:         '#F59E0B',
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

  // Tone chips
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

  // Size buttons
  $$('#sizeRow .sz-btn').forEach(el => {
    el.addEventListener('click', () => {
      $$('#sizeRow .sz-btn').forEach(b => b.classList.remove('on'));
      el.classList.add('on');
      STATE.size = el.dataset.size;
      applyFrameSize();
    });
  });

  $('genBtn').addEventListener('click', generate);

  // Accent picker — live inject into iframe
  $('accentPicker').addEventListener('input', (e) => {
    STATE.accent = e.target.value;
    applyAccentToFrame();
  });

  // Download dropdown
  $('btnDownload').addEventListener('click', (e) => {
    e.stopPropagation();
    $('dlMenu').classList.toggle('open');
  });
  document.addEventListener('click', () => $('dlMenu')?.classList.remove('open'));

  $('btnPNG').addEventListener('click',  exportPNG);
  $('btnPDF').addEventListener('click',  exportPDF);
  $('btnHTML').addEventListener('click', exportHTML);

  // Ribbon
  setupRibbon();
  setupZoom();
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
    auto: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><text x="40" y="20" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="11" fill="#E05A2B">AUTO</text><text x="40" y="34" text-anchor="middle" font-family="sans-serif" font-size="7.5" fill="#666">✨ AI decides</text><circle cx="16" cy="44" r="2" fill="#E05A2B"/><circle cx="40" cy="44" r="2" fill="#E05A2B"/><circle cx="64" cy="44" r="2" fill="#E05A2B"/></svg>`,
    steps: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="9" rx="2" fill="#1A2744"/><circle cx="12" cy="21" r="4" fill="#E05A2B"/><rect x="19" y="18.5" width="40" height="3" rx="1.5" fill="#ccc"/><circle cx="12" cy="33" r="4" fill="#1A2744"/><rect x="19" y="30.5" width="36" height="3" rx="1.5" fill="#ccc"/><circle cx="12" cy="45" r="4" fill="#E05A2B"/><rect x="19" y="42.5" width="32" height="3" rx="1.5" fill="#ccc"/></svg>`,
    grid: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="9" rx="2" fill="#1A2744"/><rect x="4" y="16" width="34" height="16" rx="2" fill="#E05A2B" opacity="0.8"/><rect x="42" y="16" width="34" height="16" rx="2" fill="#1A2744" opacity="0.8"/><rect x="4" y="35" width="21" height="14" rx="2" fill="white" stroke="#ddd" stroke-width="0.5"/><rect x="29" y="35" width="21" height="14" rx="2" fill="white" stroke="#ddd" stroke-width="0.5"/><rect x="55" y="35" width="21" height="14" rx="2" fill="white" stroke="#ddd" stroke-width="0.5"/></svg>`,
    timeline: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="9" rx="2" fill="#1A2744"/><line x1="40" y1="16" x2="40" y2="50" stroke="#E05A2B" stroke-width="1.5"/><circle cx="40" cy="20" r="3" fill="#E05A2B"/><rect x="43" y="16" width="27" height="7" rx="2" fill="#c2e5ff"/><circle cx="40" cy="33" r="3" fill="#1A2744"/><rect x="10" y="29" width="27" height="7" rx="2" fill="#c2e5ff"/></svg>`,
    funnel: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><polygon points="8,10 72,10 64,22 16,22" fill="#E05A2B" opacity="0.9"/><polygon points="16,24 64,24 56,36 24,36" fill="#E05A2B" opacity="0.7"/><polygon points="24,38 56,38 50,50 30,50" fill="#E05A2B" opacity="0.5"/></svg>`,
    comparison: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><rect x="4" y="4" width="72" height="9" rx="2" fill="#1A2744"/><rect x="4" y="16" width="33" height="32" rx="2" fill="#FEE2E2" stroke="#FECACA" stroke-width="0.5"/><rect x="43" y="16" width="33" height="32" rx="2" fill="#DCFCE7" stroke="#BBF7D0" stroke-width="0.5"/></svg>`,
    flowchart: `<svg viewBox="0 0 80 52"><rect width="80" height="52" fill="#F5F5F5" rx="3"/><rect x="27" y="2" width="26" height="9" rx="4" fill="#ffecbd"/><rect x="22" y="16" width="36" height="9" rx="2" fill="#c2e5ff"/><path d="M40 30 L52 36 L40 42 L28 36 Z" fill="#dcccff"/><rect x="23" y="46" width="34" height="6" rx="3" fill="#ffecbd"/></svg>`,
  };
  return thumbs[kind] || '';
}

// ── GENERATE ───────────────────────────────────────────────
async function generate() {
  const apiKey = $('apiKey').value.trim();
  const topic  = $('promptIn').value.trim();
  if (!apiKey) { alert('Please enter your Anthropic API key.'); return; }
  if (!topic)  { alert('Please describe your document topic.'); return; }

  STATE.apiKey = apiKey;
  STATE.topic  = topic;

  const btn = $('genBtn');
  btn.disabled = true;
  btn.classList.add('loading');
  $('ribbon').style.display = 'none';

  showGenerating();

  try {
    const html = await callAgent(topic);
    STATE.currentHTML = html;
    renderHTML(html);
    $('ribbon').style.display = 'flex';
    setupRibbonForFrame();
  } catch (err) {
    console.error(err);
    showError(err.message || String(err));
  }

  btn.disabled = false;
  btn.classList.remove('loading');
}

// ── STREAMING AGENT ────────────────────────────────────────
async function callAgent(topic) {
  const sz = SIZES[STATE.size];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-api-key':     STATE.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 12000,
      stream:     true,
      messages: [{
        role: 'user',
        content: buildPromptParts(topic, sz),
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`API error: ${err.error?.message || res.statusText}`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let lineBuffer  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer  = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const ev = JSON.parse(raw);
        if (ev.type === 'error') throw new Error(`Stream error: ${ev.error?.message}`);
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          accumulated += ev.delta.text;
          updateStreamProgress(accumulated.length);
        }
      } catch (e) {
        if (e.message.startsWith('Stream error')) throw e;
      }
    }
  }

  const text = accumulated.trim()
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  if (!text.includes('<') || !text.includes('>')) {
    throw new Error('Agent did not return valid HTML. Please try again.');
  }
  return text;
}

// ── PROMPT — static (cacheable) + dynamic ──────────────────
function buildPromptParts(topic, sz) {
  return [
    {
      type: 'text',
      text: STATIC_PROMPT,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: buildDynamicPrompt(topic, sz),
    },
  ];
}

// Static part — cached across generations in the same session (~75% input cost reduction)
const STATIC_PROMPT = `You are a world-class infographic designer. Generate a single, complete, self-contained HTML infographic document.

FONTS — include in <head>:
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
Use "Space Grotesk" ONLY for the hero title (1-2 lines max). Use "Plus Jakarta Sans" for ALL other text.
NEVER use Syne, Oswald, or any wide/condensed/extended font — they render stretched.

CSS VARIABLES — required, define at :root:
  :root { --accent: #2563EB; --accent-soft: rgba(37,99,235,0.12); }
Use var(--accent) and var(--accent-soft) throughout for all accent-colored elements.

CANVAS — absolute rule:
The .ig-page element MUST be: width:{W}px; height:{H}px; overflow:hidden; box-sizing:border-box;
  display:flex; flex-direction:column; font-family:'Plus Jakarta Sans',sans-serif;
Body: margin:0; background:#f0f2f5; display:flex; justify-content:center; align-items:flex-start;
Every section must have overflow:hidden. Use flex-grow to distribute height. Never use position:absolute for text near edges.
If content is too tall: reduce font-size, shorten text, or remove bullets — NEVER let it overflow.

ICONS — Icons8 Fluency (primary, colorful illustrated):
<img src="https://img.icons8.com/fluency/96/{name}.png" width="{px}" height="{px}" alt="" loading="lazy">
Sizes: hero=96-128px, section card (center above text)=72-80px, stats=36-40px, inline=28-32px
Names: rocket, idea, lightning-bolt, gear, calendar-3, user-group, shield, checkmark, star, trophy, target, key, lock, internet, database, source-code, console, cloud-storage, briefcase, dollar-coin, search, open-book, chart-increasing, analytics, pie-chart, clock, teamwork, strategy, growth, workflow, checklist, deadline, meeting, handshake, networking, statistics, report, presentation, brain, artificial-intelligence, robot-2, color-palette, image, video, collaboration, creativity, resume, approval, priority, layers, settings, home, smartphone, mail, folder, link
Icons are PRIMARY visual anchors — center them above section content, use 72-80px, give them breathing room.
Footer must include: <small style="font-size:10px;color:#94A3B8;">Icons by <a href="https://icons8.com" style="color:inherit;text-decoration:none;">Icons8</a></small>

LOGOS — use when topic names real brands. Never leave blank. Fallback chain:
1. <img src="https://logo.clearbit.com/{domain}" width="32" height="32" style="border-radius:6px;object-fit:contain;" loading="lazy">
   Domains: anthropic.com github.com notion.so slack.com figma.com vercel.com openai.com google.com microsoft.com apple.com amazon.com stripe.com discord.com youtube.com twitter.com linear.app airtable.com zapier.com
2. <img src="https://cdn.simpleicons.org/{slug}" width="32" height="32"> (SVG, brand-colored)
3. Icons8 thematic icon matching brand category
4. Inline SVG: <svg width="32" height="32"><circle cx="16" cy="16" r="16" fill="#2563EB"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="13" font-family="sans-serif" font-weight="700">AB</text></svg>

CONTENT RULES:
1. Real specific facts only — named tools, exact numbers, real stats. Zero filler or lorem ipsum.
2. Every text element must have contenteditable="true" for inline editing.
3. Active voice. Cut every unnecessary word.
4. Titles ≤50 chars. Bullets ≤70 chars. Body ≤120 chars per sentence.
5. 2-4 points per section. Density: Canva/Gemini quality level.`;

function buildDynamicPrompt(topic, sz) {
  const toneGuides = {
    professional: `TONE — Professional:
  Background: #FFFFFF main, #F8FAFC alternating sections
  --accent: ${TONE_COLORS.professional} (blue) for headers, borders, stat numbers, icon badges
  Text: #0F172A headings, #334155 body, #64748B captions
  Cards: white, 1px solid #E2E8F0, border-radius:10px, box-shadow:0 1px 4px rgba(0,0,0,0.06)
  Feel: clean, authoritative, corporate-grade`,

    bold: `TONE — Bold (dark, high-contrast):
  Background: #0F172A main canvas, #1E293B for card sections
  --accent: ${TONE_COLORS.bold} (amber) for labels, borders, stat numbers
  Text: #FFFFFF headings, #CBD5E1 body, #94A3B8 captions
  Cards: rgba(255,255,255,0.06) glass effect, 1px solid rgba(255,255,255,0.12), border-radius:12px
  Labels: UPPERCASE, var(--accent) color, letter-spacing:0.1em, 11px
  Icons: use Iconify SVGs with style="color:var(--accent)" for colorable icons on dark bg
  Feel: editorial dark magazine, punchy, high-contrast`,

    minimal: `TONE — Minimal:
  Background: #FAFAF8 main, #F5F3EF alternating
  --accent: ${TONE_COLORS.minimal} (dark teal) — use sparingly: 1px borders, a single underline accent
  Text: #1C1917 headings, #57534E body, #A8A29E captions
  Borders: 1px solid #E7E5E4. No drop-shadows. Flat design only.
  Feel: editorial, airy, refined typography — every pixel earns its place`,

    playful: `TONE — Playful:
  Background: #FFFBEB main, #FEF3C7 alternating sections
  --accent: ${TONE_COLORS.playful} (purple) for headers; #F59E0B amber for highlights and stat numbers
  Text: #1C1917 headings, #44403C body
  Cards: border-radius:20px, box-shadow:0 3px 16px rgba(0,0,0,0.08), colorful icon badge backgrounds
  Icons: 80-96px centered above text — let them breathe, they're heroes not accessories
  Feel: warm, energetic, friendly — specific and data-rich, never childish`,
  };

  const layoutRecipes = {
    'steps-guide': `LAYOUT — Steps Guide:
  1. Full-width hero header (accent bg): LABEL tag + main title (Space Grotesk, 36-40px) + subtitle
  2. Prerequisites row: 3-4 horizontal chips, each with 28px icon + short label
  3. Numbered steps (5-7): large step-number (56px, accent color) left + title (18px bold) + 2-sentence description + 48px icon right
     Alternate white/light-accent row backgrounds
  4. Key stats strip: 3-4 boxes, each with big number (32px Space Grotesk) + label + 36px icon
  5. Callout box: left 4px accent border, light bg, tip text
  6. Footer: brand name + attribution`,

    'mixed-grid': `LAYOUT — Mixed Grid:
  1. Full-width hero: title (Space Grotesk 40px) + subtitle + 96px hero icon right-aligned
  2. 3-4 stat boxes row: big number (36px) + label + 40px icon
  3. 2-column: wider left (title + 4-5 bullets + 64px icon) + narrow right (callout or key points)
  4. 3-column card grid: each card = 72px icon centered + bold title + 3 bullets
  5. Summary callout or quote
  6. Footer`,

    'timeline': `LAYOUT — Timeline:
  1. Header with title + subtitle
  2. Central vertical bar (3px accent) centered horizontally, full height
  3. 5-7 alternating left/right nodes: 12px circle dot on bar + date (accent color, bold) + title + 1-sentence desc
     Left: text right-aligned ending at bar. Right: text left-aligned from bar.
  4. Stats or summary row
  5. Footer`,

    'funnel': `LAYOUT — Funnel:
  1. Header with title + subtitle
  2. 5 trapezoid layers narrowing top to bottom:
     Use border-width CSS trick or clip-path. Colors: var(--accent) at 1.0, 0.80, 0.63, 0.47, 0.33 opacity.
     Each: centered stage name (white bold) + 1-line description right of the shape
  3. Result/outcome box below
  4. Footer`,

    'comparison': `LAYOUT — Comparison:
  1. Header framing the two options
  2. Side-by-side columns (equal width):
     Left: red-tinted header (#FEE2E2) + "Before"/"Option A" + 4-5 points
     Right: green-tinted header (#DCFCE7) + "After"/"Option B" + 4-5 points
  3. 3-4 comparison rows: left item → right item with arrow divider
  4. Summary / recommendation
  5. Footer`,

    'flowchart': `LAYOUT — Flowchart:
  1. Header
  2. Connected flow: rounded-rect process steps (accent bg, white text) + diamond decisions (rotated square, amber) + labeled arrows
     Use CSS flexbox columns + connector lines via ::after pseudo-elements or thin SVG lines
  3. Legend
  4. Footer`,
  };

  const layoutDir = STATE.layout === 'auto'
    ? `LAYOUT — Auto: choose the single best layout from: steps-guide (sequential how-to), mixed-grid (overview/explainer), timeline (history/roadmap), funnel (stages/tiers), comparison (X vs Y), flowchart (decision tree).`
    : `LAYOUT — MANDATORY: use "${STATE.layout}" layout exactly as described below.`;

  const recipe = layoutRecipes[STATE.layout] || '';

  return `${toneGuides[STATE.tone]}

TOPIC: ${topic}
CANVAS: exactly ${sz.w}px × ${sz.h}px — no overflow, no scroll
SECTIONS: ${sz.sections} visual sections to fill the canvas height perfectly
${layoutDir}
${recipe}
Return ONLY the complete <!DOCTYPE html> document. No markdown fences, no explanation.`;
}

// ── RENDERER ───────────────────────────────────────────────
function renderHTML(html) {
  const sz    = SIZES[STATE.size];
  const frame = document.createElement('iframe');
  frame.id    = 'outputFrame';
  frame.style.cssText = `width:${sz.w}px;height:${sz.h}px;border:none;display:block;flex-shrink:0;`;
  frame.srcdoc = html;

  const wrap = $('outputWrap');
  wrap.innerHTML = '';
  wrap.appendChild(frame);

  // Re-apply zoom after new frame
  applyZoom(false);
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
  let el = doc.getElementById('ig-accent-override');
  if (!el) {
    el = doc.createElement('style');
    el.id = 'ig-accent-override';
    doc.head?.appendChild(el);
  }
  el.textContent = `:root{--accent:${STATE.accent};--accent-soft:${hexToAlpha(STATE.accent, 0.12)};}`;
}

// ── RIBBON TOOLBAR ─────────────────────────────────────────
function setupRibbon() {
  // Format buttons — mousedown + preventDefault keeps iframe selection
  $$('.rbtn.fmt').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      if (cmd) ribbonCmd(cmd);
    });
  });

  // Font family — save/restore selection around the dropdown change
  $('rbFont').addEventListener('mousedown', (e) => { e.preventDefault(); });
  $('rbFont').addEventListener('change', (e) => {
    restoreFrameSelection();
    ribbonCmd('fontName', e.target.value);
  });

  // Font size — wrap selection in a span with font-size style
  $('rbSize').addEventListener('mousedown', (e) => { e.preventDefault(); });
  $('rbSize').addEventListener('change', (e) => {
    restoreFrameSelection();
    applyFontSize(parseInt(e.target.value, 10));
  });

  // Text color — restore selection then apply
  $('rbColor').addEventListener('focus',  saveFrameSelection);
  $('rbColor').addEventListener('input', (e) => {
    restoreFrameSelection();
    ribbonCmd('foreColor', e.target.value);
  });
}

// Called after each generation to wire up the iframe's selectionchange
function setupRibbonForFrame() {
  const frame = $('outputFrame');
  if (!frame) return;
  const tryWire = () => {
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.addEventListener('selectionchange', () => {
      try {
        const sel = doc.getSelection();
        if (sel?.rangeCount > 0) STATE.savedRange = sel.getRangeAt(0).cloneRange();
      } catch {}
    });
  };
  if (frame.contentDocument?.readyState === 'complete') tryWire();
  else frame.addEventListener('load', tryWire, { once: true });
}

function saveFrameSelection() {
  try {
    const doc = $('outputFrame')?.contentDocument;
    if (!doc) return;
    const sel = doc.getSelection();
    if (sel?.rangeCount > 0) STATE.savedRange = sel.getRangeAt(0).cloneRange();
  } catch {}
}

function restoreFrameSelection() {
  try {
    if (!STATE.savedRange) return;
    const doc = $('outputFrame')?.contentDocument;
    if (!doc) return;
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(STATE.savedRange);
  } catch {}
}

function ribbonCmd(cmd, value = null) {
  const doc = $('outputFrame')?.contentDocument;
  if (!doc) return;
  doc.execCommand('styleWithCSS', false, true);
  doc.execCommand(cmd, false, value);
}

function applyFontSize(px) {
  const doc = $('outputFrame')?.contentDocument;
  if (!doc) return;
  const sel = doc.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  try {
    const span = doc.createElement('span');
    span.style.fontSize   = px + 'px';
    span.style.lineHeight = '1.35';
    range.surroundContents(span);
  } catch {
    // fallback if selection spans multiple elements
    doc.execCommand('styleWithCSS', false, true);
    doc.execCommand('fontSize', false, '4');
  }
}

// ── ZOOM ───────────────────────────────────────────────────
function setupZoom() {
  $('btnZoomIn').addEventListener('click',  () => changeZoom(+0.1));
  $('btnZoomOut').addEventListener('click', () => changeZoom(-0.1));

  // Trackpad pinch = wheel + ctrlKey on Mac
  document.querySelector('.cbody').addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    changeZoom(e.deltaY < 0 ? +0.05 : -0.05);
  }, { passive: false });
}

function changeZoom(delta) {
  STATE.zoomLevel = Math.max(0.2, Math.min(3.0, STATE.zoomLevel + delta));
  applyZoom(true);
}

function applyZoom(animate = true) {
  const wrap = $('outputWrap');
  if (!wrap) return;
  wrap.style.transition = animate ? 'transform 0.15s ease' : 'none';
  wrap.style.transform  = `scale(${STATE.zoomLevel})`;
  $('zoomLabel').textContent = Math.round(STATE.zoomLevel * 100) + '%';
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
  await new Promise(r => setTimeout(r, 600));
  return (
    frame.contentDocument?.querySelector('.ig-page') ||
    frame.contentDocument?.body?.firstElementChild ||
    frame.contentDocument?.body
  );
}

// Convert external image URL → base64 data URL (CORS fix for html-to-image)
async function toBase64(url) {
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror   = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// Prefetch all iframe images as base64, return a restore function
async function prefetchFrameImages() {
  const doc = $('outputFrame')?.contentDocument;
  if (!doc) return () => {};
  const imgs    = [...doc.querySelectorAll('img')];
  const origSrc = imgs.map(img => img.src);

  await Promise.all(imgs.map(async (img, i) => {
    if (!origSrc[i] || origSrc[i].startsWith('data:')) return;
    const b64 = await toBase64(origSrc[i]);
    if (b64) img.src = b64;
  }));

  // Return restore function
  return () => imgs.forEach((img, i) => { img.src = origSrc[i]; });
}

// ── EXPORT PNG ─────────────────────────────────────────────
async function exportPNG() {
  $('dlMenu').classList.remove('open');
  const el = await waitForFrame();
  if (!el) { alert('Nothing to export yet.'); return; }
  await document.fonts.ready;

  const restore = await prefetchFrameImages();
  try {
    const dataUrl = await htmlToImage.toPng(el, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
    download(dataUrl, exportFilename('png'));
  } catch (e) {
    alert('PNG export failed: ' + e.message + '\n\nTip: Export as HTML and open in a browser to screenshot.');
  } finally {
    restore();
  }
}

// ── EXPORT PDF ─────────────────────────────────────────────
async function exportPDF() {
  $('dlMenu').classList.remove('open');
  const el = await waitForFrame();
  if (!el) { alert('Nothing to export yet.'); return; }
  await document.fonts.ready;

  const restore = await prefetchFrameImages();
  try {
    const dataUrl = await htmlToImage.toPng(el, { pixelRatio: 2 });
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
  } finally {
    restore();
  }
}

// ── EXPORT HTML ────────────────────────────────────────────
function exportHTML() {
  $('dlMenu').classList.remove('open');
  const frame = $('outputFrame');
  if (!frame) { alert('Nothing to export yet.'); return; }
  let html;
  try {
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
      <div class="loading-sub">Researching · Designing layout · Generating HTML</div>
      <div class="stream-count">Starting…</div>
    </div>`;
}

function updateStreamProgress(charCount) {
  const el = document.querySelector('.stream-count');
  if (el) {
    const pct = Math.min(98, Math.round((charCount / 9500) * 100));
    el.textContent = `${charCount.toLocaleString()} characters · ${pct}%`;
  }
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
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function hexToAlpha(hex, alpha) {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
