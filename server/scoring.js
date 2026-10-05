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

// ---------- static quality (unchanged rules) ----------
function staticScores(html, prompt) {
  const h = String(html || '').toLowerCase(), p = String(prompt || '').toLowerCase();
  const functionality = clamp(
    15 + (h.includes('<script') ? 20 : 0) +
    Math.min(30, cnt(h, /addeventlistener|onclick|onsubmit|oninput|onclick=/g) * 6) +
    Math.min(25, cnt(h, /<(button|form|input|select|textarea|a)\b/g) * 4) +
    (h.includes('preventdefault') ? 5 : 0) + (h.includes('localstorage') || h.includes('sessionstorage') ? 5 : 0));
  const uiux = clamp(
    15 + (h.includes('<style') ? 15 : 0) +
    Math.min(20, cnt(h, /border-radius|box-shadow|gradient/g) * 3) +
    Math.min(25, cnt(h, /<(header|nav|main|section|article|footer)\b/g) * 5) +
    Math.min(25, cnt(h, /transition|:hover|:focus|animation/g) * 4));
  const promptQuality = clamp(
    Math.min(45, String(prompt || '').length / 5) +
    Math.min(30, cnt(p, /responsive|section|layout|navigation|font|animation|form|filter|search|accessib|button|function|mobile|desktop/g) * 5) +
    (/you are (a|an)|create|build|design/.test(p) ? 15 : 0) + (String(prompt || '').length >= 80 ? 10 : 0));
  return { functionality, uiux, promptQuality };
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

function scoreRound({ html, prompt, prevHtml, prevPrompt, enhancement, round = 1 }) {
  const base = staticScores(html, prompt);
  if (round < 2 || prevHtml === undefined) {
    const total = clamp((base.functionality + base.uiux + base.promptQuality) / 3);
    return { ...base, total, dynamic: null };
  }
  const d = dynamicScores({ prevHtml, html, prevPrompt, prompt, enhancement });
  const functionality = clamp(base.functionality * STATIC_W + d.dynFunctionality * DYN_W);
  const uiux = clamp(base.uiux * STATIC_W + d.dynUiux * DYN_W);
  const promptQuality = clamp(base.promptQuality * STATIC_W + d.dynPrompt * DYN_W);
  const total = clamp((functionality + uiux + promptQuality) / 3);
  return { functionality, uiux, promptQuality, total, dynamic: { functionality: d.dynFunctionality, uiux: d.dynUiux, prompt: d.dynPrompt, change_pct: d.changePct, preserved_pct: d.preservedPct } };
}

// A round with NO generated website earns nothing (no marks for prompt text alone, no baseline marks), and it is flagged
// `skipped` so the host table / PDF show "-" instead of a mark. Only rounds that really produced a website are scored.
function scoreAllRounds({ websites, roundPrompts, enhancements }) {
  const rounds = {};
  let final = 0, prevHtml;                       // prevHtml = the nearest EARLIER round that really has a website
  for (let i = 1; i <= 4; i++) {
    const html = websites?.[i] || '';
    if (!html) {
      rounds[i] = { functionality: 0, uiux: 0, promptQuality: 0, total: 0, dynamic: null, skipped: true, out_of_25: 0, contribution: 0 };
      continue;
    }
    const r = scoreRound({
      html, prompt: roundPrompts?.[i] || '', round: i,
      prevHtml: i > 1 ? (prevHtml ?? '') : undefined, prevPrompt: i > 1 ? (roundPrompts?.[i - 1] || '') : undefined,
      enhancement: enhancements?.[i] || '',
    });
    rounds[i] = { ...r, skipped: false, out_of_25: Math.round(r.total * 0.25 * 100) / 100, contribution: Math.round(r.total * 0.25 * 100) / 100 };
    final += r.total * 0.25;
    prevHtml = html;
  }
  return { total: Math.round(final * 100) / 100, rounds };
}

module.exports = { scoreRound, scoreAllRounds };
