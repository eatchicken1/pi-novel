import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ChaseWifeBeat } from "../../../.pi/extensions/novel-agent/schemas.ts";
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
				beats: phases.map((phase, index) => beat(index + 1, phase)),
			});
			const report = await store.checkChaseWifeArc({ projectId: "chase" });
			expect(report.status).toBe("ok");
			expect(JSON.parse(await readFile(join(cwd, "novels", "chase", "project.json"), "utf8")).genre).toBe(
				"chase-wife",
			);
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
});
