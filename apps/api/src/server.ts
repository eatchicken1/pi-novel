function taskRepositoryFor(workspaceService: WorkspaceService): LazyTaskRepository {
	// Resolve lazily so the API can be constructed before a workspace is open.
	let repository: TaskRepository | null = null;
	let databasePath: string | null = null;
	const resolve = (): TaskRepositoryPort => {
		const currentPath = workspaceService.databasePath();
		if (currentPath === null) throw new Error("WORKSPACE_NOT_OPEN");
		if (repository === null || databasePath !== currentPath) {
			repository?.close();
			repository = new TaskRepository(currentPath);
			databasePath = currentPath;
		}
		return repository;
	};
	return new LazyTaskRepository(resolve, () => {
		repository?.close();
		repository = null;
		databasePath = null;
	});
}

class LazyTaskRepository implements TaskRepositoryPort {
	private readonly resolve: () => TaskRepositoryPort;
	private readonly closeRepository: () => void;

	constructor(resolve: () => TaskRepositoryPort, closeRepository: () => void) {
		this.resolve = resolve;
		this.closeRepository = closeRepository;
	}

	close(): void {
		this.closeRepository();
	}

	createTask(task: import("@earendil-works/pi-novel-contracts").NovelTask): void {
		this.resolve().createTask(task);
	}

	updateTask(task: import("@earendil-works/pi-novel-contracts").NovelTask): void {
		this.resolve().updateTask(task);
	}

	getTask(taskId: string) {
		return this.resolve().getTask(taskId);
	}

	listTasks(filter?: { projectId?: string; status?: string; limit?: number }) {
		return this.resolve().listTasks(filter);
	}

	appendEvent(event: import("@earendil-works/pi-novel-contracts").TaskEvent): void {
		this.resolve().appendEvent(event);
	}

	listEvents(taskId: string, afterSequence?: number) {
		return this.resolve().listEvents(taskId, afterSequence);
	}

	maxSequence(taskId: string) {
		return this.resolve().maxSequence(taskId);
	}

	createAgentRun(run: import("@earendil-works/pi-novel-contracts").AgentRun): void {
		this.resolve().createAgentRun(run);
	}

	updateAgentRun(run: import("@earendil-works/pi-novel-contracts").AgentRun): void {
		this.resolve().updateAgentRun(run);
	}

	getAgentRun(agentRunId: string) {
		return this.resolve().getAgentRun(agentRunId);
	}
}

import { randomBytes } from "node:crypto";
import cors from "@fastify/cors";
import fastify, { type FastifyError, type FastifyInstance } from "fastify";
import {
	AgentRuntimeService,
	ChapterWorkflowService,
	ChangeSetService,
	ForgeService,
	HistoryService,
	ModelCatalogService,
	ManuscriptPatchService,
	ProjectQueryService,
	ProjectReadService,
	ReviewService,
	StoryGraphService,
	StudioService,
	TaskService,
	WorkspaceService,
} from "@earendil-works/pi-novel-application";
import type { AgentRuntimePort, ClockPort, IdempotencyPort, TaskRepositoryPort } from "@earendil-works/pi-novel-application";
import {
	PiModelRuntimeAdapter,
	ForgeArtifactStore,
	ForgeRepository,
	LegacyNovelEngineAdapter,
	LegacyChapterAuthoringAdapter,
	NativeChapterAuthoringAdapter,
	NativeNovelEngineAdapter,
	NovelEngineRouter,
	ChapterAuthoringRouter,
	LegacyStoryExplorationAdapter,
	FileTransaction,
	MaterializationJournalRepository,
	ProjectDatabaseRegistry,
	ProjectMaterializer,
	ProjectScanner,
	RuntimeProfileRepository,
	TaskRepository,
	WorkspaceDatabase,
	WorkspaceFiles,
} from "@earendil-works/pi-novel-infrastructure";
import { registerHealthRoute } from "./routes/health.ts";
import { registerProjectRoutes } from "./routes/projects.ts";
import { registerProductProjectRoutes } from "./routes/projects-product.ts";
import { registerWorkspaceRoutes } from "./routes/workspace.ts";
import { registerModelRoutes } from "./routes/models.ts";
import { registerForgeRoutes } from "./routes/forge.ts";
import { registerRuntimeRoutes } from "./routes/runtime.ts";
import { registerChangeSetRoutes } from "./routes/changesets.ts";
import { registerReviewRoutes } from "./routes/review.ts";
import { registerHistoryRoutes } from "./routes/history.ts";
import { registerGraphRoutes } from "./routes/graph.ts";
import { registerTaskRoutes } from "./routes/tasks.ts";
import { registerChapterWorkflowRoutes } from "./routes/chapter-workflow.ts";
import { registerBootstrapRoute } from "./routes/bootstrap.ts";
import { registerCapabilitiesRoute } from "./routes/capabilities.ts";
import { registerPatchRoutes } from "./routes/patches.ts";

