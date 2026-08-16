import { nowIso, WORKSPACE_SCHEMA_VERSION, type WorkspaceManifest } from "@earendil-works/pi-novel-contracts";

export function createWorkspaceManifest(
	workspaceId: string,
	rootPath: string,
	createdAt = nowIso(),
): WorkspaceManifest {
	return {
		schemaVersion: WORKSPACE_SCHEMA_VERSION,
		workspaceId,
		rootPath,
		createdAt,
		updatedAt: createdAt,
	};
}

export function touchWorkspaceManifest(manifest: WorkspaceManifest, updatedAt = nowIso()): WorkspaceManifest {
	return { ...manifest, updatedAt };
}
