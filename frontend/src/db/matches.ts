import { getDb, uid } from './client';
import type { Match } from '../engine/types';

export async function createMatch(
  modeId: string,
  title: string,
  modeName: string
): Promise<Match> {
  const db = await getDb();
  const id = uid('match');
  await db.runAsync(
    `INSERT INTO Matches (id, mode_id, title, mode_name, status, current_round)
     VALUES (?, ?, ?, ?, 'active', 1)`,
    [id, modeId, title, modeName]
  );
  return db.getFirstAsync<Match>('SELECT * FROM Matches WHERE id = ?', [id]) as Promise<Match>;
}

export async function getMatch(id: string): Promise<Match | null> {
  const db = await getDb();
  return db.getFirstAsync<Match>('SELECT * FROM Matches WHERE id = ?', [id]);
}

export async function getActiveMatch(): Promise<Match | null> {
  const db = await getDb();
  return db.getFirstAsync<Match>(
    "SELECT * FROM Matches WHERE status = 'active' ORDER BY created_at DESC LIMIT 1"
  );
}

export async function advanceRound(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE Matches SET current_round = current_round + 1 WHERE id = ?',
    [id]
  );
}

export async function updateRoundWins(
  id: string,
  roundWins: Record<string, number>
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE Matches SET round_wins = ? WHERE id = ?',
    [JSON.stringify(roundWins), id]
  );
}

export async function finishMatch(
  id: string,
  hashSignature: string,
  winnerId: string,
  currentRound: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE Matches SET status = 'finished', hash_signature = ?, winner_id = ?,
     current_round = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [hashSignature, winnerId, currentRound, id]
  );
}

export async function listFinishedMatches(): Promise<Match[]> {
  const db = await getDb();
  return db.getAllAsync<Match>(
    "SELECT * FROM Matches WHERE status IN ('finished', 'archived') ORDER BY created_at DESC"
  );
}

export async function deleteMatch(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM Matches WHERE id = ?', [id]);
}
