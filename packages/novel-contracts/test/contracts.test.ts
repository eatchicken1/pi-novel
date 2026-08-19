import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import {
	AgentRunSchema,
	ChangeSetSchema,
	CommitRecordSchema,
	ConfigureModelApiKeyInputSchema,
	ForgeSessionSchema,
	ManuscriptPatchSchema,
	NovelTaskSchema,
	ProjectCheckpointSchema,
	ProjectManifestSchema,
	ReviewIssueSchema,
	RevisionImpactSchema,
	StoryGraphQuerySchema,
	StoryGraphSchema,
	StudioSnapshotSchema,
	TaskEventSchema,
	TextAnchorSchema,
	WorkspaceManifestSchema,
} from "../src/index.ts";

describe("novel runtime contracts", () => {
	it("accepts a valid workspace manifest", () => {
		expect(
			Check(WorkspaceManifestSchema, {
				schemaVersion: 1,
				workspaceId: "workspace-1",
				rootPath: "D:\\Novels",
				createdAt: "2026-08-16T10:00:00.000Z",
				updatedAt: "2026-08-16T10:01:00.000Z",
			}),
		).toBe(true);
	});

	it("rejects an invalid workspace manifest", () => {
		expect(
			Check(WorkspaceManifestSchema, {
				schemaVersion: 1,
				workspaceId: "",
				rootPath: "D:\\Novels",
				createdAt: "not-a-date",
				updatedAt: "2026-08-16T10:01:00.000Z",
			}),
		).toBe(false);
	});

	it("accepts and rejects native project manifests at runtime", () => {
		expect(
			Check(ProjectManifestSchema, {
				schemaVersion: 1,
				projectId: "project-1",
				title: "A Project",
				language: "zh-CN",
				createdAt: null,
				updatedAt: null,
			}),
		).toBe(true);
		expect(
			Check(ProjectManifestSchema, {
				schemaVersion: 1,
				projectId: "folder/project-1",
				title: "A Project",
				language: "zh-CN",
				createdAt: null,
				updatedAt: null,
			}),
		).toBe(false);
	});

	it("keeps Forge state and provider credentials runtime validated", () => {
		expect(Check(ConfigureModelApiKeyInputSchema, { providerId: "deepseek", apiKey: "sk-test" })).toBe(true);
		expect(Check(ConfigureModelApiKeyInputSchema, { providerId: "deepseek", apiKey: "" })).toBe(false);
		expect(
			Check(ForgeSessionSchema, {
				forgeSessionId: "session-1",
				workspaceId: "workspace-1",
				status: "draft",
				seed: "island",
				titleCandidate: null,
				narrativeDNA: null,
				hardConstraints: [],
				preferences: [],
				createdAt: "2026-08-16T10:00:00.000Z",
				updatedAt: "2026-08-16T10:00:00.000Z",
				selectedCandidateId: null,
				committedAt: null,
				materializedProjectId: null,
				currentTaskId: null,
				runtimeRelativePath: ".pi-novel/sessions/session-1",
				failureCode: null,
				failureMessage: null,
			}),
		).toBe(true);
	});
});

