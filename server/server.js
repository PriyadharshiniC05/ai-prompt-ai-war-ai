require('dotenv').config();
const express = require('express'), path = require('path'), crypto = require('crypto');
const db = require('./db'), { scoreAllRounds } = require('./scoring'), { generate } = require('./gemini');
const { PROBLEMS } = require('./problems'), quiz = require('./quiz'), { rewardPrompt } = require('./rewards');
db.load();
const PromptCheck = require('../public/js/promptcheck.js');
const D = () => db.get();

const EVENT_MS = (Number(process.env.EVENT_MINUTES) || 45) * 60000;
const RELEASE_MS = (Number(process.env.RELEASE_SECONDS) || 60) * 1000;
const MAX = 5;
const PROMPT_MIN = Math.max(1, Number(process.env.PROMPT_MIN) || 1); // prompt must contain at least one non-space character
const PROMPT_MAX = Number(process.env.PROMPT_MAX) || 2000;
const COPY_COUNTS_AS_WARNING = process.env.COPY_WARNING !== '0';   // retyping the problem statement / scenario word for word = a participant violation (set COPY_WARNING=0 to only block it)
const MAX_WARNINGS = 2;                                          // 1st & 2nd violation = warning, 3rd = auto-submit + elimination
const ROUNDS={1:{name:'PROBLEM STATEMENT',min:8},2:{name:'EASY ENHANCEMENT',min:8},3:{name:'MEDIUM ENHANCEMENT',min:10},4:{name:'HARD ENHANCEMENT',min:12}};
const ENHANCEMENTS={
  // Round 2 (EASY): first dynamic touches on the existing site.
  2:['Add a light/dark theme toggle with smooth transitions, and make the navigation highlight the section currently in view as the visitor scrolls.',
     'Add tabs or category buttons that show and hide content dynamically, with an active state and a smooth fade between panels.',
     'Add an FAQ accordion that opens and closes with animation, and a mobile menu that slides in and out when the hamburger is pressed.',
     'Add a live search box that filters the existing cards while the visitor types and shows a friendly "no results" message.',
     'Add scroll-reveal animations for sections and cards, hover and focus effects on every button, and a back-to-top button that appears after scrolling.',
     'Add a testimonials slider that changes automatically and has previous/next buttons and clickable dots.',
     'Add a modal pop-up that opens from the main call-to-action, closes with the X button, the Escape key or a click outside, and traps focus while open.',
     'Add animated number counters that count up when scrolled into view, plus a sticky header that shrinks and gains a shadow on scroll.',
     'Add a toast notification system that confirms actions such as form submission or button clicks, and disappears by itself after a few seconds.',
     'Add a sort dropdown and a grid/list view switch for the existing cards, remembering the chosen view while the page is open.',
     'Add a floating help bubble that opens a small panel with quick-answer buttons, and a copy-link button that shows a \"Copied!\" confirmation.',
     'Add a lightbox that opens when a card or image is clicked, with next/previous arrows, left/right keyboard support and a close button.',
     'Add a notice banner that can be accepted or dismissed and remembers the choice, plus a thin scroll-progress bar fixed at the top of the page.',
     'Add read-more/read-less toggles on long text blocks and a message box with a live character counter that warns near the limit.',
     'Add an announcement bar with a rotating message ticker that pauses on hover, and a currency or language selector that updates visible prices or labels.',
     'Add a newsletter signup with email validation, a loading spinner on submit, and a thank-you message that replaces the form.',
     'Add a draggable before/after or two-state comparison slider, and hover zoom effects on images or cards.',
     'Add copy-to-clipboard buttons, share buttons and animated icons that respond to hover, press and keyboard focus.',
     'Add a sticky quick-actions bar for mobile with call, book and directions buttons, and a collapsible filter drawer.',
     'Add a step-by-step how-it-works section where clicking each step highlights it and reveals more detail with animation.'],
  // Round 3 (MEDIUM): stateful, data-driven behaviour with validation.
  3:['Add search, category filters and price or date sorting working together on the main items, with a live results counter and a reset button.',
     'Add a selection or cart flow: add and remove items, change quantities, show a live running total, and keep it saved with localStorage after reload.',
     'Add a booking or order form with live field validation, inline error messages, disabled submit until valid, and a clear success summary.',
     'Add a favourites feature using heart buttons, a favourites panel that updates instantly, a count badge, and persistence in localStorage.',
     'Add a calculator or estimator related to this business (price, savings, quantity or duration) that recalculates live as sliders and inputs change.',
     'Add a multi-step form with a progress bar, back and next buttons, per-step validation and a final review screen before submitting.',
     'Add a filterable data table or card list generated from a JavaScript array, with pagination or "load more", sorting and an empty state.',
     'Add a countdown or availability tracker that updates every second, changes colour as time runs low and enables or disables actions accordingly.',
     'Add a reviews section where visitors can submit a star rating and comment, see it appear instantly, and view the updated average rating.',
     'Add a comparison tool: pick up to three items to compare side by side in a dynamic table, with a clear button and limit messages.',
     'Add a saved-items drawer with add, remove, reorder and clear-all actions, a counter badge and localStorage persistence.',
     'Add a plan or price selector with a monthly/yearly toggle, add-on checkboxes and a live total with discount rules.',
     'Add a reservation slot picker generated from a JavaScript array that disables booked slots and confirms the choice in a summary card.',
     'Add a three-question finder wizard that scores the answers and recommends the best matching item with a short reason.',
     'Add a checklist or itinerary builder where items can be added, ticked, edited and deleted, with a progress percentage and persistence.',
     'Add a listing with tag filters, text search, a load-more button and a modal detail view showing the selected item\'s data.',
     'Add a coupon or referral code box that validates codes against a JavaScript object, shows success and error states and updates totals.',
     'Add a branch or location selector that filters by city, shows open/closed status computed from the current time, and has a directions button.',
     'Add a voting widget with live percentage bars, one vote per visit stored in localStorage and an animated results view.',
     'Add a preferences panel with theme, text size and layout options that apply instantly and are remembered after reload.'],
  // Round 4 (HARD): production-style, multi-state, accessible, end-to-end.
  4:['Build a complete end-to-end user journey (browse, select, form, confirmation) with state management, validation, loading and error states, a progress indicator and a printable confirmation.',
     'Add an interactive dashboard section with a JavaScript-drawn chart or progress visuals that update live from user inputs, plus filters and a reset.',
     'Add a full cart or booking system with promo code validation, quantity limits, running totals, order summary, localStorage persistence and a final success state.',
     'Add a personalised experience: a short quiz or preference form that dynamically recommends items, updates the page content and saves results between visits.',
     'Add a scheduler or planner with a dynamic calendar or time-slot picker, conflict and availability checks, edit and cancel actions, and confirmation messages.',
     'Add an admin-style panel on the same page to add, edit and delete items from the main list, with form validation and instant updates everywhere the data appears.',
     'Add keyboard-accessible, ARIA-labelled interactive components (tabs, modal, accordion, menu), visible focus states, reduced-motion support and error/success announcements.',
     'Add a gamified feature (points, badges or a progress tracker) driven by visitor actions, with animations, persistent state and a celebratory completion screen.',
     'Add a real-time style activity feed or notifications panel that updates on timers, can be filtered, marked as read and cleared, with smooth animations.',
     'Add a polished final-version upgrade: skeleton loading states, optimistic UI updates, undo for destructive actions, responsive layouts for mobile, tablet and desktop, and refined micro-interactions.',
     'Build a multi-view single-page experience with hash-based routing (home, catalogue, detail, checkout), animated view changes, a working back button and a not-found view.',
     'Add a reorderable list (such as a build-your-own bundle or itinerary) with drag-and-drop, keyboard alternatives, undo/redo and saved state.',
     'Add a full booking or ordering flow with availability rules, tax and discount calculation, an editable summary, validation and a printable receipt.',
     'Add an analytics panel with several JavaScript-drawn charts (bar, line, donut) fed from the page\'s own data, date-range filters and a CSV export button.',
     'Add a rule-based assistant box that answers questions about the business using keyword matching, shows a typing animation, keeps chat history and offers suggested questions.',
     'Add multi-language support (at least two languages) with a switcher that rewrites all visible text, persists the choice and updates the document language attribute.',
     'Add an enquiries inbox with create, search, pin, archive and delete, timestamps, empty states and localStorage persistence, styled as a polished app screen.',
     'Add an accessibility and performance pass: skip link, landmark roles, focus trap in dialogs, reduced-motion media query, lazy-rendered sections and announced validation messages.',
     'Add a loyalty system with points earned by actions, tier levels, an animated progress ring, redeemable offers and a confetti-style celebration without external libraries.',
     'Add a decision tool with weighted-criteria sliders, a live ranked results list, an explanation of the winner and a copyable summary.'],
};
const assignmentFor=id=>PROBLEMS[(Number(id||1)-1)%PROBLEMS.length];
// 20 enhancements per round. For participants 1-100 the (Round 2, Round 3) pair is unique, and neighbours never share one.
const enhancementFor=(id,round)=>{const n=Math.max(0,Number(id||1)-1),q=Math.floor(n/20),r2=n%20,L=ENHANCEMENTS[round];
  const idx=round===2?r2:round===3?(r2+3*q+5)%20:(7*r2+5*q+2)%20;return L[idx%L.length];};
