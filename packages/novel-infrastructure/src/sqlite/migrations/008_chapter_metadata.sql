CREATE TABLE IF NOT EXISTS chapter_metadata (
	project_id TEXT NOT NULL,
	chapter INTEGER NOT NULL,
	order_index INTEGER NOT NULL,
	title TEXT NOT NULL,
	file_path TEXT NOT NULL,
	draft_revision INTEGER NOT NULL,
	content_hash TEXT NOT NULL,
	mtime TEXT NOT NULL,
	workflow_status TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	PRIMARY KEY (project_id, chapter)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_metadata_file ON chapter_metadata(project_id, file_path);
