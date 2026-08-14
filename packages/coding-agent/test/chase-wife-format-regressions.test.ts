import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ChaseWifeEvent } from "../../../.pi/extensions/novel-agent/schemas.ts";
import { SaveChaseWifeBeatSheetSchema } from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

function event(eventId: number, role: ChaseWifeEvent["role"], overrides: Partial<ChaseWifeEvent> = {}): ChaseWifeEvent {
	const heroineAgencyBefore = overrides.heroineAgencyBefore ?? (eventId === 1 ? 10 : 20);
	const heroineAgencyAfter = overrides.heroineAgencyAfter ?? (eventId === 1 ? 10 : 25);
	const agencyState = (score: number): ChaseWifeEvent["heroineAgencyStateBefore"] => {
		const level = Math.max(0, Math.min(4, Math.round(score / 25)));
		return { epistemic: level, relational: level, material: level, social: level, future: level };
	};
	return {
		eventId,
		role,
		scene: eventId,
		pov: "heroine-first-person",
		targetTrack: "heroine",
		paywallHook: false,
		causes: eventId === 1 ? [] : [eventId - 1],
		injuryMechanism: (["neglect", "substitution", "resource-transfer", "public-humiliation"][eventId - 1] ??
			"neglect") as ChaseWifeEvent["injuryMechanism"],
		informationDelta: ["the protagonist learns one new fact"],
		relationshipDelta: ["the relationship loses one promise"],
		resourceDelta: [],
		riskDelta: [],
		heroineAgencyBefore,
		heroineAgencyAfter,
		heroineAgencyStateBefore: agencyState(heroineAgencyBefore),
		heroineAgencyStateAfter: agencyState(heroineAgencyAfter),
		irreversible: role === "irreversible-exit",
		cannotRemoveBecause: "the event changes the next decision",
		lengthMode: role === "irreversible-exit" ? "anchor" : "standard",
		minChars: role === "irreversible-exit" ? 450 : 220,
		maxChars: role === "irreversible-exit" ? 850 : 450,
		eventDescription: "the protagonist encounters a concrete change",
		function: "advance the relationship conflict",
		goal: "protect the protagonist's choice",
		conflict: "the old relationship resists the choice",
		actionOrConsequence: "the choice changes the next condition",
		protagonistReaction: "the protagonist notices the cost and responds",
		oppositionReaction: "the opposing character explains or escalates",
		informationChange: "the protagonist learns one new fact",
		emotionBefore: "expectation",
		emotionAfter: "resolve",
		physicalReaction: "the protagonist pauses before acting",
		setupOrPayoff: "the event prepares a later consequence",
		readerRelease: "the hidden preference becomes visible",
		entryHook: "the previous choice remains unresolved",
		exitHook: "the next decision cannot be avoided",
		...overrides,
	};
}

function fixtureEventProse(eventRecord: ChaseWifeEvent, chapter: number): string {
	const count = eventRecord.lengthMode === "anchor" ? 20 : eventRecord.lengthMode === "flash" ? 4 : 12;
	const lead = eventRecord.targetTrack === "male" ? "他终于发现自己失去了控制" : "我把选择重新握回手中";
	const lines = Array.from(
		{ length: count },
		(_, index) =>
			`${lead}${chapter}-${eventRecord.eventId}-${index}，${eventRecord.targetTrack === "male" ? "他追到门口，却只能看着门合上" : "我转身离开，收回钥匙"}。`,
	);
	return `${chapter === 1 && eventRecord.eventId === 1 ? "交出位置。" : ""}${lines.join("")}`;
}

