import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
	MysteryCase,
	MysteryClue,
	MysteryInformationCheckpoint,
	MysterySuspect,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

function claim(
	id: string,
	statement: string,
	category: MysteryCase["truthClaims"][number]["category"],
	dependsOnClaimIds: string[],
	supportingClueIds: string[],
	plannedRevealChapter: number | undefined,
	importance: number,
) {
	return {
		id,
		statement,
		category,
		dependsOnClaimIds,
		proofRequirement: "supporting evidence",
		supportingClueIds,
		plannedRevealChapter,
		importance,
	};
}

function validCase(overrides: Partial<MysteryCase> = {}): MysteryCase {
	return {
		id: "case-1",
		centralQuestion: "为什么异常死亡理赔存在时间与数字证据矛盾？",
		truthSummary: "死亡时间被伪造以匹配保单等待期",
		truthClaims: [
			claim("T1", "死亡发生在等待期内", "timeline", [], ["C1", "C2"], 5, 5),
			claim("T2", "手机凌晨连接公司网络的不是死者本人", "access", ["T1"], ["C2", "C3"], 5, 4),
			claim("T3", "理赔材料时间戳在付款后被逆向修改", "institutional", ["T2"], ["C4"], 6, 5),
		],
		finalAnswerClaimIds: ["T3"],
		socialCore: {
			socialQuestion: "保险公司核赔流程为何放任死亡时间被伪造",
			institutionalContext: "区域理赔中心外包核赔",
			powerAsymmetry: "客户与核赔员信息不对等",
			beneficiaries: ["外包核赔负责人"],
			costBearers: ["其他投保人"],
			stakesBeyondRelationship: ["行业声誉", "保单公平性"],
		},
		...overrides,
	};
}

function validClues(extra: MysteryClue[] = []): MysteryClue[] {
	return [
		{
			id: "C1",
			observableFact: "门禁记录显示死者当日 02:10 刷卡进入公司",
			sourceType: "institutional-record",
			sourceDescription: "公司门禁系统",
			firstAvailableChapter: 2,
			intendedDiscoveryChapter: 2,
			truthClaimIds: ["T1"],
			reliability: "high",
			interpretationOptions: ["死者凌晨回到公司"],
			actualImplication: "死亡时间早于理赔材料所述",
			clueRole: "fair",
		},
		{
			id: "C2",
			observableFact: "死者手机凌晨 02:17 连接公司 Wi-Fi",
			sourceType: "digital",
			sourceDescription: "Wi-Fi 接入日志",
			firstAvailableChapter: 2,
			intendedDiscoveryChapter: 3,
			truthClaimIds: ["T1", "T2"],
			reliability: "medium",
			interpretationOptions: ["死者凌晨在公司使用手机", "手机由他人携带"],
			actualImplication: "手机持有人并不等于在场人",
			clueRole: "ambiguous",
		},
		{
			id: "C3",
			observableFact: "死者手表停摆时间与门禁记录相差三小时",
			sourceType: "physical",
			sourceDescription: "法医物证",
			firstAvailableChapter: 3,
			intendedDiscoveryChapter: 4,
			truthClaimIds: ["T2"],
			reliability: "medium",
			interpretationOptions: ["手表损坏"],
			actualImplication: "门禁记录时间未必是死亡时间",
			clueRole: "exculpatory",
		},
		{
			id: "C4",
			observableFact: "理赔材料时间戳晚于内部付款记录",
			sourceType: "financial",
			sourceDescription: "财务系统",
			firstAvailableChapter: 4,
			intendedDiscoveryChapter: 5,
			truthClaimIds: ["T3"],
			reliability: "high",
			interpretationOptions: ["录入延迟"],
			actualImplication: "材料在付款后被逆向修改",
			clueRole: "fair",
		},
		{
			id: "C5",
			observableFact: "证人称当晚看见死者离开小区",
			sourceType: "testimony",
			sourceDescription: "邻居证词",
			firstAvailableChapter: 2,
			intendedDiscoveryChapter: 2,
			truthClaimIds: ["T2"],
			reliability: "low",
			interpretationOptions: ["证人看清了死者", "证人在昏暗灯光下看错"],
			misleadingInterpretation: "证词证明死者当晚离开过小区",
			actualImplication: "证词不能单独证明在场",
			clueRole: "red-herring",
		},
		...extra,
	];
}

function validSuspects(): MysterySuspect[] {
	return [
		{
			id: "SUS-1",
			characterId: "husband",
			publicRole: "死者丈夫",
			relationshipToCase: "保单受益人",
			motive: "获取赔偿",
			means: "伪造材料时间戳",
			opportunity: "持有死者手机",
			access: "家庭与公司记录",
			publicStory: "悲伤的配偶",
			privateSecret: "知道死亡真实时间",
			actualRole: "culprit",
			knowledgeClaimIds: ["T1", "T2", "T3"],
			supportingClueIds: ["C2", "C4"],
			exculpatoryClueIds: [],
		},
		{
			id: "SUS-2",
			characterId: "neighbor",
			publicRole: "邻居",
			relationshipToCase: "目击证人",
			publicStory: "看到死者离开",
			actualRole: "witness",
			knowledgeClaimIds: [],
			supportingClueIds: ["C5"],
			exculpatoryClueIds: [],
		},
	];
}

