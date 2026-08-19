import type { FastifyInstance } from "fastify";
import { BootstrapResponseSchema } from "@earendil-works/pi-novel-contracts";
import type { AgentRuntimeService, WorkspaceService } from "@earendil-works/pi-novel-application";

export function registerBootstrapRoute(app: FastifyInstance, workspace: WorkspaceService, runtime: AgentRuntimeService): void {
	app.get(
		"/api/bootstrap",
		{ schema: { response: { 200: BootstrapResponseSchema } } },
		async () => {
			const overview = await workspace.getOverview();
			const profiles = overview === null ? [] : runtime.listProfiles();
			return {
				api: "ready" as const,
				workspace: { status: overview === null ? ("unset" as const) : ("ready" as const), summary: overview },
				runtime: { configured: profiles.length > 0 },
			};
		},
	);
}