const taskFor=s=>{const b=s.problem_statement;if(s.round===1)return `PROBLEM STATEMENT: ${b.problem}\n\nREQUIRED FEATURES:\n• ${b.features.join('\n• ')}`;return `CONTINUE THE SAME WEBSITE — DO NOT START A NEW PROBLEM.\n\nORIGINAL PROBLEM: ${b.problem}\n\nSCENARIO (new from Round 2): ${b.scenario}\n\nROUND ${s.round} ENHANCEMENT: ${s.enhancements[s.round]}\n\nKeep every working feature from earlier rounds and add/improve the requested functionality.`};

// One-time repair on start-up: re-score stored submissions so rounds that never produced a website carry no marks.
(function rescoreStored() {
  let ch = false;
  for (const x of D().submissions) {
    const s = D().sessions.find(q => q.id === x.session_id); if (!s) continue;
    const r = scoreAllRounds({ websites: s.websites, roundPrompts: s.round_prompts, enhancements: s.enhancements });
    if (r.total !== x.score || JSON.stringify(r.rounds) !== JSON.stringify(x.breakdown)) { x.score = r.total; x.breakdown = r.rounds; if (s.submission_id === x.submission_id) { s.score = r.total; s.breakdown = r.rounds; } ch = true; }
  }
  if (ch) db.save();
})();

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
const page = f => (q, r) => r.sendFile(path.join(__dirname, '..', 'public', f));
app.get('/participant', page('participant.html'));
app.get('/host', page('host.html'));
// Friendly route used after participant login.
app.get('/instructions', page('instructions.html'));
app.get('/instructions.html', page('instructions.html'));

