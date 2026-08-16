import { randomUUID } from "node:crypto";
import { access, mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DirectionCandidate, ForgeSession, MaterializeForgeInput } from "@earendil-works/pi-novel-contracts";
import { resolveWorkspacePath } from "../filesystem/workspace-path.ts";
import { ProjectDatabase } from "../sqlite/project-database.ts";

export class ProjectMaterializer {
	async materialize(input: {
		workspaceRoot: string;
		session: ForgeSession;
		candidate: DirectionCandidate;
		request: MaterializeForgeInput;
	}): Promise<{ projectId: string; projectRoot: string }> {
		const folderName = validateFolderName(input.request.folderName);
		const target = resolveWorkspacePath(input.workspaceRoot, folderName);
		if (await exists(target))
			throw new ProjectMaterializationError("PROJECT_FOLDER_EXISTS", `Project folder already exists: ${folderName}`);
		const staging = resolveWorkspacePath(input.workspaceRoot, ".pi-novel", "temp", `project-${randomUUID()}`);
		const createdAt = new Date().toISOString();
		const projectId = `nov-${randomUUID().replaceAll("-", "")}`;
		const language = input.request.language ?? "zh-CN";
		await mkdir(staging, { recursive: true });
		for (const directory of ["manuscript", "notes", "assets", "exports", ".pi-novel"])
			await mkdir(join(staging, directory), { recursive: true });
		await writeFile(
			join(staging, "novel.yaml"),
			`schema_version: 1\nproject_id: ${projectId}\ntitle: ${yamlString(input.request.title)}\nlanguage: ${language}\ncreated_at: ${createdAt}\nupdated_at: ${createdAt}\n`,
			"utf8",
		);
		const commitment = {
			projectId,
			title: input.request.title,
			candidate: input.candidate,
			forgeSessionId: input.session.forgeSessionId,
			committedAt: input.session.committedAt,
		};
		const database = new ProjectDatabase(join(staging, ".pi-novel", "project.sqlite"));
		try {
			database.writeFoundation({
				projectId,
				title: input.request.title,
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
		await writeFile(
			join(staging, "notes", "story-commitment.json"),
			`${JSON.stringify(commitment, null, 2)}\n`,
			"utf8",
		);
		await mkdir(join(target, ".."), { recursive: true });
		try {
			await rename(staging, target);
		} catch (error) {
			if (await exists(target))
				throw new ProjectMaterializationError(
					"PROJECT_FOLDER_EXISTS",
					`Project folder already exists: ${folderName}`,
					error,
				);
			throw error;
		}
		return { projectId, projectRoot: target };
	}
}

export class ProjectMaterializationError extends Error {
	readonly code: "PROJECT_FOLDER_EXISTS" | "INVALID_PROJECT_FOLDER";

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