describe("product backend contracts", () => {
	it("validates text anchors, manuscript patches and partial revision impact", () => {
		const impact = {
			severity: "safe-local",
			causalCoverage: "partial",
			items: [
				{
					category: "CURRENT_CHAPTER",
					certainty: "KNOWN",
					description: "selected text",
					evidence: { sourceType: "chapter", sourceId: "1", chapterId: "1", description: "author selection" },
				},
			],
			affectedChapters: [1],
			affectedCharacters: [],
			affectedThreads: [],
			affectedClues: [],
			affectedPromises: [],
			summary: "partial",
			analyzedAt: "2026-08-19T00:00:00.000Z",
		} as const;
		expect(Check(RevisionImpactSchema, impact)).toBe(true);
		expect(
			Check(TextAnchorSchema, {
				chapterId: "1",
				baseContentHash: "a",
				startOffset: 0,
				endOffset: 4,
				selectedTextHash: "b",
				prefixContext: "",
				suffixContext: "",
			}),
		).toBe(true);
		expect(
			Check(ManuscriptPatchSchema, {
				goal: "tighten",
				target: "manuscript/chapter-001.md",
				constraints: ["facts"],
				operations: [
					{
						operationId: "patch-op-1",
						kind: "replace-text",
						target: "manuscript/chapter-001.md",
						baseHash: "a",
						startChar: 0,
						endChar: 4,
						text: "new",
					},
				],
				impact,
				provenance: { agentId: "chapter.reviser", runtimeModelId: "provider/model", thinkingLevel: "high" },
				baseRevision: 1,
				baseContentHash: "a",
				anchor: {
					chapterId: "1",
					baseContentHash: "a",
					startOffset: 0,
					endOffset: 4,
					selectedTextHash: "b",
					prefixContext: "",
					suffixContext: "",
				},
				candidates: [{ candidateId: "candidate-1", original: "old", replacement: "new", explanation: "tighten" }],
			}),
		).toBe(true);
	});
	it("ChangeSet with operations, impact and review validates at runtime", () => {
		expect(
			Check(ChangeSetSchema, {
				changeSetId: "cs-1",
				projectId: "p-1",
				title: "Rewrite chapter 3",
				status: "proposed",
				kind: "content",
				source: "agent",
				intent: "increase-subtext",
				baseRevision: "rev-2",
				operations: [
					{
						operationId: "op-1",
						kind: "replace-text",
						target: "manuscript/chapter-003.md",
						startChar: 10,
						endChar: 40,
						text: "新的句子",
					},
				],
				impact: {
					severity: "downstream-review",
					affectedChapters: [3, 4],
					affectedCharacters: ["heroine"],
					affectedThreads: [],
					affectedClues: [],
					affectedPromises: [],
					summary: "chapter 3 prose change",
					analyzedAt: "2026-08-16T10:00:00.000Z",
				},
				createdAt: "2026-08-16T10:00:00.000Z",
				updatedAt: "2026-08-16T10:00:00.000Z",
			}),
		).toBe(true);
	});

	it("ChangeSet rejects unknown operation kind and unknown properties", () => {
		expect(
			Check(ChangeSetSchema, {
				changeSetId: "cs-2",
				projectId: "p-1",
				title: "bad",
				status: "proposed",
				kind: "content",
				source: "agent",
				intent: "x",
				baseRevision: "rev-2",
				operations: [{ operationId: "op-1", kind: "not-a-kind", target: "a.md" }],
				createdAt: "2026-08-16T10:00:00.000Z",
				updatedAt: "2026-08-16T10:00:00.000Z",
			}),
		).toBe(false);
		expect(
			Check(ChangeSetSchema, {
				changeSetId: "cs-3",
				projectId: "p-1",
				title: "bad",
				status: "proposed",
				kind: "content",
				source: "agent",
				intent: "x",
				baseRevision: "rev-2",
				operations: [{ operationId: "op-1", kind: "replace-text", target: "a.md" }],
				createdAt: "2026-08-16T10:00:00.000Z",
				updatedAt: "2026-08-16T10:00:00.000Z",
				unexpectedField: true,
			}),
		).toBe(false);
	});

	it("ReviewIssue separates severity from blockingForCurrentAction", () => {
		expect(
			Check(ReviewIssueSchema, {
				issueId: "iss-1",
				projectId: "p-1",
				sourceCode: "REALIZED_REVEAL_BEFORE_PROOF",
				severity: "error",
				priority: "P0",
				scope: "future-chapter",
				repairScope: "event-graph",
				blockingForCurrentAction: false,
				chapter: null,
				scene: null,
				landingChapter: 5,
				message: "clue CL6 is never realized",
				evidence: null,
				status: "open",
				firstSeenAt: "2026-08-16T10:00:00.000Z",
				lastSeenAt: "2026-08-16T10:00:00.000Z",
				resolvedAt: null,
			}),
		).toBe(true);
		// future-chapter P0 with blockingForCurrentAction=false must not be a chapter-1 blocker
		const futureP0 = Check(ReviewIssueSchema, {
			issueId: "iss-2",
			projectId: "p-1",
			sourceCode: "REALIZED_REVEAL_BEFORE_PROOF",
			severity: "error",
			priority: "P0",
			scope: "future-chapter",
			repairScope: "event-graph",
			blockingForCurrentAction: false,
			chapter: null,
			scene: null,
			landingChapter: 5,
			message: "x",
			evidence: null,
			status: "open",
			firstSeenAt: "2026-08-16T10:00:00.000Z",
			lastSeenAt: "2026-08-16T10:00:00.000Z",
			resolvedAt: null,
		});
		expect(futureP0).toBe(true);
	});

	it("StoryGraph accepts typed nodes and edges with filters", () => {
		expect(
			Check(StoryGraphSchema, {
				projectId: "p-1",
				nodes: [
					{ nodeId: "ev-1", type: "event", ref: "1", label: "接案", chapter: 1, meta: {} },
					{
						nodeId: "clue-1",
						type: "clue",
						ref: "CL1",
						label: "门禁记录",
						chapter: 1,
						meta: { reliability: "medium" },
					},
				],
				edges: [{ edgeId: "e-1", sourceNodeId: "ev-1", targetNodeId: "clue-1", type: "reveals", label: null }],
				sourceHash: "abc",
				generatedAt: "2026-08-16T10:00:00.000Z",
			}),
		).toBe(true);
		expect(
			Check(StoryGraphQuerySchema, {
				chapterFrom: 1,
				chapterTo: 8,
				nodeTypes: ["event", "clue"],
				characterId: "heroine",
			}),
		).toBe(true);
	});

	it("History entries and checkpoints validate", () => {
		expect(
			Check(CommitRecordSchema, {
				commitId: "cm-1",
				projectId: "p-1",
				changeSetId: "cs-1",
				actor: "user",
				summary: "edit chapter 3",
				affectedFiles: ["manuscript/chapter-003.md"],
				beforeHashes: { "manuscript/chapter-003.md": "a" },
				afterHashes: { "manuscript/chapter-003.md": "b" },
				resolvedIssueCount: 2,
				createdAt: "2026-08-16T10:00:00.000Z",
			}),
		).toBe(true);
		expect(
			Check(ProjectCheckpointSchema, {
				checkpointId: "cp-1",
				projectId: "p-1",
				label: "before big rewrite",
				manifestHashes: { "manuscript/chapter-001.md": "x" },
				createdAt: "2026-08-16T10:00:00.000Z",
			}),
		).toBe(true);
	});

	it("Tasks carry events and agent runs", () => {
		expect(
			Check(NovelTaskSchema, {
				taskId: "t-1",
				projectId: "p-1",
				forgeSessionId: null,
				type: "generate-chapter",
				status: "running",
				progress: { phase: "drafting", percent: 40 },
				resultRef: null,
				errorMessage: null,
				createdAt: "2026-08-16T10:00:00.000Z",
				startedAt: "2026-08-16T10:00:00.000Z",
				completedAt: null,
				updatedAt: "2026-08-16T10:00:00.000Z",
			}),
		).toBe(true);
		expect(
			Check(TaskEventSchema, {
				eventId: "ev-1",
				taskId: "t-1",
				sequence: 1,
				type: "task.started",
				createdAt: "2026-08-16T10:00:00.000Z",
			}),
		).toBe(true);
		expect(
			Check(AgentRunSchema, {
				agentRunId: "r-1",
				taskId: "t-1",
				model: "faux-1",
				intent: "explore",
				status: "succeeded",
				startedAt: "2026-08-16T10:00:00.000Z",
				completedAt: "2026-08-16T10:00:00.000Z",
				usage: { tokens: 100 },
				producedArtifacts: ["work/authoring/directions.json"],
			}),
		).toBe(true);
	});

	it("StudioSnapshot contains only UI-needed read model data", () => {
		expect(
			Check(StudioSnapshotSchema, {
				project: {
					projectId: "p-1",
					title: "A",
					rootPath: "D:\\Novels\\a",
					kind: "native",
					status: "ready",
					wordCount: 1200,
					lastModifiedAt: "2026-08-16T10:00:00.000Z",
					manifest: null,
				},
				detail: {
					projectId: "p-1",
					title: "A",
					path: "D:\\Novels\\a",
					kind: "native",
					status: "ready",
					primaryGenre: "female-social-suspense",
					relationshipMechanisms: [],
					wordCount: 1200,
					chapterCount: 1,
					currentChapter: 1,
					memoryStatus: "current",
					currentMovement: "m1",
					updatedAt: "2026-08-16T10:00:00.000Z",
				},
				chapters: [],
				activeChapter: 1,
				manuscriptRevision: 0,
				pendingChangeSets: [],
				activeTasks: [],
				reviewSummary: { openCount: 0, blockingCount: 0, errorCount: 0, warningCount: 0, latestRunAt: null },
				workflowStatus: "drafting",
				recommendedNextActions: [{ tool: "diagnose_chapter", reason: "诊断后定稿", chapter: 1 }],
			}),
		).toBe(true);
	});
});