const hostTokens = new Set(), busy = new Set();
const rand = () => crypto.randomBytes(24).toString('hex');
const digest = s => crypto.createHash('sha256').update(String(s)).digest();
const safeEq = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));
const fail = (res, code, message, extra = {}) => res.status(code).json({ success: false, message, ...extra });

function sweep() {
  const n = Date.now(); let ch = false;
  for (const s of D().sessions) {
    if (s.status === 'active' && n >= s.expires_at) { s.status = 'expired'; ch = true; }
    else if (s.status === 'active' && s.proctor_started) {
      // Round time is up: move on automatically (Round 4 has no next round, so it auto-submits what exists).
      const end = s.round_started_at + ROUNDS[s.round].min * 60000;
      if (n >= end) { if (s.round < 4) advanceRound(s, end, true); else finalize(s, { reason: 'Round 4 time completed' }); ch = true; }
    }
    if (s.status === 'submitted' && n >= s.release_at) { s.status = 'released'; ch = true; }
  }
  if (ch) db.save();
}
setInterval(() => { try { sweep(); } catch (e) { console.error(e); } }, 1000);
function advanceRound(s, startedAt = Date.now(), auto = false) {
  const from = s.round;
  s.round++; s.round_started_at = startedAt;
  // Round 3 starts first; the quiz appears immediately on the Round 3 screen. The reward prompt unlocks only after passing it.
  if (s.round === 3) { s.round_prompts[3] = ''; s.reward_prompt = ''; }
  if (auto) s.auto_moved = { from, to: s.round, at: Date.now() };
}
const inUse = u => D().sessions.some(s => s.username === u && (s.status === 'active' || s.status === 'submitted'));

function auth(req, res, next) {
  sweep();
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const s = t && D().sessions.find(x => x.token === t);
  if (!s) return fail(res, 401, 'Session not found. Please log in again.', { code: 'NO_SESSION' });
  s.websites ||= {}; s.round_prompts ||= {};
  req.s = s; next();
}
function hostAuth(req, res, next) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!hostTokens.has(t)) return fail(res, 401, 'Host login required.', { code: 'NO_SESSION' });
  next();
}

