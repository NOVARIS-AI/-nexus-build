ALTER TABLE npc_profiles ADD COLUMN character_family TEXT NOT NULL DEFAULT 'humanoid';
ALTER TABLE npc_profiles ADD COLUMN species TEXT NOT NULL DEFAULT 'human';
ALTER TABLE npc_profiles ADD COLUMN visual_style TEXT NOT NULL DEFAULT 'realistic-3d';
ALTER TABLE npc_profiles ADD COLUMN asset_status TEXT NOT NULL DEFAULT 'humanforge-template';
ALTER TABLE npc_profiles ADD COLUMN legacy_profile_json TEXT;

CREATE INDEX IF NOT EXISTS idx_npc_profiles_family ON npc_profiles(character_family);
CREATE INDEX IF NOT EXISTS idx_npc_profiles_species ON npc_profiles(species);
CREATE INDEX IF NOT EXISTS idx_npc_profiles_visual_style ON npc_profiles(visual_style);

CREATE TABLE IF NOT EXISTS character_library_seed_state (
  seed_key TEXT PRIMARY KEY NOT NULL,
  completed_at TEXT NOT NULL
);
