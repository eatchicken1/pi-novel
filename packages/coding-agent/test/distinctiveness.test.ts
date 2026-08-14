import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { StoryDistinctivenessProfile, UnifiedEvent } from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

function unifiedEvent(eventId: number, chapter: number, overrides: Partial<UnifiedEvent> = {}): UnifiedEvent {
	return {
		eventId,
		chapter,
		chronology: "present",
		pov: "heroine-first-person",
		storyGoal: "查清理赔时间矛盾",
		conflict: "材料时间戳互相矛盾",
		action: "核验理赔材料时间线",
		consequence: "发现门禁与死亡时间不一致",
		characterDeltas: [{ characterId: "heroine", dimension: "knowledge", from: "未知", to: "怀疑" }],
		resourceDeltas: [],
		riskDeltas: [],
		causes: eventId === 1 ? [] : [eventId - 1],
		irreversible: false,
		cannotRemoveBecause: "下一次选择不能回到原地",
		...overrides,
	};
}

const mysteryDelta = {
	discoveredClueIds: ["C1"],
	readerRevealedClueIds: [],
	claimKnowledgeChanges: [],
	suspectChanges: [],
	interpretationChanges: [],
	proofProgressClaimIds: [],
	revealClaimIds: [],
};
const professionalDelta = {
	actionIds: ["PA-1"],
	evidenceSourceIds: ["EV-1"],
	conflictIds: [],
	escalationPathIds: [],
	consequenceIds: [],
	observationIds: [],
};
const marriageDelta = {
	economicItemChanges: ["E1"],
	responsibilityChanges: [],
	decisionRightChanges: [],
	socialTieChanges: [],
	inertiaChanges: [],
	exitConstraintChanges: [],
	restructuringProgress: [],
};
const chaseWifeDelta = {
	informationDelta: [],
	relationshipDelta: [],
	resourceDelta: [],
	riskDelta: [],
	heroineAgencyBefore: 30,
	heroineAgencyAfter: 40,
	harmRefs: [],
	repairRefs: [],
	paywallHook: false,
};

function profile(
	verdict: StoryDistinctivenessProfile["verdict"],
	blendEvidence: string[] = [],
): StoryDistinctivenessProfile {
	return {
		verdict,
		premises: ["死亡时间伪造与婚姻经济控制由同一笔理赔连接"],
		engineBlendEvidence: blendEvidence,
		risks: [{ risk: "真相揭示依赖单一门禁线索", evidence: "C1 承担过重证明负担" }],
		strongestMoves: [{ move: "女主借职业调查获取婚姻证据", evidence: "专业动作与婚姻破裂互为因果" }],
	};
}

async function initProject(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "distinctiveness",
		genre: "female-social-suspense",
		storyProfile: {
			primaryGenre: "female-social-suspense",
			relationshipMechanisms: ["mature-marriage-crisis", "chase-wife"],
			professionalDomain: "insurance-fraud-investigation",
			storyForm: "mid-length",
			audience: "female",
			setting: "contemporary-china",
		},
	});
}

async function initPlainProject(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({ projectId, title: "plain", genre: "urban-romance" });
}

