// Real email delivery for the websites participants build.
// Provider (first that is configured wins):
//   1. RESEND_API_KEY            -> Resend HTTPS API (works on hosts that block SMTP ports, e.g. Render free/starter)
//   2. SMTP_HOST (+PORT/USER/PASS) -> any SMTP server through nodemailer
//   MAIL_DRY_RUN=1               -> logs the email instead of sending (testing only)
// MAIL_FROM = sender address, MAIL_NOTIFY = optional address that receives a copy of every submission.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;

const mailConfigured = () => !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.MAIL_DRY_RUN === '1');
const fromAddress = () => process.env.MAIL_FROM || (process.env.RESEND_API_KEY ? 'onboarding@resend.dev' : process.env.SMTP_USER) || 'no-reply@localhost';

let transporter;
async function deliver({ to, subject, text, html }) {
  if (process.env.MAIL_DRY_RUN === '1') { console.log(`[mail dry-run] to=${to} subject=${subject}`); return { dryRun: true }; }
  if (process.env.RESEND_API_KEY) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 15000);
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: ac.signal,
        headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromAddress(), to: [to], subject, text, html }),
      });
      if (!r.ok) throw new Error('Resend HTTP ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 300));
      return {};
    } finally { clearTimeout(t); }
  }
  if (process.env.SMTP_HOST) {
    transporter ||= require('nodemailer').createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });
    await transporter.sendMail({ from: fromAddress(), to, subject, text, html });
    return {};
  }
  throw new Error('Email is not configured');
}

const rows = fields => Object.entries(fields).map(([k, v]) => [k.slice(0, 60), String(v).slice(0, 2000)]);
const plain = fields => rows(fields).map(([k, v]) => `${k}: ${v}`).join('\n');
const table = fields => '<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif">' +
  rows(fields).map(([k, v]) => `<tr><td style="border:1px solid #ddd"><b>${esc(k)}</b></td><td style="border:1px solid #ddd">${esc(v)}</td></tr>`).join('') + '</table>';

// Sends the confirmation to the address the visitor typed and, if MAIL_NOTIFY is set, a copy to the site owner.
// Returns the list of addresses that were really emailed; throws if a required send fails.
async function sendFormMail({ site, page, fields, email }) {
  const title = String(page || 'Website').slice(0, 120), sent = [];
  if (email) {
    await deliver({
      to: email, subject: `We received your submission - ${title}`,
      text: `Thank you! Here is what you sent to ${title}:\n\n${plain(fields)}`,
      html: `<p>Thank you! Here is what you sent to <b>${esc(title)}</b>:</p>${table(fields)}`,
    });
    sent.push(email);
  }
  const notify = String(process.env.MAIL_NOTIFY || '').trim();
  if (notify && EMAIL_RE.test(notify)) {
    await deliver({
      to: notify, subject: `[AI Prompt War] New submission from ${site || 'a website'} - ${title}`,
      text: `Site: ${site || '-'}\nPage: ${title}\n\n${plain(fields)}`,
      html: `<p><b>${esc(site || '-')}</b> - ${esc(title)}</p>${table(fields)}`,
    });
    sent.push(notify);
  }
  return sent;
}
module.exports = { sendFormMail, mailConfigured, EMAIL_RE };
