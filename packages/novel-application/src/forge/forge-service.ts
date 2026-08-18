import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import {
	type CommitForgeInput,
	type CreateForgeSessionInput,
	type CritiqueDirectionInput,
	type DirectionCandidate,
	DirectionCandidateSchema,
	type ForgeArtifactsResponse,
	type ForgeGenerationSummary,
	type ForgeSession,
	type ForgeTask,
	type GenerateDirectionsInput,
	type MaterializeForgeInput,
	nowIso,
	type RuntimeInvocation,
	type SelectDirectionInput,
	type StoryDirectionComparison,
	StoryDirectionComparisonSchema,
	type TaskEvent,
	type UpdateForgeSessionInput,
} from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";
import type {
	ForgeArtifactPort,
	ForgePersistencePort,
	MaterializationJournalPort,
	ProjectMaterializationPort,
	StoryExplorationPort,
} from "../ports.ts";
import type { AgentRuntimeService } from "../runtime/agent-runtime-service.ts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";

const MAX_GENERATION_ATTEMPTS = 2;
const MIN_CANDIDATES = 3;

export class ForgeService {
	private readonly workspace: WorkspaceService;
	private readonly exploration: StoryExplorationPort;
	private readonly artifactStoreFor: (workspaceRoot: string) => ForgeArtifactPort;
	private readonly materializer: ProjectMaterializationPort;
	private readonly runtime: AgentRuntimeService;