export interface NovelApiOptions {
	workspaceRoot?: string;
	logger?: boolean;
	localToken?: string;
	allowedOrigins?: readonly string[];
}

export async function createNovelApi(options: NovelApiOptions = {}): Promise<FastifyInstance> {
	const app = fastify({ logger: options.logger ?? false });
	const localToken = options.localToken ?? process.env.PI_NOVEL_LOCAL_TOKEN ?? randomBytes(32).toString("hex");
	const modelRuntime = new PiModelRuntimeAdapter();
	const workspaceService = new WorkspaceService({
		createFileSystem: (rootPath) => new WorkspaceFiles(rootPath),
		createRepository: (databasePath) => new WorkspaceDatabase(databasePath),
		scanner: new ProjectScanner(),
		createForgeRepository: (databasePath) => new ForgeRepository(databasePath),
		createRuntimeProfileRepository: (databasePath) => new RuntimeProfileRepository(databasePath),
		createMaterializationJournalRepository: (databasePath) => new MaterializationJournalRepository(databasePath),
	});
	const modelCatalogService = new ModelCatalogService(modelRuntime);
	const agentRuntime = new AgentRuntimeService({
		storeFor: () => workspaceService.getRuntimeProfileRepository(),
		rootFor: () => workspaceService.getWorkspacePaths()?.root ?? null,
		runtime: modelRuntime,
	});
	const forgeService = new ForgeService({
		workspace: workspaceService,
		exploration: new LegacyStoryExplorationAdapter(modelRuntime),
		artifactStoreFor: (workspaceRoot) => new ForgeArtifactStore(workspaceRoot),
		materializer: new ProjectMaterializer(),
		runtime: agentRuntime,
	});
	const clock: ClockPort = { now: () => new Date().toISOString() };
	const idGenerator = { id: () => globalThis.crypto.randomUUID() };
	const registry = new ProjectDatabaseRegistry();
	const engine = new NovelEngineRouter(new NativeNovelEngineAdapter(registry), new LegacyNovelEngineAdapter());
	const authoring = new ChapterAuthoringRouter(new NativeChapterAuthoringAdapter(registry), new LegacyChapterAuthoringAdapter());
	const reads = new ProjectReadService(workspaceService, engine);
	const reviewService = new ReviewService({ workspace: workspaceService, engine, registry, id: idGenerator });
	const changeSets = new ChangeSetService({
		workspace: workspaceService,
		engine,
		registry,
		files: new FileTransaction(),
		idempotency: new InMemoryIdempotency(),
		id: idGenerator,
		clock,
		reviewProjector: reviewService,
	});
	const manuscriptPatches = new ManuscriptPatchService({ workspace: workspaceService, engine, registry, runtime: agentRuntime, model: modelRuntime, changeSets });
	const chapterWorkflow = new ChapterWorkflowService({ workspace: workspaceService, registry, engine, authoring, review: reviewService, changeSets, clock });
	const historyService = new HistoryService(workspaceService, registry);
	const graphService = new StoryGraphService(workspaceService, engine, registry);
	const taskRepository = taskRepositoryFor(workspaceService);
	const studioService = new StudioService({ workspace: workspaceService, reads, review: reviewService, registry, tasks: taskRepository, engine, chapterWorkflow });
	const taskService = new TaskService(taskRepository, new UnavailableAgentRuntime(), clock);
	if (options.workspaceRoot) {
		const overview = await workspaceService.open(options.workspaceRoot);
		if (overview) app.log.info({ event: "workspace.open" }, "workspace.open");
	}

	const allowedOrigins = new Set([
		"http://127.0.0.1:4318",
		"http://localhost:4318",
		...(options.allowedOrigins ?? parseAllowedOrigins(process.env.PI_NOVEL_ALLOWED_ORIGINS)),
	]);
	await app.register(cors, {
		origin: (origin, callback) => callback(null, origin === undefined || allowedOrigins.has(origin)),
	});
	app.addHook("onRequest", async (request, reply) => {
		if (request.url.split("?", 1)[0] === "/api/health") return;
		const header = request.headers["x-pi-novel-token"];
		const providedToken = Array.isArray(header) ? header[0] : header;
		if (providedToken === localToken) return;
		request.log.warn({ event: "auth.rejected", method: request.method, path: request.url.split("?", 1)[0] }, "auth.rejected");
		return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Local API token is required" } });
	});
	app.setErrorHandler((error: FastifyError, _request, reply) => {
		if (error.validation) {
			return reply.code(400).send({
				error: {
					code: "INVALID_REQUEST",
					message: "Request validation failed",
					details: { validation: error.validation },
				},
			});
		}
		const code = typeof error.code === "string" && error.code === "WORKSPACE_MANIFEST_INVALID" ? error.code : "INTERNAL_ERROR";
		const statusCode = code === "WORKSPACE_MANIFEST_INVALID" ? 422 : 500;
		return reply.code(statusCode).send({ error: { code, message: code === "INTERNAL_ERROR" ? "Internal server error" : error.message } });
	});
	registerHealthRoute(app);
	registerBootstrapRoute(app, workspaceService, agentRuntime);
	registerWorkspaceRoutes(app, workspaceService);
	registerProjectRoutes(app, new ProjectQueryService(workspaceService));
	registerCapabilitiesRoute(app, workspaceService, engine);
	registerProductProjectRoutes(app, reads, studioService, chapterWorkflow);
	registerModelRoutes(app, modelCatalogService, workspaceService);
	registerRuntimeRoutes(app, agentRuntime);
	registerForgeRoutes(app, forgeService, taskService);
	registerChangeSetRoutes(app, changeSets);
	registerPatchRoutes(app, manuscriptPatches, changeSets, taskService, () => workspaceService.getWorkspacePaths()?.root ?? null);
	registerReviewRoutes(app, reviewService);
	registerHistoryRoutes(app, historyService);
	registerGraphRoutes(app, graphService);
	registerTaskRoutes(app, taskService, () => workspaceService.getWorkspacePaths()?.root ?? null);
	registerChapterWorkflowRoutes(app, chapterWorkflow);
	app.addHook("onClose", async () => {
		taskRepository.close();
		workspaceService.close();
		registry.closeAll();
	});
	return app;
}

function parseAllowedOrigins(value: string | undefined): string[] {
	return value ? value.split(",").map((origin) => origin.trim()).filter(Boolean) : [];
}


class InMemoryIdempotency implements IdempotencyPort {
	private readonly results = new Map<string, unknown>();

	hasResult(key: string): boolean {
		return this.results.has(key);
	}

	storeResult(key: string, payload: unknown): void {
		this.results.set(key, payload);
	}
}

class UnavailableAgentRuntime implements AgentRuntimePort {
	async startTask(): Promise<void> {
		throw new Error("AGENT_RUNTIME_UNAVAILABLE");
	}
	cancelTask(): void {}
	subscribe(): () => void {
		return () => undefined;
	}
}
