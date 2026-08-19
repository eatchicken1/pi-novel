CREATE TABLE IF NOT EXISTS chapter_workflow (
	project_id TEXT NOT NULL,
	chapter INTEGER NOT NULL,
	phase TEXT NOT NULL,
	reconcile_json TEXT,
	settlement_json TEXT,
	updated_at TEXT NOT NULL,
	PRIMARY KEY (project_id, chapter)
);
