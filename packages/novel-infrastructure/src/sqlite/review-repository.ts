import type { DatabaseSync } from "node:sqlite";
import {
	type ReviewIssue,
	ReviewIssueSchema,
	type ReviewIssueStatus,
	type ReviewSummary,
} from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";

interface ReviewIssueRow {
	issue_id: string;
	project_id: string;
	source_code: string;
	severity: string;
	priority: string | null;
	scope: string;
	repair_scope: string;
	blocking_for_current_action: number;
	chapter: number | null;
	scene: string | null;
	landing_chapter: number | null;
	message: string;
	evidence: string | null;
	status: string;
	dedup_key: string;
	first_seen_at: string;
	last_seen_at: string;
	resolved_at: string | null;
}

export function reviewIssueDedupKey(issue: {
	sourceCode: string;
	scope: string;
	chapter: number | null;
	landingChapter: number | null;
	scene: string | null;
	message: string;
}): string {
	const scopeKey = issue.scope === "chapter" || issue.scope === "scene" || issue.scope === "future-chapter"
		? `${issue.scope}:${issue.chapter ?? "?"}`
		: issue.scope;
	const landing = issue.landingChapter === null ? "-" : String(issue.landingChapter);
	return `${issue.sourceCode}|${scopeKey}|landing:${landing}|${issue.scene ?? "-"}`;
}

function parseIssue(row: ReviewIssueRow): ReviewIssue {
	const parsed: unknown = {
		issueId: row.issue_id,
		projectId: row.project_id,
		sourceCode: row.source_code,
		severity: row.severity,
		priority: row.priority,
		scope: row.scope,
		repairScope: row.repair_scope,
		blockingForCurrentAction: row.blocking_for_current_action === 1,
		chapter: row.chapter,
		scene: row.scene,
		landingChapter: row.landing_chapter,
		message: row.message,
		evidence: row.evidence,
		status: row.status,
		firstSeenAt: row.first_seen_at,
		lastSeenAt: row.last_seen_at,
		resolvedAt: row.resolved_at,
	};
	if (!Check(ReviewIssueSchema, parsed)) throw new Error("Stored review issue failed contract validation");
	return parsed;
}

// 相同 source identity（dedupKey）的 issue：更新 lastSeen，不创建重复卡片。
export class ReviewRepository {
	private readonly db: DatabaseSync;

	constructor(db: DatabaseSync) {
		this.db = db;
	}

	upsert(issue: ReviewIssue): { created: boolean } {
		const dedupKey = reviewIssueDedupKey(issue);
		const existing = this.db
			.prepare("SELECT issue_id FROM review_issues WHERE project_id = ? AND dedup_key = ?")
			.get(issue.projectId, dedupKey) as { issue_id: string } | undefined;
		if (existing !== undefined) {
			this.db
				.prepare(
					"UPDATE review_issues SET last_seen_at = ?, status = ?, severity = ?, priority = ?, message = ?, blocking_for_current_action = ?, landing_chapter = ?, repair_scope = ? WHERE issue_id = ?",
				)
				.run(
					issue.lastSeenAt,
					issue.status,
					issue.severity,
					issue.priority,
					issue.message,
					issue.blockingForCurrentAction ? 1 : 0,
					issue.landingChapter,
					issue.repairScope,
					existing.issue_id,
				);
			return { created: false };
		}
		this.db
			.prepare(
				"INSERT INTO review_issues (issue_id, project_id, source_code, severity, priority, scope, repair_scope, blocking_for_current_action, chapter, scene, landing_chapter, message, evidence, status, dedup_key, first_seen_at, last_seen_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				issue.issueId,
				issue.projectId,
				issue.sourceCode,
				issue.severity,
				issue.priority,
				issue.scope,
				issue.repairScope,
				issue.blockingForCurrentAction ? 1 : 0,
				issue.chapter,
				issue.scene,
				issue.landingChapter,
				issue.message,
				issue.evidence,
				issue.status,
				dedupKey,
				issue.firstSeenAt,
				issue.lastSeenAt,
				issue.resolvedAt,
			);
		return { created: true };
	}

	list(projectId: string, filter: { severity?: string; scope?: string; chapter?: number; status?: string } = {}): ReviewIssue[] {
		const conditions = ["project_id = ?"];
		const params: Array<string | number> = [projectId];
		if (filter.severity !== undefined) { conditions.push("severity = ?"); params.push(filter.severity); }
		if (filter.scope !== undefined) { conditions.push("scope = ?"); params.push(filter.scope); }
		if (filter.chapter !== undefined) { conditions.push("(chapter = ? OR landing_chapter = ?)"); params.push(filter.chapter, filter.chapter); }
		if (filter.status !== undefined) { conditions.push("status = ?"); params.push(filter.status); }
		const rows = this.db
			.prepare(`SELECT * FROM review_issues WHERE ${conditions.join(" AND ")} ORDER BY first_seen_at DESC`)
			.all(...params) as unknown as ReviewIssueRow[];
		return rows.map(parseIssue);
	}

	updateStatus(issueId: string, status: ReviewIssueStatus, resolvedAt: string | null): void {
		this.db
			.prepare("UPDATE review_issues SET status = ?, resolved_at = ? WHERE issue_id = ?")
			.run(status, resolvedAt, issueId);
	}

	markResolvedBySource(projectId: string, sourceCodes: string[], now: string): number {
		// 本次投影中已消失的来源 → resolved（不在 seen 列表中的 open/acknowledged issue）。
		const result = sourceCodes.length === 0
			? this.db
					.prepare("UPDATE review_issues SET status = 'resolved', resolved_at = ? WHERE project_id = ? AND status IN ('open', 'acknowledged')")
					.run(now, projectId)
			: this.db
					.prepare(
						`UPDATE review_issues SET status = 'resolved', resolved_at = ? WHERE project_id = ? AND source_code NOT IN (${sourceCodes.map(() => "?").join(", ")}) AND status IN ('open', 'acknowledged')`,
					)
					.run(now, projectId, ...sourceCodes);
		return Number(result.changes);
	}

	summary(projectId: string): ReviewSummary {
		const row = this.db
			.prepare(
				"SELECT SUM(CASE WHEN status IN ('open','acknowledged') THEN 1 ELSE 0 END) AS open_count, SUM(CASE WHEN status IN ('open','acknowledged') AND blocking_for_current_action = 1 THEN 1 ELSE 0 END) AS blocking_count, SUM(CASE WHEN status IN ('open','acknowledged') AND severity = 'error' THEN 1 ELSE 0 END) AS error_count, SUM(CASE WHEN status IN ('open','acknowledged') AND severity = 'warning' THEN 1 ELSE 0 END) AS warning_count, MAX(last_seen_at) AS latest_run FROM review_issues WHERE project_id = ?",
			)
			.get(projectId) as { open_count: number | null; blocking_count: number | null; error_count: number | null; warning_count: number | null; latest_run: string | null };
		return {
			openCount: Number(row.open_count ?? 0),
			blockingCount: Number(row.blocking_count ?? 0),
			errorCount: Number(row.error_count ?? 0),
			warningCount: Number(row.warning_count ?? 0),
			latestRunAt: row.latest_run,
		};
	}
}
