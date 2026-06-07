// tokens.jsx — PointDrop tokens, dynamic rules engine, seed data, helpers
// ─────────────────────────────────────────────────────────────
// Color system — tabletop / parchment direction
// ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#F2EADA',  // Aged parchment
  bgSunk:    '#E7DCC6',  // deeper parchment for wells
  surface:   '#FBF6EC',  // card stock (warm off-white)
  surfaceAlt:'#FFFFFF',
  primary:   '#C25B38',  // Terracotta / sealing-wax red-orange
  primaryInk:'#FFF8F2',
  primarySoft:'#F0D9CC',
  ink:       '#33291F',  // Walnut ink
  ink70:     'rgba(51,41,31,0.70)',
  ink50:     'rgba(51,41,31,0.52)',
  ink35:     'rgba(51,41,31,0.34)',
  ink12:     'rgba(51,41,31,0.13)',
  ink06:     'rgba(51,41,31,0.06)',
  // State palette
  connect:   '#5C80BC',  // Muted Steel Blue
  success:   '#4A7C59',  // Forest Green
  warn:      '#C9923E',  // Aged gold
  error:     '#A23A38',  // Rust red
  connectSoft:'#DEE6F1',
  successSoft:'#DCE8DE',
  warnSoft:  '#EFE2C7',
  errorSoft: '#EEDAD7',
  line:      'rgba(51,41,31,0.13)',
  gold:      '#B08A4F',   // ornamental brass
};

const FONT_HEAD = "'Roboto Slab', Georgia, serif";
const FONT_BODY = "'Lato', system-ui, sans-serif";

const SHADOW = {
  card:  '0 1px 2px rgba(51,41,31,0.05), 0 8px 18px rgba(51,41,31,0.07)',
  lift:  '0 3px 6px rgba(51,41,31,0.08), 0 18px 38px rgba(51,41,31,0.16)',
  press: 'inset 0 2px 5px rgba(51,41,31,0.12)',
  sheet: '0 -10px 50px rgba(51,41,31,0.22)',
  modal: '0 30px 70px rgba(33,25,18,0.40)',
};

let _seq = 100;
const uid = (p = 'id') => `${p}_${(_seq++).toString(36)}${Date.now().toString(36).slice(-3)}`;

// ─────────────────────────────────────────────────────────────
// DYNAMIC RULES ENGINE
// Abstract logic evaluator — no hardcoded game types.
// A rule = trigger_event + conditions (subject/operator/threshold)
//          combined by a logical_gate, dispatching a consequence.
// ─────────────────────────────────────────────────────────────
const TRIGGERS = {
  on_point_added:    'When a point is scored',
  on_round_advanced: 'When a round ends',
  on_round_won:      'When a round is won',
};

const SUBJECTS = {
  'player.score':     { label: "Scorer's total",   short: 'score' },
  'match.round':      { label: 'Current round',     short: 'round' },
  'opponent.max':     { label: 'Top rival score',   short: 'rival' },
  'player.roundWins': { label: 'Rounds won',         short: 'rounds won' },
};

const OPERATORS = {
  EQ:  { label: '= equals',          glyph: '=',  fn: (a, b) => a === b },
  GT:  { label: '> greater than',    glyph: '>',  fn: (a, b) => a > b },
  GTE: { label: '\u2265 at least',   glyph: '\u2265', fn: (a, b) => a >= b },
  LT:  { label: '< less than',       glyph: '<',  fn: (a, b) => a < b },
  LTE: { label: '\u2264 at most',    glyph: '\u2264', fn: (a, b) => a <= b },
  MOD: { label: '\u00f7 divisible by',glyph: 'mod',fn: (a, b) => b !== 0 && a % b === 0 },
};

const CONSEQUENCES = {
  END_MATCH:     { label: 'End the match',      needsValue: false, needsWinner: true },
  WIN_ROUND:     { label: 'Win the round',      needsValue: false, needsWinner: true },
  SET_VALUE:     { label: "Set scorer's total", needsValue: true,  needsWinner: false },
  MODIFY_VALUE:  { label: 'Adjust scorer by',   needsValue: true,  needsWinner: false },
  UPDATE_STATUS: { label: 'Eliminate scorer',   needsValue: false, needsWinner: false },
};

// resolve a subject token against the live evaluation context
function resolveSubject(token, ctx) {
  if (token === 'player.score')     return ctx.actingScore;
  if (token === 'match.round')      return ctx.round;
  if (token === 'opponent.max')     return ctx.opponentMax;
  if (token === 'player.roundWins') return ctx.actingRoundWins || 0;
  return 0;
}
// resolve a threshold (number, or a token + offset expression for seed rules)
function resolveThreshold(thr, ctx) {
  if (typeof thr === 'number') return thr;
  if (typeof thr === 'string') {
    const m = thr.match(/^([a-z_.]+)\s*([+\-])\s*(\d+)$/);
    if (m) { const base = resolveSubject(m[1], ctx); return m[2] === '+' ? base + (+m[3]) : base - (+m[3]); }
    const n = Number(thr); if (!isNaN(n)) return n;
  }
  return 0;
}

