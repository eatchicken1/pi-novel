ALTER TABLE forge_sessions ADD COLUMN title_candidate TEXT;
ALTER TABLE forge_sessions ADD COLUMN narrative_dna_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE forge_sessions ADD COLUMN hard_constraints_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE forge_sessions ADD COLUMN preferences_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE forge_sessions ADD COLUMN selected_candidate_id TEXT;
ALTER TABLE forge_sessions ADD COLUMN committed_at TEXT;
ALTER TABLE forge_sessions ADD COLUMN materialized_project_id TEXT;
ALTER TABLE forge_sessions ADD COLUMN current_task_id TEXT;
ALTER TABLE forge_sessions ADD COLUMN runtime_relative_path TEXT NOT NULL DEFAULT '';
ALTER TABLE forge_sessions ADD COLUMN failure_code TEXT;
ALTER TABLE forge_sessions ADD COLUMN failure_message TEXT;

ALTER TABLE tasks ADD COLUMN forge_session_id TEXT;
ALTER TABLE tasks ADD COLUMN progress_phase TEXT NOT NULL DEFAULT 'queued';

CREATE TABLE IF NOT EXISTS forge_artifacts (
	artifact_id TEXT PRIMARY KEY,
	forge_session_id TEXT NOT NULL,
	kind TEXT NOT NULL,
	relative_path TEXT NOT NULL,
	candidate_id TEXT,
	summary TEXT,
	created_at TEXT NOT NULL
);
