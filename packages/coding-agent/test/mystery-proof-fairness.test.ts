import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
	MysteryCase,
	MysteryClue,
	MysteryInformationCheckpoint,
	TruthClaim,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
import { isMysteryPrivatePath } from "../../../.pi/extensions/novel-agent/services/mystery-checker.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

type TruthCategory = MysteryCase["truthClaims"][number]["category"];

function claim(
	id: string,
	statement: string,
	opts: {
		category?: TruthCategory;
		dependsOn?: string[];
		clues?: string[];
		proofPaths?: Array<{ id: string; clueIds: string[]; prerequisiteClaimIds: string[] }>;
		reveal?: number;
		importance?: number;
	} = {},
): TruthClaim {
	return {
		id,
		statement,
		category: opts.category ?? "event",
		dependsOnClaimIds: opts.dependsOn ?? [],
		proofRequirement: "supporting evidence",
		supportingClueIds: opts.clues ?? [],
		...(opts.proofPaths !== undefined ? { proofPaths: opts.proofPaths } : {}),
		...(opts.reveal !== undefined ? { plannedRevealChapter: opts.reveal } : {}),
		importance: opts.importance ?? 5,
	};
}

function clue(
	id: string,
	opts: {
		firstAvailable?: number;
		heroineDiscovery?: number;
		readerReveal?: number;
		truthClaimIds?: string[];
		role?: MysteryClue["clueRole"];
		misleading?: string;
		actualImplication?: string;
	} = {},
): MysteryClue {
	return {
		id,
		observableFact: `fact-${id}`,
		sourceType: "digital",
		sourceDescription: `source-${id}`,
		firstAvailableChapter: opts.firstAvailable ?? 1,
		...(opts.heroineDiscovery !== undefined
			? { heroineDiscoveryChapter: opts.heroineDiscovery }
			: { intendedDiscoveryChapter: opts.firstAvailable ?? 1 }),
		...(opts.readerReveal !== undefined ? { readerRevealChapter: opts.readerReveal } : {}),
		truthClaimIds: opts.truthClaimIds ?? [],
		reliability: "medium",
		interpretationOptions: [],
		...(opts.misleading !== undefined ? { misleadingInterpretation: opts.misleading } : {}),
		actualImplication: opts.actualImplication ?? `implication-${id}`,
		clueRole: opts.role ?? "fair",
	};
}

function caseWith(claims: TruthClaim[], opts: { finalAnswers?: string[]; centralQuestion?: string } = {}): MysteryCase {
	return {
		id: "case-p",
		centralQuestion: opts.centralQuestion ?? "理赔材料为何存在时间矛盾？",
		truthSummary: "时间与数字证据被系统性伪造",
		truthClaims: claims,
		finalAnswerClaimIds: opts.finalAnswers ?? claims.map((item) => item.id).slice(-1),
		socialCore: {
			socialQuestion: "核赔流程为何放任证据被伪造",
			institutionalContext: "外包核赔中心",
			powerAsymmetry: "信息不对等",
			beneficiaries: ["核赔负责人"],
			costBearers: ["投保人"],
			stakesBeyondRelationship: ["行业声誉"],
		},
	};
}

function checkpoint(
	id: string,
	afterChapter: number,
	opts: {
		heroineKnows?: string[];
		readerKnows?: string[];
		characters?: Array<{ characterId: string; knowsClaimIds: string[] }>;
	} = {},
): MysteryInformationCheckpoint {
	return {
		id,
		afterChapter,
		heroine: { knowsClaimIds: opts.heroineKnows ?? [], suspectsClaimIds: [], believesClaimIds: [] },
		reader: { knowsClaimIds: opts.readerKnows ?? [], suspectsClaimIds: [], believesClaimIds: [] },
		characterKnowledge: (opts.characters ?? []).map((item) => ({
			characterId: item.characterId,
			knowsClaimIds: item.knowsClaimIds,
			suspectsClaimIds: [],
			believesClaimIds: [],
		})),
		newlyAvailableClueIds: [],
	};
}

