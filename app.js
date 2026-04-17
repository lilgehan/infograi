/* ============================================================
   Infogr.ai v2.2
   - Streaming API (Anthropic SSE) + prompt caching
   - Ribbon toolbar (document.execCommand on iframe)
   - Pinch-to-zoom + +/− buttons + A/a relative size buttons
   - PNG/PDF export via Vercel CORS proxy + auto base64 prefetch
   - Light app theme, Space Grotesk fonts
   - Icons8 Fluency 72-96px + Clearbit/SimpleIcons logos
   - onerror SVG fallback for broken icon images
   - Post-render CSS overflow enforcement
   - Icon drag-and-resize editor
   - Export dropdown opens upward
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
  savedRange:  null,   // saved iframe text selection for ribbon
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

  // Ribbon + zoom
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
    autoConvertImages(); // background: base64-ify icons for export (no await)
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

OVERFLOW RULES — NON-NEGOTIABLE — apply every single one:
1. .ig-page: overflow:hidden (height is fixed — nothing can escape it)
2. Every flex/grid child: add min-height:0 (THIS IS CRITICAL — without it, flex children expand beyond allocation)
3. Every section, column, card, row container: overflow:hidden; min-height:0;
4. For 2-column layouts: the row needs overflow:hidden; each column needs min-height:0; overflow:hidden;
5. Limit text lines: paragraph/body text must use max-height or -webkit-line-clamp to cap at 3-4 lines
6. When space is tight: use 2 bullets not 3, font-size:10px not 12px — less content is always better than overflow
7. Verify mentally before writing: does the sum of all section heights equal the canvas height? If unsure, use less.

ICONS — Icons8 Fluency (primary, colorful illustrated):
<img src="https://img.icons8.com/fluency/96/{name}.png" width="{px}" height="{px}" alt="{label}" loading="lazy">
Sizes: hero=96-128px, section card (center above text)=72-80px, stats=36-40px, inline=28-32px
Names: rocket, idea, lightning-bolt, gear, calendar-3, user-group, shield, checkmark, star, trophy, target, key, lock, internet, database, source-code, console, cloud-storage, briefcase, dollar-coin, search, open-book, chart-increasing, analytics, pie-chart, clock, teamwork, strategy, growth, workflow, checklist, deadline, meeting, handshake, networking, statistics, report, presentation, brain, artificial-intelligence, robot-2, color-palette, image, video, collaboration, creativity, resume, approval, priority, layers, settings, home, smartphone, mail, folder, link
ONLY use names from this exact list. Do not invent or modify icon names.
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

// ── POST-PROCESSING INJECTIONS ──────────────────────────────

// Fix 1: onerror fallback for broken icon images → colored SVG with initial
function injectIconFallbacks(doc) {
  if (!doc) return;
  const s = doc.createElement('script');
  s.textContent = `(function(){
function fixImg(img){
  if(img.dataset.fixed)return;
  img.dataset.fixed='1';
  var src=img.getAttribute('src')||'';
  var isIcon=src.includes('icons8')||src.includes('clearbit')||src.includes('simpleicons');
  if(!isIcon)return;
  img.dataset.icon='true';
  img.onerror=function(){
    var sz=this.getAttribute('width')||48;
    var colors=['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444'];
    var c=colors[Math.floor(Math.random()*colors.length)];
    var lbl=(this.alt||'●').charAt(0).toUpperCase();
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+sz+'" height="'+sz+'" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="'+c+'"/><text x="24" y="31" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="white">'+lbl+'</text></svg>';
    this.src='data:image/svg+xml;base64,'+btoa(svg);
    this.onerror=null;
  };
  if(img.complete&&(img.naturalWidth===0||img.naturalHeight===0)){img.onerror.call(img);}
}
document.querySelectorAll('img').forEach(fixImg);
new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.tagName==='IMG')fixImg(n);else if(n.querySelectorAll)n.querySelectorAll('img').forEach(fixImg);});});}).observe(document.body,{childList:true,subtree:true});
})();`;
  doc.head.appendChild(s);
}

// Fix 2: inject overflow:hidden + min-height:0 on all flex children
function injectOverflowFix(doc) {
  if (!doc) return;
  const style = doc.createElement('style');
  style.id = 'ig-overflow-fix';
  style.textContent = `
    .ig-page { overflow: hidden !important; }
    .ig-page > * { overflow: hidden !important; min-height: 0 !important; }
    .ig-page * { min-height: 0; }
    .ig-page [style*="display: flex"] > *,
    .ig-page [style*="display:flex"] > *,
    .ig-page [style*="display: grid"] > *,
    .ig-page [style*="display:grid"] > * {
      min-height: 0 !important;
      overflow: hidden !important;
    }
  `;
  doc.head.appendChild(style);
}

// Fix 8: inject icon drag-and-resize editor into the iframe
function injectIconEditor(doc) {
  if (!doc) return;
  const s = doc.createElement('script');
  s.textContent = `(function(){
var sel=null,ovl=null,drag=false,rsz=false,rh='',sx=0,sy=0,sw=0,sh=0,otx=0,oty=0;
function getTr(el){var m=(el.style.transform||'').match(/translate\\(([^,]+)px,\\s*([^)]+)px\\)/);return m?[parseFloat(m[1]),parseFloat(m[2])]:[0,0];}
function pos(){
  if(!ovl||!sel)return;
  var r=sel.getBoundingClientRect();
  ovl.style.left=r.left+'px';ovl.style.top=r.top+'px';
  ovl.style.width=r.width+'px';ovl.style.height=r.height+'px';
}
function mkH(dir,t,l,r,b){
  var d=document.createElement('div');
  d.dataset.h=dir;
  d.style.cssText='position:absolute;width:10px;height:10px;background:#2563EB;border:2px solid #fff;border-radius:2px;pointer-events:all;z-index:10000;cursor:'+dir+'-resize;box-sizing:border-box;';
  if(t!==null)d.style.top=t;if(l!==null)d.style.left=l;
  if(r!==null)d.style.right=r;if(b!==null)d.style.bottom=b;
  d.addEventListener('mousedown',function(e){
    e.stopPropagation();e.preventDefault();
    rsz=true;rh=dir;sx=e.clientX;sy=e.clientY;
    sw=sel.offsetWidth;sh=sel.offsetHeight;
  });
  return d;
}
function doSelect(img){
  desel();sel=img;
  ovl=document.createElement('div');
  ovl.style.cssText='position:fixed;border:2px solid #2563EB;pointer-events:none;z-index:9999;box-sizing:border-box;border-radius:2px;';
  ovl.appendChild(mkH('nw','-5px','-5px',null,null));
  ovl.appendChild(mkH('ne','-5px',null,'-5px',null));
  ovl.appendChild(mkH('se',null,null,'-5px','-5px'));
  ovl.appendChild(mkH('sw',null,'-5px',null,'-5px'));
  document.body.appendChild(ovl);
  pos();
}
function desel(){if(ovl){ovl.remove();ovl=null;}if(sel){sel.style.cursor='';}sel=null;}
function isIconImg(img){
  var src=img.dataset.icon==='true'||(img.src&&(img.src.includes('icons8')||img.src.includes('clearbit')||img.src.includes('simpleicons')));
  return !!src;
}
document.addEventListener('click',function(e){
  var img=e.target.closest&&e.target.closest('img');
  if(img&&isIconImg(img)){e.stopPropagation();e.preventDefault();doSelect(img);}
  else if(!e.target.dataset||!e.target.dataset.h){desel();}
},true);
document.addEventListener('mousedown',function(e){
  if(sel&&(e.target===sel)){
    drag=true;e.preventDefault();
    sx=e.clientX;sy=e.clientY;
    var t=getTr(sel);otx=t[0];oty=t[1];
    sel.style.cursor='grabbing';
  }
});
document.addEventListener('mousemove',function(e){
  if(drag&&sel){
    sel.style.transform='translate('+(otx+(e.clientX-sx))+'px,'+(oty+(e.clientY-sy))+'px)';
    sel.style.position='relative';sel.style.zIndex='5';
    pos();
  }
  if(rsz&&sel){
    var dx=e.clientX-sx,dy=e.clientY-sy,w=sw,h=sh;
    if(rh.includes('e'))w=Math.max(20,sw+dx);
    if(rh.includes('s'))h=Math.max(20,sh+dy);
    if(rh.includes('w'))w=Math.max(20,sw-dx);
    if(rh.includes('n'))h=Math.max(20,sh-dy);
    var sz=Math.max(w,h);
    sel.style.width=sz+'px';sel.style.height=sz+'px';
    pos();
  }
});
document.addEventListener('mouseup',function(){
  drag=false;rsz=false;rh='';
  if(sel)sel.style.cursor='move';
});
document.addEventListener('scroll',pos,true);
window.addEventListener('resize',pos);
})();`;
  doc.body.appendChild(s);
}

// ── RIBBON TOOLBAR ─────────────────────────────────────────
function setupRibbon() {
  // Format buttons — mousedown + preventDefault keeps iframe selection alive
  $$('.rbtn.fmt').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      if (cmd) ribbonCmd(cmd);
    });
  });

  // Fix 3: Font family — removed mousedown preventDefault (was blocking dropdown open)
  // STATE.savedRange is continuously updated by selectionchange in setupRibbonForFrame
  $('rbFont').addEventListener('change', (e) => {
    restoreFrameSelection();
    ribbonCmd('fontName', e.target.value);
  });

  // Fix 3: Font size — same fix
  $('rbSize').addEventListener('change', (e) => {
    restoreFrameSelection();
    applyFontSize(parseInt(e.target.value, 10));
  });

  // A↑ A↓ relative font size buttons (Fix 7)
  $('btnAUp').addEventListener('mousedown', (e) => {
    e.preventDefault();
    adjustFontSizeRelative(+2);
  });
  $('btnADown').addEventListener('mousedown', (e) => {
    e.preventDefault();
    adjustFontSizeRelative(-2);
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

    // Track selection so ribbon can restore it after dropdown interaction
    doc.addEventListener('selectionchange', () => {
      try {
        const sel = doc.getSelection();
        if (sel?.rangeCount > 0) STATE.savedRange = sel.getRangeAt(0).cloneRange();
      } catch {}
    });

    // Post-render injections (Fixes 1, 2, 8)
    injectIconFallbacks(doc);
    injectOverflowFix(doc);
    injectIconEditor(doc);
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
    doc.execCommand('styleWithCSS', false, true);
    doc.execCommand('fontSize', false, '4');
  }
}

// Fix 7: A/a relative font size — reads current size, applies delta
function adjustFontSizeRelative(delta) {
  const doc = $('outputFrame')?.contentDocument;
  if (!doc) return;
  const sel = doc.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const node  = range.commonAncestorContainer;
  const el    = node.nodeType === 3 ? node.parentElement : node;
  const currentPx = parseFloat(doc.defaultView?.getComputedStyle(el)?.fontSize) || 14;
  applyFontSize(Math.max(8, Math.round(currentPx + delta)));
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

// Fix 6: toggle cbody overflow so zoomed-out content doesn't create scrollbar
function applyZoom(animate = true) {
  const wrap  = $('outputWrap');
  const cbody = document.querySelector('.cbody');
  if (!wrap) return;
  wrap.style.transition = animate ? 'transform 0.15s ease' : 'none';
  wrap.style.transform  = `scale(${STATE.zoomLevel})`;
  $('zoomLabel').textContent = Math.round(STATE.zoomLevel * 100) + '%';
  // When zoomed out: overflow:hidden prevents layout-space scrollbar
  // When zoomed in: overflow:auto allows scrolling to see enlarged content
  if (cbody) cbody.style.overflow = STATE.zoomLevel > 1 ? 'auto' : 'hidden';
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

// Fix 5: Try CORS proxy first, fall back to direct fetch
async function toBase64(url) {
  if (!url || url.startsWith('data:')) return url;

  // Primary: route through our Vercel proxy (no CORS restriction server-side)
  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror   = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {}

  // Fallback: direct CORS fetch (works if server sends CORS headers)
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

// Prefetch ALL iframe images as base64 at export time (safety net)
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

  return () => imgs.forEach((img, i) => { img.src = origSrc[i]; });
}

// Fix 5: Auto-convert icon images to base64 in background after generation
// By the time user clicks Export, images are already base64 — export is instant
async function autoConvertImages() {
  const frame = $('outputFrame');
  if (!frame) return;

  // Wait for frame to fully load + extra time for icons to load/fail
  await new Promise(resolve => {
    if (frame.contentDocument?.readyState === 'complete') resolve();
    else frame.addEventListener('load', resolve, { once: true });
  });
  await new Promise(r => setTimeout(r, 1500));

  const doc = frame.contentDocument;
  if (!doc) return;

  // Convert all external icon/logo images to base64 via proxy
  const imgs = [...doc.querySelectorAll('img')].filter(img => {
    const src = img.src || '';
    return src && !src.startsWith('data:') &&
      (src.includes('icons8') || src.includes('clearbit') || src.includes('simpleicons'));
  });

  await Promise.all(imgs.map(async img => {
    const b64 = await toBase64(img.src);
    if (b64) img.src = b64;
  }));

  // Trigger SVG fallback for any still-broken icons
  [...doc.querySelectorAll('img[data-icon="true"]')]
    .filter(img => !img.src.startsWith('data:') && img.naturalWidth === 0)
    .forEach(img => { if (img.onerror) img.onerror.call(img); });
}

// ── EXPORT PNG ─────────────────────────────────────────────
async function exportPNG() {
  $('dlMenu').classList.remove('open');
  const el = await waitForFrame();
  if (!el) { alert('Nothing to export yet.'); return; }
  await document.fonts.ready;

  // Images should already be base64 from autoConvertImages, but prefetch as safety net
  const restore = await prefetchFrameImages();
  try {
    const dataUrl = await htmlToImage.toPng(el, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
    download(dataUrl, exportFilename('png'));
  } catch (e) {
    alert('PNG export failed: ' + (e?.message || String(e)) +
      '\n\nTip: Export as HTML and open in browser to screenshot.');
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
    alert('PDF export failed: ' + (e?.message || String(e)));
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