describe("chase-wife format regressions", () => {
	it("finds the opening conflict marker inside the chapter-one intro for working-scope pacing", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-intro-marker-working-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "intro-marker-working", title: "引言标记", genre: "chase-wife" });
			const events = [
				event(1, "opening-injury", { heroineAgencyAfter: 20 }),
				event(2, "micro-withdrawal", { lengthMode: "flash", minChars: 60, maxChars: 180 }),
				event(3, "irreversible-exit", {
					heroineAgencyBefore: 25,
					heroineAgencyAfter: 50,
					lengthMode: "anchor",
					minChars: 450,
					maxChars: 850,
				}),
			];
			await store.saveChaseWifeEventMap({
				projectId: "intro-marker-working",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "我在引言先看见他把我的位置让给了别人，再让自己看见关系的真实位置。".repeat(4),
				openingConflict: "他把我的位置让给了别人",
				openingConflictMarker: "让给了别人",
				events,
			});
			// 冲突标记只出现在引言里，事件 1 正文不含该标记
			const prose = [
				[1, Array.from({ length: 12 }, (_, index) => `我转身离开，把决定写进第${index + 1}个新的安排。`).join("")],
				[
					2,
					Array.from({ length: 4 }, (_, index) => `我删除了共同日程里的第${index + 1}项安排，没有再解释。`).join(
						"",
					),
				],
				[
					3,
					Array.from(
						{ length: 27 },
						(_, index) => `我把钥匙放在桌上，签下离开的文件。第${index + 1}次回头时，门已经关上。`,
					).join(""),
				],
			] as const;
			for (const [eventId, content] of prose)
				await store.saveChaseWifeEventDraft({ projectId: "intro-marker-working", chapter: 1, eventId, content });
			const report = await store.checkChaseWifeStoryPacing({ projectId: "intro-marker-working", mode: "standard" });
			expect(report.metrics.firstConflictPosition).toBeGreaterThanOrEqual(0);
			expect(report.issues).not.toContain(
				"first visible conflict is not verified within 250 characters of the full story",
			);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("allows heroine agency growth across chapter boundaries but rejects regression", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-agency-cross-chapter-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "agency-cross", title: "跨章主动权", genre: "chase-wife" });
			await store.saveChaseWifeEventMap({
				projectId: "agency-cross",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "我在引言先看见他把我的位置让给了别人，再让自己看见关系的真实位置。".repeat(4),
				openingConflict: "他把我的位置让给了别人",
				openingConflictMarker: "让给了别人",
				events: [
					event(1, "opening-injury", { heroineAgencyAfter: 20 }),
					event(2, "micro-withdrawal", { lengthMode: "flash", minChars: 60, maxChars: 180 }),
					event(3, "irreversible-exit", {
						heroineAgencyBefore: 25,
						heroineAgencyAfter: 50,
						lengthMode: "anchor",
						minChars: 450,
						maxChars: 850,
					}),
				],
			});
			const chapterOneProse = [
				[1, Array.from({ length: 12 }, (_, index) => `我转身离开，把决定写进第${index + 1}个新的安排。`).join("")],
				[
					2,
					Array.from({ length: 4 }, (_, index) => `我删除了共同日程里的第${index + 1}项安排，没有再解释。`).join(
						"",
					),
				],
				[
					3,
					Array.from(
						{ length: 27 },
						(_, index) => `我把钥匙放在桌上，签下离开的文件。第${index + 1}次回头时，门已经关上。`,
					).join(""),
				],
			] as const;
			for (const [eventId, content] of chapterOneProse)
				await store.saveChaseWifeEventDraft({ projectId: "agency-cross", chapter: 1, eventId, content });
			// 第二章：时间跳跃后女主主动权跨章上升（55 > 50），必须允许
			await store.saveChaseWifeEventMap({
				projectId: "agency-cross",
				chapter: 2,
				povMode: "heroine-first-person",
				openingConflict: "the heroine rebuilds her new life",
				events: [
					event(1, "self-rebuild", { heroineAgencyBefore: 55, heroineAgencyAfter: 60 }),
					event(2, "pursuit-failure", {
						targetTrack: "shared",
						heroineAgencyBefore: 60,
						heroineAgencyAfter: 60,
						lengthMode: "flash",
						minChars: 60,
						maxChars: 180,
					}),
					event(3, "closure", { heroineAgencyBefore: 60, heroineAgencyAfter: 65 }),
				],
			});
			const chapterTwoEvents = [
				event(1, "self-rebuild", { heroineAgencyBefore: 55, heroineAgencyAfter: 60 }),
				event(2, "pursuit-failure", {
					targetTrack: "shared",
					heroineAgencyBefore: 60,
					heroineAgencyAfter: 60,
					lengthMode: "flash",
					minChars: 60,
					maxChars: 180,
				}),
				event(3, "closure", { heroineAgencyBefore: 60, heroineAgencyAfter: 65 }),
			];
			for (const eventRecord of chapterTwoEvents)
				await store.saveChaseWifeEventDraft({
					projectId: "agency-cross",
					chapter: 2,
					eventId: eventRecord.eventId,
					content: fixtureEventProse(eventRecord, 2),
				});
			const grown = await store.checkChaseWifeStoryPacing({ projectId: "agency-cross", mode: "standard" });
			expect(grown.issues.some((issue) => issue.includes("does not continue into event"))).toBe(false);
			// 第二章第一个事件把 before 降到 45（跨章回退），必须报错
			await store.saveChaseWifeEventMap({
				projectId: "agency-cross",
				chapter: 2,
				povMode: "heroine-first-person",
				openingConflict: "the heroine rebuilds her new life",
				events: [
					event(1, "self-rebuild", { heroineAgencyBefore: 45, heroineAgencyAfter: 60 }),
					event(2, "pursuit-failure", {
						targetTrack: "shared",
						heroineAgencyBefore: 60,
						heroineAgencyAfter: 60,
						lengthMode: "flash",
						minChars: 60,
						maxChars: 180,
					}),
					event(3, "closure", { heroineAgencyBefore: 60, heroineAgencyAfter: 65 }),
				],
			});
			const regressed = await store.checkChaseWifeStoryPacing({ projectId: "agency-cross", mode: "standard" });
			expect(regressed.issues.some((issue) => issue.includes("does not continue into event"))).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("accepts a real-consequence event that changes only one state dimension", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-real-consequence-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "real-consequence", title: "现实后果", genre: "chase-wife" });
			await store.saveChaseWifeEventMap({
				projectId: "real-consequence",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "我在引言先看见他把我的位置让给了别人，再让自己看见关系的真实位置。".repeat(4),
				openingConflict: "他把我的位置让给了别人",
				openingConflictMarker: "让给了别人",
				events: [
					event(1, "opening-injury", { heroineAgencyAfter: 20 }),
					event(2, "real-consequence", {
						informationDelta: ["the public record changes"],
						relationshipDelta: [],
						resourceDelta: [],
						riskDelta: [],
						heroineAgencyBefore: 20,
						heroineAgencyAfter: 20,
					}),
					event(3, "irreversible-exit", {
						heroineAgencyBefore: 20,
						heroineAgencyAfter: 50,
						lengthMode: "anchor",
						minChars: 450,
						maxChars: 850,
					}),
				],
			});
			const report = await store.checkChaseWifeEventMap({ projectId: "real-consequence", chapter: 1 });
			expect(report.status, JSON.stringify(report)).toBe("ok");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("validates the opening intro by non-whitespace length only", async () => {
		const beatSheetSchema = SaveChaseWifeBeatSheetSchema as unknown as {
			properties: { openingIntro: { maxLength?: number } };
		};
		expect(beatSheetSchema.properties.openingIntro.maxLength).toBeUndefined();
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-intro-whitespace-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "intro-whitespace", title: "引言空白", genre: "chase-wife" });
			const introText = "我在引言先看见他把我的位置让给了别人，再让自己看见关系的真实位置。";
			const paddedIntro = `${introText.repeat(4)}${" ".repeat(15)}`;
			expect(paddedIntro.length).toBeGreaterThan(140);
			await store.saveChaseWifeEventMap({
				projectId: "intro-whitespace",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: paddedIntro,
				openingConflict: "他把我的位置让给了别人",
				openingConflictMarker: "让给了别人",
				events: [
					event(1, "opening-injury", { heroineAgencyAfter: 20 }),
					event(2, "micro-withdrawal", { lengthMode: "flash", minChars: 60, maxChars: 180 }),
					event(3, "irreversible-exit", {
						heroineAgencyBefore: 25,
						heroineAgencyAfter: 50,
						lengthMode: "anchor",
						minChars: 450,
						maxChars: 850,
					}),
				],
			});
			await expect(
				store.saveChaseWifeEventMap({
					projectId: "intro-whitespace",
					chapter: 1,
					povMode: "heroine-first-person",
					openingIntro: introText,
					openingConflict: "他把我的位置让给了别人",
					openingConflictMarker: "让给了别人",
					events: [
						event(1, "opening-injury", { heroineAgencyAfter: 20 }),
						event(2, "micro-withdrawal", { lengthMode: "flash", minChars: 60, maxChars: 180 }),
						event(3, "irreversible-exit", {
							heroineAgencyBefore: 25,
							heroineAgencyAfter: 50,
							lengthMode: "anchor",
							minChars: 450,
							maxChars: 850,
						}),
					],
				}),
			).rejects.toThrow("60-140");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("keeps the opening intro a standalone first part that chapter one must not repeat", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-intro-standalone-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "intro-standalone", title: "独立引言", genre: "chase-wife" });
			const introText = "我在引言先看见他把我的位置让给了别人，再让自己看见关系的真实位置。";
			await store.saveChaseWifeEventMap({
				projectId: "intro-standalone",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: introText.repeat(4),
				openingConflict: "他把我的位置让给了别人",
				openingConflictMarker: "让给了别人",
				events: [
					event(1, "opening-injury", { heroineAgencyAfter: 20 }),
					event(2, "micro-withdrawal", { lengthMode: "flash", minChars: 60, maxChars: 180 }),
					event(3, "irreversible-exit", {
						heroineAgencyBefore: 25,
						heroineAgencyAfter: 50,
						lengthMode: "anchor",
						minChars: 450,
						maxChars: 850,
					}),
				],
			});
			// 事件 1 正文以引言全文逐字开头：引言被第一章重复，必须被门禁拦截
			await store.saveChaseWifeEventDraft({
				projectId: "intro-standalone",
				chapter: 1,
				eventId: 1,
				content: `${introText.repeat(4)}${Array.from({ length: 10 }, (_, index) => `我把决定写进第${index + 1}个新的安排。`).join("")}`,
			});
			await store.saveChaseWifeEventDraft({
				projectId: "intro-standalone",
				chapter: 1,
				eventId: 2,
				content: Array.from(
					{ length: 4 },
					(_, index) => `我删除了共同日程里的第${index + 1}项安排，没有再解释。`,
				).join(""),
			});
			await store.saveChaseWifeEventDraft({
				projectId: "intro-standalone",
				chapter: 1,
				eventId: 3,
				content: Array.from(
					{ length: 27 },
					(_, index) => `我把钥匙放在桌上，签下离开的文件。第${index + 1}次回头时，门已经关上。`,
				).join(""),
			});
			const pacing = await store.checkChaseWifeChapterPacing({ projectId: "intro-standalone", chapter: 1 });
			expect(pacing.issues).toContain(
				"the first event must not repeat the opening intro; the intro is a standalone short first part",
			);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
