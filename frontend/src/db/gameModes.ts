import { getDb, uid } from './client';
import type { GameMode, RulesConfig } from '../engine/types';

export async function listModes(gameId: string): Promise<GameMode[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GameMode>(
    'SELECT * FROM GameModes WHERE game_id = ? ORDER BY created_at ASC',
    [gameId]
  );
  return rows.map(r => ({ ...r, rules: JSON.parse(r.rules_config) as RulesConfig }));
}

export async function createMode(
  gameId: string,
  name: string,
  rules: RulesConfig
): Promise<GameMode> {
  const db = await getDb();
  const id = uid('m');
  const rulesJson = JSON.stringify(rules);
  await db.runAsync(
    'INSERT INTO GameModes (id, game_id, name, rules_config) VALUES (?, ?, ?, ?)',
    [id, gameId, name, rulesJson]
  );
  const row = await db.getFirstAsync<GameMode>(
    'SELECT * FROM GameModes WHERE id = ?', [id]
  ) as GameMode;
  return { ...row, rules };
}

export async function updateMode(
  id: string,
  patch: { name?: string; rules?: RulesConfig }
): Promise<void> {
  const db = await getDb();
  if (patch.name !== undefined && patch.rules !== undefined) {
    await db.runAsync(
      'UPDATE GameModes SET name = ?, rules_config = ? WHERE id = ?',
      [patch.name, JSON.stringify(patch.rules), id]
    );
  } else if (patch.name !== undefined) {
    await db.runAsync('UPDATE GameModes SET name = ? WHERE id = ?', [patch.name, id]);
  } else if (patch.rules !== undefined) {
    await db.runAsync(
      'UPDATE GameModes SET rules_config = ? WHERE id = ?',
      [JSON.stringify(patch.rules), id]
    );
  }
}

export async function deleteMode(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM GameModes WHERE id = ?', [id]);
}

export async function getMode(id: string): Promise<GameMode | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<GameMode>(
    'SELECT * FROM GameModes WHERE id = ?', [id]
  );
  if (!row) return null;
  return { ...row, rules: JSON.parse(row.rules_config) as RulesConfig };
}
