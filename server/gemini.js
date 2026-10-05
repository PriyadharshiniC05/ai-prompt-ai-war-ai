// Gemini call with timeout + limited retries. Returns {ok, html} or {ok:false, message}. Never throws.
// Deliberately minimal: the model only gets technical output rules. It must build what the participant typed - nothing more.
const SYS = `You turn the user's prompt into a website. Return ONE complete HTML document with inline CSS in <style> and inline JavaScript in <script>; no external files, libraries, fonts or image URLs. Build EXACTLY what the prompt says and nothing else: do not add features, sections, pages, animations, colours, content, copy or polish that the prompt does not mention, and do not "improve" or fill gaps with your own ideas. If the prompt is vague or short, output a correspondingly plain, literal result. If a CURRENT WEBSITE is supplied, change only what the new prompt asks for and keep every other part of it exactly as it is. Output ONLY raw HTML.`;
const FAIL = 'AI generation is temporarily unavailable.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function clean(t) {
  t = String(t || '').trim().replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
  const i = t.search(/<!doctype|<html/i);
  if (i > 0) t = t.slice(i);
  return /<\w+/.test(t) && t.length > 40 ? t : '';
}

async function generate(prompt, { round, previous }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_key_here') {
    if (process.env.MOCK_AI === '1') {
      await sleep(200);
      return { ok: true, html: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;background:linear-gradient(135deg,#0b1020,#3b1d6e);color:#fff;margin:0}header,section,footer{padding:2rem}.card{border-radius:12px;box-shadow:0 2px 8px #0006;transition:.2s}@media(max-width:600px){body{font-size:14px}}</style></head><body><nav><header><h1>Round ${round} (mock)</h1></header></nav><section><div class="card"><p>${esc(prompt).slice(0, 200)}</p></div><button id="b">Click</button></section><footer>mock</footer><script>document.getElementById('b').addEventListener('click',()=>alert('hi'))</script></body></html>` };
    }
    console.error('GEMINI_API_KEY is not set');
    return { ok: false, message: 'Gemini API key is not configured on the server.' };
  }
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let text = `PROMPT:\n${prompt}`;
  if (previous) text += `\n\nCURRENT WEBSITE (apply the prompt to this page and return the full updated document):\n${String(previous).slice(0, 60000)}`;
  const body = JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: 'user', parts: [{ text }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 16384 } });

  for (let attempt = 1; attempt <= 3; attempt++) {
    const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 60000);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body, signal: ac.signal });
      clearTimeout(timer);
      if (r.ok) {
        const j = await r.json().catch(() => null);
        const parts = j?.candidates?.[0]?.content?.parts || [];
        const html = clean(parts.map(p => p.text || '').join(''));
        if (html) return { ok: true, html };
        console.error('Gemini: empty/invalid response');
      } else {
        const detail = (await r.text().catch(() => '')).slice(0, 500);
        console.error('Gemini HTTP', r.status, detail);
        if (r.status === 429) return { ok: false, message: 'Gemini rate limit reached (HTTP 429). Wait and try again.' };
        if (r.status === 400) return { ok: false, message: 'Gemini rejected the request (HTTP 400). Check GEMINI_MODEL and request settings.' };
        if (r.status === 401 || r.status === 403) return { ok: false, message: 'Gemini API key was rejected (HTTP ' + r.status + '). Check GEMINI_API_KEY.' };
        if (r.status === 404) return { ok: false, message: 'Gemini model was not found (HTTP 404). Check GEMINI_MODEL.' };
        if ([400, 401, 403, 404].includes(r.status)) return { ok: false, message: FAIL };
      }
    } catch (e) {
      clearTimeout(timer);
      console.error('Gemini network/timeout:', e.name);
    }
    if (attempt < 3) await sleep(1000 * attempt);
  }
  return { ok: false, message: FAIL };
}
module.exports = { generate };
