import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { MaterializationJournalEntry, MaterializationJournalPort } from "@earendil-works/pi-novel-application";
import type { DirectionCandidate, ForgeSession, MaterializeForgeInput } from "@earendil-works/pi-novel-contracts";
import { resolveWorkspacePath } from "../filesystem/workspace-path.ts";
import { ProjectDatabase } from "../sqlite/project-database.ts";

export class ProjectMaterializer {
	private readonly journal: MaterializationJournalPort | null;

	constructor(journal?: MaterializationJournalPort) {
		this.journal = journal ?? null;
	}

	async materialize(input: {
		workspaceRoot: string;
		session: ForgeSession;
		candidate: DirectionCandidate;
		request: MaterializeForgeInput;
		journal?: MaterializationJournalPort;
	}): Promise<{ projectId: string; projectRoot: string }> {
		const folderName = validateFolderName(input.request.folderName);
		const title = input.request.title.trim();
		if (title.length === 0)
			throw new ProjectMaterializationError("INVALID_PROJECT_METADATA", "Project title is required");
		const target = resolveWorkspacePath(input.workspaceRoot, folderName);
		const createdAt = new Date().toISOString();
		const sessionId = input.session.forgeSessionId;
		const journal = input.journal ?? this.journal;
		const existing = journal?.get(sessionId) ?? null;

		// Idempotency: a registered/completed project already exists.
		if (existing && (existing.status === "REGISTERED" || existing.status === "COMPLETED") && existing.projectId) {
			return {
				projectId: existing.projectId,
				projectRoot: resolveWorkspacePath(input.workspaceRoot, existing.targetFolder),
			};
		}

		// Recovery: a previous attempt of THIS session renamed the staging
		// folder into place but never registered it. Adopt the on-disk project
		// instead of creating a second novel. Without a journal entry there is
		// no ownership evidence, so an existing folder stays an error.
		const adoptedProjectId = await readProjectId(target);
		if (
			adoptedProjectId &&
			existing &&
			existing.targetFolder === folderName &&
			adoptedProjectId === existing.projectId
		) {
			journal?.update(
				entry(sessionId, existing, {
					status: "REGISTERED",
					projectId: adoptedProjectId,
					targetFolder: folderName,
					stagingPath: null,
					errorMessage: null,
					updatedAt: new Date().toISOString(),
				}),
			);
			return { projectId: adoptedProjectId, projectRoot: target };
		}
		if (await exists(target))
			throw new ProjectMaterializationError("PROJECT_FOLDER_EXISTS", `Project folder already exists: ${folderName}`);

		const staging = resolveWorkspacePath(input.workspaceRoot, ".pi-novel", "temp", `project-${randomUUID()}`);
		const projectId = `nov-${randomUUID().replaceAll("-", "")}`;
		const language = input.request.language ?? "zh-CN";
		const attempts = (existing?.attempts ?? 0) + 1;
		journal?.update(
			entry(sessionId, existing, {
				status: "PREPARING",
				projectId,
				targetFolder: folderName,
				stagingPath: staging,
				attempts,
				errorMessage: null,
				updatedAt: createdAt,
			}),
		);
		try {
			await mkdir(staging, { recursive: true });
			for (const directory of ["manuscript", "notes", "assets", "exports", ".pi-novel", ".pi-novel/projections"])
				await mkdir(join(staging, directory), { recursive: true });
			await writeFile(
				join(staging, "novel.yaml"),
				`schema_version: 1\nproject_id: ${projectId}\ntitle: ${yamlString(title)}\nlanguage: ${yamlString(language)}\ncreated_at: ${createdAt}\nupdated_at: ${createdAt}\n`,
				"utf8",
			);
			const commitment = {
				projectId,
				title,
				candidate: input.candidate,
				forgeSessionId: input.session.forgeSessionId,
				committedAt: input.session.committedAt,
			};
			const database = new ProjectDatabase(join(staging, ".pi-novel", "project.sqlite"));
			try {
				database.writeFoundation({
					projectId,
					title,
					language,
					createdAt,
					candidateId: input.candidate.candidateId,
					commitment,
					forgeSessionId: input.session.forgeSessionId,
					sourceArtifactId: input.candidate.artifactId,
				});
			} finally {
				database.close();
			}
			// Story Commitment 的权威源是 project.sqlite；此 JSON 只是可重建投影。
			await writeFile(
				join(staging, ".pi-novel", "projections", "story-commitment.json"),
				`${JSON.stringify(
					{
						...commitment,
						derived: true,
						rebuildable: true,
						source: "project.sqlite::story_commitments",
						note: "DERIVED projection, rebuildable from project.sqlite. Not an authority.",
					},
					null,
					2,
				)}\n`,
				"utf8",
			);
			journal?.update(
				entry(sessionId, existing, {
					status: "FILES_READY",
					projectId,
					targetFolder: folderName,
					stagingPath: staging,
					attempts,
					errorMessage: null,
					updatedAt: new Date().toISOString(),
				}),
			);
			await mkdir(join(target, ".."), { recursive: true });
			await rename(staging, target);
		} catch (error) {
			journal?.update(
				entry(sessionId, existing, {
					status: "RECOVERY_REQUIRED",
					projectId,
					targetFolder: folderName,
					stagingPath: staging,
					attempts,
					errorMessage: error instanceof Error ? error.message : "Materialization failed",
					updatedAt: new Date().toISOString(),
				}),
			);
			if (await exists(target))
				throw new ProjectMaterializationError(
					"PROJECT_FOLDER_EXISTS",
					`Project folder already exists: ${folderName}`,
					error,
				);
			throw error;
		}
		journal?.update(
			entry(sessionId, existing, {
				status: "RENAMED",
				projectId,
				targetFolder: folderName,
				stagingPath: null,
				attempts,
				errorMessage: null,
				updatedAt: new Date().toISOString(),
			}),
		);
		return { projectId, projectRoot: target };
	}
}