function quizView(s, round) {
  const Q = (s.quiz ||= {})[round] || (s.quiz[round] = { attempts: [], passed: false });
  const last = Q.attempts[Q.attempts.length - 1];
  if (last && last.status === 'running' && Date.now() > last.started_at + quiz.LIMIT_MS + quiz.GRACE_MS) {
    Object.assign(last, { status: 'done', score: 0, passed: false, timed_out: true }); db.save();
  }
  const v = { round, attempts_used: Q.attempts.length, attempts_max: quiz.MAX_ATTEMPTS, limit_ms: quiz.LIMIT_MS, pass_mark: quiz.PASS, total: quiz.PER };
  if (last && last.status === 'done') { v.last_score = last.score; v.last_timed_out = !!last.timed_out; }
  if (Q.passed) return { ...v, status: 'passed', reward: rewardPrompt(s.problem_statement, 3, s.enhancements[3]) };
  if (last && last.status === 'running') return { ...v, status: 'running', started_at: last.started_at, questions: last.qs.map(({ q, opts }) => ({ q, opts })) };
  if (Q.attempts.length >= quiz.MAX_ATTEMPTS) return { ...v, status: 'failed' };
  return { ...v, status: Q.attempts.length ? 'retry' : 'idle' };
}

// quiz is finished once passed, or once both attempts are used (so nobody is ever locked out of Round 3)
const quizDone = s => ['passed', 'failed'].includes(quizView(s, 3).status);

// What the participant's prompt must contain this round, and what it must NOT copy.
//  Round 1   : required features. Round 2-4: the round enhancement.  Always: colour scheme + how the site solves the problem.
//  forbid    : the problem statement (and, from Round 2, the scenario) must not be retyped word for word = participant violation.
function rulesFor(s, round = s.round) {
  const b = s.problem_statement, r = { forbid: { problem: b.problem } };
  if (round === 1) r.features = b.features;
  else { r.forbid.scenario = b.scenario; r.enhancement = s.enhancements[round]; }
  if (round === 3 && s.quiz?.[3]?.passed) r.reward = rewardPrompt(b, 3, s.enhancements[3]);
  return r;
}

function historyFor(s) {
  return [1,2,3,4].map(round => ({
    round,
    name: ROUNDS[round].name,
    task: taskFor({ ...s, round }),
    prompt: s.round_prompts?.[round] || '',
    html: s.websites?.[round] || '',
    completed: !!s.websites?.[round]
  }));
}

function state(s) {
  const R=ROUNDS[s.round];
  const quizRound = (s.round === 2 || s.round === 3) ? 3 : s.round;
  return {
    prompt_rules:rulesFor(s), auto_moved:s.auto_moved||null,
    now:Date.now(), username:s.username.toUpperCase(), status:s.status, started_at:s.started_at, expires_at:s.expires_at,
    max:MAX, attempts_left:MAX-s.attempts_used, round:s.round, round_name:R.name, round_minutes:R.min, round_started_at:s.round_started_at,
    problem_statement:s.problem_statement, task:taskFor(s),
    html:s.websites[s.round]||'', has_site:!!s.websites[s.round], latest_html:s.latest_html || '',
    submission_id:s.submission_id, score:s.score, breakdown:s.breakdown||null, release_at:s.release_at,
    prompt_min:PROMPT_MIN, prompt_max:PROMPT_MAX, max_warnings:MAX_WARNINGS, warnings:(s.violations||[]).length, proctor_started:!!s.proctor_started,
    eliminated:s.status==='eliminated', quiz_round:quizRound, quiz:quizView(s, quizRound), history:historyFor(s),
    reward_prompt: (s.quiz?.[3]?.passed) ? rewardPrompt(s.problem_statement, 3, s.enhancements[3]) : ''
  };
}

