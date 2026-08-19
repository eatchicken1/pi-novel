ALTER TABLE changesets ADD COLUMN patch_json TEXT;
ALTER TABLE changesets ADD COLUMN selected_candidate_id TEXT;
ALTER TABLE commits ADD COLUMN patch_json TEXT;
