import type { StoryGraph, StoryGraphQuery } from "@earendil-works/pi-novel-contracts";
import type { NovelEnginePort, ProjectDatabaseRegistryPort } from "../ports.ts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";

// Story Graph 是派生 read model：每次查询从 engine source 重建投影（不是第二 authority）。
export class StoryGraphService {
	private readonly workspace: WorkspaceService;
	private readonly engine: NovelEnginePort;
	private readonly registry: ProjectDatabaseRegistryPort;

	constructor(workspace: WorkspaceService, engine: NovelEnginePort, registry: ProjectDatabaseRegistryPort) {
		this.workspace = workspace;
		this.engine = engine;
		this.registry = registry;
	}

	private async roots(projectId: string) {
		const overview = await this.workspace.getOverview();
		const project = overview?.projects.find((candidate) => candidate.projectId === projectId);
		if (project === undefined || overview === null) throw new Error("PROJECT_NOT_FOUND");
		return { project, workspaceRoot: overview.manifest.rootPath };
	}

	async getGraph(projectId: string, query: StoryGraphQuery = {}): Promise<StoryGraph> {
		const { project, workspaceRoot } = await this.roots(projectId);
		const sources = await this.engine.storyGraphSources(workspaceRoot, projectId).catch(() => null);
		const repository = this.registry.open(projectId, project.rootPath).graph;
		if (sources === null || sources.events.length === 0) {
			return { projectId, nodes: [], edges: [], sourceHash: "empty", generatedAt: new Date().toISOString() };
		}
		const nodes = this.buildNodes(sources);
		const edges = this.buildEdges(sources, nodes);
		const full: StoryGraph = {
			projectId,
			nodes,
			edges,
			sourceHash: sources.sourceHash,
			generatedAt: new Date().toISOString(),
		};
		repository.replaceAll(full);
		// 过滤查询直接走持久化投影
		const filtered = repository.query(projectId, query);
		return {
			projectId,
			nodes: filtered.nodes,
			edges: filtered.edges,
			sourceHash: sources.sourceHash,
			generatedAt: full.generatedAt,
		};
	}

	private buildNodes(sources: {
		events: Array<{ eventId: number; chapter: number; action: string }>;
		characters: Array<{ characterId: string; label: string | null }>;
		clues: Array<{ clueId: string; label: string | null; chapter: number | null }>;
		claims: Array<{ claimId: string; label: string | null; revealChapter: number | null }>;
		promises: Array<{ promiseId: string; label: string | null }>;
	}) {
		const nodes: StoryGraph["nodes"] = [];
		for (const event of sources.events) {
			nodes.push({
				nodeId: `event-${event.eventId}`,
				type: "event",
				ref: String(event.eventId),
				label: event.action.slice(0, 60),
				chapter: event.chapter,
				meta: {},
			});
		}
		for (const character of sources.characters) {
			nodes.push({
				nodeId: `character-${character.characterId}`,
				type: "character",
				ref: character.characterId,
				label: character.label,
				chapter: null,
				meta: {},
			});
		}
		for (const clue of sources.clues) {
			nodes.push({
				nodeId: `clue-${clue.clueId}`,
				type: "clue",
				ref: clue.clueId,
				label: clue.label,
				chapter: clue.chapter,
				meta: {},
			});
		}
		for (const claim of sources.claims) {
			nodes.push({
				nodeId: `claim-${claim.claimId}`,
				type: "claim",
				ref: claim.claimId,
				label: claim.label,
				chapter: claim.revealChapter,
				meta: {},
			});
		}
		for (const promise of sources.promises) {
			nodes.push({
				nodeId: `promise-${promise.promiseId}`,
				type: "promise",
				ref: promise.promiseId,
				label: promise.label,
				chapter: null,
				meta: {},
			});
		}
		return nodes;
	}

	private buildEdges(
		sources: {
			events: Array<{
				eventId: number;
				characterRefs: string[];
				clueRefs: string[];
				claimRefs: string[];
				causes: number[];
			}>;
		},
		nodes: StoryGraph["nodes"],
	) {
		const nodeIds = new Set(nodes.map((node) => node.nodeId));
		const edges: StoryGraph["edges"] = [];
		let edgeCounter = 0;
		const push = (
			sourceNodeId: string,
			targetNodeId: string,
			type: StoryGraph["edges"][number]["type"],
			label: string | null,
		) => {
			if (!nodeIds.has(sourceNodeId) || !nodeIds.has(targetNodeId)) return;
			edgeCounter += 1;
			edges.push({ edgeId: `edge-${edgeCounter}`, sourceNodeId, targetNodeId, type, label });
		};
		for (const event of sources.events) {
			for (const cause of event.causes) push(`event-${cause}`, `event-${event.eventId}`, "causes", null);
			for (const characterId of event.characterRefs)
				push(`event-${event.eventId}`, `character-${characterId}`, "involves", null);
			for (const clueId of event.clueRefs) push(`event-${event.eventId}`, `clue-${clueId}`, "reveals", null);
			for (const claimId of event.claimRefs) push(`event-${event.eventId}`, `claim-${claimId}`, "reveals", null);
		}
		return edges;
	}
}
