export type AuditAction =
  | 'match_started'
  | 'score_updated'
  | 'round_advanced'
  | 'match_completed'
  | 'player_added';

export interface AuditLog {
  id: string;
  matchId: string;
  playerId: string | null;
  action: AuditAction;
  delta: number | null;
  round: number | null;
  payload: string | null;
  createdAt: number;
}