function entry(
	sessionId: string,
	previous: MaterializationJournalEntry | null,
	patch: Partial<MaterializationJournalEntry> & { status: MaterializationJournalEntry["status"] },
): MaterializationJournalEntry {
	return {
		forgeSessionId: sessionId,
		status: patch.status,
		projectId: patch.projectId ?? previous?.projectId ?? null,
		targetFolder: patch.targetFolder ?? previous?.targetFolder ?? "",
		stagingPath: patch.stagingPath !== undefined ? patch.stagingPath : (previous?.stagingPath ?? null),
		attempts: patch.attempts ?? previous?.attempts ?? 1,
		errorMessage: patch.errorMessage !== undefined ? patch.errorMessage : (previous?.errorMessage ?? null),
		createdAt: previous?.createdAt ?? new Date().toISOString(),
		updatedAt: patch.updatedAt ?? new Date().toISOString(),
	};
}

async function readProjectId(target: string): Promise<string | null> {
	try {
		const yaml = await readFile(join(target, "novel.yaml"), "utf8");
		const match = yaml.match(/^project_id:\s*(\S+)\s*$/mu);
		if (!match) return null;
		const projectId = match[1];
		await access(join(target, ".pi-novel", "project.sqlite"));
		return projectId;
	} catch {
		return null;
	}
}

export class ProjectMaterializationError extends Error {
	readonly code: "PROJECT_FOLDER_EXISTS" | "INVALID_PROJECT_FOLDER" | "INVALID_PROJECT_METADATA";

	constructor(code: ProjectMaterializationError["code"], message: string, cause?: unknown) {
		super(message, cause instanceof Error ? { cause } : undefined);
		this.name = "ProjectMaterializationError";
		this.code = code;
	}
}

function validateFolderName(value: string): string {
	const name = value.trim();
	if (
		!name ||
		name === "." ||
		name === ".." ||
		/[<>:"/\\|?*]/u.test(name) ||
		/[. ]$/u.test(name) ||
		/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(name)
	)
		throw new ProjectMaterializationError("INVALID_PROJECT_FOLDER", "Project folder name is not safe");
	return name;
}

async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

function yamlString(value: string): string {
	return JSON.stringify(value);
}
