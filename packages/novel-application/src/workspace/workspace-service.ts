import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import {
	nowIso,
	type ProjectRecord,
	type ProjectScanWarning,
	type WorkspaceManifest,
	type WorkspaceOverview,
	type WorkspaceSummary,
} from "@earendil-works/pi-novel-contracts";
import { createWorkspaceManifest, sortProjects, touchWorkspaceManifest } from "@earendil-works/pi-novel-domain";
import type {
	WorkspaceFileSystemPort,
	WorkspacePathSet,
	WorkspaceRepository,
	WorkspaceServiceDependencies,
} from "../ports.ts";

export class WorkspaceService {
	private files: WorkspaceFileSystemPort | null = null;
	private database: WorkspaceRepository | null = null;
	private manifest: WorkspaceManifest | null = null;
	private warnings: ProjectScanWarning[] = [];
	private readonly dependencies: WorkspaceServiceDependencies;

	constructor(dependencies: WorkspaceServiceDependencies) {
		this.dependencies = dependencies;
	}

	async initialize(rootPath: string): Promise<WorkspaceOverview> {
		const trimmedRoot = rootPath.trim();
		if (trimmedRoot.length === 0) throw new Error("Workspace path is required");
		const normalizedRoot = resolve(trimmedRoot);
		this.close();
		const files = this.dependencies.createFileSystem(normalizedRoot);
		await files.ensureWorkspaceDirectory();
		const previous = await files.readManifest();
		const manifest = previous ?? createWorkspaceManifest(randomUUID(), normalizedRoot);
		const database = this.dependencies.createRepository(files.paths.database);
		this.files = files;
		this.database = database;
		this.manifest = manifest;
		this.warnings = [];
		await files.writeManifest(manifest);
		return this.rescanLoadedWorkspace();
	}

	async open(rootPath: string): Promise<WorkspaceOverview | null> {
		const trimmedRoot = rootPath.trim();
		if (trimmedRoot.length === 0) return null;
		const files = this.dependencies.createFileSystem(resolve(trimmedRoot));
		const manifest = await files.readManifest();
		if (!manifest) return null;
		this.close();
		this.files = files;
		this.database = this.dependencies.createRepository(files.paths.database);
		this.manifest = manifest;
		this.warnings = [];
		return this.rescanLoadedWorkspace();
	}

	async getOverview(): Promise<WorkspaceOverview | null> {
		if (!this.files || !this.database || !this.manifest) return null;
		return this.buildOverview(
			this.database.listProjects(),
			this.database.readWorkspace()?.lastScanAt ?? null,
			this.warnings,
		);
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

	getWorkspacePaths(): WorkspacePathSet | null {
		return this.files?.paths ?? null;
	}

	private async rescanLoadedWorkspace(): Promise<WorkspaceOverview> {
		if (!this.files || !this.database || !this.manifest) throw new Error("Workspace is not open");
		const scanResult = await this.dependencies.scanner.scan(this.files.paths.root);
		const projects = sortProjects(scanResult.projects);
		const scannedAt = nowIso();
		const manifest = touchWorkspaceManifest(this.manifest, scannedAt);
		this.manifest = manifest;
		this.warnings = scanResult.warnings;
		this.database.replaceProjects(projects);
		this.database.upsertWorkspace(manifest, scannedAt);
		await this.files.writeManifest(manifest);
		return this.buildOverview(projects, scannedAt, scanResult.warnings);
	}

	private buildOverview(
		projects: ProjectRecord[],
		lastScanAt: string | null,
		warnings: ProjectScanWarning[],
	): WorkspaceOverview {
		if (!this.manifest) throw new Error("Workspace is not open");
		const summary: WorkspaceSummary = {
			projectCount: projects.length,
			nativeProjectCount: projects.filter((project) => project.kind === "native").length,
			legacyProjectCount: projects.filter((project) => project.kind === "legacy").length,
			wordCount: projects.reduce((total, project) => total + project.wordCount, 0),
			lastScanAt,
		};
		return { manifest: this.manifest, projects, summary, warnings };
	}
}
