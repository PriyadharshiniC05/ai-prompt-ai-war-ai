const tok = sessionStorage.getItem('apw_token');
if (!tok) location.href = '/';
const $ = id => document.getElementById(id);
const H = { Authorization: 'Bearer ' + tok };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = ms => { ms = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(ms / 60)).padStart(2, '0') + ':' + String(ms % 60).padStart(2, '0'); };
async function load() {
  try {
    const r = await fetch('/api/host/overview', { headers: H });
    if (r.status === 401) { sessionStorage.removeItem('apw_token'); return location.href = '/'; }
    const j = await r.json(); if (!j.success) return;
    $('sA').textContent = j.stats.active; $('sS').textContent = j.stats.submissions; $('sV').textContent = j.stats.average; $('sC').textContent = j.stats.completed; $('sE').textContent = j.stats.eliminated;
    const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 >= 11 && n % 100 <= 13) ? 0 : Math.min(n % 10, 4) % 4] || 'th');
    const n2 = v => (v === null || v === undefined) ? '—' : String(Math.round(v * 100) / 100);
    $('podium').innerHTML = [1, 2, 3].map(p => {
      const r = (j.podium || []).find(x => x.place === p);
      return `<div class="pod p${p}"><span class="pl">${ord(p)} PLACE</span><b>${r ? esc(r.username) : '—'}</b><small>${r ? esc(r.submission_id) : 'waiting for submissions'}</small><em>${r ? n2(r.total) + ' / 100' : ''}</em></div>`;
    }).join('');
    const cell = m => (!m || m.out_of_100 === null) ? '<td class="muted">—</td>' : `<td class="rc"><b>${n2(m.out_of_100)}</b><small>/100</small><br><span>${n2(m.out_of_25)}<small>/25</small></span></td>`;
    $('rows').innerHTML = j.rows.map(x => {
      const cls = x.status === 'Done' ? 'd' : (x.status === 'Timed Out' || x.status === 'Eliminated') ? 't' : 'p';
      const time = x.status === 'In Progress' ? clock(x.expires_at - j.now) + ' left' : new Date(x.started_at).toLocaleTimeString();
      const reinstate = x.status === 'Eliminated' ? ` <button class="btn ghost sm" data-e="${esc(x.username)}">REINSTATE</button>` : '';
      const act = x.submission_id ? `<button class="btn ghost sm" data-v="${esc(x.submission_id)}">VIEW</button>${reinstate}` : x.live ? `<button class="btn ghost sm" data-r="${esc(x.username)}">RELEASE</button>` : '';
      const rank = x.rank ? `<span class="rk r${Math.min(x.rank, 4)}">${ord(x.rank)}</span>` : '—';
      return `<tr><td>${rank}</td><td>${esc(x.username)}</td><td>${esc(x.submission_id || '—')}</td>${[0, 1, 2, 3].map(i => cell(x.rounds && x.rounds[i])).join('')}<td><b>${x.score ?? '—'}</b></td><td>${x.round}</td><td><span class="pill ${cls}">${esc(x.status)}</span></td><td>${x.warnings || 0}</td><td>${esc(time)}</td><td>${act}</td></tr>`;
    }).join('') || '<tr><td colspan="14" class="muted">No sessions yet.</td></tr>';
  } catch { /* keep polling */ }
}
$('rows').onclick = async e => {
  const v = e.target.dataset.v, u = e.target.dataset.r, el = e.target.dataset.e;
  if (el && confirm(`Reinstate ${el}? They will be able to log in again.`)) { await fetch('/api/host/reinstate/' + encodeURIComponent(el), { method: 'POST', headers: H }); load(); }
  if (u && confirm(`Force-release ${u}?`)) { await fetch('/api/host/release/' + encodeURIComponent(u), { method: 'POST', headers: H }); load(); }
  if (v) {
    const j = await (await fetch('/api/host/submission/' + encodeURIComponent(v), { headers: H })).json();
    if (!j.success) return;
    const s = j.submission;
    $('vt').textContent = `${s.submission_id} · ${s.eliminated ? 'ELIMINATED' : s.score}`;
    const n2 = v => (v === null || v === undefined) ? '—' : String(Math.round(v * 100) / 100);
    $('vb').innerHTML = '<table><thead><tr><th>ROUND</th><th>FUNCTIONALITY</th><th>UI / UX</th><th>PROMPT</th><th>PROMPT DETAIL (hidden)</th><th>UI COLOUR / CONTRAST</th><th>ROUND /100</th><th>MARKS /25</th><th>DYNAMIC (change · kept)</th></tr></thead><tbody>' +
      (s.rounds || []).map(m => `<tr><td>${m.round}</td><td>${n2(m.functionality)}</td><td>${n2(m.uiux)}</td><td>${n2(m.prompt)}</td><td>${m.prompt_detail ? `problem coverage ${m.prompt_detail.coverage} · site solved ${m.prompt_detail.site_solved ?? '—'}<br>colour ${m.prompt_detail.color} · explain ${m.prompt_detail.explain} · creative ${m.prompt_detail.creative}<br><small>copied ${m.prompt_detail.copied_pct}% · bare keywords ${m.prompt_detail.bare_keywords} · ${m.prompt_detail.words} words · deduction −${m.prompt_detail.deduction_pct}%</small>` : '—'}</td><td>${m.colour ? `contrast ${m.colour.contrast} · palette ${m.colour.palette}<br><small>worst ratio ${m.colour.worst_ratio}:1</small>` : '—'}</td><td><b>${n2(m.out_of_100)}</b></td><td><b>${n2(m.out_of_25)}</b></td><td>${m.dynamic ? `func +${m.dynamic.functionality} · ui +${m.dynamic.uiux} · prompt +${m.dynamic.prompt}<br><small>page changed ${m.dynamic.change_pct}% · earlier site kept ${m.dynamic.preserved_pct}%</small>` : '<span class="muted">base round</span>'}</td></tr>`).join('') + '</tbody></table>';
    $('vf').srcdoc = window.preparePreviewHtml(s.html || ''); $('view').hidden = false;
  }
};
$('vx').onclick = () => { $('view').hidden = true; $('vf').srcdoc = ''; };
$('pdf').onclick = async () => {
  const b = $('pdf'); b.disabled = true; const t = b.textContent; b.textContent = 'PREPARING…';
  try {
    const r = await fetch('/api/host/report.pdf', { headers: H });
    if (r.status === 401) { sessionStorage.removeItem('apw_token'); return location.href = '/'; }
    if (!r.ok) throw new Error('PDF failed');
    const url = URL.createObjectURL(await r.blob()), a = document.createElement('a');
    a.href = url; a.download = 'AI-Prompt-War-Results.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch { alert('Could not download the PDF. Please try again.'); }
  b.disabled = false; b.textContent = t;
};
$('out').onclick = () => { sessionStorage.removeItem('apw_token'); location.href = '/'; };
load(); setInterval(load, 3000);
