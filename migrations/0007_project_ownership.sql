ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'legacy-unassigned';

CREATE INDEX IF NOT EXISTS idx_projects_owner_updated_at ON projects(owner_id, updated_at DESC);
