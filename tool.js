// Calligram v2 — typographic composition from photo / video / camera.
// Full tool code, loaded by the Brik snippet. Based on Calligram Tool v5.
const controls = window.ControlsAPI;
window.CALLIGRAM_VERSION = 'v2.0 (from v5)';
console.info('%c[calligram] loaded ' + window.CALLIGRAM_VERSION, 'background:#7fd0f5;color:#111;padding:2px 6px;border-radius:3px');

// stop a previous run (Brik can re-run the code without reloading the page)
if (window.__calligramStop) { try { window.__calligramStop(); } catch (e) {} }
let running = true;
window.__calligramStop = () => { running = false; };

/* ---------- control helpers (every control is optional, defaults below) ---------- */
const num = (k, d) => { const v = Number(controls.get(k)); return Number.isFinite(v) && controls.get(k) !== '' && controls.get(k) != null ? v : d; };
const str = (k, d) => { const v = controls.get(k); return typeof v === 'string' && v !== '' ? v : d; };
const raw = (k, d) => { const v = controls.get(k); return typeof v === 'string' ? v : d; };
const bool = (k, d) => { const v = controls.get(k); return v === undefined || v === null ? d : !!v; };

const DEFAULT_TEXT = "there is this sense of fulfilment that i've never felt before, but i hope that one day it will feel like i touched the sun. ";
const RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

function readParams() {
  return {
    sourceMode: str('sourceMode', 'demo'),
    mirror: bool('mirror', false),
    text: str('text', DEFAULT_TEXT),
    font: str('font', 'IBM Plex Mono'),
    bold: bool('bold', false),
    readingOrder: str('readingOrder', 'raster'),
    mode: str('calMode', 'bright'),
    layout: str('layout', 'text'),
    cell: num('cell', 14),
    sizeVar: num('sizeVariation', 0.6),
    thr: num('threshold', 0.12),
    bri: num('brightness', 0),
    con: num('contrast', 1.3),
    invert: bool('invert', false),
    srccol: bool('sourceColors', false),
    bg: str('bgColor', '#0f0f0f'),
    fg: str('textColor', '#eae6d8'),
    renderWidth: num('renderWidth', 1080),
    edgeRot: num('edgeRotation', 1),
    xOn: bool('extrasOn', false),
    xChars: raw('extrasChars', '/__|\\—-'),
    xAmt: num('extrasAmount', 0.25),
    motionMode: str('motionMode', 'auto'),
    mStyle: str('motionStyle', 'chaos'),
    mOrder: str('motionOrder', 'rand'),
    mEase: str('motionEase', 'inout'),
    mRot: num('motionRotation', 0.4),
    mDur: num('motionDuration', 3),
    mSpread: num('motionSpread', 2.5),
    mHold: num('motionHold', 2),
    mLoop: str('motionLoop', 'once'),
    mBreath: num('motionBreath', 0.25),
    mAmb: num('motionStrays', 100),
    speed: num('speed', 1),
    straySpeed: num('straySpeed', 1),
    breathSpeed: num('breathSpeed', 1),
  };
}

/* ---------- canvas inside the Brik frame ---------- */
const area = document.querySelector('.tool-canvas-area') || document.body;
document.querySelectorAll('canvas[data-calligram]').forEach((c) => c.remove());
const tpl = document.getElementById('canvas'); if (tpl) tpl.style.display = 'none';
const out = document.createElement('canvas');
out.setAttribute('data-calligram', '1');
out.width = 1080; out.height = 810;
Object.assign(out.style, { display: 'block', maxWidth: '100%', maxHeight: '100%' });
if (getComputedStyle(area).position === 'static') area.style.position = 'relative';
area.appendChild(out);
const ctx = out.getContext('2d');

/* ---------- seeded randoms ---------- */
const RN = 262144; const RND = new Float32Array(RN * 4);
function seedRandoms(seed) {
  let a = (seed | 0) >>> 0;
  const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  for (let i = 0; i < RND.length; i++) RND[i] = f();
}
let curSeed = num('seed', 7); seedRandoms(curSeed);

