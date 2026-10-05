// Real-time sending for generated websites (works in the preview iframe AND in the downloaded file).
//  - window.PromptWar.send({ email, message, ... }) -> Promise<{ ok, message }>   (never rejects)
//  - Any <form> that is submitted and whose page code did NOT call PromptWar.send itself is sent automatically.
// The server (POST /api/forms/submit) stores the entry and emails it for real; it never pretends a send worked.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.siteRelay = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function siteRelay(cfg) {
    if (window.PromptWar) return;
    var url = String(cfg.base || '').replace(/\/$/, '') + '/api/forms/submit';
    var lastCall = 0, bar, barTimer;

    function banner(msg) {
      try {
        if (!bar) {
          bar = document.createElement('div');
          bar.setAttribute('role', 'alert');
          bar.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);max-width:90%;padding:10px 16px;border-radius:10px;background:#7f1d1d;color:#fff;font:600 13px/1.35 system-ui,sans-serif;z-index:2147483647;box-shadow:0 6px 24px rgba(0,0,0,.35)';
          (document.body || document.documentElement).appendChild(bar);
        }
        bar.textContent = msg; bar.style.display = 'block';
        clearTimeout(barTimer); barTimer = setTimeout(function () { bar.style.display = 'none'; }, 5000);
      } catch (e) {}
    }

    function send(data) {
      lastCall = Date.now();
      var fields = {};
      if (data && typeof data === 'object') for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k) && data[k] != null && typeof data[k] !== 'object') fields[k] = String(data[k]);
      return fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site: cfg.site || '', page: document.title || '', fields: fields })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          return { ok: !!(r.ok && j.success), message: j.message || (r.ok ? 'Sent.' : 'Could not send.') };
        });
      }).catch(function () { return { ok: false, message: 'Network error - could not send.' }; });
    }

    function collect(form) {
      var out = {}, els = form.elements || [];
      for (var i = 0; i < els.length; i++) {
        var el = els[i], name = el.name || el.id, type = (el.type || '').toLowerCase();
        if (!name || el.disabled || type === 'password' || type === 'file' || type === 'submit' || type === 'button' || type === 'reset' || type === 'hidden') continue;
        if ((type === 'checkbox' || type === 'radio') && !el.checked) continue;
        var v = el.value;
        if (v === '' || v == null) continue;
        out[name] = out[name] ? out[name] + ', ' + v : v;
      }
      return out;
    }

    // Fallback for forms whose own script never calls PromptWar.send.
    document.addEventListener('submit', function (e) {
      var f = e.target; if (!f || f.tagName !== 'FORM') return;
      var before = lastCall, fields = collect(f);          // read now: the page may reset the form
      setTimeout(function () {
        if (lastCall !== before) return;                   // the page sent it itself
        if (f.checkValidity && !f.checkValidity() && !f.noValidate) return;
        if (!Object.keys(fields).length) return;
        send(fields).then(function (r) { if (!r.ok) banner(r.message); });
      }, 400);
    }, true);

    window.PromptWar = { send: send };
  }

  // Insert the relay as the first script of a generated page.
  siteRelay.inject = function (html, cfg) {
    html = String(html || '');
    var tag = '<script>(' + siteRelay.toString() + ')(' + JSON.stringify(cfg || {}).replace(/</g, '\\u003c') + ');<' + '/script>';
    var m;
    if ((m = /<head(?=[\s>])[^>]*>/i.exec(html))) return html.slice(0, m.index + m[0].length) + tag + html.slice(m.index + m[0].length);
    if ((m = /<html[^>]*>/i.exec(html))) return html.slice(0, m.index + m[0].length) + '<head>' + tag + '</head>' + html.slice(m.index + m[0].length);
    if ((m = /<!doctype[^>]*>/i.exec(html))) return html.slice(0, m.index + m[0].length) + tag + html.slice(m.index + m[0].length);
    return tag + html;
  };
  if (typeof window !== 'undefined') window.siteRelay = siteRelay;
  return siteRelay;
});
