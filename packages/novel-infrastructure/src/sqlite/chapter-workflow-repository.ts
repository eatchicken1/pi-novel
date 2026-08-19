import type { DatabaseSync } from "node:sqlite";
import type { ChapterWorkflowRecord, ChapterWorkflowRepositoryPort } from "@earendil-works/pi-novel-application";
import {
	type ChapterSettlement,
	ChapterSettlementSchema,
	type ChapterWorkflowPhase,
	ChapterWorkflowPhaseSchema,
	type ReconcileReport,
	ReconcileReportSchema,
} from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";

interface WorkflowRow {
	project_id: string;
	chapter: number;
	phase: string;
	reconcile_json: string | null;
	settlement_json: string | null;
	updated_at: string;
}

export class ChapterWorkflowRepository implements ChapterWorkflowRepositoryPort {
	private readonly db: DatabaseSync;

	constructor(db: DatabaseSync) {
		this.db = db;
	}

	get(projectId: string, chapter: number): ChapterWorkflowRecord | null {
		const row = this.db
			.prepare("SELECT * FROM chapter_workflow WHERE project_id = ? AND chapter = ?")
			.get(projectId, chapter) as unknown as WorkflowRow | undefined;
		if (row === undefined) return null;
		const reconcile = row.reconcile_json === null ? null : (JSON.parse(row.reconcile_json) as unknown);
		const settlement = row.settlement_json === null ? null : (JSON.parse(row.settlement_json) as unknown);
		if (!Check(ChapterWorkflowPhaseSchema, row.phase)) throw new Error("Stored chapter workflow has invalid phase");
		if (reconcile !== null && !Check(ReconcileReportSchema, reconcile))
			throw new Error("Stored reconcile report is invalid");
		if (settlement !== null && !Check(ChapterSettlementSchema, settlement))
			throw new Error("Stored chapter settlement is invalid");
		return {
			projectId: row.project_id,
			chapter: row.chapter,
			phase: row.phase as ChapterWorkflowPhase,
			reconcile: reconcile as ReconcileReport | null,
			settlement: settlement as ChapterSettlement | null,
			updatedAt: row.updated_at,
		};
	}

	upsert(record: ChapterWorkflowRecord): void {
		this.db
			.prepare(
				`INSERT INTO chapter_workflow (project_id, chapter, phase, reconcile_json, settlement_json, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?)
				 ON CONFLICT(project_id, chapter) DO UPDATE SET phase=excluded.phase,
				 reconcile_json=excluded.reconcile_json, settlement_json=excluded.settlement_json, updated_at=excluded.updated_at`,
			)
			.run(
				record.projectId,
				record.chapter,
				record.phase,
				record.reconcile === null ? null : JSON.stringify(record.reconcile),
				record.settlement === null ? null : JSON.stringify(record.settlement),
				record.updatedAt,
			);
	}
}
