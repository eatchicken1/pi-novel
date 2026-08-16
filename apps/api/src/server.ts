import { randomBytes } from "node:crypto";
import cors from "@fastify/cors";
import fastify, { type FastifyError, type FastifyInstance } from "fastify";
import {
	ForgeService,
	ModelCatalogService,
	ProjectQueryService,
	WorkspaceService,
} from "@earendil-works/pi-novel-application";
import {
	PiModelRuntimeAdapter,
	ForgeArtifactStore,
	ForgeRepository,
	LegacyStoryExplorationAdapter,
	ProjectMaterializer,
	ProjectScanner,
	WorkspaceDatabase,
	WorkspaceFiles,
} from "@earendil-works/pi-novel-infrastructure";
import { registerHealthRoute } from "./routes/health.ts";
import { registerProjectRoutes } from "./routes/projects.ts";
import { registerWorkspaceRoutes } from "./routes/workspace.ts";
import { registerModelRoutes } from "./routes/models.ts";
import { registerForgeRoutes } from "./routes/forge.ts";

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
	});
	const modelCatalogService = new ModelCatalogService(modelRuntime);
	const forgeService = new ForgeService({
		workspace: workspaceService,
		exploration: new LegacyStoryExplorationAdapter(modelRuntime),
		artifactStoreFor: (workspaceRoot) => new ForgeArtifactStore(workspaceRoot),
		materializer: new ProjectMaterializer(),
	});
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
	registerWorkspaceRoutes(app, workspaceService);
	registerProjectRoutes(app, new ProjectQueryService(workspaceService));
	registerModelRoutes(app, modelCatalogService, workspaceService);
	registerForgeRoutes(app, forgeService);
	app.addHook("onClose", async () => workspaceService.close());
	return app;
}

function parseAllowedOrigins(value: string | undefined): string[] {
	return value ? value.split(",").map((origin) => origin.trim()).filter(Boolean) : [];
}
