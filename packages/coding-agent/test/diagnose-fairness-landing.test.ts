import { readdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

// 回归：diagnoseChapter 的全书级 realized-fairness 问题按「修复落点」分流——
// 落点不在本章时不得卡死本章诊断（真实案例里第一章被第 5/7 章的 fairness 问题反复 block，
// 模型空转 4 次）；落点在本章才保留 P0。
describe("diagnose fairness landing", () => {
	async function withProject<T>(
		name: string,
		setup: (store: NovelProjectStore, projectId: string, cwd: string) => Promise<T>,
	): Promise<T> {
		const cwd = await mkdtemp(join(tmpdir(), `pi-novel-fairland-${name}-`));
		try {
			return await setup(new NovelProjectStore(cwd), name, cwd);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	}

	function anchor(content: string, start: number): { startChar: number; endChar: number; excerpt: string } {
		const normalized = [...content.replace(/\s+/gu, "")].join("");
		const safeStart = Math.min(start, Math.max(0, normalized.length - 10));
		const endChar = Math.min(normalized.length, safeStart + 10);
		return { startChar: safeStart, endChar, excerpt: normalized.slice(safeStart, endChar) };
	}

	it("FAIR-L1: fairness issues landing in another chapter do not block this chapter diagnosis", async () => {
		await withProject("l1", async (store, projectId) => {
			await store.initializeNovel({
				projectId,
				title: "fairland",
				genre: "female-social-suspense",
				storyProfile: {
					primaryGenre: "female-social-suspense",
					relationshipMechanisms: [],
					storyForm: "mid-length",
					audience: "female",
					setting: "contemporary-china",
				},
			});
			await store.saveMysteryCase({
				projectId,
				status: "proposed",
				case: {
					id: "case-f",
					centralQuestion: "为什么死亡时间对不上",
					truthSummary: "死亡时间被伪造",
					truthClaims: [
						{
							id: "T1",
							statement: "死亡发生在等待期内",
							category: "timeline",
							dependsOnClaimIds: [],
							proofRequirement: "门禁记录",
							proofPaths: [{ id: "PP1", clueIds: ["C2"], prerequisiteClaimIds: [] }],
							plannedRevealChapter: 2,
							importance: 5,
						},
					],
					finalAnswerClaimIds: ["T1"],
					socialCore: {
						socialQuestion: "核赔流程为何放任伪造",
						institutionalContext: "外包核赔",
						powerAsymmetry: "信息不对等",
						beneficiaries: ["核赔负责人"],
						costBearers: ["投保人"],
						stakesBeyondRelationship: ["行业声誉"],
					},
				},
			});
			await store.saveMysteryClueLedger({
				projectId,
				clues: [
					{
						id: "C1",
						observableFact: "门禁凭证被使用",
						sourceType: "institutional-record",
						sourceDescription: "门禁系统",
						firstAvailableChapter: 1,
						plannedRealizationChapter: 1,
						truthClaimIds: ["T1"],
						reliability: "medium",
						interpretationOptions: [],
						actualImplication: "持有人不等于在场人",
						clueRole: "ambiguous",
					},
					{
						id: "C2",
						observableFact: "加保签字笔迹",
						sourceType: "document",
						sourceDescription: "加保材料",
						firstAvailableChapter: 1,
						plannedRealizationChapter: 2,
						truthClaimIds: ["T1"],
						reliability: "medium",
						interpretationOptions: [],
						actualImplication: "签字人知情",
						clueRole: "ambiguous",
					},
				],
			});
			await store.saveSocialSuspenseDesign({
				projectId,
				design: {
					socialArchitecture: {
						centralSocialQuestion: "核赔流程为何放任伪造",
						institutionalSystem: "外包核赔",
						everydayEntryPoint: "她按流程核验一单理赔",
						hiddenPowerStructure: "负责人兼管调查结论",
						protagonistPosition: "调查员",
						vulnerableGroups: ["投保人家属"],
						beneficiaries: ["核赔负责人"],
						normalizedHarm: ["时间戳被替换"],
						investigationPressure: ["结案时限"],
						personalCostChannels: ["职业问责"],
						publicPrivateCollision: "受益人是丈夫家族",
						resolutionScope: "个案澄清",
						unresolvedSocialResidue: ["外包模式仍在"],
						systemMechanisms: [
							{
								id: "m1",
								institutionOrNorm: "结论须经审批",
								powerHolder: "负责人",
								mechanism: "结论被压缩",
								whoBenefits: "核赔负责人",
								whoPays: "投保人",
								observableStoryEffects: ["结论被压"],
								relatedMysteryClaimIds: ["T1"],
								relatedProfessionalRefIds: [],
								relatedMarriageRefIds: [],
								eventIds: [1],
							},
						],
					},
					truthLayerMap: [{ claimId: "T1", layer: "system" }],
					suspense: { falseModel: { statement: "丈夫只是隐瞒了外遇", replacedByClaimIds: ["T1"] } },
					marriagePatterns: [],
					professionalDilemmas: [],
					professionalPlotDependency: {
						irreplaceabilityStatement: "只有她能调档案",
						dependencyChannels: ["职业权限获取线索"],
					},
					chaseArcReview: {
						wrongPursuitRootedInFlaw: true,
						wrongPursuitExplanation: "x",
						repairAddressesHarmMechanism: true,
						repairExplanation: "x",
						regretWithBeliefChange: true,
						regretExplanation: "x",
					},
					collisionAnalysis: [],
					antagonisticForces: [],
					socialResolution: {
						personalResolution: "她搬出去",
						caseResolution: "结论被纠正",
						unresolvedResidue: ["x"],
					},
					themeArchitecture: [],
					storyMovements: [
						{
							id: "m1",
							chapters: [1],
							dominantQuestion: "q1",
							protagonistGoal: "核验",
							externalPressure: "时限",
							relationshipPressure: "x",
							professionalPressure: "x",
							irreversibleChange: "x",
							exitCondition: "x",
							eventIds: [1],
						},
						{
							id: "m2",
							chapters: [2],
							dominantQuestion: "q2",
							protagonistGoal: "证明",
							externalPressure: "x",
							relationshipPressure: "x",
							professionalPressure: "x",
							irreversibleChange: "x",
							exitCondition: "x",
							eventIds: [2],
						},
					],
					commercialForm: {
						openingAnomalyChapter: 1,
						lateExpositionChapters: [],
						chapterExits: [
							{ chapter: 1, kind: "threat" },
							{ chapter: 2, kind: "contradiction" },
						],
					},
					supportingCharacters: [],
				} as never,
			});

			const prose1 =
				"她把保单材料摊开核对时间戳，门禁记录与死亡证明对不上，她给调查科打了电话，把复印件收进档案袋锁好。".repeat(
					2,
				);
			const prose2 = "她翻开加保材料最后一页，签字那一点顿得很重，她把材料压进枕头底下，关灯躺下。".repeat(2);
			const events = [
				{
					eventId: 1,
					chapter: 1,
					chronology: "present",
					pov: "heroine-first-person",
					storyGoal: "g",
					conflict: "c",
					action: "a",
					consequence: "c",
					characterDeltas: [{ characterId: "heroine", dimension: "knowledge", from: "未知", to: "怀疑" }],
					resourceDeltas: [],
					riskDeltas: [{ label: "职业风险", change: "升级" }],
					causes: [],
					irreversible: false,
					cannotRemoveBecause: "x",
					mysteryDelta: {
						discoveredClueIds: ["C1"],
						readerRevealedClueIds: [],
						claimKnowledgeChanges: [],
						suspectChanges: [],
						interpretationChanges: [],
						proofProgressClaimIds: [],
						revealClaimIds: [],
					},
				} as never,
				{
					eventId: 2,
					chapter: 2,
					chronology: "present",
					pov: "heroine-first-person",
					storyGoal: "g",
					conflict: "c",
					action: "a",
					consequence: "c",
					characterDeltas: [{ characterId: "heroine", dimension: "knowledge", from: "未知", to: "怀疑" }],
					resourceDeltas: [],
					riskDeltas: [{ label: "职业风险", change: "升级" }],
					causes: [],
					irreversible: false,
					cannotRemoveBecause: "x",
					mysteryDelta: {
						discoveredClueIds: [],
						readerRevealedClueIds: [],
						claimKnowledgeChanges: [],
						suspectChanges: [],
						interpretationChanges: [],
						proofProgressClaimIds: [],
						revealClaimIds: ["T1"],
					},
				} as never,
			];
			await store.saveUnifiedEventMap({ projectId, chapter: 1, events: [events[0]] });
			await store.saveUnifiedEventMap({ projectId, chapter: 2, events: [events[1]] });

			for (const chapter of [1, 2]) {
				const plan = await store.planChapter({
					projectId,
					chapter,
					plan: {
						chapterGoal: "推进",
						openingState: "开始",
						eventIds: [chapter],
						sceneDesign: [
							{
								sceneId: "s1",
								order: 1,
								location: "办公室",
								goal: "推进",
								opposition: "阻力",
								stakes: "st",
								emotionalTurn: "t",
								informationReveal: [],
							},
						],
						informationControl: "i",
						emotionalMovement: "e",
						professionalConstraints: "p",
						relationshipMovement: "r",
						chapterExitPressure: "威胁",
						targetLength: 500,
						cannotRemoveBecause: "x",
					},
				});
				expect(plan.status, JSON.stringify(plan)).toBe("completed");
				const prose = chapter === 1 ? prose1 : prose2;
				const draft = await store.draftChapter({
					projectId,
					chapter,
					eventDrafts: [{ eventId: chapter, content: prose }],
					semanticReports: [
						{
							eventId: chapter,
							actionShown: true,
							consequenceShown: true,
							deltaEvidence: [{ dimension: "information", evidence: anchor(prose, 0) }],
						},
					],
				});
				expect(draft.status, JSON.stringify(draft)).toBe("completed");
				await store.saveNarrativeRealizations({
					projectId,
					chapter,
					draftRevision: Number(draft.draftRevision ?? 1),
					records: [
						{
							recordId: `ev${chapter}`,
							contentType: "unified-event" as const,
							engineRef: String(chapter),
							anchor: anchor(prose, 0),
						},
						...(chapter === 1
							? [
									{
										recordId: "clue-c1",
										contentType: "mystery-clue" as const,
										engineRef: "C1",
										anchor: anchor(prose, 30),
									},
								]
							: [
									{
										recordId: "reveal-t1",
										contentType: "mystery-reveal" as const,
										engineRef: "T1",
										anchor: anchor(prose, 30),
									},
								]),
					],
				});
			}

			// ch1：fairness 落点 ch2 ≠ 本章 → 不得 blocked
			const d1 = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(d1.verdict, JSON.stringify(d1.findings)).not.toBe("blocked");
			for (const finding of d1.findings) {
				expect(
					finding.problem.includes("REALIZED_REVEAL_BEFORE_PROOF") ||
						finding.problem.includes("REALIZED_CLUE_NEVER_REALIZED"),
				).toBe(false);
			}

			// ch2：fairness 落点 = 本章 → 保留 P0 → blocked
			const d2 = await store.diagnoseChapter({ projectId, chapter: 2 });
			expect(d2.verdict, JSON.stringify(d2.findings)).toBe("blocked");
			expect(
				d2.findings.some(
					(finding) =>
						finding.priority === "P0" &&
						(finding.sourceIssues.includes("REALIZED_REVEAL_BEFORE_PROOF") ||
							finding.problem.includes("REALIZED_REVEAL_BEFORE_PROOF")),
				),
			).toBe(true);
		});
	});

	it("FAIR-L2: identical repeated checks do not append new versioned report files", async () => {
		await withProject("l2", async (store, projectId, cwd) => {
			await store.initializeNovel({
				projectId,
				title: "dedup",
				genre: "general-fiction",
				storyProfile: {
					primaryGenre: "general-fiction",
					relationshipMechanisms: [],
					storyForm: "mid-length",
					audience: "female",
					setting: "contemporary-china",
				},
			});
			const prose =
				"她把保单材料摊开核对时间戳，门禁记录与死亡证明对不上，她给调查科打了电话，把复印件收进档案袋锁好。".repeat(
					2,
				);
			await store.saveUnifiedEventMap({
				projectId,
				chapter: 1,
				events: [
					{
						eventId: 1,
						chapter: 1,
						chronology: "present",
						pov: "heroine-first-person",
						storyGoal: "g",
						conflict: "c",
						action: "a",
						consequence: "c",
						characterDeltas: [{ characterId: "heroine", dimension: "knowledge", from: "未知", to: "怀疑" }],
						resourceDeltas: [],
						riskDeltas: [{ label: "职业风险", change: "升级" }],
						causes: [],
						irreversible: false,
						cannotRemoveBecause: "x",
					} as never,
				],
			});
			const plan = await store.planChapter({
				projectId,
				chapter: 1,
				plan: {
					chapterGoal: "推进",
					openingState: "开始",
					eventIds: [1],
					sceneDesign: [
						{
							sceneId: "s1",
							order: 1,
							location: "办公室",
							goal: "推进",
							opposition: "阻力",
							stakes: "st",
							emotionalTurn: "t",
							informationReveal: [],
						},
					],
					informationControl: "i",
					emotionalMovement: "e",
					professionalConstraints: "p",
					relationshipMovement: "r",
					chapterExitPressure: "威胁",
					targetLength: 500,
					cannotRemoveBecause: "x",
				},
			});
			expect(plan.status).toBe("completed");
			const draft = await store.draftChapter({
				projectId,
				chapter: 1,
				eventDrafts: [{ eventId: 1, content: prose }],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(prose, 0) }],
					},
				],
			});
			expect(draft.status).toBe("completed");

			const versionedDir = join(cwd, "novels", projectId, "continuity", "reports");
			const countVersions = (): number =>
				readdirSync(versionedDir).filter((file) => /^chapter-001-event-001-unified-r\d+\.json$/u.test(file)).length;
			const before = countVersions();
			await store.checkUnifiedEventDraft({ projectId, chapter: 1, eventId: 1 });
			const afterFirst = countVersions();
			// 相同输入重复调用：不追加新版本
			await store.checkUnifiedEventDraft({ projectId, chapter: 1, eventId: 1 });
			const afterSecond = countVersions();
			expect(afterFirst).toBeGreaterThanOrEqual(before);
			expect(afterSecond).toBe(afterFirst);
		});
	});
});
