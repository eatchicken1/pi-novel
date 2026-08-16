import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { applyProjectMigrations } from "./project-migrations.ts";

// ProjectDatabase 只负责：连接生命周期 + 迁移 + 基础写入。
// 业务访问通过 domain repository（changeset/commit/review/story-graph）共享 db 句柄，
// 避免巨型数据库类。
export class ProjectDatabase {
	readonly db: DatabaseSync;
	readonly path: string;

	constructor(databasePath: string) {
		mkdirSync(dirname(databasePath), { recursive: true });
		this.path = databasePath;
		this.db = new DatabaseSync(databasePath);
		applyProjectMigrations(this.db);
	}

	writeFoundation(input: {
		projectId: string;
		title: string;
		language: string;
		createdAt: string;
		candidateId: string;
		commitment: unknown;
		forgeSessionId: string;
		sourceArtifactId: string;
	}): void {
		this.db
			.prepare(
				"INSERT INTO project_metadata (project_id, title, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
			)
			.run(input.projectId, input.title, input.language, input.createdAt, input.createdAt);
		this.db
			.prepare(
				"INSERT INTO story_commitments (commitment_id, candidate_id, payload_json, committed_at) VALUES (?, ?, ?, ?)",
			)
			.run(input.sourceArtifactId, input.candidateId, JSON.stringify(input.commitment), input.createdAt);
		this.db
			.prepare(
				"INSERT INTO forge_provenance (provenance_id, forge_session_id, source_artifact_id, created_at) VALUES (?, ?, ?, ?)",
			)
			.run(input.sourceArtifactId, input.forgeSessionId, input.sourceArtifactId, input.createdAt);
	}

	close(): void {
		this.db.close();
	}
}
