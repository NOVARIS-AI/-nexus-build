-- Keep the existing starter catalogue globally readable while isolating creator registrations.
ALTER TABLE asset_catalogue ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'legacy-shared';

CREATE INDEX IF NOT EXISTS idx_asset_catalogue_owner_updated ON asset_catalogue(owner_id, updated_at DESC);