	constructor(input: {
		workspace: WorkspaceService;
		exploration: StoryExplorationPort;
		artifactStoreFor(workspaceRoot: string): ForgeArtifactPort;
		materializer: ProjectMaterializationPort;
		runtime: AgentRuntimeService;
	}) {
		this.workspace = input.workspace;
		this.exploration = input.exploration;
		this.artifactStoreFor = input.artifactStoreFor;
		this.materializer = input.materializer;
		this.runtime = input.runtime;
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
		this.requireRepository().createSession(session);
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

	async startDirectionGeneration(sessionId: string, input: GenerateDirectionsInput): Promise<ForgeTask> {
		return this.startGeneration(sessionId, input);
	}

	async startRegeneration(sessionId: string, input: GenerateDirectionsInput): Promise<ForgeTask> {
		return this.startGeneration(sessionId, input);
	}

	async getArtifacts(sessionId: string): Promise<ForgeArtifactsResponse> {
		const session = this.getSession(sessionId);
		const repository = this.requireRepository();
		const store = this.artifactStoreFor(this.requireContext().root);
		const generations = this.listGenerations(repository.listArtifacts(sessionId));
		const latest = generations.at(-1);
		let candidates: DirectionCandidate[] = [];
		let comparison: StoryDirectionComparison | null = null;
		if (latest) {
			const document = await store.readJson(
				sessionId,
				`artifacts/generations/${generationFolder(latest.generation)}/generation.json`,
			);
			const raw = readCandidates(document);
			candidates = raw.map((candidate) => {
				const status =
					candidate.candidateId === session.selectedCandidateId
						? session.committedAt !== null
							? "committed"
							: "selected"
						: "proposed";
				return {
					...candidate,
					status,
					...(status !== "proposed" ? { selectedAt: session.committedAt ?? candidate.selectedAt } : {}),
				};
			});
			const comparisonDocument = await store.readJson(
				sessionId,
				`artifacts/generations/${generationFolder(latest.generation)}/comparison.json`,
			);
			if (comparisonDocument && typeof comparisonDocument === "object" && "comparison" in comparisonDocument) {
				const storedComparison = (comparisonDocument as { comparison: unknown }).comparison;
				if (!Check(StoryDirectionComparisonSchema, storedComparison)) {
					throw new ForgeError("FORGE_ARTIFACT_INVALID", "Stored Forge comparison artifact is invalid", 422);
				}
				comparison = storedComparison;
			}
		}
		return {
			artifacts: repository.listArtifacts(sessionId),
			candidates,
			generations,
			comparison,
			task: session.currentTaskId ? repository.getTask(session.currentTaskId) : null,
		};
	}

	/** Real Forge Comparator run, resolved through the forge.comparator profile. */
	async startComparison(sessionId: string): Promise<ForgeTask> {
		const session = this.getSession(sessionId);
		if (session.status !== "awaiting_selection")
			throw new ForgeError("FORGE_COMPARE_NOT_ALLOWED", "Generate directions before comparison", 409);
		const artifacts = await this.getArtifacts(sessionId);
		if (artifacts.candidates.length < MIN_CANDIDATES)
			throw new ForgeError("FORGE_DIRECTIONS_REQUIRED", "Generate directions before comparison", 409);
		const invocation = await this.runtime.resolveInvocation("forge.comparator");
		const createdAt = nowIso();
		const task: ForgeTask = {
			taskId: randomUUID(),
			forgeSessionId: sessionId,
			type: "forge.compare",
			status: "queued",
			progressPhase: "queued",
			createdAt,
			updatedAt: createdAt,
			errorMessage: null,
		};
		this.requireRepository().createTask(task);
		this.requireRepository().updateSession({ ...session, currentTaskId: task.taskId, updatedAt: createdAt });
		void this.runComparison(session, task, invocation);
		return task;
	}

	async startCritique(sessionId: string, input: CritiqueDirectionInput): Promise<ForgeTask> {
		const session = this.getSession(sessionId);
		if (session.status !== "awaiting_selection")
			throw new ForgeError("FORGE_DIRECTIONS_REQUIRED", "Generate directions before critique", 409);
		const artifacts = await this.getArtifacts(sessionId);
		const candidate = artifacts.candidates.find((entry) => entry.candidateId === input.candidateId);
		if (!candidate) throw new ForgeError("FORGE_CANDIDATE_NOT_FOUND", "Direction candidate not found", 404);
		const invocation = await this.runtime.resolveInvocation("forge.critic");
		const createdAt = nowIso();
		const task: ForgeTask = {
			taskId: randomUUID(),
			forgeSessionId: sessionId,
			type: "forge.critique",
			status: "queued",
			progressPhase: "queued",
			createdAt,
			updatedAt: createdAt,
			errorMessage: null,
		};
		this.requireRepository().createTask(task);
		this.requireRepository().updateSession({ ...session, currentTaskId: task.taskId, updatedAt: createdAt });
		void this.runCritique(session, task, invocation, input);
		return task;
	}

	async select(sessionId: string, input: SelectDirectionInput): Promise<ForgeSession> {
		const session = this.getSession(sessionId);
		if (session.status !== "awaiting_selection")
			throw new ForgeError("FORGE_SELECTION_NOT_ALLOWED", "Select a candidate after generation completes", 409);
		const artifacts = await this.getArtifacts(sessionId);
		if (!artifacts.candidates.some((candidate) => candidate.candidateId === input.candidateId))
			throw new ForgeError("FORGE_CANDIDATE_NOT_FOUND", "Direction candidate not found", 404);
		const selectedAt = nowIso();
		const previousSelection = session.selectedCandidateId;
		const artifactId = randomUUID();
		const relativePath = `artifacts/selections/${artifactId}.json`;
		await this.artifactStoreFor(this.requireContext().root).writeJson(sessionId, relativePath, {
			artifactId,
			candidateId: input.candidateId,
			selectedAt,
			previousSelection,
			// Selection is an author preference, not a story commitment.
			confirmation: "AUTHOR_SELECTED",
		});
		this.requireRepository().addArtifact({
			artifactId,
			forgeSessionId: sessionId,
			kind: "selection",
			relativePath,
			candidateId: input.candidateId,
			summary: `Selection -> ${input.candidateId}`,
			createdAt: selectedAt,
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
		const relativePath = `artifacts/commitment-${artifactId}.json`;
		const commitment = {
			artifactId,
			forgeSessionId: sessionId,
			candidateId: candidate.candidateId,
			confirmation: "USER_CONFIRMED",
			committedAt,
			authorNote: input.authorNote,
			// Only these fields are author-confirmed; everything else in the
			// candidate stays proposed until the author explicitly confirms it.
			confirmationScope: ["direction", "readerPromise", "hardConstraints"],
			candidate,
		};
		await this.artifactStoreFor(this.requireContext().root).writeJson(sessionId, relativePath, commitment);
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
		const journal = this.requireJournal();
		const entry = journal.get(sessionId);
		// Idempotent completion: a previous run already registered/completed the
		// project. Never create a second novel.
		if (entry && (entry.status === "COMPLETED" || entry.status === "REGISTERED") && entry.projectId) {
			if (session.materializedProjectId === entry.projectId)
				return { ...session, status: "materialized" as const, updatedAt: nowIso() };
			return this.completeMaterialization(
				session,
				entry.projectId,
				resolve(this.requireContext().root, entry.targetFolder),
			);
		}
		if (session.status !== "committed" && session.status !== "failed")
			throw new ForgeError(
				"FORGE_MATERIALIZE_NOT_ALLOWED",
				"Commit a selected direction before materialization",
				409,
			);
		const candidate = await this.requireSelectedCandidate(session);
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
				journal: this.requireJournal(),
			});
			return await this.completeMaterialization(started, result.projectId, result.projectRoot);
		} catch (error) {
			const current = journal.get(sessionId);
			const recoverable =
				current !== null &&
				(current.status === "RENAMED" ||
					current.status === "FILES_READY" ||
					current.status === "RECOVERY_REQUIRED");
			const failedAt = nowIso();
			const failed = {
				...started,
				status: "failed" as const,
				failureCode: recoverable ? "FORGE_MATERIALIZATION_RECOVERABLE" : errorCode(error),
				failureMessage: errorMessage(error),
				updatedAt: failedAt,
			};
			this.requireRepository().updateSession(failed);
			throw error;
		}
	}

