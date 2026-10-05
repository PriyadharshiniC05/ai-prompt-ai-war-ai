// Round scoring. Each round is scored 0-100 on 3 criteria (functionality, UI/UX, prompt quality); the round score is their
// average and each of the 4 rounds contributes 25% (so a round is worth 25 marks) - same allocation as before.
//
// DYNAMIC SCORING (rounds 2-4): the round is also compared with the PREVIOUS round's website and prompt.
// Each criterion = 60% static quality of the page/prompt + 40% "dynamic" score = how much the page really improved:
//   functionality : new interactive code (listeners, functions, forms, inputs, timers, storage, validation) added since last round
//   UI/UX         : new sections, styling rules, animations/transitions, hover/focus states, ARIA, responsive rules added
//   prompt        : the prompt targets this round's enhancement, is NOT a copy of the last prompt, and asks for new things
// The dynamic part is scaled by how much of the earlier site was preserved (rewriting from scratch or deleting features is
// penalised) and is 0 when the page did not change.
const clamp = n => Math.max(0, Math.min(100, Math.round(n)));
const cnt = (s, re) => (s.match(re) || []).length;
const STATIC_W = 0.6, DYN_W = 0.4;

function metrics(html) {
  const h = String(html || '').toLowerCase();
  const script = (h.match(/<script[^>]*>[\s\S]*?<\/script>/g) || []).join('\n');
  const style = (h.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
  return {
    listeners: cnt(h, /addeventlistener|\bonclick\s*=|\bonsubmit\s*=|\boninput\s*=|\bonchange\s*=/g),
    functions: cnt(script, /\bfunction\b|=>/g),
    forms: cnt(h, /<(form|input|select|textarea)\b/g),
    buttons: cnt(h, /<(button|a)\b/g),
    timers: cnt(script, /setinterval|settimeout|requestanimationframe/g),
    storage: cnt(script, /localstorage|sessionstorage/g),
    validation: cnt(h, /checkvalidity|setcustomvalidity|\brequired\b|pattern=|\.test\(|invalid|error/g),
    dom: cnt(script, /queryselector|getelementbyid|createelement|classlist|innerhtml|textcontent|appendchild/g),
    scriptLen: script.length,
    sections: cnt(h, /<(header|nav|main|section|article|aside|footer|table|dialog)\b/g),
    cssRules: cnt(style, /\{/g),
    effects: cnt(style, /transition|animation|@keyframes|transform|:hover|:focus/g),
    polish: cnt(style, /border-radius|box-shadow|gradient|backdrop-filter|var\(--/g),
    media: cnt(style, /@media/g),
    aria: cnt(h, /aria-|role=|tabindex|alt=|<label\b/g),
    ids: new Set(h.match(/\b(?:id|class)=["'][^"']+["']/g) || []),
    tags: new Set(h.match(/<[a-z][a-z0-9-]*[^>]*>/g) || []),
    words: new Set((h.replace(/<[^>]+>/g, ' ').match(/[a-z]{4,}/g) || [])),
  };
}
const gain = (a, b, w = 1) => Math.max(0, (b || 0) - (a || 0)) * w;
const jaccard = (A, B) => { if (!A.size && !B.size) return 1; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i || 1); };
const preservedShare = (A, B) => { if (!A.size) return 1; let i = 0; for (const x of A) if (B.has(x)) i++; return i / A.size; };


// ---------- hidden prompt scoring ----------
// Participants see no checklist. The prompt is judged on:
//   problem coverage : is the problem statement (and, rounds 2-4, the enhancement) actually explained in the participant's OWN words?
//   colour           : is the colour scheme explained with real colours / codes?  (missing = large deduction)
//   explanation      : does the whole prompt explain WHAT is wanted and HOW it should work (not a one-line / keyword list)?
//   creativity       : own ideas, varied vocabulary, concrete design / interaction ideas
// Deductions (multiply the prompt mark; the copy / bare-keyword deductions also cut Functionality by the same factor):
//   - requirement text copied from the statement/enhancement instead of being explained
//   - generic words ("enhance", "solve", "improve", "add"...) used without saying what is enhanced and how
//   - a single line / a couple of short sentences instead of an explained prompt
const COLORS = ['red','orange','yellow','green','blue','navy','teal','cyan','purple','violet','pink','magenta','brown','beige','cream','black','white','grey','gray','gold','silver','maroon','indigo','coral','peach','mint','lavender','turquoise','crimson','olive','amber','charcoal','ivory','tan','burgundy','emerald','lime','rose','lilac','mustard','terracotta','slate'];
const COLOR_NAMED = new RegExp('\\b(' + COLORS.join('|') + ')\\b', 'g');
const COLOR_CODE = /#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/g;
const COLOR_WORD = /\b(colou?rs?|palette|theme|background|accent|gradient|shade|contrast)\b/;
const EXPLAIN_CUES = /\b(because|so that|so the|in order to|when|if|should|must|needs? to|want|allow|let|user|visitor|customer|student|owner|admin|show|display|click|press|select|enter|submit|validate|save|filter|search|sort)\b/g;
const HOW_CUES = /\b(by|using|through|when|after|before|once|then|so that|because|which|will|should|on click|on press|if|until|while|each|every|updates?|shows?|displays?|opens?|closes?|changes?|saves?|validates?|filters?|sorts?)\b/;
const VAGUE = /\b(enhanc\w*|solv\w*|improv\w*|upgrad\w*|requirements?|features?|functionalit\w*|better|good|nice|proper(?:ly)?|advanced|modern|complete|amazing|add|implement|include)\b/g;
const CREATIVE_CUES = /\b(animated?|animation|hover|glow|glass|gradient|dark mode|theme|icon|emoji|illustration|badge|ribbon|timeline|slider|carousel|card|hero|sticky|parallax|typography|font|rounded|shadow|layout|grid|story|brand|mascot|tone|personality|playful|elegant|minimal|bold|retro|futuristic)\b/g;
const STOPW = new Set('with that this from have will your their they them then than into onto also each every when where while which what make sure keep must should would could about after before there these those only more most some such very just like over under again between through during without within website page site'.split(' '));
const toks = t => (String(t || '').toLowerCase().match(/[a-z]{4,}/g) || []).filter(w => !STOPW.has(w));
const wordList = t => String(t || '').toLowerCase().replace(/[\u2018\u2019]/g, "'").match(/[a-z0-9']+/g) || [];
const shingles = (t, n = 5) => { const w = wordList(t), out = new Set(); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' ')); return out; };

// ctx: { problem, enhancement, round }
function analyzePrompt(prompt, ctx = {}) {
  const raw = String(prompt || ''), p = raw.toLowerCase(), words = wordList(raw);
  const { problem, enhancement, round = 1 } = ctx;
  const refText = [problem?.problem, problem?.scenario, round === 1 ? (problem?.features || []).join('. ') : enhancement].filter(Boolean).join(' ');
  const tk = toks(raw), uniq = new Set(tk);
  const sentenceList = raw.split(/[.!?\n;]+/).map(x => x.trim()).filter(x => x.split(/\s+/).length >= 3);
  const lines = raw.split(/\n+/).filter(x => x.trim()).length;

  // --- copy detection: how much of the supplied statement / enhancement is typed word for word, and how much of the prompt is that text
  const refSh = shingles(refText), pSh = shingles(raw);
  let copiedOfRef = 0, copiedOfPrompt = 0;
  if (refSh.size && pSh.size) {
    for (const x of refSh) if (pSh.has(x)) copiedOfRef++;
    for (const x of pSh) if (refSh.has(x)) copiedOfPrompt++;
    copiedOfRef /= refSh.size; copiedOfPrompt /= pSh.size;
  }
  const copyShare = Math.max(copiedOfRef, copiedOfPrompt * 0.9);         // 0 = own words, 1 = pure copy
  const copyPenalty = copyShare < 0.15 ? 0 : Math.min(0.6, (copyShare - 0.15) * 0.9);

  // --- bare generic words: "enhancement", "solve", "add features" ... with no what / how in the same sentence
  let vagueHits = 0, bare = 0;
  for (const sen of raw.split(/[.!?\n;]+/)) {
    const sl = sen.toLowerCase(), v = (sl.match(VAGUE) || []).length;
    if (!v) continue;
    vagueHits += v;
    const explained = sl.trim().split(/\s+/).length >= 9 && HOW_CUES.test(sl);
    if (!explained) bare += v;
  }
  const bareShare = vagueHits ? bare / vagueHits : 0;
  const vaguePenalty = vagueHits ? Math.min(0.45, bareShare * 0.35 + (vagueHits >= 3 && bareShare > 0.6 ? 0.1 : 0)) : 0;

  // --- single-line / thin prompt: the whole prompt must be explained
  const thin = words.length < 25 ? 0.5 : words.length < 45 ? 0.3 : words.length < 70 ? 0.12 : 0;
  const oneLiner = (sentenceList.length <= 1 && lines <= 1) ? 0.2 : sentenceList.length <= 2 ? 0.08 : 0;
  const depthPenalty = Math.min(0.6, thin + oneLiner);

  // --- sub scores
  const sentences = sentenceList.length;
  const explain = clamp(Math.min(35, words.length * 0.4) + Math.min(35, cnt(p, EXPLAIN_CUES) * 4) + Math.min(30, sentences * 6));
  const variety = tk.length ? uniq.size / tk.length : 0;
  const creative = clamp(Math.min(35, variety * 45) + Math.min(40, new Set(p.match(CREATIVE_CUES) || []).size * 8) + Math.min(25, uniq.size * 0.6));
  const named = new Set(p.match(COLOR_NAMED) || []).size + cnt(p, COLOR_CODE);
  const color = clamp((named ? 55 + Math.min(30, (named - 1) * 15) : 0) + (COLOR_WORD.test(p) && named ? 15 : 0));
  // coverage counts only words the participant wrote themselves (words that are part of copied runs don't count)
  const refWords = new Set(toks(refText)), own = new Set();
  const w = wordList(raw), copiedIdx = new Set();
  for (let i = 0; i + 5 <= w.length; i++) if (refSh.has(w.slice(i, i + 5).join(' '))) for (let k = i; k < i + 5; k++) copiedIdx.add(k);
  w.forEach((x, i) => { if (!copiedIdx.has(i) && x.length >= 4 && !STOPW.has(x)) own.add(x); });
  const hitOwn = [...refWords].filter(x => own.has(x)).length;
  const need = Math.max(5, Math.min(refWords.size, 40) * 0.3);
  let coverage = refWords.size ? clamp(Math.min(1, hitOwn / need) * 100) : 50;
  // rounds 2-4: the enhancement must be explained in detail - at least a few explanatory sentences that mention it
  if (round > 1 && enhancement) {
    const ew = new Set(toks(enhancement)), about = sentenceList.filter(sn => toks(sn).filter(x => ew.has(x)).length >= 2);
    const detailed = about.filter(sn => sn.split(/\s+/).length >= 9 && HOW_CUES.test(sn.toLowerCase())).length;
    coverage = clamp(coverage * (0.4 + 0.6 * Math.min(1, detailed / 2)));
  }

  // --- combine: problem solved + colour matter most
  let base = coverage * 0.35 + color * 0.25 + explain * 0.25 + creative * 0.15;
  if (!named) base *= 0.75;                                        // colour scheme not explained
  const factor = (1 - copyPenalty) * (1 - vaguePenalty) * (1 - depthPenalty);
  const score = clamp(base * factor);
  const link = (1 - copyPenalty) * (1 - vaguePenalty);              // copy / bare-keyword deductions hit Functionality equally
  return { score, link, detail: { explain, creative, color, coverage, copied_pct: Math.round(copyShare * 100), bare_keywords: bare, words: words.length, deduction_pct: Math.round((1 - factor) * 100) } };
}

// ---------- UI colour + contrast (read from the generated page's CSS) ----------
const NAMED_HEX = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', gray: '#808080', grey: '#808080', navy: '#000080', teal: '#008080', maroon: '#800000', gold: '#ffd700', silver: '#c0c0c0', cyan: '#00ffff', lime: '#00ff00', ivory: '#fffff0', beige: '#f5f5dc', brown: '#a52a2a', coral: '#ff7f50', indigo: '#4b0082', crimson: '#dc143c', olive: '#808000', lavender: '#e6e6fa', tan: '#d2b48c', transparent: null };
function parseColor(v, vars = {}, depth = 0) {
  v = String(v || '').trim().toLowerCase().replace(/!important/, '').trim();
  if (!v || depth > 4) return null;
  const m = v.match(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/);
  if (m) return parseColor(vars[m[1]] ?? m[2], vars, depth + 1);
  let h = v.match(/#([0-9a-f]{3,8})\b/);
  if (h) { let x = h[1]; if (x.length === 3 || x.length === 4) x = x.split('').map(c => c + c).join(''); if (x.length >= 6) return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)); }
  h = v.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/); if (h) return [h[1], h[2], h[3]].map(Number);
  h = v.match(/hsla?\(\s*([\d.]+)(?:deg)?[ ,]+([\d.]+)%[ ,]+([\d.]+)%/);
  if (h) { const H = h[1] / 360, S = h[2] / 100, L = h[3] / 100, f = n => { const k = (n + H * 12) % 12, a = S * Math.min(L, 1 - L); return Math.round(255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
  const w = v.match(/^[a-z]+$/); if (w && NAMED_HEX[w[0]]) return parseColor(NAMED_HEX[w[0]]);
  if (/gradient\(/.test(v)) { const first = v.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/); return first ? parseColor(first[0], vars, depth + 1) : null; }
  return null;
}
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

function colourContrast(html) {
  const css = (String(html || '').match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n').replace(/<\/?style[^>]*>/gi, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const inline = String(html || '').match(/style\s*=\s*"[^"]*"/gi) || [];
  const vars = {}; for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)/g)) vars[m[1]] = m[2].trim();
  const rules = [...css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim(), body: m[2] }));
  inline.forEach(i => rules.push({ sel: 'inline', body: i.replace(/^style\s*=\s*"/i, '').replace(/"$/, '') }));
  const prop = (body, re) => { const m = body.match(re); return m ? m[1] : null; };
  const get = body => ({ fg: parseColor(prop(body, /(?:^|[;\s])color\s*:\s*([^;]+)/i), vars), bg: parseColor(prop(body, /background(?:-color)?\s*:\s*([^;]+)/i), vars) });
  let pageBg = [255, 255, 255], pageFg = [0, 0, 0];
  for (const r of rules) if (/(^|,)\s*(body|html|:root|\*)\s*(,|$)/i.test(r.sel)) { const c = get(r.body); if (c.bg) pageBg = c.bg; if (c.fg) pageFg = c.fg; }
  const pairs = [];
  for (const r of rules) { const c = get(r.body); if (!c.fg && !c.bg) continue; pairs.push(ratio(c.fg || pageFg, c.bg || pageBg)); }
  pairs.push(ratio(pageFg, pageBg));
  const low = pairs.filter(x => x < 3).length, mid = pairs.filter(x => x >= 3 && x < 4.5).length;
  const contrast = clamp(100 * (1 - (low * 1 + mid * 0.5) / pairs.length));
  const distinct = new Set([...css.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi)].map(m => m[0].toLowerCase())).size + Object.keys(vars).filter(k => parseColor(vars[k])).length * 0.5;
  const palette = clamp(Math.min(60, distinct * 10) + (Object.keys(vars).length >= 3 ? 25 : 0) + (/gradient|box-shadow/.test(css) ? 15 : 0));
  return { contrast, palette, score: clamp(contrast * 0.65 + palette * 0.35), worst: Math.round(Math.min(...pairs) * 10) / 10 };
}

