import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
	MarriageEconomicItem,
	MarriageExitConstraint,
	MarriageResponsibility,
	MatureMarriageRestructuringPlan,
	MatureMarriageStructure,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
import { isMarriagePrivatePath } from "../../../.pi/extensions/novel-agent/services/marriage-checker.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

function structure(overrides: Partial<MatureMarriageStructure> = {}): MatureMarriageStructure {
	return {
		id: "marriage-1",
		protagonistCharacterId: "heroine",
		spouseCharacterId: "husband",
		economicItems: [],
		responsibilities: [],
		decisionRights: [],
		socialTies: [],
		inertiaFactors: [],
		exitConstraints: [],
		...overrides,
	};
}

function economicItem(id: string, overrides: Partial<MarriageEconomicItem> = {}): MarriageEconomicItem {
	return {
		id,
		kind: "asset",
		description: `asset ${id}`,
		control: "shared",
		protagonistAccess: "full",
		spouseAccess: "full",
		exitConsequence: "split between parties",
		relatedResponsibilityIds: [],
		...overrides,
	};
}

function responsibility(
	id: string,
	domain: MarriageResponsibility["domain"],
	overrides: Partial<MarriageResponsibility> = {},
): MarriageResponsibility {
	return {
		id,
		domain,
		description: `responsibility ${id}`,
		beneficiaryDescription: "household",
		actualPrimaryBearer: "protagonist",
		frequency: "daily",
		substitutability: "difficult",
		failureConsequence: "household breaks down",
		recognizedByBoth: "unknown",
		relatedEconomicItemIds: [],
		...overrides,
	};
}

function exitConstraint(id: string, overrides: Partial<MarriageExitConstraint> = {}): MarriageExitConstraint {
	return {
		id,
		category: "housing",
		description: `constraint ${id}`,
		sourceRefIds: [],
		affectedParties: ["heroine", "husband"],
		severity: "medium",
		timeHorizon: "short-term",
		reducibility: "reducible",
		mitigationOptions: [],
		unresolvedConsequence: "no alternative housing",
		...overrides,
	};
}

function plan(overrides: Partial<MatureMarriageRestructuringPlan> = {}): MatureMarriageRestructuringPlan {
	return {
		id: "plan-1",
		mode: "remain-with-renegotiation",
		protagonistGoal: "regain control of her income",
		resourceChanges: [],
		responsibilityChanges: [],
		decisionRightChanges: [],
		socialTieChanges: [],
		constraintResponses: [],
		nonNegotiableBoundaries: [],
		unresolvedDependencies: [],
		...overrides,
	};
}

async function initProject(
	store: NovelProjectStore,
	projectId: string,
	mechanisms: string[],
	genre: string,
	primaryGenre: string,
): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "mature",
		genre,
		storyProfile: { primaryGenre, relationshipMechanisms: mechanisms },
	});
}

