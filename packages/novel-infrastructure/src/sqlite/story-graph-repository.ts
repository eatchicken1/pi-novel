import type { DatabaseSync } from "node:sqlite";
import type { StoryEdge, StoryGraph, StoryGraphQuery, StoryNode } from "@earendil-works/pi-novel-contracts";

interface StoryNodeRow {
	node_id: string;
	project_id: string;
	type: string;
	ref: string;
	label: string | null;
	chapter: number | null;
	meta_json: string;
}

interface StoryEdgeRow {
	edge_id: string;
	project_id: string;
	source_node_id: string;
	target_node_id: string;
	type: string;
	label: string | null;
}

// Story Graph 是 derived read model：replaceAll 整体重建，查询支持过滤。
export class StoryGraphRepository {
	private readonly db: DatabaseSync;

	constructor(db: DatabaseSync) {
		this.db = db;
	}

	replaceAll(graph: StoryGraph): void {
		this.db.exec("BEGIN IMMEDIATE");
		try {
			this.db.prepare("DELETE FROM story_nodes WHERE project_id = ?").run(graph.projectId);
			this.db.prepare("DELETE FROM story_edges WHERE project_id = ?").run(graph.projectId);
			const nodeStatement = this.db.prepare(
				"INSERT INTO story_nodes (node_id, project_id, type, ref, label, chapter, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
			);
			for (const node of graph.nodes) {
				nodeStatement.run(
					node.nodeId,
					graph.projectId,
					node.type,
					node.ref,
					node.label,
					node.chapter,
					JSON.stringify(node.meta),
				);
			}
			const edgeStatement = this.db.prepare(
				"INSERT INTO story_edges (edge_id, project_id, source_node_id, target_node_id, type, label) VALUES (?, ?, ?, ?, ?, ?)",
			);
			for (const edge of graph.edges) {
				edgeStatement.run(
					edge.edgeId,
					graph.projectId,
					edge.sourceNodeId,
					edge.targetNodeId,
					edge.type,
					edge.label,
				);
			}
			this.db.exec("COMMIT");
		} catch (error) {
			this.db.exec("ROLLBACK");
			throw error;
		}
	}

	query(projectId: string, filter: StoryGraphQuery): { nodes: StoryNode[]; edges: StoryEdge[] } {
		const nodeConditions = ["project_id = ?"];
		const nodeParams: Array<string | number> = [projectId];
		if (filter.chapterFrom !== undefined) {
			nodeConditions.push("chapter >= ?");
			nodeParams.push(filter.chapterFrom);
		}
		if (filter.chapterTo !== undefined) {
			nodeConditions.push("chapter <= ?");
			nodeParams.push(filter.chapterTo);
		}
		if (filter.nodeTypes !== undefined && filter.nodeTypes.length > 0) {
			nodeConditions.push(`type IN (${filter.nodeTypes.map(() => "?").join(", ")})`);
			nodeParams.push(...filter.nodeTypes);
		}
		if (filter.characterId !== undefined) {
			nodeConditions.push("(ref = ? OR meta_json LIKE ?)");
			nodeParams.push(filter.characterId, `%"characterId":"${filter.characterId}"%`);
		}
		const nodeRows = this.db
			.prepare(`SELECT * FROM story_nodes WHERE ${nodeConditions.join(" AND ")}`)
			.all(...nodeParams) as unknown as StoryNodeRow[];
		const nodes = nodeRows.map((row) => ({
			nodeId: row.node_id,
			type: row.type as StoryNode["type"],
			ref: row.ref,
			label: row.label,
			chapter: row.chapter,
			meta: JSON.parse(row.meta_json) as StoryNode["meta"],
		}));
		const nodeIds = new Set(nodes.map((node) => node.nodeId));
		if (nodeIds.size === 0) return { nodes, edges: [] };
		const placeholders = [...nodeIds].map(() => "?").join(", ");
		const edgeRows = this.db
			.prepare(
				`SELECT * FROM story_edges WHERE project_id = ? AND source_node_id IN (${placeholders}) AND target_node_id IN (${placeholders})`,
			)
			.all(projectId, ...nodeIds, ...nodeIds) as unknown as StoryEdgeRow[];
		const edges = edgeRows.map((row) => ({
			edgeId: row.edge_id,
			sourceNodeId: row.source_node_id,
			targetNodeId: row.target_node_id,
			type: row.type as StoryEdge["type"],
			label: row.label,
		}));
		return { nodes, edges };
	}

	counts(projectId: string): { nodes: number; edges: number } {
		const nodes = this.db.prepare("SELECT COUNT(*) AS c FROM story_nodes WHERE project_id = ?").get(projectId) as {
			c: number;
		};
		const edges = this.db.prepare("SELECT COUNT(*) AS c FROM story_edges WHERE project_id = ?").get(projectId) as {
			c: number;
		};
		return { nodes: Number(nodes.c), edges: Number(edges.c) };
	}
}
