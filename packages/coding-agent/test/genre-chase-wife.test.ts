import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ChaseWifeBeat, ChaseWifeEvent } from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

function beat(beatNumber: number, phase: ChaseWifeBeat["phase"]): ChaseWifeBeat {
	return {
		beat: beatNumber,
		phase,
		sceneCount: 1,
		goal: "make a choice",
		conflict: "the old relationship resists the choice",
		actionOrConsequence: "the choice changes the next condition",
		emotionBefore: "hope",
		emotionAfter: "resolve",
		emotionStack: ["surprise", "anger"],
		painPoint: "the heroine loses access to an old promise",
		rewardPoint: "the heroine gains room to choose",
		hook: "the next decision cannot be avoided",
	};
}

function event(eventId: number, role: ChaseWifeEvent["role"]): ChaseWifeEvent {
	return {
		eventId,
		role,
		scene: eventId,
		pov: "first-person",
		charTarget: 400,
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
		exitHook: "the next decision cannot be avoided",
	};
}

describe("chase-wife genre branch", () => {
	it("normalizes the Chinese genre selection and checks its dedicated arc", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-chase-wife-"));
		try {
			const store = new NovelProjectStore(cwd);
			const info = await store.initializeNovel({ projectId: "chase", title: "追妻测试", genre: "追妻文" });
			expect(info.genre).toBe("chase-wife");
			const phases: ChaseWifeBeat["phase"][] = [
				"opening-injury",
				"escalation",
				"paywall-hook",
				"exit",
				"self-rebuild",
				"male-pursuit",
				"exposure",
				"public-consequence",
				"closure",
				"closure",
				"closure",
				"closure",
			];
			await store.saveChaseWifeBeatSheet({
				projectId: "chase",
				pov: "first-person",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the protagonist is asked to surrender her place immediately",
				beats: phases.map((phase, index) => beat(index + 1, phase)),
			});
			const report = await store.checkChaseWifeArc({ projectId: "chase" });
			expect(report.status).toBe("ok");
			expect(JSON.parse(await readFile(join(cwd, "novels", "chase", "project.json"), "utf8")).genre).toBe(
				"chase-wife",
			);
			await store.saveChaseWifeEventMap({
				projectId: "chase",
				chapter: 1,
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the protagonist is asked to surrender her place immediately",
				events: [event(1, "opening-intro-conflict"), event(2, "escalation"), event(3, "reversal")],
			});
			expect((await store.checkChaseWifeEventMap({ projectId: "chase", chapter: 1 })).status).toBe("ok");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("does not allow chase-wife tools on other genre projects", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-other-genre-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "other", title: "悬疑测试", genre: "suspense" });
			await expect(store.checkChaseWifeArc({ projectId: "other" })).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("rejects incomplete or non-contiguous beat sheets", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-invalid-chase-wife-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "invalid", title: "不完整测试", genre: "追妻文" });
			await expect(
				store.saveChaseWifeBeatSheet({
					projectId: "invalid",
					pov: "first-person",
					openingIntro: "opening intro ".repeat(8),
					openingConflict: "the protagonist is asked to surrender her place immediately",
					beats: [beat(1, "opening-injury")],
				}),
			).rejects.toThrow("12-24");
			await expect(
				store.saveChaseWifeBeatSheet({
					projectId: "invalid",
					pov: "first-person",
					openingIntro: "opening intro ".repeat(8),
					openingConflict: "the protagonist is asked to surrender her place immediately",
					beats: Array.from({ length: 12 }, (_, index) => beat(index === 11 ? 13 : index + 1, "closure")),
				}),
			).rejects.toThrow("contiguous");
			await expect(
				store.saveChaseWifeBeatSheet({
					projectId: "invalid",
					pov: "first-person",
					openingIntro: "opening intro ".repeat(8),
					openingConflict: "the protagonist is asked to surrender her place immediately",
					beats: Array.from({ length: 12 }, (_, index) =>
						beat(index + 1, index === 10 ? "paywall-hook" : "closure"),
					),
				}),
			).rejects.toThrow("opening half");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("reports invalid records and phase order instead of passing", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-invalid-arc-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "invalid-arc", title: "曲线测试", genre: "chase-wife" });
			const phases: ChaseWifeBeat["phase"][] = [
				"closure",
				"escalation",
				"paywall-hook",
				"exit",
				"self-rebuild",
				"male-pursuit",
				"exposure",
				"public-consequence",
				"opening-injury",
				"closure",
				"closure",
				"closure",
			];
			const beats = phases.map((phase, index) => beat(index + 1, phase));
			(beats[11] as { phase: string }).phase = "unknown";
			await mkdir(join(cwd, "novels", "invalid-arc", "outline", "genre"), { recursive: true });
			await writeFile(
				join(cwd, "novels", "invalid-arc", "outline", "genre", "chase-wife-beat-sheet.json"),
				JSON.stringify({ beats }),
				"utf8",
			);
			const report = await store.checkChaseWifeArc({ projectId: "invalid-arc" });
			expect(report.status).toBe("error");
			expect(report.issues).toEqual(expect.arrayContaining(["chase-wife beat sheet must declare first-person narration"]));
			expect(report.issues).toEqual(expect.arrayContaining(["opening intro must contain 80-300 characters"]));
			expect(report.issues).toEqual(expect.arrayContaining(["beat sheet contains invalid beat records"]));
			expect(report.issues).toEqual(
				expect.arrayContaining(["chase-wife phases must follow the defined emotional arc order"]),
			);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
