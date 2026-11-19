CREATE TABLE IF NOT EXISTS npc_profiles (
 id TEXT PRIMARY KEY NOT NULL,
 name TEXT NOT NULL,
 role TEXT NOT NULL,
 dialogue TEXT NOT NULL DEFAULT '',
 x REAL NOT NULL DEFAULT 0,
 z REAL NOT NULL DEFAULT 0,
 radius REAL NOT NULL DEFAULT 2.8,
 personality TEXT NOT NULL DEFAULT 'warm',
 routine TEXT NOT NULL DEFAULT 'community',
 greeting TEXT NOT NULL DEFAULT '',
 appearance_json TEXT NOT NULL DEFAULT '{}',
 preview_url TEXT,
 model_url TEXT,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_npc_profiles_name ON npc_profiles(name);
CREATE INDEX IF NOT EXISTS idx_npc_profiles_role ON npc_profiles(role);
CREATE INDEX IF NOT EXISTS idx_npc_profiles_personality ON npc_profiles(personality);
