ALTER TABLE generation_tasks ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'legacy-unassigned';

CREATE INDEX IF NOT EXISTS idx_generation_tasks_owner_created ON generation_tasks(owner_id, created_at DESC);
