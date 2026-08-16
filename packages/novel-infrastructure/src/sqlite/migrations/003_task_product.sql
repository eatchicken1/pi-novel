ALTER TABLE tasks ADD COLUMN progress_json TEXT;
ALTER TABLE tasks ADD COLUMN result_ref TEXT;
ALTER TABLE tasks ADD COLUMN started_at TEXT;
ALTER TABLE tasks ADD COLUMN completed_at TEXT;

CREATE TABLE IF NOT EXISTS task_events (
	event_id TEXT PRIMARY KEY,
	task_id TEXT NOT NULL,
	sequence INTEGER NOT NULL,
	type TEXT NOT NULL,
	payload_json TEXT,
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id, sequence);

CREATE TABLE IF NOT EXISTS agent_runs (
	agent_run_id TEXT PRIMARY KEY,
	task_id TEXT NOT NULL,
	model TEXT,
	intent TEXT NOT NULL,
	status TEXT NOT NULL,
	started_at TEXT,
	completed_at TEXT,
	usage_json TEXT,
	produced_artifacts_json TEXT NOT NULL
);
