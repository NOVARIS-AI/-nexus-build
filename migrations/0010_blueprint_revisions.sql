CREATE TABLE IF NOT EXISTS blueprint_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  task_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  blueprint_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_blueprint_revisions_owner_created
  ON blueprint_revisions(owner_id, created_at DESC);
