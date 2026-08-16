import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import {
	nowIso,
	type ProjectRecord,
	type WorkspaceManifest,
	type WorkspaceOverview,
	type WorkspaceSummary,
} from "@earendil-works/pi-novel-contracts";
import { createWorkspaceManifest, sortProjects, touchWorkspaceManifest } from "@earendil-works/pi-novel-domain";
import {
	scanProjects,
	WorkspaceDatabase,
	WorkspaceFiles,
	type WorkspacePaths,
} from "@earendil-works/pi-novel-infrastructure";

export class WorkspaceService {
	private files: WorkspaceFiles | null = null;
	private database: WorkspaceDatabase | null = null;
	private manifest: WorkspaceManifest | null = null;

	async initialize(rootPath: string): Promise<WorkspaceOverview> {
		const trimmedRoot = rootPath.trim();
		if (trimmedRoot.length === 0) throw new Error("Workspace path is required");
		const normalizedRoot = resolve(trimmedRoot);
		this.close();
		const files = new WorkspaceFiles(normalizedRoot);
		await files.ensureWorkspaceDirectory();
		const previous = await files.readManifest();
		const manifest = previous ?? createWorkspaceManifest(randomUUID(), normalizedRoot);
		const database = new WorkspaceDatabase(files.paths.database);
		this.files = files;
		this.database = database;
		this.manifest = manifest;
		await files.writeManifest(manifest);
		return this.rescanLoadedWorkspace();
	}

	async open(rootPath: string): Promise<WorkspaceOverview | null> {
		const trimmedRoot = rootPath.trim();
		if (trimmedRoot.length === 0) return null;
		const files = new WorkspaceFiles(resolve(trimmedRoot));
		const manifest = await files.readManifest();
		if (!manifest) return null;
		this.close();
		this.files = files;
		this.database = new WorkspaceDatabase(files.paths.database);
		this.manifest = manifest;
		return this.rescanLoadedWorkspace();
	}

	async getOverview(): Promise<WorkspaceOverview | null> {
		if (!this.files || !this.database || !this.manifest) return null;
		return this.buildOverview(this.database.listProjects(), this.database.readWorkspace()?.lastScanAt ?? null);
	}

	async rescan(): Promise<WorkspaceOverview> {
		return this.rescanLoadedWorkspace();
	}

	close(): void {
		this.database?.close();
		this.database = null;
		this.files = null;
		this.manifest = null;
	}

	getWorkspacePaths(): WorkspacePaths | null {
		return this.files?.paths ?? null;
	}

	private async rescanLoadedWorkspace(): Promise<WorkspaceOverview> {
		if (!this.files || !this.database || !this.manifest) throw new Error("Workspace is not open");
		const projects = sortProjects(await scanProjects(this.files.paths.root));
		const scannedAt = nowIso();
		const manifest = touchWorkspaceManifest(this.manifest, scannedAt);
		this.manifest = manifest;
		this.database.replaceProjects(projects);
		this.database.upsertWorkspace(manifest, scannedAt);
		await this.files.writeManifest(manifest);
		return this.buildOverview(projects, scannedAt);
	}

	private buildOverview(projects: ProjectRecord[], lastScanAt: string | null): WorkspaceOverview {
		if (!this.manifest) throw new Error("Workspace is not open");
		const summary: WorkspaceSummary = {
			projectCount: projects.length,
			nativeProjectCount: projects.filter((project) => project.kind === "native").length,
			legacyProjectCount: projects.filter((project) => project.kind === "legacy").length,
			wordCount: projects.reduce((total, project) => total + project.wordCount, 0),
			lastScanAt,
		};
		return { manifest: this.manifest, projects, summary };
	}
}