// ---------- static quality ----------
function staticScores(html, prompt, ctx) {
  const h = String(html || '').toLowerCase(), p = String(prompt || '').toLowerCase();
  const pa = analyzePrompt(prompt, ctx), cc = colourContrast(html);
  const functionalityRaw = clamp(
    15 + (h.includes('<script') ? 20 : 0) +
    Math.min(30, cnt(h, /addeventlistener|onclick|onsubmit|oninput|onclick=/g) * 6) +
    Math.min(25, cnt(h, /<(button|form|input|select|textarea|a)\b/g) * 4) +
    (h.includes('preventdefault') ? 5 : 0) + (h.includes('localstorage') || h.includes('sessionstorage') ? 5 : 0));
  const uiuxRaw = clamp(
    15 + (h.includes('<style') ? 15 : 0) +
    Math.min(20, cnt(h, /border-radius|box-shadow|gradient/g) * 3) +
    Math.min(25, cnt(h, /<(header|nav|main|section|article|footer)\b/g) * 5) +
    Math.min(25, cnt(h, /transition|:hover|:focus|animation/g) * 4));
  const uiux = clamp(uiuxRaw * (0.6 + 0.4 * cc.score / 100));        // poor colour / contrast lowers UI/UX
  const functionality = clamp(functionalityRaw * pa.link);               // copied / bare-keyword prompts lower Functionality equally
  const promptQuality = pa.score;
  return { functionality, uiux, promptQuality, promptDetail: pa.detail, colourDetail: cc, link: pa.link };
}

