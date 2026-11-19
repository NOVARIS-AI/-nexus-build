CREATE TABLE IF NOT EXISTS asset_catalogue (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  prompt_key TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'imported',
  model TEXT NOT NULL DEFAULT '',
  license TEXT NOT NULL DEFAULT 'user-supplied-or-model-terms',
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_asset_catalogue_type ON asset_catalogue(asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_catalogue_prompt_key ON asset_catalogue(prompt_key);
CREATE INDEX IF NOT EXISTS idx_asset_catalogue_updated ON asset_catalogue(updated_at DESC);