/* ---------- fonts ---------- */
if (!document.getElementById('calligram-fonts')) {
  const l = document.createElement('link');
  l.id = 'calligram-fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap';
  document.head.appendChild(l);
}
let customFontUrl = '', customFontOk = false;
async function loadCustomFont(url) {
  customFontUrl = url; customFontOk = false;
  if (!url) return;
  try {
    const ff = new FontFace('CalligramCustom', `url(${url})`); await ff.load(); document.fonts.add(ff);
    if (customFontUrl === url) { customFontOk = true; forceBuild = true; }
  } catch (e) { console.warn('[calligram] custom font failed', e); }
}
const fontKey = (P) => `${P.bold ? 700 : 400}|${P.font}`;
let fontLoaded = '';
function ensureFont(P) {
  const k = fontKey(P); if (k === fontLoaded) return; fontLoaded = k;
  document.fonts.load(`${P.bold ? 700 : 400} 20px "${P.font}"`).catch(() => {}).then(() => { forceBuild = true; });
}
const familyOf = (P) => customFontOk ? '"CalligramCustom",monospace' : `"${P.font}",monospace`;

/* ---------- sources ---------- */
const demo = document.createElement('canvas'); demo.width = 800; demo.height = 600;
function drawDemo(t) {
  const c = demo.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 800, 600);
  const blobs = [[400 + Math.sin(t * .8) * 160, 300 + Math.cos(t * .6) * 90, 190], [230 + Math.cos(t * .5) * 60, 200, 110], [580, 400 + Math.sin(t * .9) * 80, 130]];
  blobs.forEach(([x, y, r]) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(.6, '#888'); g.addColorStop(1, '#000'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
  c.strokeStyle = '#fff'; c.lineWidth = 14; c.beginPath(); c.arc(400, 300, 260 + Math.sin(t) * 12, 0, 7); c.stroke();
}
drawDemo(0);

let imgEl = null, vidEl = null, camEl = null, camStream = null;
let imgUrl = null, vidUrl = null;
function loadImageUrl(url) {
  imgUrl = url; imgEl = null; if (!url) return;
  const im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = () => { if (imgUrl === url) { imgEl = im; replay(); } };
  im.onerror = () => console.warn('[calligram] image failed to load', url);
  im.src = url;
}
function loadVideoUrl(url) {
  vidUrl = url;
  if (vidEl) { try { vidEl.pause(); } catch (e) {} vidEl = null; }
  if (!url) return;
  const v = document.createElement('video');
  v.crossOrigin = 'anonymous'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
  v.onloadeddata = () => { if (vidUrl === url) { vidEl = v; v.play().catch(() => {}); replay(); } };
  v.onerror = () => console.warn('[calligram] video failed to load', url);
  v.src = url;
}
async function startCamera() {
  if (camStream || camEl) return;
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
    const v = document.createElement('video'); v.srcObject = camStream; v.muted = true; v.playsInline = true;
    v.onloadeddata = () => { v.play().catch(() => {}); camEl = v; replay(); };
  } catch (e) { console.warn('[calligram] camera unavailable', e); camStream = null; }
}
function stopCamera() { if (camStream) camStream.getTracks().forEach((t) => t.stop()); camStream = null; camEl = null; }
function pickSource(P) {
  if (P.sourceMode === 'image' && imgEl) return ['image', imgEl];
  if (P.sourceMode === 'video' && vidEl) return ['video', vidEl];
  if (P.sourceMode === 'camera' && camEl) return ['cam', camEl];
  return ['demo', demo];
}
function srcSize(s) {
  return s.videoWidth ? [s.videoWidth, s.videoHeight] : s.naturalWidth ? [s.naturalWidth, s.naturalHeight] : [s.width, s.height];
}

/* ---------- build target layout (the final typographic composition) ---------- */
const sample = document.createElement('canvas'); const sctx = sample.getContext('2d', { willReadFrequently: true });
let tainted = false;