function validCheckpoints(): MysteryInformationCheckpoint[] {
	return [
		{
			id: "S1",
			afterChapter: 2,
			heroine: { knowsClaimIds: [], suspectsClaimIds: ["T1"], believesClaimIds: ["T1"] },
			reader: { knowsClaimIds: [], suspectsClaimIds: ["T1"], believesClaimIds: [] },
			characterKnowledge: [],
			newlyAvailableClueIds: ["C1", "C5"],
		},
		{
			id: "S2",
			afterChapter: 4,
			heroine: { knowsClaimIds: ["T1", "T2"], suspectsClaimIds: ["T3"], believesClaimIds: [] },
			reader: { knowsClaimIds: ["T1"], suspectsClaimIds: ["T2"], believesClaimIds: [] },
			characterKnowledge: [],
			newlyAvailableClueIds: ["C2", "C3"],
		},
		{
			id: "S3",
			afterChapter: 6,
			heroine: { knowsClaimIds: ["T3"], suspectsClaimIds: [], believesClaimIds: [] },
			reader: { knowsClaimIds: ["T3"], suspectsClaimIds: [], believesClaimIds: [] },
			characterKnowledge: [],
			newlyAvailableClueIds: ["C4"],
		},
	];
}

async function initFssProject(store: NovelProjectStore, projectId: string, mechanisms: string[] = []): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "mystery",
		genre: "female-social-suspense",
		storyProfile: { primaryGenre: "female-social-suspense", relationshipMechanisms: mechanisms },
	});
}

async function saveValidMysteryArtifacts(
	store: NovelProjectStore,
	projectId: string,
	caseData: MysteryCase = validCase(),
	clues: MysteryClue[] = validClues(),
	suspects: MysterySuspect[] = validSuspects(),
	checkpoints: MysteryInformationCheckpoint[] = validCheckpoints(),
): Promise<void> {
	await store.saveMysteryCase({ projectId, status: "proposed", case: caseData });
	await store.saveMysteryClueLedger({ projectId, clues });
	await store.saveMysterySuspectModel({ projectId, status: "proposed", suspects });
	await store.saveMysteryInformationState({ projectId, checkpoints });
}

