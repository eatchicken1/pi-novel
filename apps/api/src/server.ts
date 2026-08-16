import cors from "@fastify/cors";
import fastify, { type FastifyInstance } from "fastify";
import { WorkspaceService, ProjectQueryService } from "@earendil-works/pi-novel-application";
import { registerHealthRoute } from "./routes/health.ts";
import { registerProjectRoutes } from "./routes/projects.ts";
import { registerWorkspaceRoutes } from "./routes/workspace.ts";
import { registerModelRoutes } from "./routes/models.ts";

export interface NovelApiOptions {
	workspaceRoot?: string;
	logger?: boolean;
}

export async function createNovelApi(options: NovelApiOptions = {}): Promise<FastifyInstance> {
	const app = fastify({ logger: options.logger ?? false });
	const workspaceService = new WorkspaceService();
	if (options.workspaceRoot) await workspaceService.open(options.workspaceRoot);

	await app.register(cors, { origin: true });
	registerHealthRoute(app);
	registerWorkspaceRoutes(app, workspaceService);
	registerProjectRoutes(app, new ProjectQueryService(workspaceService));
	registerModelRoutes(app);
	app.addHook("onClose", async () => workspaceService.close());
	return app;
}
