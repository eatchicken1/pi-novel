CREATE TABLE IF NOT EXISTS changesets (
	changeset_id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	title TEXT NOT NULL,
	status TEXT NOT NULL,
	kind TEXT NOT NULL,
	source TEXT NOT NULL,
	intent TEXT NOT NULL,
	base_revision TEXT,
	operations_json TEXT NOT NULL,
	impact_json TEXT,
	review_json TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	committed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_changesets_project ON changesets(project_id, status);

CREATE TABLE IF NOT EXISTS review_issues (
	issue_id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	source_code TEXT NOT NULL,
	severity TEXT NOT NULL,
	priority TEXT,
	scope TEXT NOT NULL,
	repair_scope TEXT NOT NULL,
	blocking_for_current_action INTEGER NOT NULL,
	chapter INTEGER,
	scene TEXT,
	landing_chapter INTEGER,
	message TEXT NOT NULL,
	evidence TEXT,
	status TEXT NOT NULL,
	dedup_key TEXT NOT NULL,
	first_seen_at TEXT NOT NULL,
	last_seen_at TEXT NOT NULL,
	resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_review_issues_project ON review_issues(project_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_issues_dedup ON review_issues(project_id, dedup_key);

CREATE TABLE IF NOT EXISTS commits (
	commit_id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	change_set_id TEXT,
	actor TEXT NOT NULL,
	summary TEXT NOT NULL,
	affected_files_json TEXT NOT NULL,
	before_hashes_json TEXT NOT NULL,
	after_hashes_json TEXT NOT NULL,
	resolved_issue_count INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_commits_project ON commits(project_id, created_at);

CREATE TABLE IF NOT EXISTS checkpoints (
	checkpoint_id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	label TEXT,
	manifest_hashes_json TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commit_journals (
	journal_id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	change_set_id TEXT NOT NULL,
	state TEXT NOT NULL,
	files_json TEXT NOT NULL,
	db_actions_json TEXT NOT NULL,
	started_at TEXT NOT NULL,
	completed_at TEXT
);

CREATE TABLE IF NOT EXISTS story_nodes (
	node_id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	type TEXT NOT NULL,
	ref TEXT NOT NULL,
	label TEXT,
	chapter INTEGER,
	meta_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_story_nodes_project ON story_nodes(project_id, chapter);

CREATE TABLE IF NOT EXISTS story_edges (
	edge_id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	source_node_id TEXT NOT NULL,
	target_node_id TEXT NOT NULL,
	type TEXT NOT NULL,
	label TEXT
);
CREATE INDEX IF NOT EXISTS idx_story_edges_project ON story_edges(project_id);

CREATE TABLE IF NOT EXISTS artifacts (
	artifact_id TEXT PRIMARY KEY,
	project_id TEXT,
	task_id TEXT,
	kind TEXT NOT NULL,
	relative_path TEXT NOT NULL,
	summary TEXT,
	created_at TEXT NOT NULL
);