function build(P, src, W, H) {
  const bgBase = P.bg, fgBase = P.fg;
  const edgeInv = P.mode === 'edge' && P.invert;
  const bg = edgeInv ? fgBase : bgBase, fg = edgeInv ? bgBase : fgBase;
  const cell = P.cell * W / 1080, cw = cell * 0.6, chh = cell;
  const cols = Math.max(2, Math.floor(W / cw)), rows = Math.max(2, Math.floor(H / chh));
  sample.width = cols; sample.height = rows;
  // cover-fit the source into the canvas aspect
  const [sw, sh] = srcSize(src); const sa = sw / sh, ca = W / H;
  let sx = 0, sy = 0, sW = sw, sH = sh;
  if (sa > ca) { sW = sh * ca; sx = (sw - sW) / 2; } else { sH = sw / ca; sy = (sh - sH) / 2; }
  sctx.save(); if (P.mirror) { sctx.translate(cols, 0); sctx.scale(-1, 1); }
  sctx.drawImage(src, sx, sy, sW, sH, 0, 0, cols, rows); sctx.restore();
  let px;
  try { px = sctx.getImageData(0, 0, cols, rows).data; tainted = false; }
  catch (e) { tainted = true; return null; }

  const bri = P.bri, con = P.con, inv = P.invert, srccol = P.srccol, thr = P.thr, amp = P.sizeVar;
  const lum = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    let l = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
    l = (l - .5) * con + .5 + bri; l = Math.min(1, Math.max(0, l)); if (inv) l = 1 - l; lum[i] = l;
  }
  const B = { W, H, bg, cell, srccol, family: familyOf(P), bold: P.bold ? 700 : 400, items: [], glyphs: [] };
  const glyphs = [...(P.text.replace(/\s+/g, ' ').trim() || 'text')].filter((c) => c !== ' ');
  B.glyphs = glyphs;
  const q = (v) => Math.min(255, Math.round(Math.min(255, v * 1.15) / 255 * 6) * 42.5 | 0);
  const colAt = (i) => srccol ? `rgb(${q(px[i * 4])},${q(px[i * 4 + 1])},${q(px[i * 4 + 2])})` : fg;
  const useRamp = P.layout === 'ramp';
  const extras = [...P.xChars.replace(/\s+/g, '')], xOn = P.xOn && extras.length > 0, xAmt = P.xAmt, erot = P.edgeRot;
  const items0 = () => B.items.length;
  const push = (ch, x, y, size, rot, col, l, r, c) => B.items.push({ ch, x, y, size: Math.max(2, Math.round(size)), rot, col, l, r, c, ro: 0, d: 0 });

  if (P.mode === 'bright') {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, l = lum[i]; if (l <= thr) continue;
      const x = (c + .5) * (W / cols), y = (r + .5) * (H / rows);
      let ch, size;
      if (useRamp) { ch = RAMP[Math.min(RAMP.length - 1, Math.floor(l * RAMP.length))]; if (ch === ' ') continue; size = cell; }
      else {
        size = cell * (1 - amp + amp * (0.3 + 1.1 * l));
        if (xOn && RND[(items0() % RN) * 4 + 1] < xAmt) ch = extras[(RND[(items0() % RN) * 4 + 2] * extras.length) | 0];
        else ch = null;
      }
      push(ch, x, y, size, 0, colAt(i), l, r, c);
    }
  } else {
    const g = (c, r) => lum[Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))];
    const t = 0.03 + thr * 0.6;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const gx = -g(c - 1, r - 1) - 2 * g(c - 1, r) - g(c - 1, r + 1) + g(c + 1, r - 1) + 2 * g(c + 1, r) + g(c + 1, r + 1);
      const gy = -g(c - 1, r - 1) - 2 * g(c, r - 1) - g(c + 1, r - 1) + g(c - 1, r + 1) + 2 * g(c, r + 1) + g(c + 1, r + 1);
      const mag = Math.hypot(gx, gy) / 4; if (mag <= t) continue;
      let rot = Math.atan2(gy, gx) + Math.PI / 2;
      if (rot > Math.PI / 2) rot -= Math.PI; if (rot < -Math.PI / 2) rot += Math.PI;
      const x = (c + .5) * (W / cols), y = (r + .5) * (H / rows);
      const size = cell * (1 - amp + amp * Math.min(1.3, .5 + mag * 1.6)), col = colAt(r * cols + c), l = Math.min(1, mag * 2);
      let ch = null, rr = rot * erot;
      if (!useRamp && xOn && RND[(items0() % RN) * 4 + 1] < xAmt) {
        const a = Math.abs(rot), cls = a < Math.PI / 8 ? 'h' : a > 3 * Math.PI / 8 ? 'v' : rot > 0 ? '\\' : '/';
        const pool = cls === 'h' ? extras.filter((s) => '_—-–'.includes(s)) : cls === 'v' ? extras.filter((s) => '|!¦'.includes(s)) : extras.filter((s) => s === cls);
        if (pool.length) { ch = pool[(RND[(items0() % RN) * 4 + 2] * pool.length) | 0]; rr = 0; }
      }
      push(useRamp ? '.' : ch, x, y, size, rr, col, l, r, c);
    }
  }
  // reading order: decides which letter of the text goes into which cell
  const n = B.items.length;
  const ord = readingOrder(B.items, cols, rows, P.readingOrder, cell, W, H);
  let gi2 = 0;
  for (let rank = 0; rank < ord.length; rank++) {
    const it = B.items[ord[rank]]; it.ro = rank / Math.max(1, n);
    if (it.ch === null) it.ch = glyphs[(gi2++) % glyphs.length];
  }
  return B;
}

