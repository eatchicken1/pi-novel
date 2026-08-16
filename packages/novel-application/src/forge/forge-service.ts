import { randomUUID } from "node:crypto";
import {
	type CommitForgeInput,
	type CreateForgeSessionInput,
	type CritiqueDirectionInput,
	type DirectionCandidate,
	DirectionCandidateSchema,
	type ForgeArtifactsResponse,
	type ForgeSession,
	type ForgeTask,
	type GenerateDirectionsInput,
	type MaterializeForgeInput,
	nowIso,
	type SelectDirectionInput,
	type StoryDirectionComparison,
	StoryDirectionComparisonSchema,
	type UpdateForgeSessionInput,
} from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";
import type {
	ForgeArtifactPort,
	ForgePersistencePort,
	ProjectMaterializationPort,
	StoryExplorationPort,
} from "../ports.ts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";

export class ForgeService {
	private readonly workspace: WorkspaceService;
	private readonly exploration: StoryExplorationPort;
	private readonly artifactStoreFor: (workspaceRoot: string) => ForgeArtifactPort;
	private readonly materializer: ProjectMaterializationPort;

	constructor(input: {
		workspace: WorkspaceService;
		exploration: StoryExplorationPort;
		artifactStoreFor(workspaceRoot: string): ForgeArtifactPort;
		materializer: ProjectMaterializationPort;
	}) {
		this.workspace = input.workspace;
		this.exploration = input.exploration;
		this.artifactStoreFor = input.artifactStoreFor;
		this.materializer = input.materializer;
	}

	createSession(input: CreateForgeSessionInput): ForgeSession {
		const context = this.requireContext();
		const createdAt = nowIso();
		const forgeSessionId = randomUUID();
		const session: ForgeSession = {
			forgeSessionId,
			workspaceId: context.workspaceId,
			status: input.narrativeDNA ? "ready" : "draft",
			seed: input.seed.trim(),
			titleCandidate: input.titleCandidate ?? null,
			narrativeDNA: input.narrativeDNA ?? null,
			hardConstraints: input.hardConstraints ?? [],
			preferences: input.preferences ?? [],
			createdAt,
			updatedAt: createdAt,
			selectedCandidateId: null,
			committedAt: null,
			materializedProjectId: null,
			currentTaskId: null,
			runtimeRelativePath: `.pi-novel/sessions/${forgeSessionId}`,
			failureCode: null,
			failureMessage: null,
		};
		const repository = this.requireRepository();
		repository.createSession(session);
		return session;
	}

	getSession(sessionId: string): ForgeSession {
		const session = this.requireRepository().getSession(sessionId);
		if (!session) throw new ForgeError("FORGE_SESSION_NOT_FOUND", "Forge session not found", 404);
		return session;
	}

	updateSession(sessionId: string, input: UpdateForgeSessionInput): ForgeSession {
		const session = this.getSession(sessionId);
		if (session.status !== "draft" && session.status !== "ready" && session.status !== "failed") {
			throw new ForgeError("FORGE_SESSION_LOCKED", "This Forge session can no longer be edited", 409);
		}
		const next: ForgeSession = {
			...session,
			...(input.seed !== undefined ? { seed: input.seed.trim() } : {}),
			...(input.titleCandidate !== undefined ? { titleCandidate: input.titleCandidate.trim() } : {}),
			...(input.narrativeDNA !== undefined ? { narrativeDNA: input.narrativeDNA } : {}),
			...(input.hardConstraints !== undefined ? { hardConstraints: input.hardConstraints } : {}),
			...(input.preferences !== undefined ? { preferences: input.preferences } : {}),
			status: input.narrativeDNA !== undefined || session.narrativeDNA !== null ? "ready" : "draft",
			updatedAt: nowIso(),
			failureCode: null,
			failureMessage: null,
		};
		this.requireRepository().updateSession(next);
		return next;
	}

	startDirectionGeneration(sessionId: string, input: GenerateDirectionsInput): ForgeTask {
		return this.startGeneration(sessionId, input);
	}

	startRegeneration(sessionId: string, input: GenerateDirectionsInput): ForgeTask {
		return this.startGeneration(sessionId, input);
	}

