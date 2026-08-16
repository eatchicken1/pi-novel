import { isAbsolute, relative, resolve, sep } from "node:path";

export interface WorkspacePaths {
	root: string;
	controlDirectory: string;
	manifest: string;
	database: string;
}

export function resolveWorkspacePaths(rootPath: string): WorkspacePaths {
	const root = resolve(rootPath);
	const controlDirectory = resolveWorkspacePath(root, ".pi-novel");
	return {
		root,
		controlDirectory,
		manifest: resolveWorkspacePath(root, ".pi-novel", "workspace.json"),
		database: resolveWorkspacePath(root, ".pi-novel", "workspace.sqlite"),
	};
}

export function resolveWorkspacePath(rootPath: string, ...segments: string[]): string {
	const root = resolve(rootPath);
	const candidate = resolve(root, ...segments);
	const relativePath = relative(root, candidate);
	if (isAbsolute(relativePath) || relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
		throw new Error("Resolved path escapes the Workspace root");
	}
	return candidate;
}
