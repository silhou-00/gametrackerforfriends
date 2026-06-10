import type {
  Rule, RulesConfig, Consequence, EvalContext,
  OperatorKey, SubjectKey, LogicalGate, TriggerEvent,
} from './types';

const OPERATORS: Record<OperatorKey, (a: number, b: number) => boolean> = {
  EQ:  (a, b) => a === b,
  GT:  (a, b) => a > b,
  GTE: (a, b) => a >= b,
  LT:  (a, b) => a < b,
  LTE: (a, b) => a <= b,
  MOD: (a, b) => b !== 0 && a % b === 0,
};

export const OPERATOR_LABELS: Record<OperatorKey, string> = {
  EQ:  '= equals',
  GT:  '> greater than',
  GTE: '≥ at least',
  LT:  '< less than',
  LTE: '≤ at most',
  MOD: '÷ divisible by',
};

export const OPERATOR_GLYPHS: Record<OperatorKey, string> = {
  EQ: '=', GT: '>', GTE: '≥', LT: '<', LTE: '≤', MOD: 'mod',
};

export const SUBJECT_LABELS: Record<SubjectKey, { label: string; short: string }> = {
  'player.score':     { label: "Scorer's total",  short: 'score' },
  'match.round':      { label: 'Current round',    short: 'round' },
  'opponent.max':     { label: 'Top rival score',  short: 'rival' },
  'player.roundWins': { label: 'Rounds won',        short: 'rounds won' },
};

export const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  on_point_added:    'When a point is scored',
  on_round_advanced: 'When a round ends',
  on_round_won:      'When a round is won',
};

export const CONSEQUENCE_META: Record<string, { label: string; needsValue: boolean; needsWinner: boolean }> = {
  END_MATCH:     { label: 'End the match',       needsValue: false, needsWinner: true },
  WIN_ROUND:     { label: 'Win the round',        needsValue: false, needsWinner: true },
  SET_VALUE:     { label: "Set scorer's total",   needsValue: true,  needsWinner: false },
  MODIFY_VALUE:  { label: 'Adjust scorer by',     needsValue: true,  needsWinner: false },
  UPDATE_STATUS: { label: 'Eliminate scorer',     needsValue: false, needsWinner: false },
};

function resolveSubject(token: SubjectKey, ctx: EvalContext): number {
  switch (token) {
    case 'player.score':     return ctx.actingScore;
    case 'match.round':      return ctx.round;
    case 'opponent.max':     return ctx.opponentMax;
    case 'player.roundWins': return ctx.actingRoundWins;
    default:                 return 0;
  }
}

function resolveThreshold(thr: number | string, ctx: EvalContext): number {
  if (typeof thr === 'number') return thr;
  const m = thr.match(/^([a-z_.]+)\s*([+\-])\s*(\d+)$/);
  if (m) {
    const base = resolveSubject(m[1] as SubjectKey, ctx);
    return m[2] === '+' ? base + Number(m[3]) : base - Number(m[3]);
  }
  const n = Number(thr);
  return isNaN(n) ? 0 : n;
}

function evalCondition(
  cond: { subject: SubjectKey; operator: OperatorKey; threshold: number | string },
  ctx: EvalContext
): boolean {
  const a = resolveSubject(cond.subject, ctx);
  const b = resolveThreshold(cond.threshold, ctx);
  const op = OPERATORS[cond.operator];
  return op ? op(a, b) : false;
}

export function evaluateRules(
  config: RulesConfig,
  trigger: TriggerEvent,
  ctx: EvalContext
): Consequence | null {
  if (!config?.rules?.length) return null;
  for (const rule of config.rules) {
    if (rule.trigger_event !== trigger) continue;
    const conds = rule.conditions || [];
    if (!conds.length) continue;
    const results = conds.map(c => evalCondition(c, ctx));
    const pass = rule.logical_gate === 'OR'
      ? results.some(Boolean)
      : results.every(Boolean);
    if (pass) return rule.consequence;
  }
  return null;
}

