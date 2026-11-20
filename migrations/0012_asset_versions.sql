CREATE TABLE IF NOT EXISTS asset_versions (
  version_id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  prompt_key TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'imported',
  model TEXT NOT NULL DEFAULT '',
  license TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  storage_backend TEXT,
  storage_key TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_asset_versions_owner_asset
  ON asset_versions(owner_id, asset_id, version_id DESC);
