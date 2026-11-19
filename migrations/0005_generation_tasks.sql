CREATE TABLE IF NOT EXISTS generation_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','completed','failed')),
  input TEXT NOT NULL,
  engine TEXT NOT NULL DEFAULT 'auto',
  result_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_created ON generation_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_status ON generation_tasks(status, updated_at DESC);
