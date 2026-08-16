import { resolve } from "node:path";

export interface WorkspacePaths {
	root: string;
	controlDirectory: string;
	manifest: string;
	database: string;
}

export function resolveWorkspacePaths(rootPath: string): WorkspacePaths {
	const root = resolve(rootPath);
	const controlDirectory = resolve(root, ".pi-novel");
	return {
		root,
		controlDirectory,
		manifest: resolve(controlDirectory, "workspace.json"),
		database: resolve(controlDirectory, "workspace.sqlite"),
	};
}
