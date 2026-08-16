CREATE TABLE IF NOT EXISTS project_metadata (project_id TEXT PRIMARY KEY, title TEXT NOT NULL, language TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS story_commitments (commitment_id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL, payload_json TEXT NOT NULL, committed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS forge_provenance (provenance_id TEXT PRIMARY KEY, forge_session_id TEXT NOT NULL, source_artifact_id TEXT NOT NULL, created_at TEXT NOT NULL);