	async getArtifacts(sessionId: string): Promise<ForgeArtifactsResponse> {
		const session = this.getSession(sessionId);
		const repository = this.requireRepository();
		const store = this.artifactStoreFor(this.requireContext().root);
		const directions = await store.readJson(session.forgeSessionId, "artifacts/directions.json");
		const candidates = isDirectionsDocument(directions) ? directions.candidates : [];
		const comparison = isDirectionsDocument(directions) ? directions.comparison : null;
		return {
			artifacts: repository.listArtifacts(sessionId),
			candidates,
			comparison,
			task: session.currentTaskId ? repository.getTask(session.currentTaskId) : null,
		};
	}

	async compare(sessionId: string): Promise<ForgeArtifactsResponse> {
		return this.getArtifacts(sessionId);
	}

	async critique(sessionId: string, input: CritiqueDirectionInput): Promise<ForgeArtifactsResponse> {
		const session = this.getSession(sessionId);
		if (session.status !== "awaiting_selection")
			throw new ForgeError("FORGE_DIRECTIONS_REQUIRED", "Generate directions before critique", 409);
		const artifacts = await this.getArtifacts(sessionId);
		const candidate = artifacts.candidates.find((entry) => entry.candidateId === input.candidateId);
		if (!candidate) throw new ForgeError("FORGE_CANDIDATE_NOT_FOUND", "Direction candidate not found", 404);
		const root = this.requireContext().root;
		const result = await this.exploration.critiqueDirection({
			workspaceRoot: root,
			modelId: input.modelId,
			seed: session.seed,
			candidate,
			instruction: input.instruction,
		});
		const artifactId = randomUUID();
		const relativePath = `artifacts/critique-${artifactId}.json`;
		await this.artifactStoreFor(root).writeJson(sessionId, relativePath, {
			artifactId,
			candidateId: input.candidateId,
			instruction: input.instruction,
			critique: result,
			createdAt: nowIso(),
		});
		this.requireRepository().addArtifact({
			artifactId,
			forgeSessionId: sessionId,
			kind: "critique",
			relativePath,
			candidateId: input.candidateId,
			summary: result.slice(0, 180),
			createdAt: nowIso(),
		});
		return this.getArtifacts(sessionId);
	}

	async select(sessionId: string, input: SelectDirectionInput): Promise<ForgeSession> {
		const session = this.getSession(sessionId);
		if (session.status !== "awaiting_selection")
			throw new ForgeError("FORGE_SELECTION_NOT_ALLOWED", "Select a candidate after generation completes", 409);
		const artifacts = await this.getArtifacts(sessionId);
		if (!artifacts.candidates.some((candidate) => candidate.candidateId === input.candidateId))
			throw new ForgeError("FORGE_CANDIDATE_NOT_FOUND", "Direction candidate not found", 404);
		const selectedAt = nowIso();
		const candidates = artifacts.candidates.map((candidate) =>
			candidate.candidateId === input.candidateId
				? { ...candidate, status: "selected" as const, selectedAt }
				: { ...candidate, status: "proposed" as const },
		);
		await this.artifactStoreFor(this.requireContext().root).writeJson(sessionId, "artifacts/directions.json", {
			candidates,
			comparison: artifacts.comparison,
			selectedCandidateId: input.candidateId,
			updatedAt: selectedAt,
		});
		const next = { ...session, selectedCandidateId: input.candidateId, updatedAt: selectedAt };
		this.requireRepository().updateSession(next);
		return next;
	}

