import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
	ChaseWifeBeat,
	ChaseWifeEvent,
	UnifiedChaseWifeDelta,
	UnifiedEvent,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
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

function anchor(content: string, start: number): { startChar: number; endChar: number; excerpt: string } {
	const normalized = [...content.replace(/\s+/gu, "")].join("");
	const safeStart = Math.min(start, Math.max(0, normalized.length - 8));
	const endChar = Math.min(normalized.length, safeStart + 8);
	return { startChar: safeStart, endChar, excerpt: normalized.slice(safeStart, endChar) };
}

function chaseDelta(
	role: UnifiedChaseWifeDelta["role"],
	overrides: Partial<UnifiedChaseWifeDelta> = {},
): UnifiedChaseWifeDelta {
	return {
		informationDelta: ["他第一次把决定权摆到桌上"],
		relationshipDelta: ["旧约定开始松动"],
		resourceDelta: [],
		riskDelta: [],
		heroineAgencyBefore: 20,
		heroineAgencyAfter: 40,
		harmRefs: [],
		repairRefs: [],
		role,
		paywallHook: false,
		...overrides,
	};
}

async function initProject(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "convergence",
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

function chapterOneEvents(): UnifiedEvent[] {
	return [
		unifiedEvent(1, 1, {
			conflict: "他要求我放弃调查这件理赔",
			action: "我拒绝把材料交出去",
			chaseWifeDelta: chaseDelta("opening-injury"),
		}),
		unifiedEvent(2, 1, { chaseWifeDelta: chaseDelta("micro-withdrawal") }),
	];
}

function _chapterTwoEvents(): UnifiedEvent[] {
	return [
		unifiedEvent(3, 2, { chaseWifeDelta: chaseDelta("evidence") }),
		unifiedEvent(4, 2, { chaseWifeDelta: chaseDelta("boundary-test") }),
	];
}

function beat(
	beatNumber: number,
	heroinePhase: ChaseWifeBeat["heroinePhase"],
	malePhase: ChaseWifeBeat["malePhase"],
): ChaseWifeBeat {
	return {
		beat: beatNumber,
		heroinePhase,
		malePhase,
		targetTrack: "heroine",
		paywallHook: false,
		sceneCount: 1,
		goal: "the heroine protects her choice",
		conflict: "the old relationship resists",
		actionOrConsequence: "the choice moves forward",
		emotionBefore: "expectation",
		emotionAfter: "resolve",
		emotionStack: ["resolve"],
		painPoint: "the old promise",
		rewardPoint: "her own boundary",
		hook: "the next decision approaches",
	};
}

function chaseEventRecord(eventId: number, role: ChaseWifeEvent["role"]): ChaseWifeEvent {
	return {
		eventId,
		role,
		beatRefs: undefined,
		harmRefs: [],
		repairRefs: [],
		chronology: "present",
		scene: eventId,
		pov: "heroine-first-person",
		targetTrack: "heroine",
		paywallHook: false,
		causes: eventId === 1 ? [] : [eventId - 1],
		informationDelta: ["新信息"],
		relationshipDelta: ["关系变化"],
		resourceDelta: [],
		riskDelta: [],
		heroineAgencyBefore: 20,
		heroineAgencyAfter: 40,
		heroineAgencyStateBefore: { epistemic: 1, relational: 1, material: 1, social: 1, future: 1 },
		heroineAgencyStateAfter: { epistemic: 2, relational: 2, material: 2, social: 2, future: 2 },
		irreversible: false,
		cannotRemoveBecause: "下一次选择不能回到原地",
		lengthMode: "standard",
		minChars: 220,
		maxChars: 450,
		eventDescription: "a concrete change",
		function: "advance the conflict",
		goal: "protect the choice",
		conflict: "the old relationship resists",
		actionOrConsequence: "the choice changes the condition",
		protagonistReaction: "she responds",
		oppositionReaction: "he escalates",
		informationChange: "one new fact",
		emotionBefore: "expectation",
		emotionAfter: "resolve",
		physicalReaction: "she pauses",
		setupOrPayoff: "prepares a consequence",
		readerRelease: "the preference becomes visible",
		entryHook: "the previous choice remains",
		exitHook: "the next decision approaches",
	};
}
describe("chase wife unified convergence", () => {
	it("C1: legacy chase-wife event tools reject unified-covered chapters", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-converge-c1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "c1");
			await store.saveUnifiedEventMap({ projectId: "c1", chapter: 1, events: chapterOneEvents() });
			await expect(
				store.saveChaseWifeEventMap({
					projectId: "c1",
					chapter: 1,
					povMode: "heroine-first-person",
					openingConflict: "conflict",
					events: [],
				}),
			).rejects.toThrow("LEGACY_EVENT_AUTHORITY_CONFLICT");
			await expect(
				store.saveChaseWifeEventDraft({ projectId: "c1", chapter: 1, eventId: 1, content: "草稿内容".repeat(20) }),
			).rejects.toThrow("LEGACY_EVENT_AUTHORITY_CONFLICT");
			await expect(store.assembleChaseWifeChapter({ projectId: "c1", chapter: 1 })).rejects.toThrow(
				"LEGACY_EVENT_AUTHORITY_CONFLICT",
			);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C2: chase-wife validators run on the unified projection", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-converge-c2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "c2");
			await store.saveUnifiedEventMap({ projectId: "c2", chapter: 1, events: chapterOneEvents() });
			const report = await store.checkChaseWifeEventMap({ projectId: "c2", chapter: 1 });
			expect(report.status, JSON.stringify(report)).toBe("ok");
			expect(report.checkedEvents).toBe(2);
			expect(report.eventMapHash).toBeTruthy();
			// 上下文不再读取 legacy chase-wife 事件文件
			const context = await store.readStoryContext({ projectId: "c2", chapter: 1, task: "chapter-writing" });
			expect(
				context.includedFiles.some(
					(file) => file.includes("work/chase-wife-events") || file.includes("work\\chase-wife-events"),
				),
			).toBe(false);
			expect(context.includedFiles).toContain("outline/unified/event-map.json");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C3: divergent legacy event map reports LEGACY_EVENT_AUTHORITY_CONFLICT", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-converge-c3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "c3");
			await store.saveUnifiedEventMap({ projectId: "c3", chapter: 1, events: chapterOneEvents() });
			await mkdir(join(cwd, "novels", "c3", "work", "chase-wife-events"), { recursive: true });
			await writeFile(
				join(cwd, "novels", "c3", "work", "chase-wife-events", "chapter-001.json"),
				JSON.stringify({
					version: 2,
					genre: "chase-wife",
					projectId: "c3",
					chapter: 1,
					povMode: "heroine-first-person",
					openingConflict: "conflict",
					events: [],
				}),
				"utf8",
			);
			const report = await store.checkChaseWifeEventMap({ projectId: "c3", chapter: 1 });
			expect(report.status).toBe("error");
			expect(report.issues.some((issue) => issue.includes("LEGACY_EVENT_AUTHORITY_CONFLICT"))).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C4: male-pov events must follow an earlier unified irreversible exit", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-converge-c4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "c4");
			await store.saveUnifiedEventMap({ projectId: "c4", chapter: 1, events: chapterOneEvents() });
			await store.saveUnifiedEventMap({
				projectId: "c4",
				chapter: 2,
				events: [
					unifiedEvent(3, 2, {
						pov: "male-limited-third-person",
						chaseWifeDelta: chaseDelta("pursuit-failure", { targetTrack: "male" }),
					}),
				],
			});
			const withoutExit = await store.checkChaseWifeEventMap({ projectId: "c4", chapter: 2 });
			expect(
				withoutExit.issues.some((issue) =>
					issue.includes("male-limited-third-person events must follow the irreversible exit"),
				),
			).toBe(true);
			// 第 1 章补上正式退出事件后放行
			await store.saveUnifiedEventMap({
				projectId: "c4",
				chapter: 1,
				events: [
					unifiedEvent(1, 1, {
						conflict: "他要求我放弃调查这件理赔",
						action: "我拒绝把材料交出去",
						chaseWifeDelta: chaseDelta("opening-injury"),
					}),
					unifiedEvent(2, 1, {
						irreversible: true,
						cannotRemoveBecause: "材料已经交到第三方",
						chaseWifeDelta: chaseDelta("irreversible-exit", { heroineAgencyAfter: 60 }),
					}),
				],
			});
			const withExit = await store.checkChaseWifeEventMap({ projectId: "c4", chapter: 2 });
			expect(withExit.status, JSON.stringify(withExit)).toBe("ok");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C5: beat sheet integration validates beats and phases on unified events", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-converge-c5-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "c5");
			await store.saveChaseWifeBeatSheet({
				projectId: "c5",
				povMode: "heroine-first-person",
				heroineArc: [
					"injury",
					"recognition",
					"micro-withdrawal",
					"boundary-test",
					"irreversible-exit",
					"self-rebuild",
					"final-boundary",
				],
				maleArc: [
					"entitlement",
					"loss-of-control",
					"wrong-pursuit",
					"real-consequence",
					"recognition",
					"respect-or-failure",
				],
				openingIntro: "我把钥匙放在玄关，转身走出家门，夜风把门带上。".repeat(4),
				openingConflict: "他要求我放弃调查这件理赔",
				stayingLogic: {
					emotionalReason: "旧承诺还能修复",
					materialReason: "住房绑定",
					socialReason: "家族期待",
					falseBelief: "再解释一次他就会选择我",
					sustainingEvidence: ["他不断要求我等待"],
					breakingThreshold: "他把位置公开给了别人",
				},
				beats: [
					beat(1, "injury", "entitlement"),
					beat(2, "recognition", "loss-of-control"),
					beat(3, "micro-withdrawal", "wrong-pursuit"),
					beat(4, "boundary-test", "real-consequence"),
					beat(5, "irreversible-exit", "recognition"),
					beat(6, "self-rebuild", "respect-or-failure"),
					beat(7, "final-boundary", "respect-or-failure"),
					beat(8, "final-boundary", "respect-or-failure"),
					beat(9, "final-boundary", "respect-or-failure"),
					beat(10, "final-boundary", "respect-or-failure"),
					beat(11, "final-boundary", "respect-or-failure"),
					beat(12, "final-boundary", "respect-or-failure"),
				],
			});
			await store.saveUnifiedEventMap({
				projectId: "c5",
				chapter: 1,
				events: [
					unifiedEvent(1, 1, {
						conflict: "他要求我放弃调查这件理赔",
						action: "我拒绝把材料交出去",
						chaseWifeDelta: chaseDelta("opening-injury", { beatRefs: [1], heroinePhase: "injury" }),
					}),
				],
			});
			expect((await store.checkChaseWifeEventMap({ projectId: "c5", chapter: 1 })).status).toBe("ok");
			// phase 与 beatRefs 冲突 → 投影拒绝
			await store.saveUnifiedEventMap({
				projectId: "c5",
				chapter: 1,
				events: [
					unifiedEvent(1, 1, {
						conflict: "他要求我放弃调查这件理赔",
						action: "我拒绝把材料交出去",
						chaseWifeDelta: chaseDelta("opening-injury", { beatRefs: [1], heroinePhase: "final-boundary" }),
					}),
				],
			});
			await expect(store.checkChaseWifeEventMap({ projectId: "c5", chapter: 1 })).rejects.toThrow(
				"heroinePhase does not match its beatRefs",
			);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("C6: chapter pacing consumes unified drafts and assembly in converged mode", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-converge-c6-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "c6");
			await store.saveUnifiedEventMap({ projectId: "c6", chapter: 1, events: chapterOneEvents() });
			const prose: Record<number, string> = {
				1: "他要求我放弃调查这件理赔，旧约定开始松动，我拒绝交材料。",
				2: "我收回钥匙，旧约定开始松动，决定权握回手中。",
			};
			for (const event of chapterOneEvents()) {
				const content = prose[event.eventId]!.repeat(12);
				await store.saveUnifiedEventDraft({ projectId: "c6", chapter: 1, eventId: event.eventId, content });
				await store.checkUnifiedEventDraft({ projectId: "c6", chapter: 1, eventId: event.eventId });
				await store.saveUnifiedEventSemanticReport({
					projectId: "c6",
					chapter: 1,
					eventId: event.eventId,
					actionShown: true,
					consequenceShown: true,
					deltaEvidence: [
						{ dimension: "information", evidence: anchor(content, 0) },
						{ dimension: "relationship", evidence: anchor(content, 20) },
					],
					chaseEvidence: {
						roleShown: true,
						conflictShown: true,
						relationshipDeltasShown: ["旧约定开始松动"],
						agencyActionShown: true,
					},
				});
			}
			const assembled = await store.assembleUnifiedChapter({ projectId: "c6", chapter: 1 });
			const pacing = await store.checkChaseWifeChapterPacing({
				projectId: "c6",
				chapter: 1,
				draftRevision: assembled.draftRevision,
			});
			expect(pacing.status, JSON.stringify(pacing)).toBe("ok");
			expect(pacing.eventMapHash).toBeTruthy();
			expect(pacing.manifestHash).toBeTruthy();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
	it("FULL2: the legacy chase-wife pipeline keeps running on projects without a unified map", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-converge-full2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "full2");
			await store.saveChaseWifeEventMap({
				projectId: "full2",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "我把钥匙放在玄关，转身走出家门，夜风把门带上。".repeat(3),
				openingConflict: "conflict",
				openingConflictMarker: "钥匙",
				events: [
					chaseEventRecord(1, "opening-injury"),
					chaseEventRecord(2, "micro-withdrawal"),
					chaseEventRecord(3, "boundary-test"),
				],
			});
			const report = await store.checkChaseWifeEventMap({ projectId: "full2", chapter: 1 });
			expect(report.status, JSON.stringify(report)).toBe("ok");
			expect(report.checkedEvents).toBe(3);
			for (const eventId of [1, 2, 3]) {
				const content = `legacy draft ${eventId} 内容足够长，重复若干次以保证长度预算。`.repeat(10);
				await store.saveChaseWifeEventDraft({ projectId: "full2", chapter: 1, eventId, content });
				await store.checkChaseWifeEventDraft({ projectId: "full2", chapter: 1, eventId });
				await store.saveChaseWifeEventSemanticReport({
					projectId: "full2",
					chapter: 1,
					eventId,
					roleSatisfied: true,
					conflictShown: true,
					stateDeltasShown: [
						{ deltaId: "information-1", dimension: "information", delta: "新信息", evidence: anchor(content, 0) },
						{
							deltaId: "relationship-1",
							dimension: "relationship",
							delta: "关系变化",
							evidence: anchor(content, 20),
						},
					],
					roleEvidence: anchor(content, 0),
					conflictEvidence: anchor(content, 20),
					agencyActionEvidence: anchor(content, 40),
					entryHookEvidence: anchor(content, 60),
					exitHookEvidence: anchor(content, 80),
				});
			}
			const assembled = await store.assembleChaseWifeChapter({ projectId: "full2", chapter: 1 });
			expect(assembled.draftRevision).toBe(1);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
