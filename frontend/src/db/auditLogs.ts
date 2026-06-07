import { getDb, uid } from './client';
import type { AuditLog } from '../engine/types';

export async function appendLog(
  matchId: string,
  playerId: string,
  actionType: string,
  deltaValue: number,
  round: number
): Promise<AuditLog> {
  const db = await getDb();
  const id = uid('log');
  await db.runAsync(
    `INSERT INTO AuditLogs (id, match_id, player_id, action_type, delta_value, round)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, matchId, playerId, actionType, deltaValue, round]
  );
  return db.getFirstAsync<AuditLog>(
    'SELECT * FROM AuditLogs WHERE id = ?', [id]
  ) as Promise<AuditLog>;
}

export async function listLogs(matchId: string): Promise<AuditLog[]> {
  const db = await getDb();
  return db.getAllAsync<AuditLog>(
    'SELECT * FROM AuditLogs WHERE match_id = ? ORDER BY created_at ASC',
    [matchId]
  );
}

export async function getPlayerScore(matchId: string, playerId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(delta_value), 0) as total
     FROM AuditLogs WHERE match_id = ? AND player_id = ?`,
    [matchId, playerId]
  );
  return row?.total ?? 0;
}

export async function getRoundScore(
  matchId: string,
  playerId: string,
  round: number
): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(delta_value), 0) as total
     FROM AuditLogs WHERE match_id = ? AND player_id = ? AND round = ?`,
    [matchId, playerId, round]
  );
  return row?.total ?? 0;
}

export async function deleteMatchLogs(matchId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM AuditLogs WHERE match_id = ?', [matchId]);
}
