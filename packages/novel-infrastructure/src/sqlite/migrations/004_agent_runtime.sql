-- Agent Runtime Profiles（workspace.sqlite 权威存储；不再使用 localStorage.selectedModel）。
CREATE TABLE IF NOT EXISTS agent_runtime_profiles (
	agent_id TEXT PRIMARY KEY,
	model_id TEXT NOT NULL,
	thinking_level TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