	async commit(sessionId: string, input: CommitForgeInput): Promise<ForgeSession> {
		const session = this.getSession(sessionId);
		if (session.status !== "awaiting_selection" || !session.selectedCandidateId)
			throw new ForgeError("FORGE_COMMIT_NOT_ALLOWED", "Select a direction before author commit", 409);
		const artifacts = await this.getArtifacts(sessionId);
		const candidate = artifacts.candidates.find((entry) => entry.candidateId === session.selectedCandidateId);
		if (!candidate) throw new ForgeError("FORGE_CANDIDATE_NOT_FOUND", "Selected candidate is missing", 409);
		const committedAt = nowIso();
		const artifactId = randomUUID();
		const relativePath = "artifacts/story-commitment.json";
		await this.artifactStoreFor(this.requireContext().root).writeJson(sessionId, relativePath, {
			artifactId,
			candidate,
			authorNote: input.authorNote,
			confirmation: "USER_CONFIRMED",
			committedAt,
		});
		this.requireRepository().addArtifact({
			artifactId,
			forgeSessionId: sessionId,
			kind: "commitment",
			relativePath,
			candidateId: candidate.candidateId,
			summary: input.authorNote,
			createdAt: committedAt,
		});
		const next = { ...session, status: "committed" as const, committedAt, updatedAt: committedAt };
		this.requireRepository().updateSession(next);
		return next;
	}

	async materialize(sessionId: string, input: MaterializeForgeInput): Promise<ForgeSession> {
		const session = this.getSession(sessionId);
		if (session.status === "materialized") return session;
		if (session.status !== "committed" || !session.selectedCandidateId)
			throw new ForgeError(
				"FORGE_MATERIALIZE_NOT_ALLOWED",
				"Commit a selected direction before materialization",
				409,
			);
		const artifacts = await this.getArtifacts(sessionId);
		const candidate = artifacts.candidates.find((entry) => entry.candidateId === session.selectedCandidateId);
		if (!candidate) throw new ForgeError("FORGE_CANDIDATE_NOT_FOUND", "Selected candidate is missing", 409);
		const started = {
			...session,
			status: "materializing" as const,
			updatedAt: nowIso(),
			failureCode: null,
			failureMessage: null,
		};
		this.requireRepository().updateSession(started);
		try {
			const result = await this.materializer.materialize({
				workspaceRoot: this.requireContext().root,
				session: started,
				candidate,
				request: input,
			});
			await this.workspace.rescan();
			const completedAt = nowIso();
			const artifactId = randomUUID();
			const relativePath = "artifacts/materialization.json";
			await this.artifactStoreFor(this.requireContext().root).writeJson(sessionId, relativePath, {
				artifactId,
				projectId: result.projectId,
				projectRoot: result.projectRoot,
				createdAt: completedAt,
			});
			this.requireRepository().addArtifact({
				artifactId,
				forgeSessionId: sessionId,
				kind: "materialization",
				relativePath,
				summary: result.projectId,
				createdAt: completedAt,
			});
			const materialized = {
				...started,
				status: "materialized" as const,
				materializedProjectId: result.projectId,
				updatedAt: completedAt,
			};
			this.requireRepository().updateSession(materialized);
			return materialized;
		} catch (error) {
			const failed = {
				...started,
				status: "failed" as const,
				failureCode: errorCode(error),
				failureMessage: errorMessage(error),
				updatedAt: nowIso(),
			};
			this.requireRepository().updateSession(failed);
			throw error;
		}
	}

	getTask(taskId: string): ForgeTask {
		const task = this.requireRepository().getTask(taskId);
		if (!task) throw new ForgeError("TASK_NOT_FOUND", "Forge task not found", 404);
		return task;
	}

	private startGeneration(sessionId: string, input: GenerateDirectionsInput): ForgeTask {
		const session = this.getSession(sessionId);
		if (!["draft", "ready", "failed", "awaiting_selection"].includes(session.status))
			throw new ForgeError("FORGE_GENERATION_NOT_ALLOWED", "This Forge session cannot generate directions now", 409);
		if (!session.narrativeDNA)
			throw new ForgeError("FORGE_DNA_REQUIRED", "Narrative DNA must be defined before generation", 400);
		const createdAt = nowIso();
		const task: ForgeTask = {
			taskId: randomUUID(),
			forgeSessionId: sessionId,
			type: "forge.generate_directions",
			status: "queued",
			progressPhase: "queued",
			createdAt,
			updatedAt: createdAt,
			errorMessage: null,
		};
		const next = {
			...session,
			status: "generating" as const,
			currentTaskId: task.taskId,
			selectedCandidateId: null,
			failureCode: null,
			failureMessage: null,
			updatedAt: createdAt,
		};
		this.requireRepository().createTask(task);
		this.requireRepository().updateSession(next);
		void this.runGeneration(next, task, input);
		return task;
	}

