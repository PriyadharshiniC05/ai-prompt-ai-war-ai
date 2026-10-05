// Shared by the browser (live checklist) and the server (authoritative check before a generation is allowed).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.PromptCheck = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // lenient only on case, spacing and curly quotes; the wording itself must match exactly
  const norm = t => String(t || '').toLowerCase().replace(/[\u2018\u2019\u201B]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, ' ').trim();
  const COLORS = ['red','orange','yellow','green','blue','navy','teal','cyan','purple','violet','pink','magenta','brown','beige','cream','black','white','grey','gray','gold','silver','maroon','indigo','coral','peach','mint','lavender','turquoise','crimson','olive','amber','charcoal','ivory','tan','burgundy','emerald','lime','sky blue','rose','lilac','mustard','terracotta','slate'];
  const COLOR_WORD = /\b(colou?rs?|colou?r scheme|palette|theme)\b/;
  const NAMED = new RegExp('\\b(' + COLORS.join('|') + ')\\b');
  const CODE = /#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/;

  // Looser form used only for the "copied word for word" test: ignores punctuation as well as case/spacing.
  const squash = t => norm(t).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  // The prompt must say HOW the website will solve the problem (purpose / what visitors can do / how it helps).
  const APPROACH = /\b(solve[sd]?|solving|solution|help(s|ing)?|so that|in order to|allow(s|ing)?|enable[sd]?|lets?|let (the )?(visitors?|users?|customers?|parents?|donors?)|goal|purpose|aims? to|ensure[sd]?|make(s)? it (easy|simple|quick)|easy (for|to)|(visitors?|users?|customers?|clients?|parents?|donors?|students?|patients?|guests?|people) (can|will|should|are able)|by (providing|offering|showing|giving|using|adding|including|displaying)|designed to|will (let|help|allow))\b/;

  function check(prompt, rules) {
    rules = rules || {};
    const p = norm(prompt), items = [], missing = [], violations = [];
    const add = (key, label, ok, detail) => { items.push({ key, label, ok }); if (!ok) missing.push(detail || label); };
    if (rules.reward && p.includes(norm(rules.reward))) {
      return { ok: true, items: [{ key: 'reward', label: 'Solved quiz prompt', ok: true }], missing: [], violations: [], violated: false };
    }
    // PARTICIPANT VIOLATION: the prompt must be the participant's own words, not the problem statement / scenario retyped.
    const q = squash(prompt), forbid = rules.forbid || {};
    if (forbid.problem) violations.push({ key: 'copy_problem', label: 'Problem statement copied word for word', hit: q.includes(squash(forbid.problem)) });
    if (forbid.scenario) violations.push({ key: 'copy_scenario', label: 'Scenario copied word for word', hit: q.includes(squash(forbid.scenario)) });

    if (rules.features && rules.features.length) {
      const lost = rules.features.filter(f => !p.includes(norm(f)));
      add('features', `Required features (${rules.features.length - lost.length}/${rules.features.length})`, !lost.length,
        'These required features written out: ' + lost.join('; '));
    }
    if (rules.enhancement) add('enhancement', 'Round feature (enhancement) typed exactly', p.includes(norm(rules.enhancement)),
      'The round feature (enhancement) typed exactly as shown: "' + rules.enhancement + '"');
    add('color', 'Colour scheme explained', COLOR_WORD.test(p) && (NAMED.test(p) || CODE.test(p)),
      'An explanation of the colour scheme (say "colour"/"palette" and name the actual colours, e.g. cream background, #8b4513 accents)');
    add('approach', 'How the website solves the problem', APPROACH.test(p),
      'How you want the website to solve the problem, in your own words (e.g. "so that supporters can learn about the projects and donate easily")');
    return { ok: !missing.length, items, missing, violations, violated: violations.some(v => v.hit) };
  }
  function message(missing) {
    return 'PROMPT RULES NOT MET\n\nYour prompt must include:\n' + missing.map(m => '• ' + m).join('\n') + '\n\nNo attempt was used.';
  }
  function violationMessage(violations) {
    const hit = (violations || []).filter(v => v.hit).map(v => v.label);
    return 'PARTICIPANT VIOLATION\n\n' + hit.map(m => '• ' + m).join('\n') + '\n\nYou must write your own prompt. Do not type the problem statement or scenario exactly as given. No attempt was used.';
  }
  return { check, message, violationMessage, norm };
});
