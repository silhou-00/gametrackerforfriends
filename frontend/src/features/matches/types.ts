export type MatchStatus = 'setup' | 'active' | 'completed';

export interface Match {
  id: string;
  templateId: string;
  status: MatchStatus;
  currentRound: number;
  winnerPlayerId: string | null;
  integrityHash: string | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
}