function readingOrder(items, cols, rows, mode, cell, W, H) {
  const n = items.length, idx = [...Array(n).keys()], cx = W / 2, cy = H / 2;
  switch (mode) {
    case 'snake': return idx.sort((a, b) => items[a].r - items[b].r || ((items[a].r & 1) ? items[b].c - items[a].c : items[a].c - items[b].c));
    case 'cols': return idx.sort((a, b) => items[a].c - items[b].c || items[a].r - items[b].r);
    case 'spiral': {
      const pitch = cell * 1.3;
      const k = idx.map((i) => { const dx = items[i].x - cx, dy = items[i].y - cy; return Math.hypot(dx, dy) - (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI) * pitch; });
      return idx.sort((a, b) => k[a] - k[b]);
    }
    case 'lum': return idx.sort((a, b) => items[b].l - items[a].l || a - b);
    case 'contour': return contourOrder(items, cols, rows);
    default: return idx;
  }
}

// walks from cell to neighbouring cell, keeping direction, so text runs along the line
function contourOrder(items, cols, rows) {
  const n = items.length, grid = new Int32Array(cols * rows).fill(-1), seen = new Uint8Array(n), order = [];
  for (let i = 0; i < n; i++) grid[items[i].r * cols + items[i].c] = i;
  let next = 0, last = -1;
  for (;;) {
    let s = -1;
    if (last >= 0) {
      let best = 1e9; const L = items[last];
      for (let dr = -4; dr <= 4; dr++) for (let dc = -4; dc <= 4; dc++) {
        const r = L.r + dr, c = L.c + dc; if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        const j = grid[r * cols + c]; if (j >= 0 && !seen[j]) { const d = dr * dr + dc * dc; if (d < best) { best = d; s = j; } }
      }
    }
    if (s < 0) { while (next < n && seen[next]) next++; if (next >= n) break; s = next; }
    const chain = [s]; seen[s] = 1; let cur = s, dR = 0, dC = 1;
    for (;;) {
      const I = items[cur]; let bj = -1, bs = -1e9, bdr = 0, bdc = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const r = I.r + dr, c = I.c + dc; if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        const j = grid[r * cols + c]; if (j < 0 || seen[j]) continue;
        const len = Math.hypot(dr, dc), sc = (dr * dR + dc * dC) / len + (len === 1 ? .15 : 0);
        if (sc > bs) { bs = sc; bj = j; bdr = dr / len; bdc = dc / len; }
      }
      if (bj < 0) break;
      seen[bj] = 1; chain.push(bj); cur = bj; dR = bdr; dC = bdc;
    }
    if (items[chain[chain.length - 1]].x < items[chain[0]].x) chain.reverse(); // read left to right
    for (const j of chain) order.push(j);
    last = chain[chain.length - 1];
  }
  return order;
}

/* ---------- motion ---------- */
const EASE = {
  linear: (p) => p,
  inout: (p) => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  expo: (p) => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p),
  back: (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  elastic: (p) => p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - .75) * (2 * Math.PI) / 3) + 1,
};
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const M = { t: 0, amb: 0, br: 0, last: 0 };
function replay() { M.t = 0; M.amb = 0; M.br = 0; forceBuild = true; }

