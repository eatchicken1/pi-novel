import type { DatabaseSync } from "node:sqlite";
import type { ChapterMetadata, ChapterMetadataRepositoryPort } from "@earendil-works/pi-novel-application";

interface ChapterMetadataRow {
	project_id: string;
	chapter: number;
	order_index: number;
	title: string;
	file_path: string;
	draft_revision: number;
	content_hash: string;
	mtime: string;
	workflow_status: "draft" | "finalized";
	created_at: string;
	updated_at: string;
}

export class ChapterMetadataRepository implements ChapterMetadataRepositoryPort {
	private readonly db: DatabaseSync;

	constructor(db: DatabaseSync) {
		this.db = db;
	}

	list(projectId: string): ChapterMetadata[] {
		return (
			this.db
				.prepare("SELECT * FROM chapter_metadata WHERE project_id = ? ORDER BY order_index")
				.all(projectId) as unknown as ChapterMetadataRow[]
		).map(toMetadata);
	}

	get(projectId: string, chapter: number): ChapterMetadata | null {
		const row = this.db
			.prepare("SELECT * FROM chapter_metadata WHERE project_id = ? AND chapter = ?")
			.get(projectId, chapter) as unknown as ChapterMetadataRow | undefined;
		return row === undefined ? null : toMetadata(row);
	}

	create(metadata: ChapterMetadata): void {
		this.db
			.prepare(
				`INSERT INTO chapter_metadata
			(project_id, chapter, order_index, title, file_path, draft_revision, content_hash, mtime, workflow_status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				metadata.projectId,
				metadata.chapter,
				metadata.orderIndex,
				metadata.title,
				metadata.filePath,
				metadata.draftRevision,
				metadata.contentHash,
				metadata.mtime,
				metadata.workflowStatus,
				metadata.createdAt,
				metadata.updatedAt,
			);
	}

	update(metadata: ChapterMetadata): void {
		this.db
			.prepare(
				`UPDATE chapter_metadata SET order_index = ?, title = ?, file_path = ?, draft_revision = ?, content_hash = ?, mtime = ?, workflow_status = ?, updated_at = ?
			WHERE project_id = ? AND chapter = ?`,
			)
			.run(
				metadata.orderIndex,
				metadata.title,
				metadata.filePath,
				metadata.draftRevision,
				metadata.contentHash,
				metadata.mtime,
				metadata.workflowStatus,
				metadata.updatedAt,
				metadata.projectId,
				metadata.chapter,
			);
	}
}

function toMetadata(row: ChapterMetadataRow): ChapterMetadata {
	return {
		projectId: row.project_id,
		chapter: row.chapter,
		orderIndex: row.order_index,
		title: row.title,
		filePath: row.file_path,
		draftRevision: row.draft_revision,
		contentHash: row.content_hash,
		mtime: row.mtime,
		workflowStatus: row.workflow_status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}