describe("mystery engine", () => {
	it("CASE M1: a valid mystery case passes design and fairness checks", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "m1");
			await saveValidMysteryArtifacts(store, "m1");
			const design = await store.checkMysteryDesign({ projectId: "m1" });
			expect(design.status, JSON.stringify(design.issues)).toBe("ok");
			const fairness = await store.checkMysteryFairness({ projectId: "m1" });
			expect(fairness.verdict, JSON.stringify(fairness.issues)).toBe("fair");
			expect(fairness.supportedFinalClaims).toContain("T3");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M2: truth dependency cycle fails the design check", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "m2");
			const cycleCase = validCase({
				truthClaims: [
					claim("T1", "A", "event", ["T2"], ["C1"], 5, 5),
					claim("T2", "B", "event", ["T1"], ["C2"], 5, 5),
				],
				finalAnswerClaimIds: ["T1"],
			});
			await saveValidMysteryArtifacts(store, "m2", cycleCase);
			const design = await store.checkMysteryDesign({ projectId: "m2" });
			expect(design.issues.some((item) => item.code === "TRUTH_CLAIM_CYCLE")).toBe(true);
			expect(design.status).toBe("error");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M3: a final claim without any supporting clue fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "m3");
			// 旧 fixture 让 T3 依赖 T1；Round 2.5 语义下“仅靠前置声明推导”是合法证明（P3），
			// 因此 M3 改为真正没有任何证明来源（无 clue 也无前置声明）的 final claim。
			const unsupported = validCase({
				truthClaims: [
					claim("T1", "死亡发生在等待期内", "timeline", [], ["C1"], 5, 5),
					claim("T3", "理赔材料被逆向修改", "institutional", [], [], 6, 5),
				],
				finalAnswerClaimIds: ["T3"],
			});
			await saveValidMysteryArtifacts(store, "m3", unsupported);
			const design = await store.checkMysteryDesign({ projectId: "m3" });
			expect(design.issues.some((item) => item.code === "UNSUPPORTED_CRITICAL_TRUTH")).toBe(true);
			expect(design.status).toBe("error");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M4: a fair red herring passes", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "m4");
			await saveValidMysteryArtifacts(store, "m4");
			const design = await store.checkMysteryDesign({ projectId: "m4" });
			expect(design.issues.some((item) => item.code === "RED_HERRING_WITHOUT_FACTUAL_BASIS")).toBe(false);
			expect(design.status).toBe("ok");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M5: a red herring without a factual basis fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m5-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "m5");
			const fakeRedHerring = validClues([
				{
					id: "C6",
					observableFact: "证人声称看到黑影",
					sourceType: "testimony",
					sourceDescription: "邻居证词",
					firstAvailableChapter: 2,
					intendedDiscoveryChapter: 2,
					truthClaimIds: ["T2"],
					reliability: "low",
					interpretationOptions: [],
					actualImplication: "",
					clueRole: "red-herring",
				},
			]);
			await saveValidMysteryArtifacts(store, "m5", validCase(), fakeRedHerring);
			const design = await store.checkMysteryDesign({ projectId: "m5" });
			expect(design.issues.some((item) => item.code === "RED_HERRING_WITHOUT_FACTUAL_BASIS")).toBe(true);
			expect(design.status).toBe("error");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M6: deus ex machina evidence fails the fairness check", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m6-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "m6");
			const lateClue = validClues().map((clue) => (clue.id === "C4" ? { ...clue, firstAvailableChapter: 6 } : clue));
			await saveValidMysteryArtifacts(store, "m6", validCase(), lateClue);
			const fairness = await store.checkMysteryFairness({ projectId: "m6" });
			expect(fairness.issues.some((item) => item.code === "DEUS_EX_MACHINA_CLUE")).toBe(true);
			expect(fairness.verdict).toBe("unfair");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M7: knowing the truth before its clue is available fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m7-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "m7");
			// S1 原为第 2 章；改成第 1 章就知道 T1，而 T1 最早的线索 C1 第 2 章才可用
			const leaky = validCheckpoints().map((checkpoint) =>
				checkpoint.id === "S1"
					? { ...checkpoint, afterChapter: 1, heroine: { ...checkpoint.heroine, knowsClaimIds: ["T1"] } }
					: checkpoint,
			);
			await saveValidMysteryArtifacts(store, "m7", validCase(), validClues(), validSuspects(), leaky);
			const design = await store.checkMysteryDesign({ projectId: "m7" });
			expect(design.issues.some((item) => item.code === "INFO_KNOWLEDGE_BEFORE_SOURCE")).toBe(true);
			expect(design.status).toBe("error");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M8: suspicion is not knowledge and passes", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m8-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "m8");
			const suspectOnly = validCheckpoints().map((checkpoint) =>
				checkpoint.id === "S2"
					? {
							...checkpoint,
							heroine: {
								...checkpoint.heroine,
								knowsClaimIds: [],
								suspectsClaimIds: ["T3"],
								believesClaimIds: ["T3"],
							},
						}
					: checkpoint,
			);
			await saveValidMysteryArtifacts(store, "m8", validCase(), validClues(), validSuspects(), suspectOnly);
			const design = await store.checkMysteryDesign({ projectId: "m8" });
			expect(design.issues.some((item) => item.code === "INFO_KNOWLEDGE_BEFORE_SOURCE")).toBe(false);
			expect(design.status).toBe("ok");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M9: reader-sim context never exposes mystery author truth", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m9-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "m9");
			await saveValidMysteryArtifacts(store, "m9");
			await store.saveMysteryCase({
				projectId: "m9",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				case: validCase(),
			});
			await store.saveMysterySuspectModel({
				projectId: "m9",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				suspects: validSuspects(),
			});
			const reader = await store.readStoryContext({ projectId: "m9", task: "reader-sim" });
			expect(reader.includedFiles.some((file) => file.includes("mystery"))).toBe(false);
			expect(reader.text).not.toContain("死亡时间被伪造以匹配保单等待期");
			expect(reader.text).not.toContain("知道死亡真实时间");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M10: plain chase-wife projects cannot call mystery tools", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m10-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "m10", title: "legacy", genre: "chase-wife" });
			await expect(
				store.saveMysteryCase({ projectId: "m10", status: "proposed", case: validCase() }),
			).rejects.toThrow("only available");
			await expect(store.checkMysteryDesign({ projectId: "m10" })).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M11: plain female-social-suspense gets mystery tools but no chase-wife tools", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m11-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "m11");
			await expect(
				store.saveMysteryCase({ projectId: "m11", status: "proposed", case: validCase() }),
			).resolves.toBeTruthy();
			await expect(store.checkChaseWifeArc({ projectId: "m11" })).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M12: female-social-suspense + chase-wife gets both tool groups and combined context", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-mystery-m12-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFssProject(store, "m12", ["chase-wife"]);
			await expect(
				store.saveMysteryCase({ projectId: "m12", status: "proposed", case: validCase() }),
			).resolves.toBeTruthy();
			await expect(store.saveMysteryClueLedger({ projectId: "m12", clues: validClues() })).resolves.toBeTruthy();
			await expect(store.checkChaseWifeArc({ projectId: "m12" })).resolves.toBeTruthy();
			const projectRoot = join(cwd, "novels", "m12");
			await mkdir(join(projectRoot, "outline", "genre"), { recursive: true });
			await writeFile(
				join(projectRoot, "outline", "genre", "chase-wife-beat-sheet.json"),
				JSON.stringify({ version: 2, genre: "chase-wife", beats: [] }),
				"utf8",
			);
			const context = await store.readStoryContext({ projectId: "m12", chapter: 1, task: "chapter-writing" });
			expect(context.includedFiles).toContain("outline/genre/chase-wife-beat-sheet.json");
			expect(context.includedFiles).toContain("outline/mystery/clue-ledger.json");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
