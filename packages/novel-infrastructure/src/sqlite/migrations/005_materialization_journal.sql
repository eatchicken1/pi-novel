-- Materialization Journal：项目创建链（staging → rename → register）的可恢复记录。
-- 状态：PREPARING / FILES_READY / RENAMED / REGISTERED / COMPLETED / RECOVERY_REQUIRED
CREATE TABLE IF NOT EXISTS materialization_journal (
	forge_session_id TEXT PRIMARY KEY,
	status TEXT NOT NULL,
	project_id TEXT,
	target_folder TEXT NOT NULL,
	staging_path TEXT,
	attempts INTEGER NOT NULL DEFAULT 0,
	error_message TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