app.post('/api/login', (req, res) => {
  sweep();
  const { role, username, password } = req.body || {};
  if (role === 'host') {
    if (safeEq(username, process.env.HOST_USERNAME || 'host') && safeEq(password, process.env.HOST_PASSWORD || 'change_me')) {
      const t = rand(); hostTokens.add(t); return res.json({ success: true, role: 'host', token: t });
    }
    return fail(res, 401, 'Invalid host credentials.');
  }
  const u = String(username || '').trim().toLowerCase();
  const p = D().participants.find(x => x.username === u && x.active);
  if (!p || !db.verify(String(password || ''), p.password)) return fail(res, 401, 'Invalid username or password.');
  if (p.eliminated) return fail(res, 403, `${u} has been eliminated from the event.`);
  if (inUse(u)) return fail(res, 409, `${u} is currently in use.`);
  const n = Date.now();
  const s = {
    id: D().sessions.length + 1, participant_id: p.id, username: u, token: rand(), started_at: n, expires_at: n + EVENT_MS, status: 'active',
    attempts_used: 0, round: 1, round_started_at: n, problem_statement: assignmentFor(p.id), enhancements: { 2: enhancementFor(p.id, 2), 3: enhancementFor(p.id, 3), 4: enhancementFor(p.id, 4) }, prompts: [], round_prompts: {}, websites: {}, quiz: {}, quiz_used: [], violations: [], proctor_started: false, latest_html: '', submission_id: null, score: null, breakdown: null, release_at: null,
  };
  D().sessions.push(s); db.save();
  res.json({ success: true, role: 'participant', token: s.token });
});

app.get('/api/state', auth, (req, res) => res.json({ success: true, state: state(req.s) }));

const active = (req, res, next) => req.s.status === 'active' ? next()
  : fail(res, 403, req.s.status === 'expired' ? 'EVENT TIME COMPLETED' : req.s.status === 'eliminated' ? 'You have been eliminated.' : 'Session is not active.', { code: req.s.status });

app.post('/api/round/next', auth, active, (req, res) => {
  const s = req.s;
  if (s.round >= 4) return fail(res, 400, 'Already in the final round.');
  if (!s.websites[s.round]) return fail(res, 400, 'Generate and review your website before moving to the next round.');
  advanceRound(s);
  db.save();
  res.json({ success: true, state: state(s) });
});

app.post('/api/prompt/save', auth, active, (req, res) => {
  const s = req.s, round = Number(req.body?.round);
  if (![1,2,3,4].includes(round) || round !== s.round) return fail(res, 400, 'Round mismatch. Refresh the page.');
  if (round === 3 && !quizDone(s)) return fail(res, 403, 'Pass the Round 3 quiz before entering the Round 3 prompt.', { code: 'QUIZ_REQUIRED' });
  const prompt = String(req.body?.prompt || '').trim();
  if (prompt.length > PROMPT_MAX) return fail(res, 400, `Prompt cannot exceed ${PROMPT_MAX} characters.`);
  s.round_prompts[round] = prompt; db.save();
  res.json({ success: true, saved: true });
});

app.get('/api/round/view/:round', auth, active, (req, res) => {
  const round = Number(req.params.round);
  if (![1,2,3,4].includes(round)) return fail(res, 400, 'Invalid round.');
  const item = historyFor(req.s).find(x => x.round === round);
  if (!item) return fail(res, 404, 'Round not found.');
  res.json({ success: true, round: item });
});

app.post('/api/generate', auth, active, async (req, res) => {
  const s = req.s;
  try {
    const prompt = String(req.body?.prompt || '').trim(), round = Number(req.body?.round);
    if (prompt.length < PROMPT_MIN || prompt.length > PROMPT_MAX) return fail(res, 400, `Prompt must contain 1 to ${PROMPT_MAX} characters (yours: ${prompt.length}).`);
    if (round !== s.round) return fail(res, 400, 'Round mismatch. Refresh the page.');
    if (round === 3 && !quizDone(s)) return fail(res, 403, 'Pass the Round 3 quiz before generating the Round 3 website.', { code: 'QUIZ_REQUIRED' });
    const chk = PromptCheck.check(prompt, rulesFor(s, round));
    if (chk.violated) {                                                                                   // retyped problem statement / scenario
      if (COPY_COUNTS_AS_WARNING) recordViolation(s, 'copy_prompt');
      return fail(res, 422, PromptCheck.violationMessage(chk.violations), { code: 'PROMPT_VIOLATION', state: state(s) });   // attempt NOT consumed
    }
    if (!chk.ok) return fail(res, 422, PromptCheck.message(chk.missing), { code: 'PROMPT_RULES', missing: chk.missing });   // attempt NOT consumed
    if (s.attempts_used >= MAX) return fail(res, 403, 'PROMPT LIMIT REACHED', { code: 'LIMIT' });
    if (busy.has(s.id)) return fail(res, 429, 'A generation is already in progress.');
    busy.add(s.id);
    try {
      const previous = round > 1 ? (s.websites[round - 1] || s.latest_html) : '';
      const r = await generate(prompt, { round, previous, task: taskFor(s), problem: s.problem_statement });
      if (!r.ok) return fail(res, 502, r.message);                 // API failure: attempt NOT consumed
      sweep();
      if (s.status !== 'active') return fail(res, 403, 'EVENT TIME COMPLETED', { code: s.status });
      s.attempts_used++; s.prompts.push(prompt); s.round_prompts[round] = prompt; s.websites[round] = r.html; s.latest_html = r.html; db.save();
      res.json({ success: true, html: r.html, attempts_left: MAX - s.attempts_used });
    } finally { busy.delete(s.id); }
  } catch (e) {
    console.error('generate error', e);
    fail(res, 500, 'AI generation is temporarily unavailable.');
  }
});

