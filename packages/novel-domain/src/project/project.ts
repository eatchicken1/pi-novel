import type { ProjectKind, ProjectRecord } from "@earendil-works/pi-novel-contracts";

export function projectKindLabel(kind: ProjectKind): string {
	return kind === "native" ? "Native" : "Legacy";
}

export function sortProjects(projects: ProjectRecord[]): ProjectRecord[] {
	return [...projects].sort((left, right) => right.lastModifiedAt.localeCompare(left.lastModifiedAt));
}
