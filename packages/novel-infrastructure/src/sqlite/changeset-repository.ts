import type { DatabaseSync } from "node:sqlite";
import { type ChangeOperation, type ChangeSet, ChangeSetSchema } from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";

interface ChangeSetRow {
	changeset_id: string;
	project_id: string;
	title: string;
	status: string;
	kind: string;
	source: string;
	intent: string;
	base_revision: string | null;
	operations_json: string;
	impact_json: string | null;
	review_json: string | null;
	created_at: string;
	updated_at: string;
	committed_at: string | null;
	patch_json: string | null;
	selected_candidate_id: string | null;
}

function parseChangeSet(row: ChangeSetRow): ChangeSet {
	const parsed: unknown = {
		changeSetId: row.changeset_id,
		projectId: row.project_id,
		title: row.title,
		status: row.status,
		kind: row.kind,
		source: row.source,
		intent: row.intent,
		baseRevision: row.base_revision,
		operations: JSON.parse(row.operations_json) as ChangeOperation[],
		...(row.impact_json === null ? {} : { impact: JSON.parse(row.impact_json) }),
		...(row.review_json === null ? {} : { review: JSON.parse(row.review_json) }),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		...(row.committed_at === null ? {} : { committedAt: row.committed_at }),
		...(row.patch_json === null ? {} : { patch: JSON.parse(row.patch_json) }),
		...(row.selected_candidate_id === null ? {} : { selectedCandidateId: row.selected_candidate_id }),
	};
	if (!Check(ChangeSetSchema, parsed)) throw new Error("Stored change set failed contract validation");
	return parsed;
}

export class ChangeSetRepository {
	private readonly db: DatabaseSync;

	constructor(db: DatabaseSync) {
		this.db = db;
	}

	create(changeSet: ChangeSet): void {
		this.db
			.prepare(
				"INSERT INTO changesets (changeset_id, project_id, title, status, kind, source, intent, base_revision, operations_json, impact_json, review_json, created_at, updated_at, committed_at, patch_json, selected_candidate_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				changeSet.changeSetId,
				changeSet.projectId,
				changeSet.title,
				changeSet.status,
				changeSet.kind,
				changeSet.source,
				changeSet.intent,
				changeSet.baseRevision,
				JSON.stringify(changeSet.operations),
				changeSet.impact === undefined ? null : JSON.stringify(changeSet.impact),
				changeSet.review === undefined ? null : JSON.stringify(changeSet.review),
				changeSet.createdAt,
				changeSet.updatedAt,
				changeSet.committedAt ?? null,
				changeSet.patch === undefined ? null : JSON.stringify(changeSet.patch),
				changeSet.selectedCandidateId ?? null,
			);
	}

	update(changeSet: ChangeSet): void {
		this.db
			.prepare(
				"UPDATE changesets SET title = ?, status = ?, operations_json = ?, impact_json = ?, review_json = ?, updated_at = ?, committed_at = ?, patch_json = ?, selected_candidate_id = ? WHERE changeset_id = ?",
			)
			.run(
				changeSet.title,
				changeSet.status,
				JSON.stringify(changeSet.operations),
				changeSet.impact === undefined ? null : JSON.stringify(changeSet.impact),
				changeSet.review === undefined ? null : JSON.stringify(changeSet.review),
				changeSet.updatedAt,
				changeSet.committedAt ?? null,
				changeSet.patch === undefined ? null : JSON.stringify(changeSet.patch),
				changeSet.selectedCandidateId ?? null,
				changeSet.changeSetId,
			);
	}

	get(changeSetId: string): ChangeSet | null {
		const row = this.db.prepare("SELECT * FROM changesets WHERE changeset_id = ?").get(changeSetId) as
			| ChangeSetRow
			| undefined;
		return row === undefined ? null : parseChangeSet(row);
	}

	listByProject(projectId: string): ChangeSet[] {
		const rows = this.db
			.prepare("SELECT * FROM changesets WHERE project_id = ? ORDER BY created_at DESC")
			.all(projectId) as unknown as ChangeSetRow[];
		return rows.map(parseChangeSet);
	}

	listPending(projectId: string): ChangeSet[] {
		const rows = this.db
			.prepare(
				"SELECT * FROM changesets WHERE project_id = ? AND status IN ('proposed', 'reviewing', 'accepted') ORDER BY created_at ASC",
			)
			.all(projectId) as unknown as ChangeSetRow[];
		return rows.map(parseChangeSet);
	}
}