	private async runGeneration(session: ForgeSession, task: ForgeTask, input: GenerateDirectionsInput): Promise<void> {
		const repository = this.requireRepository();
		const running = { ...task, status: "running" as const, progressPhase: "generating", updatedAt: nowIso() };
		repository.updateTask(running);
		try {
			const previous = (await this.getArtifacts(session.forgeSessionId)).candidates;
			const result = await this.exploration.generateDirections({
				workspaceRoot: this.requireContext().root,
				forgeSessionId: session.forgeSessionId,
				seed: session.seed,
				narrativeDNA: session.narrativeDNA as NonNullable<ForgeSession["narrativeDNA"]>,
				hardConstraints: session.hardConstraints,
				preferences: session.preferences,
				modelId: input.modelId,
				count: input.count ?? 3,
				previousCandidates: previous,
			});
			if (result.candidates.length < 3)
				throw new ForgeError(
					"FORGE_TOO_FEW_CANDIDATES",
					"Forge must return at least three direction candidates",
					422,
				);
			const createdAt = nowIso();
			const directionsPath = "artifacts/directions.json";
			await this.artifactStoreFor(this.requireContext().root).writeJson(session.forgeSessionId, directionsPath, {
				candidates: result.candidates,
				comparison: result.comparison,
				updatedAt: createdAt,
			});
			repository.addArtifact({
				artifactId: randomUUID(),
				forgeSessionId: session.forgeSessionId,
				kind: "directions",
				relativePath: directionsPath,
				summary: `${result.candidates.length} candidates`,
				createdAt,
			});
			repository.addArtifact({
				artifactId: randomUUID(),
				forgeSessionId: session.forgeSessionId,
				kind: "comparison",
				relativePath: directionsPath,
				summary: "Deterministic comparison",
				createdAt,
			});
			repository.updateTask({
				...running,
				status: "succeeded",
				progressPhase: "awaiting_selection",
				updatedAt: createdAt,
			});
			repository.updateSession({
				...session,
				status: "awaiting_selection",
				currentTaskId: task.taskId,
				updatedAt: createdAt,
			});
		} catch (error) {
			const failedAt = nowIso();
			repository.updateTask({
				...running,
				status: "failed",
				progressPhase: "failed",
				updatedAt: failedAt,
				errorMessage: errorMessage(error),
			});
			repository.updateSession({
				...session,
				status: "failed",
				failureCode: errorCode(error),
				failureMessage: errorMessage(error),
				updatedAt: failedAt,
			});
		}
	}

	private requireContext(): { root: string; workspaceId: string } {
		const paths = this.workspace.getWorkspacePaths();
		const manifest = this.workspace.getWorkspaceManifest();
		if (!paths || !manifest) throw new ForgeError("WORKSPACE_NOT_OPEN", "Open a workspace before using Forge", 409);
		return { root: paths.root, workspaceId: manifest.workspaceId };
	}

	private requireRepository(): ForgePersistencePort {
		const repository = this.workspace.getForgeRepository();
		if (!repository) throw new ForgeError("WORKSPACE_NOT_OPEN", "Open a workspace before using Forge", 409);
		return repository;
	}
}

export class ForgeError extends Error {
	readonly code: string;
	readonly statusCode: number;

	constructor(code: string, message: string, statusCode: number) {
		super(message);
		this.name = "ForgeError";
		this.code = code;
		this.statusCode = statusCode;
	}
}

function isDirectionsDocument(
	value: unknown,
): value is { candidates: DirectionCandidate[]; comparison: StoryDirectionComparison | null } {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		Array.isArray(record.candidates) &&
		record.candidates.every((candidate) => Check(DirectionCandidateSchema, candidate)) &&
		(record.comparison === null || Check(StoryDirectionComparisonSchema, record.comparison))
	);
}

function errorCode(error: unknown): string {
	if (error instanceof ForgeError) return error.code;
	if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string")
		return error.code;
	return "FORGE_OPERATION_FAILED";
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Forge operation failed";
}