function evalCondition(cond, ctx) {
  const a = resolveSubject(cond.subject, ctx);
  const b = resolveThreshold(cond.threshold, ctx);
  const op = OPERATORS[cond.operator];
  return op ? op.fn(a, b) : false;
}

// Evaluate every rule for a trigger. Returns the FIRST matching consequence (or null).
function evaluateRules(rulesConfig, trigger, ctx) {
  if (!rulesConfig || !rulesConfig.rules) return null;
  for (const rule of rulesConfig.rules) {
    if (rule.trigger_event !== trigger) continue;
    const conds = rule.conditions || [];
    if (!conds.length) continue;
    const results = conds.map(c => evalCondition(c, ctx));
    const pass = (rule.logical_gate === 'OR') ? results.some(Boolean) : results.every(Boolean);
    if (pass) return rule.consequence;
  }
  return null;
}

// human-readable one-liner for a single condition
function describeCondition(c) {
  const subj = SUBJECTS[c.subject] ? SUBJECTS[c.subject].short : c.subject;
  const op = OPERATORS[c.operator] ? OPERATORS[c.operator].glyph : c.operator;
  return `${subj} ${op} ${c.threshold}`;
}

// short label for cards: tries to recognise common shapes, else "Custom"
function describeMode(rulesConfig) {
  const rules = (rulesConfig && rulesConfig.rules) || [];
  if (!rules.length) return 'No rules yet';
  // round-based mode (reach target → win round, best-of N)
  const winRound = rules.find(r => r.consequence && r.consequence.action === 'WIN_ROUND');
  if (winRound) {
    const c = (winRound.conditions || [])[0];
    const endR = rules.find(r => r.trigger_event === 'on_round_won' && r.consequence && r.consequence.action === 'END_MATCH');
    const bestOf = endR && (endR.conditions || [])[0] ? (endR.conditions[0].threshold) : null;
    let s = c ? `Round to ${c.threshold}` : 'Round-based';
    if (bestOf) s += ` \u00b7 first to ${bestOf} rounds`;
    return s;
  }
  const end = rules.find(r => r.consequence && r.consequence.action === 'END_MATCH');
  const bust = rules.find(r => r.consequence && r.consequence.action === 'SET_VALUE');
  if (end) {
    const c = (end.conditions || [])[0];
    if (c) {
      if (c.subject === 'player.score' && (c.operator === 'GTE' || c.operator === 'GT')) {
        let s = `First to ${c.threshold}`;
        if (bust) s += ` · bust \u2192 ${bust.consequence.value}`;
        return s;
      }
      if (c.subject === 'player.score' && c.operator === 'EQ') return `Exactly ${c.threshold}${bust ? ` · bust \u2192 ${bust.consequence.value}` : ''}`;
      if (c.subject === 'match.round') return `${c.threshold} rounds, highest wins`;
    }
  }
  return `${rules.length} custom rule${rules.length > 1 ? 's' : ''}`;
}

// ── seed rule builders (abstract shape) ──
const ruleTarget = (n) => ({ id: uid('r'), trigger_event: 'on_point_added', logical_gate: 'AND',
  conditions: [{ subject: 'player.score', operator: 'GTE', threshold: n }],
  consequence: { action: 'END_MATCH', winner: 'acting' } });
const ruleBust = (target, fallback) => ({ id: uid('r'), trigger_event: 'on_point_added', logical_gate: 'AND',
  conditions: [{ subject: 'player.score', operator: 'GT', threshold: target }],
  consequence: { action: 'SET_VALUE', value: fallback } });
const ruleExactWin = (n) => ({ id: uid('r'), trigger_event: 'on_point_added', logical_gate: 'AND',
  conditions: [{ subject: 'player.score', operator: 'EQ', threshold: n }],
  consequence: { action: 'END_MATCH', winner: 'acting' } });
const ruleRounds = (n) => ({ id: uid('r'), trigger_event: 'on_round_advanced', logical_gate: 'AND',
  conditions: [{ subject: 'match.round', operator: 'GT', threshold: n }],
  consequence: { action: 'END_MATCH', winner: 'leader' } });
