import { getDb, uid } from './client';
import type { Player } from '../engine/types';

export async function addPlayer(matchId: string, name: string): Promise<Player> {
  const db = await getDb();
  const id = uid('p');
  await db.runAsync(
    'INSERT INTO Players (id, match_id, name) VALUES (?, ?, ?)',
    [id, matchId, name]
  );
  return db.getFirstAsync<Player>(
    'SELECT * FROM Players WHERE id = ?', [id]
  ) as Promise<Player>;
}

export async function listPlayers(matchId: string): Promise<Player[]> {
  const db = await getDb();
  return db.getAllAsync<Player>(
    'SELECT * FROM Players WHERE match_id = ? ORDER BY created_at ASC',
    [matchId]
  );
}

export async function getPlayerScore(matchId: string, playerId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(delta_value), 0) as total FROM AuditLogs WHERE match_id = ? AND player_id = ?',
    [matchId, playerId]
  );
  return row?.total ?? 0;
}