function prepareOrder(B, mode) {
  const n = B.items.length, cx = B.W / 2, cy = B.H / 2, maxD = Math.hypot(cx, cy);
  for (let i = 0; i < n; i++) {
    const it = B.items[i]; let d;
    switch (mode) {
      case 'text': d = it.ro; break;
      case 'center': d = Math.hypot(it.x - cx, it.y - cy) / maxD; break;
      case 'edgein': d = 1 - Math.hypot(it.x - cx, it.y - cy) / maxD; break;
      case 'ltr': d = it.x / B.W; break;
      case 'lum': d = 1 - it.l; break;
      default: d = RND[(i % RN) * 4 + 3];
    }
    it.d = d;
  }
}

function timing(P) {
  const dur = Math.max(.05, P.mDur), spread = Math.max(0, P.mSpread), hold = Math.max(0, P.mHold), loop = P.mLoop === 'loop';
  const A = dur + spread;
  return { dur, spread, hold, loop, A, cycle: loop ? 2 * A + hold + .4 : A + hold };
}

const PS = { x: 0, y: 0, rot: 0, size: 0, alpha: 1 };
function pose(it, i, e, B, style, mr) {
  const W = B.W, H = B.H, cell = B.cell, k = (i % RN) << 2, r0 = RND[k], r1 = RND[k + 1], r2 = RND[k + 2];
  if (style === 'vortex') {
    const cx = W / 2, cy = H / 2, dx = it.x - cx, dy = it.y - cy, inv = 1 - e;
    const ang = inv * (2.5 + r0 * 3.5) * (r2 > .5 ? 1 : -1), rad = 1 + inv * (1.2 + r1 * 1.5), c = Math.cos(ang), s = Math.sin(ang);
    PS.x = cx + (dx * c - dy * s) * rad; PS.y = cy + (dx * s + dy * c) * rad; PS.rot = it.rot + ang * mr; PS.size = it.size; PS.alpha = clamp01(e * 4 + .2);
    return;
  }
  let fx = it.x, fy = it.y, fr = it.rot, fs = it.size, alpha = 1;
  switch (style) {
    case 'chaos': fx = r0 * W; fy = r1 * H; fr = it.rot + (r2 - .5) * Math.PI * 4 * mr; fs = it.size * (.5 + r2); break;
    case 'burst': fx = W / 2 + (r0 - .5) * cell * 3; fy = H / 2 + (r1 - .5) * cell * 3; fr = it.rot + (r2 - .5) * 6 * mr; fs = it.size * .35; break;
    case 'rain': fx = it.x + (r0 - .5) * cell * 2; fy = -r1 * H * .9 - cell * 2; fs = it.size * (.7 + r2 * .6); break;
    case 'edges': {
      const sd = (r0 * 4) | 0, m = cell * 2;
      if (sd === 0) { fx = -m; fy = r1 * H; } else if (sd === 1) { fx = W + m; fy = r1 * H; } else if (sd === 2) { fx = r1 * W; fy = -m; } else { fx = r1 * W; fy = H + m; }
      fr = it.rot + (r2 - .5) * 4 * mr; break;
    }
    case 'drift': fx = it.x + (r0 - .5) * W * .45; fy = it.y + (r1 - .5) * H * .45; fr = it.rot + (r2 - .5) * 1.5 * mr; alpha = clamp01(e * 1.6); break;
    case 'type': fs = it.size * .2; alpha = clamp01(e * 2.5); break;
  }
  PS.x = fx + (it.x - fx) * e; PS.y = fy + (it.y - fy) * e; PS.rot = fr + (it.rot - fr) * e; PS.size = fs + (it.size - fs) * e; PS.alpha = alpha;
}

