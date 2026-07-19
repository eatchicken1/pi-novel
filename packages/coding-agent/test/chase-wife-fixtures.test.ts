import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

type FixtureLabel = {
	pacing: "ok" | "fail";
	aiArtifacts: "ok" | "warning" | "error";
	fakeRemorse: boolean;
	agencyLate: boolean;
	repeatedMechanism: boolean;
};

const fixtureRoot = fileURLToPath(new URL("./fixtures/chase-wife/", import.meta.url));
const fixtureNames = [
	"realistic-tight-pass",
	"realistic-dragging-fail",
	"realistic-fake-remorse-fail",
	"realistic-overexplained-fail",
] as const;

describe("realistic Chinese chase-wife fixtures", () => {
	it.each(fixtureNames)("runs the AI-artifact gate against %s", async (fixtureName) => {
		const labels = JSON.parse(await readFile(join(fixtureRoot, "labels.json"), "utf8")) as Record<
			string,
			FixtureLabel
		>;
		const label = labels[fixtureName];
		if (label === undefined) throw new Error(`Missing labels for ${fixtureName}`);
		const content = await readFile(join(fixtureRoot, `${fixtureName}.md`), "utf8");
		const nonWhitespaceChars = [...content.replace(/\s+/gu, "")].length;
		expect(nonWhitespaceChars).toBeGreaterThan(900);

		const cwd = await mkdtemp(join(tmpdir(), `pi-novel-fixture-${fixtureName}-`));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "fixture", title: fixtureName, genre: "urban-romance" });
			await store.saveChapterDraft({ projectId: "fixture", chapter: 1, content });
			const report = await store.checkAiArtifacts({ projectId: "fixture", chapter: 1, draftRevision: 1 });
			expect(report.status, JSON.stringify(report)).toBe(label.aiArtifacts);
			if (label.aiArtifacts === "error") expect(report.passed).toBe(false);
			if (label.aiArtifacts === "ok") expect(report.findingCount).toBe(0);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("keeps literary review labels separate from executable quality-gate output", async () => {
		const labels = JSON.parse(await readFile(join(fixtureRoot, "labels.json"), "utf8")) as Record<
			string,
			FixtureLabel
		>;
		for (const fixtureName of fixtureNames) {
			const label = labels[fixtureName];
			expect(label).toEqual(
				expect.objectContaining({ pacing: expect.any(String), fakeRemorse: expect.any(Boolean) }),
			);
		}
	});
});
