import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('pointdrop.db');
    await _db.execAsync('PRAGMA foreign_keys = ON;');
  }
  return _db;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(SCHEMA_SQL);
}

let _seq = 100;
export function uid(prefix = 'id'): string {
  return `${prefix}_${(++_seq).toString(36)}${Date.now().toString(36).slice(-4)}`;
}
