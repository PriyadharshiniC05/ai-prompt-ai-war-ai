const base = process.env.TEST_BASE || `http://localhost:${process.env.PORT || 3111}`;
let token = '';
let passed = 0, failed = 0;
const ok = (v, m) => { if (v) { passed++; console.log('✓', m); } else { failed++; console.error('✗', m); } };
async function call(method, path, body) {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}
(async () => {
  let r = await call('POST', '/api/login', { role: 'participant', username: 'pa001', password: 'pa001' });
  ok(r.success && r.token, 'participant login uses username=password'); token = r.token;
  let st = (await call('GET', '/api/state')).state;
  ok(st.round === 1 && st.prompt_min === 1, 'Round 1 starts and prompt minimum is removed');

  const own = 'I want a warm, friendly website where visitors can browse everything on offer and get in touch. The colour scheme is a cream background (#fff7ec) with dark brown text and orange accents so every line stays readable. Cards show name and price, and when a visitor hovers a card it lifts slightly. A contact form checks the name, email and message and then shows a thank you message.';
  const valid = () => own;
  st = (await call('GET', '/api/state')).state;
  ok(!('prompt_rules' in st), 'No prompt-rules container is sent to the participant');
  const p1 = own;
  r = await call('POST', '/api/generate', { round: 1, prompt: p1 });
  ok(r.success, 'Round 1 prompt in own words is accepted');
  st = (await call('GET', '/api/state')).state;
  ok(st.history[0].html, 'Round 1 website is stored');

  r = await call('POST', '/api/round/next', {}); ok(r.success && r.state.round === 2, 'Round 2 starts after Round 1 website is generated');
  r = await call('POST', '/api/prompt/save', { round: 2, prompt: 'enhance' }); ok(r.success, 'Round 2 prompt is saved independently');
  st = (await call('GET', '/api/state')).state; r = await call('POST', '/api/generate', { round: 2, prompt: valid(st) }); ok(r.success, 'Round 2 generates from the previous website');

  r = await call('POST', '/api/round/next', {}); ok(r.success && r.state.round === 3, 'Round 3 starts; the quiz gate appears inside Round 3');
  st = r.state; ok(st.has_site === false && st.history[1].completed, 'has_site is per-round (Next enables only after generating)');
  r = await call('POST', '/api/generate', { round: 3, prompt: 'try early' }); ok(r.code === 'QUIZ_REQUIRED', 'Round 3 generation is locked behind the quiz');
  r = await call('POST', '/api/quiz/start', { round: 3 }); ok(r.success && r.state.quiz.status === 'running' && r.state.quiz.questions.length === 5, 'Round 3 quiz starts with 5 questions');
  const dbm = require('../server/db'); dbm.load(); const db = dbm.get();
  const s = db.sessions.find(x => x.token === token);
  const answers = s.quiz[3].attempts.at(-1).qs.map(q => q.ans);
  const wrong = answers.map((a, i) => i === 0 ? (a + 1) % 4 : a);
  r = await call('POST', '/api/quiz/submit', { round: 3, answers: wrong });
  ok(r.success && r.state.quiz.status === 'retry', 'Quiz needs ALL 5 answers right (4/5 fails)');
  r = await call('POST', '/api/quiz/start', { round: 3 });
  const answers2 = db.sessions ? (dbm.load(), dbm.get().sessions.find(x => x.token === token).quiz[3].attempts.at(-1).qs.map(q => q.ans)) : answers;
  r = await call('POST', '/api/quiz/submit', { round: 3, answers: answers2 });
  ok(r.success && r.state.quiz.status === 'passed' && r.state.quiz.reward, 'Solved Round 3 quiz unlocks the reward prompt');
  ok(r.state.history[2].prompt === r.state.reward_prompt && r.state.reward_prompt.includes(r.state.problem_statement.title), 'Reward prompt is stored for Round 3');

  st = (await call('GET', '/api/state')).state; r = await call('POST', '/api/generate', { round: 3, prompt: st.history[2].prompt }); ok(r.success, 'Round 3 reward prompt generates the Round 3 website');
  r = await call('POST', '/api/round/next', {}); ok(r.success && r.state.round === 4, 'Round 4 starts after Round 3 website is generated');

  st = (await call('GET', '/api/state')).state;
  ok(st.history[0].html && st.history[1].html && st.history[2].html, 'Saved round previews remain available');
  r = await call('GET', '/api/round/view/1'); ok(r.success && r.round.html && r.round.prompt === p1, 'Completed Round 1 can be opened from saved history');

  // ---- Round 4, submit, dynamic scoring, host leaderboard + PDF, 100 participants ----
  st = (await call('GET', '/api/state')).state;
  r = await call('POST', '/api/generate', { round: 4, prompt: valid(st) }); ok(r.success, 'Round 4 website is generated');
  r = await call('POST', '/api/submit', {}); ok(r.success && r.state.score >= 0, 'All 4 rounds submit');
  const bd = r.state.breakdown;
  ok([1, 2, 3, 4].every(n => bd[n].total >= 0 && bd[n].out_of_25 === Math.round(bd[n].total * 25) / 100), 'Each round has a mark out of 100 and out of 25');
  ok(bd[1].dynamic === null && [2, 3, 4].every(n => bd[n].dynamic && 'change_pct' in bd[n].dynamic), 'Rounds 2-4 carry dynamic scoring against the previous round');
  const sub = r.state.submission_id; token = '';
  r = await call('POST', '/api/login', { role: 'host', username: process.env.HOST_USERNAME || 'host', password: process.env.HOST_PASSWORD || 'change_me' });
  ok(r.success && r.token, 'host login'); token = r.token;
  r = await call('GET', '/api/host/leaderboard'); ok(r.success && r.rows[0].place === 1 && r.rows[0].submission_id === sub && r.rows[0].rounds.length === 4, 'Leaderboard ranks the submission 1st with 4 round marks');
  r = await call('GET', '/api/host/overview'); ok(r.success && r.podium[0].place === 1 && r.rows.some(x => x.rank === 1 && x.rounds.length === 4), 'Host overview has podium, rank and per-round marks');
  const pdf = await fetch(base + '/api/host/report.pdf', { headers: { Authorization: `Bearer ${token}` } });
  const buf = Buffer.from(await pdf.arrayBuffer());
  ok(pdf.status === 200 && buf.slice(0, 5).toString() === '%PDF-' && buf.length > 1500, 'Results PDF downloads');
  const noauth = await fetch(base + '/api/host/report.pdf'); ok(noauth.status === 401, 'PDF needs host login');
  token = '';
  r = await call('POST', '/api/login', { role: 'participant', username: 'pa100', password: 'pa100' }); ok(r.success, 'participant pa100 exists (100 participants)'); token = r.token;
  const a100 = (await call('GET', '/api/state')).state.problem_statement; token = '';
  r = await call('POST', '/api/login', { role: 'participant', username: 'pa002', password: 'pa002' }); token = r.token;
  const a2 = (await call('GET', '/api/state')).state.problem_statement;
  ok(a100.title !== a2.title && a100.scenario !== a2.scenario, 'Different participants get different problems and scenarios');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