/* ---------- paint (glyph sprites instead of fillText: much faster) ---------- */
const SPR = new Map(); let sprKey = '';
function makeSprite(ch, col, B) {
  const bs = B.sprBase, d = Math.ceil(bs * 1.7) + 2, c = document.createElement('canvas'); c.width = c.height = d;
  const g = c.getContext('2d'); g.font = `${B.bold} ${bs}px ${B.family}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = col; g.fillText(ch, d / 2, d / 2); return { c, d };
}
function paint(B, P, motionOn, final) {
  const items = B.items, n = items.length;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = B.bg; ctx.fillRect(0, 0, B.W, B.H);
  B.sprBase = Math.min(44, Math.max(12, Math.round(B.cell * 1.5)));
  const key = B.family + B.bold + B.sprBase; if (key !== sprKey || SPR.size > 5000) { SPR.clear(); sprKey = key; }
  const draw = (ch, x, y, size, rot, col, alpha) => {
    if (alpha !== ctx.globalAlpha) ctx.globalAlpha = alpha;
    const k = ch + '|' + col; let sp = SPR.get(k); if (!sp) { sp = makeSprite(ch, col, B); SPR.set(k, sp); }
    const dw = sp.d * Math.max(2, size) / B.sprBase;
    if (rot) { const c = Math.cos(rot), sn = Math.sin(rot); ctx.setTransform(c, sn, -sn, c, x, y); ctx.drawImage(sp.c, -dw / 2, -dw / 2, dw, dw); ctx.setTransform(1, 0, 0, 1, 0, 0); }
    else ctx.drawImage(sp.c, x - dw / 2, y - dw / 2, dw, dw);
  };
  if (final || !motionOn) {
    for (let i = 0; i < n; i++) { const it = items[i]; draw(it.ch, it.x, it.y, it.size, it.rot, it.col, 1); }
    ctx.globalAlpha = 1; return;
  }
  const T = timing(P), style = P.mStyle, ease = EASE[P.mEase] || EASE.inout, mr = P.mRot;
  const tm = T.loop ? M.t % T.cycle : M.t;
  const breath = P.mBreath * B.cell * .35;
  const fg = B.fg, amb = Math.max(0, P.mAmb | 0), gl = B.glyphs;
  for (let j = 0; j < amb; j++) {
    const k = ((RN - 1 - j) % RN) << 2, r0 = RND[k], r1 = RND[k + 1], r2 = RND[k + 2], r3 = RND[k + 3];
    const x = ((r0 * B.W + M.amb * (r2 - .5) * B.cell * 1.6) % B.W + B.W) % B.W, y = ((r1 * B.H + M.amb * (r3 - .5) * B.cell * 1.6) % B.H + B.H) % B.H;
    draw(gl[(r2 * gl.length) | 0], x, y, B.cell * (.7 + r3 * .5), 0, fg, .35 + .5 * r1);
  }
  const assembling = tm < T.A;
  for (let i = 0; i < n; i++) {
    const it = items[i], delay = it.d * T.spread;
    let p;
    if (assembling) p = clamp01((tm - delay) / T.dur);
    else if (!T.loop || tm < T.A + T.hold) p = 1;
    else p = 1 - clamp01((tm - T.A - T.hold - delay) / T.dur);
    let x, y, rot, size, alpha;
    if (p >= 1) { x = it.x; y = it.y; rot = it.rot; size = it.size; alpha = 1; }
    else { pose(it, i, ease(p), B, style, mr); x = PS.x; y = PS.y; rot = PS.rot; size = PS.size; alpha = clamp01(PS.alpha); }
    if (breath) { const k = (i % RN) << 2; x += Math.sin(M.br * 1.3 + RND[k] * 6.283) * breath; y += Math.cos(M.br * 1.1 + RND[k + 1] * 6.283) * breath; }
    draw(it.ch, x, y, size, rot, it.col, alpha);
  }
  ctx.globalAlpha = 1;
}

/* ---------- control changes ---------- */
let forceBuild = true;
let prev = {};
const SOURCE_KEYS = new Set(['sourceImage', 'sourceVideo', 'sourceMode', 'customFontUrl', 'seed']);
const REPLAY_KEYS = new Set(['motionStyle', 'motionOrder', 'motionEase', 'motionDuration', 'motionSpread', 'motionHold', 'motionLoop', 'motionMode', 'motionRotation']);
function same(a, b) { return a === b || (typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b)); }
function pollControls() {
  const cur = controls.getAll(); let changed = false, doReplay = false;
  for (const k of Object.keys(cur)) {
    if (same(cur[k], prev[k])) continue;
    if (k === 'canvasState') continue;
    changed = true;
    if (REPLAY_KEYS.has(k)) doReplay = true;
    if (k === 'sourceImage') loadImageUrl(typeof cur[k] === 'string' ? cur[k] : (Array.isArray(cur[k]) ? cur[k][0] : ''));
    if (k === 'sourceVideo') loadVideoUrl(typeof cur[k] === 'string' ? cur[k] : (Array.isArray(cur[k]) ? cur[k][0] : ''));
    if (k === 'customFontUrl') loadCustomFont(typeof cur[k] === 'string' ? cur[k] : '');
    if (k === 'seed') { curSeed = num('seed', 7); seedRandoms(curSeed); doReplay = true; }
    if (k === 'sourceMode') { if (cur[k] === 'camera') startCamera(); else stopCamera(); doReplay = true; }
  }
  prev = cur;
  if (changed) forceBuild = true;
  if (doReplay) replay();
}

controls.onAction('replay', () => replay());
controls.onAction('shuffle', () => { controls.set('seed', Math.floor(Math.random() * 1e6)); });
controls.onAction('exportSvg', () => {
  const P = readParams(); const [type, src] = pickSource(P);
  const [W, H] = canvasSize(P, src);
  const B = build(P, src, W, H); if (!B) return;
  const esc = (c) => c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : c;
  const f = B.family.replace(/"/g, "'");
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${B.W} ${B.H}" width="${B.W}" height="${B.H}">\n<rect width="100%" height="100%" fill="${B.bg}"/>\n<g font-family="${f}" font-weight="${B.bold}" text-anchor="middle" dominant-baseline="central">\n`;
  for (const o of B.items) {
    const tr = o.rot ? ` transform="rotate(${(o.rot * 180 / Math.PI).toFixed(1)} ${o.x.toFixed(1)} ${o.y.toFixed(1)})"` : '';
    s += `<text x="${o.x.toFixed(1)}" y="${o.y.toFixed(1)}" font-size="${o.size}" fill="${o.col}"${tr}>${esc(o.ch)}</text>\n`;
  }
  const blob = new Blob([s + '</g></svg>'], { type: 'image/svg+xml' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'calligram.svg'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});

/* ---------- canvas size: follows Brik export size when fixed, else source aspect ---------- */
function canvasSize(P, src) {
  const CR = window.CanvasRuntimeAPI;
  if (CR && CR.isFixedExportMode && CR.isFixedExportMode()) { const d = CR.getExportDimensions(); return [d.width, d.height]; }
  const [sw, sh] = srcSize(src); const W = Math.max(240, P.renderWidth | 0 || 1080);
  return [W, Math.round(W * sh / sw)];
}

/* ---------- main loop ---------- */
let B = null, lastType = '', lastFixed = false;
const first = controls.getAll(); prev = {}; // so the first poll loads sources
function frame(ts) {
  if (!running) return;
  requestAnimationFrame(frame);
  pollControls();
  const P = readParams();
  ensureFont(P);
  const [type, src] = pickSource(P);
  if (type !== lastType) { lastType = type; forceBuild = true; replay(); }
  const auto = type === 'image' || type === 'demo';
  const motionOn = P.motionMode === 'on' || (P.motionMode === 'auto' && auto);
  const live = type === 'video' || type === 'cam' || (type === 'demo' && !motionOn);
  if (type === 'demo' && live) drawDemo(ts / 1000);
  if ((type === 'video' || type === 'cam') && src.readyState < 2) return;
  if (type === 'video' && Math.abs(src.playbackRate - P.speed) > .01) src.playbackRate = Math.min(16, Math.max(.0625, P.speed));

  const dt = Math.min(.1, (ts - (M.last || ts)) / 1000); M.last = ts;
  M.t += dt * P.speed; M.amb += dt * P.speed * P.straySpeed; M.br += dt * P.speed * P.breathSpeed;

  const [W, H] = canvasSize(P, src);
  const sizeChanged = out.width !== W || out.height !== H;
  if (sizeChanged) { out.width = W; out.height = H; forceBuild = true; }
  if (forceBuild || !B || live) {
    let nb = build(P, src, W, H);
    if (!nb && src !== demo) { if (!window.__calWarned) console.warn('[calligram] source blocks pixel access (CORS); showing demo. Upload the file through the panel.'); window.__calWarned = true; nb = build(P, demo, W, H); }
    if (nb) { B = nb; prepareOrder(B, P.mOrder); forceBuild = false; }
  }
  if (B) paint(B, P, motionOn, false);
}
requestAnimationFrame(frame);