describe("story distinctiveness review", () => {
	it("D1: blended story checks clean with collision stats", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-distinct-d1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "d1");
			await store.saveUnifiedEventMap({
				projectId: "d1",
				chapter: 1,
				events: [
					unifiedEvent(1, 1, { mysteryDelta, professionalDelta }),
					unifiedEvent(2, 1, { marriageDelta, chaseWifeDelta }),
				],
			});
			await store.saveStoryDistinctiveness({
				projectId: "d1",
				profile: profile("distinctive", ["理赔核验动作同时推进线索与职业冲突"]),
			});
			const report = await store.checkStoryDistinctiveness({ projectId: "d1" });
			expect(report.status, JSON.stringify(report)).toBe("ok");
			expect(report.stats.collisionEvents).toBe(2);
			expect(report.stats.totalEvents).toBe(2);
			expect(report.verdict).toBe("distinctive");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("D2: blend claims without any collision event warn", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-distinct-d2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "d2");
			await store.saveUnifiedEventMap({
				projectId: "d2",
				chapter: 1,
				events: [unifiedEvent(1, 1), unifiedEvent(2, 1)],
			});
			await store.saveStoryDistinctiveness({
				projectId: "d2",
				profile: profile("needs-work", ["四个引擎在女主选择中交织"]),
			});
			const report = await store.checkStoryDistinctiveness({ projectId: "d2" });
			expect(report.status).toBe("warning");
			expect(report.issues.some((item) => item.code === "DISTINCTIVENESS_BLEND_CLAIM_UNSUPPORTED")).toBe(true);
			expect(
				report.issues.some(
					(item) => item.code === "DISTINCTIVENESS_ENGINE_UNUSED" && item.message.includes("mystery"),
				),
			).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("D3: repeated event fingerprints warn", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-distinct-d3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "d3");
			const same = unifiedEvent(1, 1);
			const twin = unifiedEvent(2, 1, { action: same.action, consequence: same.consequence });
			await store.saveUnifiedEventMap({ projectId: "d3", chapter: 1, events: [same, twin] });
			await store.saveStoryDistinctiveness({ projectId: "d3", profile: profile("needs-work") });
			const report = await store.checkStoryDistinctiveness({ projectId: "d3" });
			expect(report.stats.repeatEvents).toBe(1);
			expect(report.issues.some((item) => item.code === "DISTINCTIVE_EVENT_REPEAT")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("D4: distinctive verdict with repeated fingerprints is overstated", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-distinct-d4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "d4");
			const events = [1, 2, 3].map((id) => unifiedEvent(id, 1, { action: `动作${id}`, consequence: `后果${id}` }));
			const twinA = unifiedEvent(4, 1, { action: events[0]!.action, consequence: events[0]!.consequence });
			const twinB = unifiedEvent(5, 1, { action: events[1]!.action, consequence: events[1]!.consequence });
			await store.saveUnifiedEventMap({ projectId: "d4", chapter: 1, events: [...events, twinA, twinB] });
			await store.saveStoryDistinctiveness({ projectId: "d4", profile: profile("distinctive") });
			const report = await store.checkStoryDistinctiveness({ projectId: "d4" });
			expect(report.stats.repeatEvents).toBe(2);
			expect(report.issues.some((item) => item.code === "DISTINCTIVENESS_VERDICT_OVERSTATED")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("D5: engine coverage tracks unused capabilities", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-distinct-d5-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "d5");
			// 只用 mystery：chase-wife 与 professional 能力零覆盖
			await store.saveUnifiedEventMap({
				projectId: "d5",
				chapter: 1,
				events: [unifiedEvent(1, 1, { mysteryDelta })],
			});
			await store.saveStoryDistinctiveness({ projectId: "d5", profile: profile("needs-work") });
			const report = await store.checkStoryDistinctiveness({ projectId: "d5" });
			expect(report.stats.engineCoverage).toEqual({ mystery: 1, marriage: 0, chaseWife: 0, professional: 0 });
			const unused = report.issues.filter((item) => item.code === "DISTINCTIVENESS_ENGINE_UNUSED");
			expect(unused.some((item) => item.message.includes("marriage"))).toBe(true);
			expect(unused.some((item) => item.message.includes("chase-wife"))).toBe(true);
			expect(unused.some((item) => item.message.includes("insurance-fraud"))).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("D6: plain projects warn that no map exists to substantiate the review", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-distinct-d6-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initPlainProject(store, "d6");
			await store.saveStoryDistinctiveness({ projectId: "d6", profile: profile("generic-risk") });
			const report = await store.checkStoryDistinctiveness({ projectId: "d6" });
			expect(report.status).toBe("warning");
			expect(report.issues.some((item) => item.code === "DISTINCTIVENESS_MAP_MISSING")).toBe(true);
			expect(report.stats.totalEvents).toBe(0);
			// 无评审档案时也给出确定性报告
			const missing = await store.checkStoryDistinctiveness({ projectId: "d6", chapter: 1 });
			expect(missing.issues.some((item) => item.code === "DISTINCTIVENESS_PROFILE_MISSING")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