describe("mature marriage crisis engine", () => {
	it("MM1: plain mature-marriage-crisis project gets marriage tools but no chase-wife tools", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "mm1", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			await expect(
				store.saveMatureMarriageStructure({ projectId: "mm1", status: "proposed", structure: structure() }),
			).resolves.toBeTruthy();
			await expect(store.checkChaseWifeArc({ projectId: "mm1" })).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM2: plain chase-wife projects cannot call marriage tools", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "mm2", title: "legacy", genre: "chase-wife" });
			await expect(
				store.saveMatureMarriageStructure({ projectId: "mm2", status: "proposed", structure: structure() }),
			).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM3: female-social-suspense + mature-marriage-crisis gets mystery and marriage but no chase-wife", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(
				store,
				"mm3",
				["mature-marriage-crisis"],
				"female-social-suspense",
				"female-social-suspense",
			);
			await expect(
				store.saveMatureMarriageStructure({ projectId: "mm3", status: "proposed", structure: structure() }),
			).resolves.toBeTruthy();
			await expect(store.checkMysteryDesign({ projectId: "mm3" })).resolves.toBeTruthy();
			await expect(store.checkChaseWifeArc({ projectId: "mm3" })).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM4: all three capabilities coexist and context loads all engines", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(
				store,
				"mm4",
				["mature-marriage-crisis", "chase-wife"],
				"female-social-suspense",
				"female-social-suspense",
			);
			await store.saveMatureMarriageStructure({ projectId: "mm4", status: "proposed", structure: structure() });
			await store.saveMysteryClueLedger({
				projectId: "mm4",
				clues: [
					{
						id: "C1",
						observableFact: "f",
						sourceType: "digital",
						sourceDescription: "s",
						firstAvailableChapter: 1,
						truthClaimIds: [],
						reliability: "medium",
						interpretationOptions: [],
						actualImplication: "i",
						clueRole: "fair",
					},
				],
			});
			const projectRoot = join(cwd, "novels", "mm4");
			await mkdir(join(projectRoot, "outline", "genre"), { recursive: true });
			await writeFile(
				join(projectRoot, "outline", "genre", "chase-wife-beat-sheet.json"),
				JSON.stringify({ version: 2, genre: "chase-wife", beats: [] }),
				"utf8",
			);
			await expect(store.checkChaseWifeArc({ projectId: "mm4" })).resolves.toBeTruthy();
			const context = await store.readStoryContext({ projectId: "mm4", chapter: 1, task: "chapter-writing" });
			expect(context.includedFiles).toContain("outline/mystery/clue-ledger.json");
			expect(context.includedFiles).toContain("work/marriage/structure-proposed.json");
			expect(context.includedFiles).toContain("outline/genre/chase-wife-beat-sheet.json");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM5: duplicate structural ids fail", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm5-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "mm5", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			await store.saveMatureMarriageStructure({
				projectId: "mm5",
				status: "proposed",
				structure: structure({ economicItems: [economicItem("E1"), economicItem("E1")] }),
			});
			const report = await store.checkMatureMarriageStructure({ projectId: "mm5" });
			expect(report.issues.some((item) => item.code === "DUPLICATE_MARRIAGE_ID")).toBe(true);
			expect(report.status).toBe("error");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM6: invalid structural references fail", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm6-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "mm6", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			await store.saveMatureMarriageStructure({
				projectId: "mm6",
				status: "proposed",
				structure: structure({ exitConstraints: [exitConstraint("X1", { sourceRefIds: ["NOPE"] })] }),
			});
			const report = await store.checkMatureMarriageStructure({ projectId: "mm6" });
			expect(report.issues.some((item) => item.code === "MARRIAGE_REFERENCE_MISSING")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM7: a thin marriage without structural dimensions fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm7-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "mm7", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			await store.saveMatureMarriageStructure({
				projectId: "mm7",
				status: "proposed",
				structure: structure({
					inertiaFactors: [
						{
							id: "I1",
							category: "hope",
							description: "她还爱他",
							sourceRefIds: [],
							keepsRelationshipBecause: "舍不得",
							breakingCondition: "如果再次撒谎",
						},
					],
				}),
			});
			const report = await store.checkMatureMarriageStructure({ projectId: "mm7" });
			expect(report.issues.some((item) => item.code === "MARRIAGE_STRUCTURE_TOO_THIN")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM8: care imbalance is a warning, never an automatic harm", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm8-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "mm8", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			const s = structure({
				responsibilities: [
					responsibility("R1", "childcare", { actualPrimaryBearer: "protagonist", frequency: "daily" }),
					responsibility("R2", "eldercare", { actualPrimaryBearer: "protagonist", frequency: "daily" }),
					responsibility("R3", "domestic", { actualPrimaryBearer: "protagonist", frequency: "weekly" }),
					responsibility("R4", "financial", { actualPrimaryBearer: "spouse", frequency: "weekly" }),
				],
			});
			await store.saveMatureMarriageStructure({ projectId: "mm8", status: "proposed", structure: s });
			const report = await store.checkMatureMarriageStructure({ projectId: "mm8" });
			expect(report.issues.some((item) => item.code === "CARE_LOAD_ASYMMETRY" && item.severity === "warning")).toBe(
				true,
			);
			expect(report.issues.some((item) => item.severity === "error")).toBe(false);
			expect(report.issues.some((item) => item.code.includes("HARM") || item.code.includes("EXPLOIT"))).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM9: high exit constraints need a response in the restructuring plan", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm9-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "mm9", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			const s = structure({
				economicItems: [economicItem("E1", { kind: "housing" })],
				exitConstraints: [
					exitConstraint("H1", { category: "housing", severity: "critical", sourceRefIds: ["E1"] }),
				],
			});
			await store.saveMatureMarriageStructure({ projectId: "mm9", status: "proposed", structure: s });
			await store.saveMatureMarriageRestructuring({
				projectId: "mm9",
				status: "proposed",
				plan: plan({
					mode: "divorce-intent",
					resourceChanges: [
						{
							economicItemId: "E1",
							afterAccess: "none",
							action: "leave the house",
							remainingRisk: "homelessness",
						},
					],
				}),
			});
			const report = await store.checkMatureMarriageRestructuring({ projectId: "mm9" });
			expect(report.issues.some((item) => item.code === "UNADDRESSED_HIGH_EXIT_CONSTRAINT")).toBe(true);
			expect(report.status).toBe("error");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM10: a responsibility cannot magically disappear", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm10-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "mm10", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			const s = structure({ responsibilities: [responsibility("R1", "childcare")] });
			await store.saveMatureMarriageStructure({ projectId: "mm10", status: "proposed", structure: s });
			await store.saveMatureMarriageRestructuring({
				projectId: "mm10",
				status: "proposed",
				plan: plan({
					responsibilityChanges: [
						{
							responsibilityId: "R1",
							feasibility: "ready",
							transitionAction: "talk",
							remainingConsequence: "nobody",
						},
					],
				}),
			});
			const report = await store.checkMatureMarriageRestructuring({ projectId: "mm10" });
			expect(report.issues.some((item) => item.code === "RESPONSIBILITY_VANISHED")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM11: a valid responsibility redistribution passes", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm11-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "mm11", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			const s = structure({
				economicItems: [economicItem("E1")],
				responsibilities: [responsibility("R1", "childcare")],
				exitConstraints: [exitConstraint("C1", { sourceRefIds: ["E1"], severity: "low" })],
			});
			await store.saveMatureMarriageStructure({ projectId: "mm11", status: "proposed", structure: s });
			await store.saveMatureMarriageRestructuring({
				projectId: "mm11",
				status: "proposed",
				plan: plan({
					responsibilityChanges: [
						{
							responsibilityId: "R1",
							afterBearer: "shared",
							feasibility: "ready",
							transitionAction: "hire a helper",
							remainingConsequence: "cost",
						},
					],
					constraintResponses: [
						{ constraintId: "C1", strategy: "keep house", status: "addressed", remainingConsequence: "none" },
					],
				}),
			});
			const report = await store.checkMatureMarriageRestructuring({ projectId: "mm11" });
			expect(report.status, JSON.stringify(report.issues)).toBe("ok");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM12: reader-sim never exposes marriage author planning, including Windows paths", async () => {
		expect(isMarriagePrivatePath("canon\\marriage\\structure.json")).toBe(true);
		expect(isMarriagePrivatePath("work/marriage/restructuring-proposed.json")).toBe(true);
		expect(isMarriagePrivatePath("outline\\marriage\\future.json")).toBe(true);
		expect(isMarriagePrivatePath("outline/overview.md")).toBe(false);
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm12-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "mm12", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			await store.saveMatureMarriageStructure({
				projectId: "mm12",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				structure: structure({ economicItems: [economicItem("E1")] }),
			});
			await store.saveMatureMarriageRestructuring({
				projectId: "mm12",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				plan: plan({ mode: "divorce-intent", protagonistGoal: "独立生活" }),
			});
			const context = await store.readStoryContext({
				projectId: "mm12",
				task: "reader-sim",
				sections: ["outline", "project"],
			});
			expect(
				context.includedFiles.some((file) => file.includes("/marriage/") || file.includes("\\marriage\\")),
			).toBe(false);
			expect(context.text).not.toContain("独立生活");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM13: mature-only projects never trigger chase-wife gates", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm13-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "mm13", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			await expect(
				store.saveChapterDraft({ projectId: "mm13", chapter: 1, content: "draft" }),
			).resolves.toBeTruthy();
			await expect(
				store.saveChaseWifeHarmLedger({
					projectId: "mm13",
					status: "proposed",
					harms: [
						{
							id: "h1",
							category: "deception",
							victimImpact: {},
							maleBeliefAtTheTime: "x",
							heroineBeliefAtTheTime: "y",
							severity: "major",
							recognizedByHeroine: true,
							recognizedByMale: false,
							repaired: false,
							repairable: true,
						},
					],
				}),
			).rejects.toThrow("only available");
			await expect(store.checkChaseWifeEndingEligibility({ projectId: "mm13" })).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM14: marriage structure never auto-creates chase-wife harms", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm14-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(
				store,
				"mm14",
				["mature-marriage-crisis", "chase-wife"],
				"female-social-suspense",
				"female-social-suspense",
			);
			await store.saveMatureMarriageStructure({
				projectId: "mm14",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				structure: structure({ responsibilities: [responsibility("R1", "eldercare")] }),
			});
			const harmPath = join(cwd, "novels", "mm14", "continuity", "chase-wife-harm-ledger.json");
			await expect(readFile(harmPath, "utf8")).rejects.toThrow();
			// chase-wife harm 门禁保持原样：confirmed 写入仍要求正文证据
			await expect(
				store.saveChaseWifeHarmLedger({
					projectId: "mm14",
					status: "confirmed",
					confirmation: "USER_CONFIRMED",
					harms: [
						{
							id: "h1",
							category: "care-labor-exploitation",
							victimImpact: {},
							maleBeliefAtTheTime: "x",
							heroineBeliefAtTheTime: "y",
							severity: "major",
							recognizedByHeroine: true,
							recognizedByMale: false,
							repaired: false,
							repairable: true,
						},
					],
				}),
			).rejects.toThrow("prose evidence");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("MM15: stayingLogic reasons align with marriage structure when the beat sheet exists", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-mm15-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(
				store,
				"mm15",
				["mature-marriage-crisis", "chase-wife"],
				"female-social-suspense",
				"female-social-suspense",
			);
			const projectRoot = join(cwd, "novels", "mm15");
			await mkdir(join(projectRoot, "outline", "genre"), { recursive: true });
			await writeFile(
				join(projectRoot, "outline", "genre", "chase-wife-beat-sheet.json"),
				JSON.stringify({
					version: 2,
					genre: "chase-wife",
					beats: [],
					stayingLogic: {
						emotionalReason: "e",
						falseBelief: "f",
						sustainingEvidence: ["s"],
						breakingThreshold: "b",
						materialReason: "房贷与共同存款绑定",
						socialReason: "双方家庭",
						familyReason: "照顾公婆",
						careerReason: "公司合伙",
					},
				}),
				"utf8",
			);
			// 无任何经济/住房/债务基础的结构 → 四个 alignment warning
			await store.saveMatureMarriageStructure({
				projectId: "mm15",
				status: "proposed",
				structure: structure({ responsibilities: [responsibility("R1", "domestic")] }),
			});
			const thin = await store.checkMatureMarriageStructure({ projectId: "mm15" });
			expect(thin.issues.some((item) => item.code === "STAYING_LOGIC_MATERIAL_UNSUPPORTED")).toBe(true);
			expect(thin.issues.some((item) => item.code === "STAYING_LOGIC_SOCIAL_UNSUPPORTED")).toBe(true);
			expect(thin.issues.some((item) => item.code === "STAYING_LOGIC_FAMILY_UNSUPPORTED")).toBe(true);
			expect(thin.issues.some((item) => item.code === "STAYING_LOGIC_CAREER_UNSUPPORTED")).toBe(true);
			// 补齐经济/社会/家庭/职业基础后 warning 消失
			await store.saveMatureMarriageStructure({
				projectId: "mm15",
				status: "proposed",
				structure: structure({
					economicItems: [economicItem("E1", { kind: "housing" })],
					responsibilities: [
						responsibility("R1", "domestic"),
						responsibility("R2", "eldercare", { domain: "eldercare" }),
					],
					socialTies: [
						{
							id: "S1",
							kind: "family",
							description: "双方父母",
							connection: "shared",
							dependenceOrLeverage: "家庭地位",
							informationExposure: "婚姻状态",
							exitConsequence: "家族压力",
						},
					],
					decisionRights: [
						{
							id: "D1",
							domain: "business",
							decisionDescription: "公司决策",
							formalExpectation: "共同",
							practicalController: "shared",
							affectedResponsibilityIds: [],
							affectedEconomicItemIds: ["E1"],
							consequenceOfDisagreement: "僵局",
						},
					],
				}),
			});
			const aligned = await store.checkMatureMarriageStructure({ projectId: "mm15" });
			expect(aligned.issues.some((item) => item.code.startsWith("STAYING_LOGIC_"))).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("R3F1: recurring financial duties never trigger CARE_LOAD_ASYMMETRY", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-r3f1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "r3f1", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			const s = structure({
				responsibilities: [
					responsibility("R1", "financial", { actualPrimaryBearer: "protagonist", frequency: "daily" }),
					responsibility("R2", "financial", { actualPrimaryBearer: "protagonist", frequency: "weekly" }),
					responsibility("R3", "financial", { actualPrimaryBearer: "protagonist", frequency: "recurring" }),
				],
			});
			await store.saveMatureMarriageStructure({ projectId: "r3f1", status: "proposed", structure: s });
			const report = await store.checkMatureMarriageStructure({ projectId: "r3f1" });
			expect(report.issues.some((item) => item.code === "CARE_LOAD_ASYMMETRY")).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("R3F2: duplicate restructuring targets within one collection fail", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-r3f2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "r3f2", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			const s = structure({ economicItems: [economicItem("E1")] });
			await store.saveMatureMarriageStructure({ projectId: "r3f2", status: "proposed", structure: s });
			await store.saveMatureMarriageRestructuring({
				projectId: "r3f2",
				status: "proposed",
				plan: plan({
					resourceChanges: [
						{ economicItemId: "E1", afterAccess: "none", action: "leave", remainingRisk: "r" },
						{ economicItemId: "E1", afterAccess: "limited", action: "keep", remainingRisk: "r2" },
					],
				}),
			});
			const report = await store.checkMatureMarriageRestructuring({ projectId: "r3f2" });
			expect(report.issues.some((item) => item.code === "DUPLICATE_RESTRUCTURING_TARGET")).toBe(true);
			expect(report.status).toBe("error");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("R3F3: afterBearer=unknown with feasibility=ready fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-r3f3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "r3f3", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			const s = structure({ responsibilities: [responsibility("R1", "childcare")] });
			await store.saveMatureMarriageStructure({ projectId: "r3f3", status: "proposed", structure: s });
			await store.saveMatureMarriageRestructuring({
				projectId: "r3f3",
				status: "proposed",
				plan: plan({
					responsibilityChanges: [
						{
							responsibilityId: "R1",
							afterBearer: "unknown",
							feasibility: "ready",
							transitionAction: "t",
							remainingConsequence: "r",
						},
					],
				}),
			});
			const report = await store.checkMatureMarriageRestructuring({ projectId: "r3f3" });
			expect(report.issues.some((item) => item.code === "RESPONSIBILITY_BEARER_UNRESOLVED")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("R3F4: afterBearer=unknown with an explicit unresolved state is valid", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-marriage-r3f4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "r3f4", ["mature-marriage-crisis"], "urban-romance", "urban-romance");
			const s = structure({ responsibilities: [responsibility("R1", "childcare")] });
			await store.saveMatureMarriageStructure({ projectId: "r3f4", status: "proposed", structure: s });
			await store.saveMatureMarriageRestructuring({
				projectId: "r3f4",
				status: "proposed",
				plan: plan({
					responsibilityChanges: [
						{
							responsibilityId: "R1",
							afterBearer: "unknown",
							feasibility: "unresolved",
							transitionAction: "t",
							remainingConsequence: "仍需确定新照护安排",
						},
					],
				}),
			});
			const report = await store.checkMatureMarriageRestructuring({ projectId: "r3f4" });
			expect(
				report.issues.some(
					(item) => item.code === "RESPONSIBILITY_VANISHED" || item.code === "RESPONSIBILITY_BEARER_UNRESOLVED",
				),
			).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
