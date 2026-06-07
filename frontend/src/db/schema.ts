export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS GameModes (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rules_config TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES Games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Matches (
  id TEXT PRIMARY KEY,
  mode_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mode_name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  current_round INTEGER DEFAULT 1,
  hash_signature TEXT,
  round_wins TEXT DEFAULT '{}',
  winner_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  FOREIGN KEY (mode_id) REFERENCES GameModes(id)
);

CREATE TABLE IF NOT EXISTS Players (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES Matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AuditLogs (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  delta_value INTEGER NOT NULL,
  round INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES Matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES Players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auditlogs_match_player ON AuditLogs(match_id, player_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON Matches(status);
`;