// round-based builders: reach target → win the round; first to N round-wins → end match
const ruleWinRound = (n) => ({ id: uid('r'), trigger_event: 'on_point_added', logical_gate: 'AND',
  conditions: [{ subject: 'player.score', operator: 'GTE', threshold: n }],
  consequence: { action: 'WIN_ROUND', winner: 'acting' } });
const ruleBestOf = (wins) => ({ id: uid('r'), trigger_event: 'on_round_won', logical_gate: 'AND',
  conditions: [{ subject: 'player.roundWins', operator: 'GTE', threshold: wins }],
  consequence: { action: 'END_MATCH', winner: 'leader' } });

// ──────────────────────────────────────────────────────────────
// score = SUM(delta) of a player's logs
// roundScore = SUM(delta) within the current round only (resets each round)
// ─────────────────────────────────────────────────────────────
function roundScoreOf(logs, playerId, round) {
  return logs.reduce((s, l) => (l.playerId === playerId && l.round === round ? s + l.delta : s), 0);
}
// a mode plays in rounds when any rule awards a round win
function isRoundBased(rulesConfig) {
  return ((rulesConfig && rulesConfig.rules) || []).some(r => r.consequence && r.consequence.action === 'WIN_ROUND');
}

// ─────────────────────────────────────────────────────────────
// score = SUM(delta) of a player's logs
// ─────────────────────────────────────────────────────────────
function scoreOf(logs, playerId) {
  return logs.reduce((s, l) => (l.playerId === playerId ? s + l.delta : s), 0);
}

// ─────────────────────────────────────────────────────────────
// Seed world
// ─────────────────────────────────────────────────────────────
function seedWorld() {
  const games = [
    { id: 'g_party',  name: 'Party Games',           created: 'Apr 2026' },
    { id: 'g_corn',   name: 'Cornhole',              created: 'Apr 2026' },
    { id: 'g_trivia', name: 'Trivia Night',          created: 'May 2026' },
    { id: 'g_cards',  name: 'Card Battles',          created: 'May 2026' },
    { id: 'g_cah',    name: 'Cards Against Humanity', created: 'Jun 2026' },
  ];
  const modes = [
    { id: 'm_f5',  gameId: 'g_party',  name: 'First to 5',      rules: { rules: [ruleTarget(5)] } },
    { id: 'm_f10', gameId: 'g_party',  name: 'Long Game (10)',  rules: { rules: [ruleTarget(10)] } },
    { id: 'm_blitz',gameId: 'g_party', name: 'Round Blitz',     rules: { rules: [ruleRounds(6)] } },
    { id: 'm_c21', gameId: 'g_corn',   name: 'Classic 21',      rules: { rules: [ruleWinRound(21), ruleBestOf(2)] } },
    { id: 'm_speed',gameId: 'g_trivia',name: 'Speed Round',     rules: { rules: [ruleTarget(8)] } },
    { id: 'm_last',gameId: 'g_cards',  name: 'Last One Standing',rules: { rules: [ruleRounds(10)] } },
  ];
  const past = [
    pastMatch('Game Night', 'First to 5', 'First to 5', 'Jun 4', false, [['Mathew',5],['Priya',3],['Devon',4]]),
    pastMatch('Backyard BBQ', 'Classic 21', 'Round to 21 · first to 2 rounds', 'May 30', true, [['Sam',21],['Alex',18]]),
    pastMatch('Trivia Tuesday', 'Speed Round', 'First to 8', 'May 27', false, [['Priya',8],['Mathew',6],['Jordan',7],['Devon',5]]),
  ];
  return { games, modes, matches: past };
}

function pastMatch(title, modeName, rulesLabel, dateLabel, tampered, finals) {
  const id = uid('match');
  const players = finals.map(([name]) => ({ id: uid('p'), name }));
  const logs = [];
  let round = 1;
  const maxScore = Math.max(...finals.map(f => f[1]));
  for (let r = 0; r < maxScore; r++) {
    finals.forEach(([name, total], i) => {
      if (r < total) logs.push({ id: uid('log'), playerId: players[i].id, action: 'point_added', delta: 1, round, ts: r });
    });
    round++;
  }
  return { id, title, modeName, rulesLabel, dateLabel, tampered, status: 'finished',
    players, logs, round, hash: tampered ? '\u26a0 mismatch' : 'a3f' + id.slice(-6) };
}

Object.assign(window, {
  C, FONT_HEAD, FONT_BODY, SHADOW, uid,
  TRIGGERS, SUBJECTS, OPERATORS, CONSEQUENCES,
  resolveSubject, resolveThreshold, evalCondition, evaluateRules,
  describeCondition, describeMode, scoreOf, roundScoreOf, isRoundBased, seedWorld,
  ruleTarget, ruleBust, ruleExactWin, ruleRounds, ruleWinRound, ruleBestOf,
});
