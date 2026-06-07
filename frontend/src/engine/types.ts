export type OperatorKey = 'EQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'MOD';
export type SubjectKey = 'player.score' | 'match.round' | 'opponent.max' | 'player.roundWins';
export type ConsequenceAction = 'END_MATCH' | 'WIN_ROUND' | 'SET_VALUE' | 'MODIFY_VALUE' | 'UPDATE_STATUS';
export type LogicalGate = 'AND' | 'OR';
export type TriggerEvent = 'on_point_added' | 'on_round_advanced' | 'on_round_won';

export interface Condition {
  subject: SubjectKey;
  operator: OperatorKey;
  threshold: number | string;
}

export interface Consequence {
  action: ConsequenceAction;
  winner?: 'acting' | 'leader';
  value?: number;
}

export interface Rule {
  id?: string;
  trigger_event: TriggerEvent;
  logical_gate: LogicalGate;
  conditions: Condition[];
  consequence: Consequence;
}

export interface RulesConfig {
  rules: Rule[];
  auto_reset?: boolean;
}

export interface EvalContext {
  actingScore: number;
  round: number;
  opponentMax: number;
  leaderId: string | null;
  leaderScore: number;
  actingRoundWins: number;
  roundWins: Record<string, number>;
}

export interface Game {
  id: string;
  name: string;
  created_at: string;
}

export interface GameMode {
  id: string;
  game_id: string;
  name: string;
  rules_config: string;
  created_at: string;
  rules?: RulesConfig;
}

export interface Match {
  id: string;
  mode_id: string;
  title: string;
  mode_name: string;
  status: 'active' | 'finished' | 'archived';
  current_round: number;
  hash_signature: string | null;
  round_wins: string;
  winner_id: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface Player {
  id: string;
  match_id: string;
  name: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  match_id: string;
  player_id: string;
  action_type: string;
  delta_value: number;
  round: number;
  created_at: string;
}

export interface ActiveMatch {
  match: Match;
  mode: GameMode & { rules: RulesConfig };
  players: Player[];
  logs: AuditLog[];
  roundWins: Record<string, number>;
  roundBased: boolean;
  paired: boolean;
  hash?: string;
  winnerId?: string;
}