const STOP = new Set('with that this from have will your their they them then than into onto also each every when where while which what make sure keep must should would could about after before there these those only more most some such very just like over under again between through during without within'.split(' '));
const wordsOf = t => new Set((String(t || '').toLowerCase().match(/[a-z]{4,}/g) || []).filter(w => !STOP.has(w)));

// ---------- dynamic part: how the page / prompt changed since the previous round ----------
function dynamicScores({ prevHtml, html, prevPrompt, prompt, enhancement }) {
  const a = metrics(prevHtml), b = metrics(html);
  const tagChange = 1 - jaccard(a.tags, b.tags);                // 0 = identical structure, 1 = completely different
  const preserved = preservedShare(a.tags, b.tags) * 0.5 + preservedShare(a.ids, b.ids) * 0.5;   // share of the old site still there
  const changed = prevHtml === html ? 0 : Math.min(1, tagChange * 4 + gain(a.scriptLen, b.scriptLen) / 3000 + gain(a.cssRules, b.cssRules) / 40);
  const keep = preserved >= 0.6 ? 1 : Math.max(0.35, preserved / 0.6);   // rewriting from scratch / deleting old features lowers the dynamic marks

  const fnGain = gain(a.listeners, b.listeners, 7) + gain(a.functions, b.functions, 3) + gain(a.forms, b.forms, 4) + gain(a.buttons, b.buttons, 2) +
    gain(a.timers, b.timers, 6) + gain(a.storage, b.storage, 6) + gain(a.validation, b.validation, 3) + gain(a.dom, b.dom, 1.5) + gain(a.scriptLen, b.scriptLen) / 120;
  const uiGain = gain(a.sections, b.sections, 6) + gain(a.cssRules, b.cssRules, 1.2) + gain(a.effects, b.effects, 3.5) + gain(a.polish, b.polish, 3) +
    gain(a.media, b.media, 8) + gain(a.aria, b.aria, 2.5);
  const dynFunctionality = clamp(Math.min(100, fnGain * 1.1) * keep * (changed > 0 ? 1 : 0));
  const dynUiux = clamp(Math.min(100, uiGain * 1.1) * keep * (changed > 0 ? 1 : 0));

  const pw = wordsOf(prompt), prevW = wordsOf(prevPrompt), ew = wordsOf(enhancement);
  const target = ew.size ? [...ew].filter(w => pw.has(w)).length / Math.min(ew.size, 10) : 0.5;   // prompt addresses this round's enhancement
  const novelty = 1 - jaccard(pw, prevW);                                                          // not a copy of last round's prompt
  const fresh = pw.size ? [...pw].filter(w => !prevW.has(w)).length / pw.size : 0;                 // asks for new things
  const dynPrompt = clamp(Math.min(1, target) * 55 + Math.min(1, novelty * 1.6) * 25 + Math.min(1, fresh * 1.5) * 20);

  return { dynFunctionality, dynUiux, dynPrompt, changePct: Math.round(changed * 100), preservedPct: Math.round(preserved * 100) };
}