async function initFssProject(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "proof",
		genre: "female-social-suspense",
		storyProfile: { primaryGenre: "female-social-suspense", relationshipMechanisms: [] },
	});
}

describe("mystery proof and fairness hardening", () => {
	it("P1: ALL evidence in a proof path is required before a claim is provable", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p1");
			const caseData = caseWith([
				claim("T5", "企业内部人员系统性伪造理赔", {
					proofPaths: [{ id: "P1", clueIds: ["C1", "C2", "C3"], prerequisiteClaimIds: [] }],
					reveal: 6,
				}),
			]);
			await store.saveMysteryCase({ projectId: "p1", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "p1",
				clues: [
					clue("C1", { readerReveal: 2, truthClaimIds: ["T5"] }),
					clue("C2", { readerReveal: 2, truthClaimIds: ["T5"] }),
					clue("C3", { readerReveal: 7, truthClaimIds: ["T5"] }),
				],
			});
			const fairness = await store.checkMysteryFairness({ projectId: "p1" });
			// C3 直到第 7 章才对读者曝光，T5 第 6 章揭示：单条路径必须 ALL 成立，因此不可证明
			expect(fairness.supportedFinalClaims).not.toContain("T5");
			expect(fairness.verdict).toBe("unfair");
			expect(fairness.issues.some((item) => item.code === "DEUS_EX_MACHINA_CLUE")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("P2: any complete alternate proof path proves the claim", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p2");
			const caseData = caseWith([
				claim("T5", "企业内部人员系统性伪造理赔", {
					proofPaths: [
						{ id: "A", clueIds: ["C1", "C2"], prerequisiteClaimIds: [] },
						{ id: "B", clueIds: ["C8", "C9"], prerequisiteClaimIds: [] },
					],
					reveal: 6,
				}),
			]);
			await store.saveMysteryCase({ projectId: "p2", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "p2",
				clues: [
					clue("C1", { readerReveal: 2, truthClaimIds: ["T5"] }),
					clue("C2", { readerReveal: 2, truthClaimIds: ["T5"] }),
					clue("C8", { readerReveal: 3, truthClaimIds: ["T5"] }),
					clue("C9", { readerReveal: 3, truthClaimIds: ["T5"] }),
				],
			});
			const fairness = await store.checkMysteryFairness({ projectId: "p2" });
			// 路径 A 在揭示前完整可见，T5 可证明
			expect(fairness.supportedFinalClaims).toContain("T5");
			expect(fairness.verdict).toBe("fair");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("P3: a derived claim is knowable through prerequisite claims without direct clues", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p3");
			const caseData = caseWith(
				[
					claim("T1", "死亡发生在等待期内", { clues: ["C1"], reveal: 4 }),
					claim("T2", "手机被他人携带", { clues: ["C2"], reveal: 4 }),
					claim("T3", "材料被逆向修改", {
						proofPaths: [{ id: "D", clueIds: [], prerequisiteClaimIds: ["T1", "T2"] }],
						reveal: 5,
						importance: 5,
					}),
				],
				{ finalAnswers: ["T3"] },
			);
			await store.saveMysteryCase({ projectId: "p3", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "p3",
				clues: [
					clue("C1", { readerReveal: 2, truthClaimIds: ["T1"] }),
					clue("C2", { readerReveal: 3, truthClaimIds: ["T2"] }),
				],
			});
			await store.saveMysteryInformationState({
				projectId: "p3",
				checkpoints: [checkpoint("S1", 4, { heroineKnows: ["T1", "T2", "T3"] })],
			});
			const design = await store.checkMysteryDesign({ projectId: "p3" });
			// T3 没有 direct clue，但 T1/T2 在第 4 章前可证明，派生知识合法
			expect(design.issues.some((item) => item.code === "INFO_KNOWLEDGE_BEFORE_SOURCE")).toBe(false);
			expect(design.issues.some((item) => item.code === "UNSUPPORTED_CRITICAL_TRUTH")).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("P4: culprit private knowledge is not gated by reader evidence timing", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p4");
			const caseData = caseWith([claim("T5", "企业内部人员系统性伪造理赔", { clues: ["C1"], reveal: 6 })]);
			await store.saveMysteryCase({ projectId: "p4", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "p4",
				clues: [clue("C1", { readerReveal: 5, truthClaimIds: ["T5"] })],
			});
			await store.saveMysteryInformationState({
				projectId: "p4",
				checkpoints: [checkpoint("S1", 1, { characters: [{ characterId: "culprit", knowsClaimIds: ["T5"] }] })],
			});
			const design = await store.checkMysteryDesign({ projectId: "p4" });
			// 凶手第 1 章知道 T5 是合理的私有知识，不报 INFO_KNOWLEDGE_BEFORE_SOURCE
			expect(design.issues.some((item) => item.code === "INFO_KNOWLEDGE_BEFORE_SOURCE")).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("P5: heroine early knowledge fails against heroine discovery timing", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p5-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p5");
			const caseData = caseWith([claim("T1", "死亡发生在等待期内", { clues: ["C1"], reveal: 5 })]);
			await store.saveMysteryCase({ projectId: "p5", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "p5",
				clues: [clue("C1", { firstAvailable: 1, heroineDiscovery: 4, truthClaimIds: ["T1"] })],
			});
			await store.saveMysteryInformationState({
				projectId: "p5",
				checkpoints: [checkpoint("S1", 2, { heroineKnows: ["T1"] })],
			});
			const design = await store.checkMysteryDesign({ projectId: "p5" });
			// C1 第 4 章才被女主发现，第 2 章就知道 T1 是泄漏
			expect(design.issues.some((item) => item.code === "INFO_KNOWLEDGE_BEFORE_SOURCE")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("P6: reader fairness uses reader exposure, not world availability", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p6-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p6");
			const caseData = caseWith([claim("T1", "死亡发生在等待期内", { clues: ["C1"], reveal: 5 })]);
			await store.saveMysteryCase({ projectId: "p6", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "p6",
				clues: [clue("C1", { firstAvailable: 1, heroineDiscovery: 2, readerReveal: 6, truthClaimIds: ["T1"] })],
			});
			const fairness = await store.checkMysteryFairness({ projectId: "p6" });
			// 线索第 1 章就存在于世界，但第 6 章才向读者曝光，T1 第 5 章揭示 → unfair
			expect(fairness.verdict).toBe("unfair");
			expect(fairness.issues.some((item) => item.code === "DEUS_EX_MACHINA_CLUE")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("P7: a proof referencing a missing clue fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p7-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p7");
			const caseData = caseWith([
				claim("T1", "死亡发生在等待期内", {
					proofPaths: [{ id: "P1", clueIds: ["C999"], prerequisiteClaimIds: [] }],
					reveal: 4,
				}),
			]);
			await store.saveMysteryCase({ projectId: "p7", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({ projectId: "p7", clues: [clue("C1", { truthClaimIds: ["T1"] })] });
			const design = await store.checkMysteryDesign({ projectId: "p7" });
			expect(design.issues.some((item) => item.code === "CLAIM_REFERENCES_MISSING_CLUE")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("P8: claim/clue bidirectional references must agree", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p8-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p8");
			const caseData = caseWith([claim("T1", "死亡发生在等待期内", { clues: ["C1"], reveal: 4 })]);
			await store.saveMysteryCase({ projectId: "p8", status: "proposed", case: caseData });
			// C1 声称支撑 T2，但 T1 的证明使用 C1：双向引用漂移
			await store.saveMysteryClueLedger({ projectId: "p8", clues: [clue("C1", { truthClaimIds: ["T2"] })] });
			const design = await store.checkMysteryDesign({ projectId: "p8" });
			expect(
				design.issues.some((item) => item.code === "CLAIM_CLUE_LINK_MISMATCH" && item.severity === "error"),
			).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("P9: a red herring whose misleading interpretation equals its actual implication fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p9-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p9");
			const caseData = caseWith([claim("T1", "死亡发生在等待期内", { clues: ["C1"], reveal: 4 })]);
			await store.saveMysteryCase({ projectId: "p9", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "p9",
				clues: [
					clue("C1", {
						truthClaimIds: ["T1"],
						role: "red-herring",
						misleading: "死者确实凌晨回过公司",
						actualImplication: "死者确实凌晨回过公司",
					}),
				],
			});
			const design = await store.checkMysteryDesign({ projectId: "p9" });
			expect(design.issues.some((item) => item.code === "RED_HERRING_INTERPRETATION_EQUALS_ACTUAL")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("P10: unknown reveal timing yields FAIRNESS_UNVERIFIABLE and needs-work", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p10-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p10");
			const caseData = caseWith([claim("T9", "系统掩盖持续多年", { clues: ["C1"] })]);
			await store.saveMysteryCase({ projectId: "p10", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "p10",
				clues: [clue("C1", { readerReveal: 3, truthClaimIds: ["T9"] })],
			});
			await store.saveMysteryInformationState({
				projectId: "p10",
				checkpoints: [checkpoint("S1", 3, { heroineKnows: ["T9"] })],
			});
			const fairness = await store.checkMysteryFairness({ projectId: "p10" });
			// T9 没有 plannedRevealChapter，也没有 reader 知道它的检查点：不猜测揭示章
			expect(fairness.issues.some((item) => item.code === "FAIRNESS_UNVERIFIABLE")).toBe(true);
			expect(fairness.verdict).toBe("needs-work");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("P11: reader-sim hard isolation survives custom sections", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p11-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p11");
			const caseData = caseWith([claim("T1", "死亡发生在等待期内", { clues: ["C1"], reveal: 4 })]);
			await store.saveMysteryCase({
				projectId: "p11",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				case: caseData,
			});
			await store.saveMysteryClueLedger({ projectId: "p11", clues: [clue("C1", { truthClaimIds: ["T1"] })] });
			const context = await store.readStoryContext({
				projectId: "p11",
				task: "reader-sim",
				sections: ["outline", "project"],
			});
			expect(context.includedFiles.some((file) => file.includes("/mystery/"))).toBe(false);
			expect(context.text).not.toContain("时间与数字证据被系统性伪造");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("P12: legacy Round 2 artifacts normalize into proof paths without breaking", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-proof-p12-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "p12");
			// 完全 Round 2 风格：只有 supportingClueIds + dependsOnClaimIds，没有 proofPaths
			const caseData = caseWith(
				[
					claim("T1", "死亡发生在等待期内", { clues: ["C1"], reveal: 4 }),
					claim("T2", "手机被他人携带", { dependsOn: ["T1"], clues: ["C2"], reveal: 4 }),
				],
				{ finalAnswers: ["T2"] },
			);
			await store.saveMysteryCase({ projectId: "p12", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "p12",
				clues: [
					clue("C1", { readerReveal: 2, truthClaimIds: ["T1"] }),
					clue("C2", { readerReveal: 3, truthClaimIds: ["T2"] }),
				],
			});
			const design = await store.checkMysteryDesign({ projectId: "p12" });
			expect(design.status).toBe("ok");
			const fairness = await store.checkMysteryFairness({ projectId: "p12" });
			expect(fairness.verdict).toBe("fair");
			expect(fairness.supportedFinalClaims).toContain("T2");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C1: reader and heroine proof validation are isolated", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-closure-c1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "c1");
			const caseData = caseWith([claim("T1", "死亡发生在等待期内", { clues: ["C1"], reveal: 5 })]);
			await store.saveMysteryCase({ projectId: "c1", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "c1",
				clues: [clue("C1", { firstAvailable: 1, heroineDiscovery: 2, readerReveal: 4, truthClaimIds: ["T1"] })],
			});
			// 同一检查点第 3 章：heroine 可证明（发现章 2），reader 不可（曝光章 4）
			await store.saveMysteryInformationState({
				projectId: "c1",
				checkpoints: [checkpoint("S1", 3, { heroineKnows: ["T1"], readerKnows: ["T1"] })],
			});
			const both = await store.checkMysteryFairness({ projectId: "c1" });
			const readerIssue = both.issues.find(
				(item) => item.code === "REVEAL_BEFORE_PROOF" && item.message.includes("reader"),
			);
			expect(readerIssue).toBeDefined();
			expect(
				both.issues.some((item) => item.code === "REVEAL_BEFORE_PROOF" && item.message.includes("heroine")),
			).toBe(false);
			// 只有 heroine 知道：通过（heroine provable 不能放行 reader，但 heroine 本身合法）
			await store.saveMysteryInformationState({
				projectId: "c1",
				checkpoints: [checkpoint("S1", 3, { heroineKnows: ["T1"] })],
			});
			const heroineOnly = await store.checkMysteryFairness({ projectId: "c1" });
			expect(heroineOnly.issues.some((item) => item.code === "REVEAL_BEFORE_PROOF")).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C2: proof-only prerequisite cycles are detected even with empty dependsOnClaimIds", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-closure-c2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "c2");
			const caseData = caseWith([
				claim("T1", "A", { proofPaths: [{ id: "P1", clueIds: [], prerequisiteClaimIds: ["T2"] }] }),
				claim("T2", "B", { proofPaths: [{ id: "P1", clueIds: [], prerequisiteClaimIds: ["T3"] }] }),
				claim("T3", "C", { proofPaths: [{ id: "P1", clueIds: [], prerequisiteClaimIds: ["T1"] }] }),
			]);
			await store.saveMysteryCase({ projectId: "c2", status: "proposed", case: caseData });
			const design = await store.checkMysteryDesign({ projectId: "c2" });
			expect(design.issues.some((item) => item.code.includes("CYCLE"))).toBe(true);
			expect(design.status).toBe("error");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C3: an explicit empty proofPaths array is authoritative and cannot fall back to legacy clues", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-closure-c3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "c3");
			const caseData = caseWith([
				{
					id: "T1",
					statement: "死亡发生在等待期内",
					category: "event",
					dependsOnClaimIds: [],
					proofRequirement: "evidence",
					supportingClueIds: ["C1"],
					proofPaths: [],
					plannedRevealChapter: 4,
					importance: 5,
				},
			]);
			await store.saveMysteryCase({ projectId: "c3", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({ projectId: "c3", clues: [clue("C1", { truthClaimIds: ["T1"] })] });
			const design = await store.checkMysteryDesign({ projectId: "c3" });
			// proofPaths=[] 是作者明确配置"无证明路径"，C1 不能把它救回
			expect(design.issues.some((item) => item.code === "UNSUPPORTED_CRITICAL_TRUTH")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C4: undefined proofPaths keeps the legacy supportingClueIds path working", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-closure-c4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "c4");
			const caseData = caseWith([claim("T1", "死亡发生在等待期内", { clues: ["C1"], reveal: 4 })]);
			await store.saveMysteryCase({ projectId: "c4", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "c4",
				clues: [clue("C1", { readerReveal: 2, truthClaimIds: ["T1"] })],
			});
			const design = await store.checkMysteryDesign({ projectId: "c4" });
			expect(design.issues.some((item) => item.code === "UNSUPPORTED_CRITICAL_TRUTH")).toBe(false);
			const fairness = await store.checkMysteryFairness({ projectId: "c4" });
			expect(fairness.verdict).toBe("fair");
			expect(fairness.supportedFinalClaims).toContain("T1");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C5: reader exposure before world availability is a design error", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-closure-c5-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "c5");
			const caseData = caseWith([claim("T1", "死亡发生在等待期内", { clues: ["C1"], reveal: 5 })]);
			await store.saveMysteryCase({ projectId: "c5", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "c5",
				clues: [clue("C1", { firstAvailable: 4, readerReveal: 2, truthClaimIds: ["T1"] })],
			});
			const design = await store.checkMysteryDesign({ projectId: "c5" });
			expect(design.issues.some((item) => item.code === "READER_EXPOSURE_BEFORE_WORLD_AVAILABILITY")).toBe(true);
			expect(design.status).toBe("error");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C6: reader exposure before heroine discovery is legal", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-closure-c6-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "c6");
			const caseData = caseWith([claim("T1", "死亡发生在等待期内", { clues: ["C1"], reveal: 5 })]);
			await store.saveMysteryCase({ projectId: "c6", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "c6",
				clues: [clue("C1", { firstAvailable: 1, readerReveal: 2, heroineDiscovery: 5, truthClaimIds: ["T1"] })],
			});
			const design = await store.checkMysteryDesign({ projectId: "c6" });
			expect(design.issues.some((item) => item.code === "READER_EXPOSURE_BEFORE_WORLD_AVAILABILITY")).toBe(false);
			expect(design.issues.some((item) => item.code === "INVALID_REVEAL_TIMING")).toBe(false);
			const fairness = await store.checkMysteryFairness({ projectId: "c6" });
			expect(fairness.verdict).toBe("fair");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C7: mystery private path detection handles Windows separators", () => {
		expect(isMysteryPrivatePath("outline\\mystery\\truth.json")).toBe(true);
		expect(isMysteryPrivatePath("outline/mystery/clue-ledger.json")).toBe(true);
		expect(isMysteryPrivatePath("canon/mystery/truth-model.json")).toBe(true);
		expect(isMysteryPrivatePath("work/mystery/suspect-model-proposed.json")).toBe(true);
		expect(isMysteryPrivatePath("outline/overview.md")).toBe(false);
		expect(isMysteryPrivatePath("continuity/reports/mystery-design.json")).toBe(false);
	});

	it("C8: duplicate proof path ids within one claim fail", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-closure-c8-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "c8");
			const caseData = caseWith([
				claim("T1", "死亡发生在等待期内", {
					proofPaths: [
						{ id: "P1", clueIds: ["C1"], prerequisiteClaimIds: [] },
						{ id: "P1", clueIds: ["C2"], prerequisiteClaimIds: [] },
					],
					reveal: 4,
				}),
			]);
			await store.saveMysteryCase({ projectId: "c8", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "c8",
				clues: [clue("C1", { truthClaimIds: ["T1"] }), clue("C2", { truthClaimIds: ["T1"] })],
			});
			const design = await store.checkMysteryDesign({ projectId: "c8" });
			expect(design.issues.some((item) => item.code === "DUPLICATE_PROOF_PATH_ID")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C9: derived final claims report transitive clue coverage", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-closure-c9-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "c9");
			const caseData = caseWith(
				[
					claim("T1", "死亡发生在等待期内", { clues: ["C1", "C2"] }),
					claim("T2", "手机被他人携带", { clues: ["C3"] }),
					claim("T3", "材料被逆向修改", {
						proofPaths: [{ id: "D", clueIds: [], prerequisiteClaimIds: ["T1", "T2"] }],
						reveal: 6,
						importance: 5,
					}),
				],
				{ finalAnswers: ["T3"] },
			);
			await store.saveMysteryCase({ projectId: "c9", status: "proposed", case: caseData });
			await store.saveMysteryClueLedger({
				projectId: "c9",
				clues: [
					clue("C1", { readerReveal: 2, truthClaimIds: ["T1"] }),
					clue("C2", { readerReveal: 2, truthClaimIds: ["T1"] }),
					clue("C3", { readerReveal: 3, truthClaimIds: ["T2"] }),
				],
			});
			const fairness = await store.checkMysteryFairness({ projectId: "c9" });
			expect(fairness.supportedFinalClaims).toContain("T3");
			const coverage = fairness.proofCoverage.T3;
			expect(coverage).toBeDefined();
			expect(coverage.completePaths).toBe(1);
			expect(coverage.totalPaths).toBe(1);
			expect(coverage.directClueIds).toEqual([]);
			expect(coverage.transitiveClueIds).toEqual(expect.arrayContaining(["C1", "C2", "C3"]));
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