function finalize(s, { eliminated = false, reason = '' } = {}) {
  const d = new Date(), ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `SUB-${ymd}-${s.username.toUpperCase()}-`;
  const submissionId = prefix + String(D().submissions.filter(x => x.submission_id.startsWith(prefix)).length + 1).padStart(3, '0');
  const result = scoreAllRounds({ websites: s.websites, roundPrompts: s.round_prompts, enhancements: s.enhancements });
  D().submissions.push({ id: D().submissions.length + 1, submission_id: submissionId, participant_username: s.username, session_id: s.id, score: result.total, breakdown: result.rounds, submitted_at: Date.now(), prompts: s.prompts, eliminated, eliminated_reason: reason, violations: s.violations || [], website_data: { final: s.latest_html, rounds: s.websites } });
  Object.assign(s, { status: eliminated ? 'eliminated' : 'submitted', submission_id: submissionId, score: result.total, breakdown: result.rounds, release_at: eliminated ? null : Date.now() + RELEASE_MS });
  if (eliminated) { const p = D().participants.find(x => x.username === s.username); if (p) p.eliminated = true; }
  db.save();
}

app.post('/api/submit', auth, active, (req, res) => {
  const s = req.s;
  try {
    if ([1, 2, 3, 4].some(n => !s.websites[n])) return fail(res, 400, 'Complete and generate a website for all four rounds before submitting.');
    if (busy.has(s.id)) return fail(res, 409, 'Wait for the current generation to finish.');
    finalize(s);
    res.json({ success: true, state: state(s) });
  } catch (e) { console.error('submit error', e); fail(res, 500, 'Submission failed. Please try again.'); }
});

// ---- Secure event mode: fullscreen / tab-switch violations -------------------------------------------------
app.post('/api/proctor/begin', auth, active, (req, res) => {
  const s = req.s;
  if (!s.proctor_started) { const n = Date.now(); Object.assign(s, { started_at: n, round_started_at: n, expires_at: n + EVENT_MS }); }   // clocks start when the event really begins, not at login
  s.proctor_started = true; db.save();
  res.json({ success: true, state: state(req.s) });
});
function recordViolation(s, type) {
  s.violations ||= [];
  const n = Date.now(), last = s.violations[s.violations.length - 1];
  if (last && n - last.at < 1500) return false;                      // one action can fire several browser events
  s.violations.push({ type: String(type || 'unknown').slice(0, 30), at: n });
  if (s.violations.length > MAX_WARNINGS) finalize(s, { eliminated: true, reason: 'Too many violations (left fullscreen / switched tab / copied the problem)' });
  else db.save();
  return true;
}
app.post('/api/violation', auth, active, (req, res) => {
  const s = req.s;
  if (!s.proctor_started) return res.json({ success: true, state: state(s) });
  const type = String(req.body?.type || 'unknown');
  if (type === 'copy_prompt') return res.json({ success: true, state: state(s) });   // only the server can raise this one (see /api/generate)
  const fresh = recordViolation(s, type);
  res.json({ success: true, duplicate: !fresh || undefined, state: state(s) });
});

