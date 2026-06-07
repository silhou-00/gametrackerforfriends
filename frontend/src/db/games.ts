import { getDb, uid } from './client';
import type { Game } from '../engine/types';

export async function listGames(): Promise<Game[]> {
  const db = await getDb();
  return db.getAllAsync<Game>('SELECT * FROM Games ORDER BY created_at ASC');
}

export async function createGame(name: string): Promise<Game> {
  const db = await getDb();
  const id = uid('g');
  await db.runAsync(
    'INSERT INTO Games (id, name) VALUES (?, ?)',
    [id, name]
  );
  return db.getFirstAsync<Game>('SELECT * FROM Games WHERE id = ?', [id]) as Promise<Game>;
}

export async function renameGame(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE Games SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteGame(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM Games WHERE id = ?', [id]);
}