	/** Recover a materialization whose disk project is complete but never registered. */
	async recoverMaterialization(sessionId: string): Promise<ForgeSession> {
		const session = this.getSession(sessionId);
		if (session.status === "materialized") return session;
		const journal = this.requireJournal().get(sessionId);
		if (!journal || !journal.projectId)
			throw new ForgeError(
				"FORGE_NO_MATERIALIZATION_JOURNAL",
				"No materialization journal entry; nothing to recover",
				409,
			);
		const candidate = await this.requireSelectedCandidate(session);
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
				request: {
					title: session.titleCandidate ?? session.seed.slice(0, 40),
					folderName: journal.targetFolder,
					language: "zh-CN",
				},
				journal: this.requireJournal(),
			});
			return await this.completeMaterialization(started, result.projectId, result.projectRoot);
		} catch (error) {
			const failedAt = nowIso();
			const failed = {
				...started,
				status: "failed" as const,
				failureCode: errorCode(error),
				failureMessage: errorMessage(error),
				updatedAt: failedAt,
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

	listTaskEvents(taskId: string, afterSequence: number): TaskEvent[] {
		return this.requireRepository().listTaskEvents(taskId, afterSequence);
	}

	private async startGeneration(sessionId: string, input: GenerateDirectionsInput): Promise<ForgeTask> {
		const session = this.getSession(sessionId);
		if (!["draft", "ready", "failed", "awaiting_selection"].includes(session.status))
			throw new ForgeError("FORGE_GENERATION_NOT_ALLOWED", "This Forge session cannot generate directions now", 409);
		if (!session.narrativeDNA)
			throw new ForgeError("FORGE_DNA_REQUIRED", "Narrative DNA must be defined before generation", 400);
		// Resolve the explorer runtime before queueing so an unconfigured agent
		// fails immediately instead of inside the background task.
		const invocation = await this.runtime.resolveInvocation("forge.explorer");
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
		void this.runGeneration(next, task, input, invocation, undefined, 1);
		return task;
	}

	private async runGeneration(
		session: ForgeSession,
		task: ForgeTask,
		input: GenerateDirectionsInput,
		invocation: RuntimeInvocation,
		repairHint: string | undefined,
		attempt: number,
	): Promise<void> {
		const repository = this.requireRepository();
		const running = {
			...task,
			status: "running" as const,
			progressPhase: `generating (attempt ${attempt})`,
			updatedAt: nowIso(),
		};
		repository.updateTask(running);
		this.appendEvent(running, "task.started", { attempt });
		try {
			const previous = (await this.getArtifacts(session.forgeSessionId)).candidates;
			const result = await this.exploration.generateDirections(
				{
					workspaceRoot: this.requireContext().root,
					forgeSessionId: session.forgeSessionId,
					seed: session.seed,
					narrativeDNA: session.narrativeDNA as NonNullable<ForgeSession["narrativeDNA"]>,
					hardConstraints: session.hardConstraints,
					preferences: session.preferences,
					invocation,
					count: input.count ?? MIN_CANDIDATES,
					previousCandidates: previous,
					...(repairHint ? { repairHint } : {}),
				},
				undefined,
			);
			const candidates = result.candidates;
			const gated = candidates.filter((candidate) => candidate.constraintValidation.status !== "FAIL");
			if (gated.length < MIN_CANDIDATES || gated.length !== candidates.length) {
				if (attempt < MAX_GENERATION_ATTEMPTS) {
					const hint = `上一次生成有 ${candidates.length - gated.length} 个候选未通过硬约束门禁（或不足 ${MIN_CANDIDATES} 个），请确保每个候选都满足全部硬约束，并输出 constraintValidation.status=PASS。`;
					return this.runGeneration(session, task, input, invocation, hint, attempt + 1);
				}
				throw new ForgeError(
					"FORGE_CONSTRAINT_GATE_FAILED",
					`Hard-constraint gate rejected candidates after ${MAX_GENERATION_ATTEMPTS} attempts`,
					422,
				);
			}
			const generation = this.nextGeneration(repository.listArtifacts(session.forgeSessionId));
			const createdAt = nowIso();
			const store = this.artifactStoreFor(this.requireContext().root);
			const folder = generationFolder(generation);
			const generationArtifactId = randomUUID();
			// Stamp the immutable generation number onto every candidate so the
			// stored artifact is self-describing and auditable.
			const stamped = gated.map((candidate) => ({ ...candidate, generation }));
			await store.writeJson(session.forgeSessionId, `artifacts/generations/${folder}/generation.json`, {
				generation,
				artifactId: generationArtifactId,
				candidates: stamped,
				comparison: result.comparison,
				createdAt,
			});
			for (const candidate of stamped) {
				await store.writeJson(
					session.forgeSessionId,
					`artifacts/generations/${folder}/candidates/${candidate.candidateId}.json`,
					candidate,
				);
				repository.addArtifact({
					// One candidate = one candidate artifact; the id always resolves.
					artifactId: candidate.candidateId,
					forgeSessionId: session.forgeSessionId,
					kind: "directions",
					relativePath: `artifacts/generations/${folder}/candidates/${candidate.candidateId}.json`,
					candidateId: candidate.candidateId,
					summary: candidate.title,
					createdAt,
				});
			}
			repository.addArtifact({
				artifactId: generationArtifactId,
				forgeSessionId: session.forgeSessionId,
				kind: "directions",
				relativePath: `artifacts/generations/${folder}/generation.json`,
				summary: `generation ${generation}: ${gated.length} candidates`,
				createdAt,
			});
			if (result.comparison) {
				const comparisonArtifactId = randomUUID();
				await store.writeJson(session.forgeSessionId, `artifacts/generations/${folder}/comparison.json`, {
					comparison: result.comparison,
					createdAt,
				});
				repository.addArtifact({
					artifactId: comparisonArtifactId,
					forgeSessionId: session.forgeSessionId,
					kind: "comparison",
					relativePath: `artifacts/generations/${folder}/comparison.json`,
					summary: `${result.comparison.dimensions.length} dimensions`,
					createdAt,
				});
			}
			repository.updateTask({
				...running,
				status: "succeeded",
				progressPhase: "awaiting_selection",
				updatedAt: createdAt,
			});
			this.appendEvent(
				{ ...running, status: "succeeded", progressPhase: "awaiting_selection", updatedAt: createdAt },
				"task.completed",
				{ generation, candidateCount: gated.length },
			);
			repository.updateSession({
				...session,
				status: "awaiting_selection",
				currentTaskId: task.taskId,
				updatedAt: createdAt,
			});
		} catch (error) {
			if (isRepairable(error) && attempt < MAX_GENERATION_ATTEMPTS) {
				return this.runGeneration(session, task, input, invocation, repairMessage(error), attempt + 1);
			}
			const failedAt = nowIso();
			const failed = {
				...running,
				status: "failed" as const,
				progressPhase: "failed",
				updatedAt: failedAt,
				errorMessage: errorMessage(error),
			};
			repository.updateTask(failed);
			this.appendEvent(failed, "task.failed", { code: errorCode(error), message: errorMessage(error) });
			repository.updateSession({
				...session,
				status: "failed",
				failureCode: errorCode(error),
				failureMessage: errorMessage(error),
				updatedAt: failedAt,
			});
		}
	}

	private async runComparison(session: ForgeSession, task: ForgeTask, invocation: RuntimeInvocation): Promise<void> {
		const repository = this.requireRepository();
		const running = { ...task, status: "running" as const, progressPhase: "comparing", updatedAt: nowIso() };
		repository.updateTask(running);
		this.appendEvent(running, "task.started", {});
		try {
			const artifacts = await this.getArtifacts(session.forgeSessionId);
			const result = await this.exploration.compareDirections(
				{
					workspaceRoot: this.requireContext().root,
					invocation,
					seed: session.seed,
					narrativeDNA: session.narrativeDNA as NonNullable<ForgeSession["narrativeDNA"]>,
					hardConstraints: session.hardConstraints,
					preferences: session.preferences,
					candidates: artifacts.candidates,
				},
				undefined,
			);
			const generation = this.listGenerations(repository.listArtifacts(session.forgeSessionId)).at(-1);
			if (!generation)
				throw new ForgeError("FORGE_DIRECTIONS_REQUIRED", "Generate directions before comparison", 409);
			const createdAt = nowIso();
			const folder = generationFolder(generation.generation);
			const artifactId = randomUUID();
			const relativePath = `artifacts/generations/${folder}/comparison.json`;
			await this.artifactStoreFor(this.requireContext().root).writeJson(session.forgeSessionId, relativePath, {
				comparison: result,
				createdAt,
			});
			repository.addArtifact({
				artifactId,
				forgeSessionId: session.forgeSessionId,
				kind: "comparison",
				relativePath,
				summary: `${result.dimensions.length} dimensions`,
				createdAt,
			});
			const succeeded = {
				...running,
				status: "succeeded" as const,
				progressPhase: "awaiting_selection",
				updatedAt: createdAt,
			};
			repository.updateTask(succeeded);
			this.appendEvent(succeeded, "task.completed", { dimensionCount: result.dimensions.length });
		} catch (error) {
			const failedAt = nowIso();
			const failed = {
				...running,
				status: "failed" as const,
				progressPhase: "failed",
				updatedAt: failedAt,
				errorMessage: errorMessage(error),
			};
			repository.updateTask(failed);
			this.appendEvent(failed, "task.failed", { code: errorCode(error), message: errorMessage(error) });
		}
	}

	private async runCritique(
		session: ForgeSession,
		task: ForgeTask,
		invocation: RuntimeInvocation,
		input: CritiqueDirectionInput,
	): Promise<void> {
		const repository = this.requireRepository();
		const running = { ...task, status: "running" as const, progressPhase: "critiquing", updatedAt: nowIso() };
		repository.updateTask(running);
		this.appendEvent(running, "task.started", { candidateId: input.candidateId });
		try {
			const artifacts = await this.getArtifacts(session.forgeSessionId);
			const candidate = artifacts.candidates.find((entry) => entry.candidateId === input.candidateId);
			if (!candidate) throw new ForgeError("FORGE_CANDIDATE_NOT_FOUND", "Direction candidate not found", 404);
			const root = this.requireContext().root;
			const result = await this.exploration.critiqueDirection(
				{
					workspaceRoot: root,
					invocation,
					seed: session.seed,
					candidate,
					instruction: input.instruction,
				},
				undefined,
			);
			const artifactId = randomUUID();
			const relativePath = `artifacts/critique-${artifactId}.json`;
			await this.artifactStoreFor(root).writeJson(session.forgeSessionId, relativePath, {
				artifactId,
				candidateId: input.candidateId,
				instruction: input.instruction,
				critique: result,
				createdAt: nowIso(),
			});
			repository.addArtifact({
				artifactId,
				forgeSessionId: session.forgeSessionId,
				kind: "critique",
				relativePath,
				candidateId: input.candidateId,
				summary: result.slice(0, 180),
				createdAt: nowIso(),
			});
			const succeeded = {
				...running,
				status: "succeeded" as const,
				progressPhase: "awaiting_selection",
				updatedAt: nowIso(),
			};
			repository.updateTask(succeeded);
			this.appendEvent(succeeded, "task.completed", { candidateId: input.candidateId });
		} catch (error) {
			const failedAt = nowIso();
			const failed = {
				...running,
				status: "failed" as const,
				progressPhase: "failed",
				updatedAt: failedAt,
				errorMessage: errorMessage(error),
			};
			repository.updateTask(failed);
			this.appendEvent(failed, "task.failed", { code: errorCode(error), message: errorMessage(error) });
		}
	}

	private async completeMaterialization(
		session: ForgeSession,
		projectId: string,
		projectRoot: string,
	): Promise<ForgeSession> {
		await this.workspace.rescan();
		const completedAt = nowIso();
		const artifactId = randomUUID();
		const relativePath = "artifacts/materialization.json";
		await this.artifactStoreFor(this.requireContext().root).writeJson(session.forgeSessionId, relativePath, {
			artifactId,
			projectId,
			projectRoot,
			createdAt: completedAt,
		});
		this.requireRepository().addArtifact({
			artifactId,
			forgeSessionId: session.forgeSessionId,
			kind: "materialization",
			relativePath,
			summary: projectId,
			createdAt: completedAt,
		});
		const existing = this.requireJournal().get(session.forgeSessionId);
		this.requireJournal().update({
			forgeSessionId: session.forgeSessionId,
			status: "COMPLETED",
			projectId,
			targetFolder: existing?.targetFolder ?? projectRoot.split(/[\\/]/u).filter(Boolean).at(-1) ?? projectRoot,
			stagingPath: null,
			attempts: existing?.attempts ?? 1,
			errorMessage: null,
			createdAt: existing?.createdAt ?? completedAt,
			updatedAt: completedAt,
		});
		const materialized = {
			...session,
			status: "materialized" as const,
			materializedProjectId: projectId,
			updatedAt: completedAt,
			failureCode: null,
			failureMessage: null,
		};
		this.requireRepository().updateSession(materialized);
		return materialized;
	}

	private async requireSelectedCandidate(session: ForgeSession): Promise<DirectionCandidate> {
		if (!session.selectedCandidateId)
			throw new ForgeError(
				"FORGE_MATERIALIZE_NOT_ALLOWED",
				"Select and commit a direction before materialization",
				409,
			);
		const artifacts = await this.getArtifacts(session.forgeSessionId);
		const candidate = artifacts.candidates.find((entry) => entry.candidateId === session.selectedCandidateId);
		if (!candidate) throw new ForgeError("FORGE_CANDIDATE_NOT_FOUND", "Selected candidate is missing", 409);
		return candidate;
	}

	private listGenerations(artifacts: ForgeArtifactsResponse["artifacts"]): ForgeGenerationSummary[] {
		const generations = new Map<number, ForgeGenerationSummary>();
		for (const artifact of artifacts) {
			if (artifact.kind !== "directions") continue;
			const match = artifact.relativePath.match(/^artifacts\/generations\/(\d+)\/generation\.json$/u);
			if (!match) continue;
			const generation = Number(match[1]);
			generations.set(generation, {
				generation,
				artifactId: artifact.artifactId,
				createdAt: artifact.createdAt,
			});
		}
		return [...generations.values()].sort((left, right) => left.generation - right.generation);
	}

	private nextGeneration(artifacts: ForgeArtifactsResponse["artifacts"]): number {
		const latest = this.listGenerations(artifacts).at(-1);
		return (latest?.generation ?? 0) + 1;
	}

	private appendEvent(task: ForgeTask, type: TaskEvent["type"], payload: Record<string, unknown>): void {
		const repository = this.requireRepository();
		const sequence =
			repository.listTaskEvents(task.taskId, 0).reduce((max, event) => Math.max(max, event.sequence), 0) + 1;
		repository.appendTaskEvent({
			eventId: randomUUID(),
			taskId: task.taskId,
			sequence,
			type,
			payload,
			createdAt: nowIso(),
		});
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

	private requireJournal(): MaterializationJournalPort {
		const journal = this.workspace.getMaterializationJournalRepository();
		if (!journal) throw new ForgeError("WORKSPACE_NOT_OPEN", "Open a workspace before using Forge", 409);
		return journal;
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

function readCandidates(value: unknown): DirectionCandidate[] {
	if (typeof value !== "object" || value === null) return [];
	const record = value as Record<string, unknown>;
	if (!Array.isArray(record.candidates)) return [];
	const candidates = record.candidates.filter((candidate): candidate is DirectionCandidate =>
		Check(DirectionCandidateSchema, candidate),
	);
	if (candidates.length !== record.candidates.length) {
		throw new ForgeError("FORGE_ARTIFACT_INVALID", "Stored Forge direction artifact is invalid", 422);
	}
	return candidates;
}

function generationFolder(generation: number): string {
	return String(generation).padStart(3, "0");
}

function isRepairable(error: unknown): boolean {
	if (error instanceof ForgeError) {
		return (
			error.code === "FORGE_TOO_FEW_CANDIDATES" ||
			error.code === "FORGE_CONSTRAINT_GATE" ||
			error.code === "FORGE_DIRECTIONS_NOT_DISTINCT" ||
			error.code === "FORGE_MODEL_OUTPUT_INVALID" ||
			error.code === "FORGE_DIRECTIONS_REJECTED"
		);
	}
	return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string";
}

function repairMessage(error: unknown): string {
	if (error instanceof ForgeError) return error.message;
	return "模型输出不符合约束；请重新生成真正满足要求的方向。";
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