// ---- Round 3 gate quiz: 2 attempts, 5 questions, pass unlocks the solved Round 3 prompt ----
app.post('/api/quiz/start', auth, active, (req, res) => {
  const s = req.s, round = Number(req.body?.round);
  if (round !== 3 || s.round !== 3) return fail(res, 400, 'The Round 3 quiz starts at the beginning of Round 3.');
  const v = quizView(s, 3);
  if (v.status === 'idle' || v.status === 'retry') {
    s.quiz_used ||= [];
    const qs = quiz.pickQuestions(s.quiz_used);
    s.quiz_used.push(...qs.map(q => q.id));
    s.quiz[3].attempts.push({ qs, started_at: Date.now(), status: 'running' });
    db.save();
  }
  res.json({ success: true, state: state(s) });
});
app.post('/api/quiz/submit', auth, active, (req, res) => {
  const s = req.s, round = Number(req.body?.round);
  if (round !== 3 || s.round !== 3) return fail(res, 400, 'The Round 3 quiz must be completed before Round 3 generation.');
  const v = quizView(s, 3);
  if (v.status !== 'running') return res.json({ success: true, state: state(s) });
  const Q = s.quiz[3], last = Q.attempts[Q.attempts.length - 1];
  last.score = quiz.grade(last.qs, req.body?.answers);
  last.passed = last.score >= quiz.PASS; last.status = 'done'; last.submitted_at = Date.now();
  if (last.passed) {
    Q.passed = true;
    const reward = rewardPrompt(s.problem_statement, 3, s.enhancements[3]);
    s.round_prompts[3] = reward;
    s.reward_prompt = reward;
  }
  db.save();
  res.json({ success: true, state: state(s) });
});

app.get('/api/download', auth, (req, res) => {
  if (!req.s.latest_html) return fail(res, 404, 'No generated website available.');
  const filename = `ai-prompt-war-${String(req.s.username).replace(/[^a-z0-9_-]/gi, '_')}-website.html`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(req.s.latest_html);
});

// ---- Leaderboard: rank by total score (ties broken by earlier submission); eliminated entries are listed but unranked ----
const marksOf = bd => [1, 2, 3, 4].map(n => {
  const r = bd?.[n];
  return (r && !r.skipped) ? { round: n, out_of_100: r.total, out_of_25: r.out_of_25 ?? r.contribution, functionality: r.functionality, uiux: r.uiux, prompt: r.promptQuality, dynamic: r.dynamic || null }
           : { round: n, out_of_100: null, out_of_25: null, functionality: null, uiux: null, prompt: null, dynamic: null };
});
function leaderboard() {
  const subs = D().submissions;
  const ranked = subs.filter(x => !x.eliminated).sort((a, b) => b.score - a.score || a.submitted_at - b.submitted_at);
  const out = ranked.map((x, i) => ({ place: i + 1, submission_id: x.submission_id, username: x.participant_username, total: x.score, eliminated: false, rounds: marksOf(x.breakdown), submitted_at: x.submitted_at }));
  subs.filter(x => x.eliminated).forEach(x => out.push({ place: null, submission_id: x.submission_id, username: x.participant_username, total: x.score, eliminated: true, rounds: marksOf(x.breakdown), submitted_at: x.submitted_at }));
  return out;
}
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 >= 11 && n % 100 <= 13) ? 0 : Math.min(n % 10, 4) % 4] || 'th');
app.get('/api/host/leaderboard', hostAuth, (req, res) => res.json({ success: true, rows: leaderboard() }));

app.get('/api/host/report.pdf', hostAuth, (req, res) => {
  try {
    const PDFDocument = require('pdfkit'), rows = leaderboard(), top = rows.filter(r => r.place && r.place <= 3);
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, info: { Title: 'AI Prompt War - Results' } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="AI-Prompt-War-Results.pdf"');
    doc.pipe(res);
    const W = doc.page.width - 72, f1 = n => (n === null || n === undefined ? '-' : (Math.round(n * 100) / 100).toString());
    doc.fontSize(20).fillColor('#0b3d91').text('AI PROMPT WAR - RESULTS', { align: 'left' });
    doc.fontSize(9).fillColor('#555').text(`Generated ${new Date().toLocaleString()}  |  ${rows.length} submission(s)  |  Each round: score out of 100 and marks out of 25 (25% weight)`);
    doc.moveDown(0.8);
    doc.fontSize(12).fillColor('#000').text('Top 3');
    doc.moveDown(0.2);
    if (!top.length) doc.fontSize(10).fillColor('#555').text('No ranked submissions yet.');
    top.forEach(r => doc.fontSize(11).fillColor('#000').text(`${ordinal(r.place)} place  -  ${r.username}  (${r.submission_id})  -  ${f1(r.total)} / 100`));
    doc.moveDown(0.8);
    const cols = [['Rank', 46], ['Submission ID', 180], ['Participant', 84], ['Round 1 (/100, /25)', 92], ['Round 2 (/100, /25)', 92], ['Round 3 (/100, /25)', 92], ['Round 4 (/100, /25)', 92], ['Total /100', 92]];
    const drawHead = () => {
      let x = 36; const y = doc.y;
      doc.rect(36, y - 2, W, 16).fill('#0b3d91');
      cols.forEach(([t, w]) => { doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8).text(t, x + 3, y + 1, { width: w - 4, lineBreak: false }); x += w; });
      doc.y = y + 18;
    };
    drawHead();
    rows.forEach((r, i) => {
      if (doc.y > doc.page.height - 60) { doc.addPage(); drawHead(); }
      const y = doc.y; let x = 36;
      if (i % 2 === 0) doc.rect(36, y - 2, W, 24).fill('#eef3fb');
      const cells = [r.eliminated ? 'ELIM' : String(r.place), r.submission_id, r.username,
        ...r.rounds.map(m => m.out_of_100 === null ? '-' : `${f1(m.out_of_100)}/100\n${f1(m.out_of_25)}/25`), f1(r.total)];
      cols.forEach(([, w], c) => { doc.fillColor(r.eliminated ? '#a33' : '#000').font('Helvetica').fontSize(8).text(cells[c].replace('\\n', '\n'), x + 3, y, { width: w - 4 }); x += w; });
      doc.y = y + 26;
    });
    doc.end();
  } catch (e) { console.error('pdf error', e); if (!res.headersSent) fail(res, 500, 'Could not create the PDF.'); }
});