function scoreRound({ html, prompt, prevHtml, prevPrompt, enhancement, problem, round = 1 }) {
  const ctx = { problem, enhancement, round };
  const base = staticScores(html, prompt, ctx);
  const solved = problemSolved(html, problem);                         // does the generated site actually contain the problem's features?
  const cut = 0.7 + 0.3 * solved / 100;
  const extra = { promptDetail: { ...base.promptDetail, site_solved: solved }, colour: { contrast: base.colourDetail.contrast, palette: base.colourDetail.palette, worst_ratio: base.colourDetail.worst } };
  if (round < 2 || prevHtml === undefined) {
    const functionality = clamp(base.functionality * cut);
    const total = clamp((functionality + base.uiux + base.promptQuality) / 3);
    return { functionality, uiux: base.uiux, promptQuality: base.promptQuality, ...extra, total, dynamic: null };
  }
  const d = dynamicScores({ prevHtml, html, prevPrompt, prompt, enhancement });
  const functionality = clamp((base.functionality * STATIC_W + d.dynFunctionality * DYN_W * base.link) * cut);
  const uiux = clamp(base.uiux * STATIC_W + d.dynUiux * DYN_W);
  const promptQuality = clamp(base.promptQuality * STATIC_W + d.dynPrompt * DYN_W * (base.promptDetail.deduction_pct ? 1 - base.promptDetail.deduction_pct / 100 : 1));
  const total = clamp((functionality + uiux + promptQuality) / 3);
  return { functionality, uiux, promptQuality, ...extra, total, dynamic: { functionality: d.dynFunctionality, uiux: d.dynUiux, prompt: d.dynPrompt, change_pct: d.changePct, preserved_pct: d.preservedPct } };
}

