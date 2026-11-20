ALTER TABLE asset_catalogue ADD COLUMN storage_backend TEXT;
ALTER TABLE asset_catalogue ADD COLUMN storage_key TEXT;
CREATE INDEX IF NOT EXISTS idx_asset_catalogue_storage_owner
  ON asset_catalogue(owner_id, storage_backend);