app.get('/api/host/overview', hostAuth, (req, res) => {
  sweep();
  const subs = D().submissions, ss = D().sessions, lb = leaderboard(), placeOf = new Map(lb.map(r => [r.submission_id, r.place]));
  res.json({
    success: true, now: Date.now(),
    stats: { active: ss.filter(s => s.status === 'active' || s.status === 'submitted').length, submissions: subs.length, eliminated: ss.filter(s => s.status === 'eliminated').length, average: (() => { const ok = subs.filter(x => !x.eliminated); return ok.length ? Math.round(ok.reduce((a, b) => a + b.score, 0) / ok.length) : 0; })(), completed: ss.filter(s => s.status !== 'active').length },
    podium: lb.filter(r => r.place && r.place <= 3),
    rows: ss.slice().reverse().map(s => ({ rank: placeOf.get(s.submission_id) || null, rounds: s.breakdown ? marksOf(s.breakdown) : null, username: s.username, submission_id: s.submission_id, score: s.score, round: s.round, status: s.status === 'active' ? 'In Progress' : s.status === 'expired' ? 'Timed Out' : s.status === 'eliminated' ? 'Eliminated' : 'Done', warnings: (s.violations || []).length, started_at: s.started_at, expires_at: s.expires_at, live: s.status === 'active' || s.status === 'submitted' })),
  });
});
app.get('/api/host/submission/:id', hostAuth, (req, res) => {
  const x = D().submissions.find(s => s.submission_id === req.params.id);
  if (!x) return fail(res, 404, 'Submission not found.');
  res.json({ success: true, submission: { submission_id: x.submission_id, username: x.participant_username, score: x.score, eliminated: !!x.eliminated, violations: x.violations || [], breakdown: x.breakdown, rounds: marksOf(x.breakdown), prompts: x.prompts, html: x.website_data.final } });
});
app.post('/api/host/reinstate/:username', hostAuth, (req, res) => {
  const p = D().participants.find(x => x.username === req.params.username);
  if (!p) return fail(res, 404, 'Participant not found.');
  p.eliminated = false; db.save(); res.json({ success: true });
});
app.post('/api/host/release/:username', hostAuth, (req, res) => {
  let n = 0;
  for (const s of D().sessions) if (s.username === req.params.username && (s.status === 'active' || s.status === 'submitted')) { s.status = 'released'; n++; }
  db.save(); res.json({ success: true, released: n });
});

app.use('/api', (q, r) => fail(r, 404, 'Not found.'));
app.use((err, req, res, next) => fail(res, err.status || 500, err.type === 'entity.parse.failed' ? 'Invalid request.' : 'Server error.'));
process.on('unhandledRejection', e => console.error('unhandledRejection', e));
process.on('uncaughtException', e => console.error('uncaughtException', e));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AI PROMPT WAR running at http://localhost:${PORT}`))
  .on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is already in use. Stop the other server (STOP.BAT) or set a different PORT in .env.` : e); process.exit(1); });
