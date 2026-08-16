import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
	ProjectDatabaseHandle,
	ProjectDatabaseRegistryPort,
} from "@earendil-works/pi-novel-application";
import { ChangeSetRepository } from "./changeset-repository.ts";
import { CommitRepository } from "./commit-repository.ts";
import { ProjectDatabase } from "./project-database.ts";
import { ReviewRepository } from "./review-repository.ts";
import { StoryGraphRepository } from "./story-graph-repository.ts";

const MAX_OPEN_DATABASES = 8;

interface OpenEntry {
	projectId: string;
	database: ProjectDatabase;
	lastUsed: number;
}

// per-project DB：lazy open + 有界缓存（规格 53 节：不允许 Library 打开 100 个项目就持有 100 个句柄）。
export class ProjectDatabaseRegistry implements ProjectDatabaseRegistryPort {
	private readonly entries = new Map<string, OpenEntry>();

	open(projectId: string, projectRoot: string): ProjectDatabaseHandle {
		const existing = this.entries.get(projectId);
		if (existing !== undefined) {
			existing.lastUsed = Date.now();
			return this.handleFor(existing.database);
		}
		if (this.entries.size >= MAX_OPEN_DATABASES) {
			const oldest = [...this.entries.values()].sort((left, right) => left.lastUsed - right.lastUsed)[0];
			if (oldest !== undefined) this.close(oldest.projectId);
		}
		const databasePath = join(projectRoot, ".pi-novel", "project.sqlite");
		mkdirSync(dirname(databasePath), { recursive: true });
		const database = new ProjectDatabase(databasePath);
		this.entries.set(projectId, { projectId, database, lastUsed: Date.now() });
		return this.handleFor(database);
	}

	private handleFor(database: ProjectDatabase): ProjectDatabaseHandle {
		return {
			changesets: new ChangeSetRepository(database.db),
			commits: new CommitRepository(database.db),
			review: new ReviewRepository(database.db),
			graph: new StoryGraphRepository(database.db),
		};
	}

	close(projectId: string): void {
		const entry = this.entries.get(projectId);
		if (entry === undefined) return;
		entry.database.close();
		this.entries.delete(projectId);
	}

	closeAll(): void {
		for (const entry of this.entries.values()) entry.database.close();
		this.entries.clear();
	}
}
