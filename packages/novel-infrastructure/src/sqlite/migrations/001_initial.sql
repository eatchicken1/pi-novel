CREATE TABLE IF NOT EXISTS workspace_metadata (
	workspace_id TEXT PRIMARY KEY,
	root_path TEXT NOT NULL,
	manifest_json TEXT NOT NULL,
	last_scan_at TEXT
);

CREATE TABLE IF NOT EXISTS projects (
	project_id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	root_path TEXT NOT NULL,
	kind TEXT NOT NULL,
	status TEXT NOT NULL,
	word_count INTEGER NOT NULL DEFAULT 0,
	last_modified_at TEXT NOT NULL,
	manifest_json TEXT
);

CREATE TABLE IF NOT EXISTS forge_sessions (
	forge_session_id TEXT PRIMARY KEY,
	workspace_id TEXT NOT NULL,
	status TEXT NOT NULL,
	seed TEXT NOT NULL,
	genre TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
	task_id TEXT PRIMARY KEY,
	project_id TEXT,
	type TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	error_message TEXT
);