// share of the assigned problem's key words / features that really appear in the generated website's visible text
function problemSolved(html, problem) {
  if (!problem) return 100;
  const text = String(html || '').toLowerCase().replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
  const feats = (problem.features || []);
  if (!feats.length) return 100;
  const got = feats.filter(f => { const w = toks(f); return w.length && w.filter(x => text.includes(x.slice(0, Math.max(4, x.length - 2)))).length / w.length >= 0.5; }).length;
  return clamp(got / feats.length * 100);
}

function scoreAllRounds({ websites, roundPrompts, enhancements, problem }) {
  const rounds = {};
  let final = 0;
  for (let i = 1; i <= 4; i++) {
    const r = scoreRound({
      html: websites?.[i] || '', prompt: roundPrompts?.[i] || '', round: i,
      prevHtml: i > 1 ? (websites?.[i - 1] || '') : undefined, prevPrompt: i > 1 ? (roundPrompts?.[i - 1] || '') : undefined,
      enhancement: enhancements?.[i] || '', problem,
    });
    rounds[i] = { ...r, out_of_25: Math.round(r.total * 0.25 * 100) / 100, contribution: Math.round(r.total * 0.25 * 100) / 100 };
    final += r.total * 0.25;
  }
  return { total: Math.round(final * 100) / 100, rounds };
}

module.exports = { scoreRound, scoreAllRounds };