export function buildContext(
  logs: { player_id: string; delta_value: number; round: number }[],
  players: { id: string }[],
  actingId: string,
  round: number,
  scopeToRound: boolean,
  roundWins: Record<string, number>
): EvalContext {
  const scoreOf = (pid: string) => {
    if (scopeToRound) {
      return logs
        .filter(l => l.player_id === pid && l.round === round)
        .reduce((s, l) => s + l.delta_value, 0);
    }
    return logs
      .filter(l => l.player_id === pid)
      .reduce((s, l) => s + l.delta_value, 0);
  };

  const scores = players.map(p => ({ id: p.id, s: scoreOf(p.id) }));
  const acting = scores.find(x => x.id === actingId);

  const rank = (x: { id: string; s: number }) =>
    (roundWins[x.id] || 0) * 1e6 + x.s;
  const leader = scores.reduce(
    (m, x) => (rank(x) > rank(m) ? x : m),
    scores[0] || { id: '', s: 0 }
  );
  const opponentMax = scores
    .filter(x => x.id !== actingId)
    .reduce((m, x) => Math.max(m, x.s), 0);

  return {
    actingScore: acting?.s ?? 0,
    round,
    opponentMax,
    leaderId: leader.id,
    leaderScore: leader.s,
    actingRoundWins: roundWins[actingId] || 0,
    roundWins,
  };
}

export function winnerId(
  cons: Consequence | null,
  ctx: EvalContext,
  actingId: string
): string {
  if (!cons) return actingId;
  if (cons.winner === 'leader') return ctx.leaderId || actingId;
  return actingId;
}

export function isRoundBased(config: RulesConfig): boolean {
  return (config?.rules || []).some(r => r.consequence?.action === 'WIN_ROUND');
}

export function scoreOf(
  logs: { player_id: string; delta_value: number }[],
  playerId: string
): number {
  return logs
    .filter(l => l.player_id === playerId)
    .reduce((s, l) => s + l.delta_value, 0);
}

export function roundScoreOf(
  logs: { player_id: string; delta_value: number; round: number }[],
  playerId: string,
  round: number
): number {
  return logs
    .filter(l => l.player_id === playerId && l.round === round)
    .reduce((s, l) => s + l.delta_value, 0);
}

export function describeMode(config: RulesConfig | null | undefined): string {
  const rules = config?.rules || [];
  if (!rules.length) return 'No rules yet';
  const winRound = rules.find(r => r.consequence?.action === 'WIN_ROUND');
  if (winRound) {
    const c = winRound.conditions?.[0];
    const endR = rules.find(
      r => r.trigger_event === 'on_round_won' && r.consequence?.action === 'END_MATCH'
    );
    const bestOf = endR?.conditions?.[0]?.threshold;
    let s = c ? `Round to ${c.threshold}` : 'Round-based';
    if (bestOf) s += ` · first to ${bestOf} rounds`;
    return s;
  }
  const end = rules.find(r => r.consequence?.action === 'END_MATCH');
  const bust = rules.find(r => r.consequence?.action === 'SET_VALUE');
  if (end) {
    const c = end.conditions?.[0];
    if (c) {
      if (c.subject === 'player.score' && (c.operator === 'GTE' || c.operator === 'GT')) {
        let s = `First to ${c.threshold}`;
        if (bust) s += ` · bust → ${bust.consequence.value}`;
        return s;
      }
      if (c.subject === 'player.score' && c.operator === 'EQ')
        return `Exactly ${c.threshold}${bust ? ` · bust → ${bust.consequence.value}` : ''}`;
      if (c.subject === 'match.round')
        return `${c.threshold} rounds, highest wins`;
    }
  }
  return `${rules.length} custom rule${rules.length > 1 ? 's' : ''}`;
}

// rule builders for seed data / templates
export const ruleTarget = (n: number): Rule => ({
  trigger_event: 'on_point_added', logical_gate: 'AND',
  conditions: [{ subject: 'player.score', operator: 'GTE', threshold: n }],
  consequence: { action: 'END_MATCH', winner: 'acting' },
});
export const ruleBust = (target: number, fallback: number): Rule => ({
  trigger_event: 'on_point_added', logical_gate: 'AND',
  conditions: [{ subject: 'player.score', operator: 'GT', threshold: target }],
  consequence: { action: 'SET_VALUE', value: fallback },
});
export const ruleRounds = (n: number): Rule => ({
  trigger_event: 'on_round_advanced', logical_gate: 'AND',
  conditions: [{ subject: 'match.round', operator: 'GT', threshold: n }],
  consequence: { action: 'END_MATCH', winner: 'leader' },
});
export const ruleWinRound = (n: number): Rule => ({
  trigger_event: 'on_point_added', logical_gate: 'AND',
  conditions: [{ subject: 'player.score', operator: 'GTE', threshold: n }],
  consequence: { action: 'WIN_ROUND', winner: 'acting' },
});
export const ruleBestOf = (wins: number): Rule => ({
  trigger_event: 'on_round_won', logical_gate: 'AND',
  conditions: [{ subject: 'player.roundWins', operator: 'GTE', threshold: wins }],
  consequence: { action: 'END_MATCH', winner: 'leader' },
});
