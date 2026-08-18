import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AgentRuntimeProfile } from "@earendil-works/pi-novel-contracts";
import { applyWorkspaceMigrations } from "./workspace-migrations.ts";

export interface RuntimeProfileRow {
	agent_id: string;
	model_id: string;
	thinking_level: string;
	updated_at: string;
}

// AgentRuntimeProfile 的 workspace.sqlite 存储。profile 由 agentId 唯一标识，
// 每个 agent（forge.explorer / forge.comparator / forge.critic ...）独立保存
// modelId + thinkingLevel。
export class RuntimeProfileRepository {
	private readonly db: DatabaseSync;

	constructor(databasePath: string) {
		mkdirSync(dirname(databasePath), { recursive: true });
		this.db = new DatabaseSync(databasePath);
		applyWorkspaceMigrations(this.db);
	}

	close(): void {
		this.db.close();
	}

	listProfiles(): AgentRuntimeProfile[] {
		const rows = this.db
			.prepare("SELECT * FROM agent_runtime_profiles ORDER BY agent_id")
			.all() as unknown as RuntimeProfileRow[];
		return rows.map(toProfile);
	}

	getProfile(agentId: string): AgentRuntimeProfile | null {
		const row = this.db.prepare("SELECT * FROM agent_runtime_profiles WHERE agent_id = ?").get(agentId) as
			| RuntimeProfileRow
			| undefined;
		return row ? toProfile(row) : null;
	}

	setProfile(profile: AgentRuntimeProfile): void {
		this.db
			.prepare(
				"INSERT INTO agent_runtime_profiles (agent_id, model_id, thinking_level, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(agent_id) DO UPDATE SET model_id = excluded.model_id, thinking_level = excluded.thinking_level, updated_at = excluded.updated_at",
			)
			.run(profile.agentId, profile.modelId, profile.thinkingLevel, profile.updatedAt);
	}
}

function toProfile(row: RuntimeProfileRow): AgentRuntimeProfile {
	return {
		agentId: row.agent_id as AgentRuntimeProfile["agentId"],
		modelId: row.model_id,
		thinkingLevel: row.thinking_level as AgentRuntimeProfile["thinkingLevel"],
		updatedAt: row.updated_at,
	};
}
