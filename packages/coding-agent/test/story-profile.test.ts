import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";
import {
	hasChaseWifeCapability,
	hasRelationshipMechanism,
	legacyGenreToStoryProfile,
	normalizePrimaryGenre,
	normalizeRelationshipMechanism,
	resolveStoryProfile,
} from "../../../.pi/extensions/novel-agent/services/story-profile.ts";

const BEAT_SHEET_PATH = "outline/genre/chase-wife-beat-sheet.json";

async function writeProjectFile(projectRoot: string, relativePath: string, content: string): Promise<void> {
	const path = join(projectRoot, relativePath);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, content, "utf8");
}

describe("story profile capability resolution", () => {
	it("normalizes primary genres and relationship mechanisms", () => {
		expect(normalizePrimaryGenre("追妻文")).toBe("chase-wife");
		expect(normalizePrimaryGenre("女性社会派悬疑")).toBe("female-social-suspense");
		expect(normalizePrimaryGenre("Female-Social-Suspense")).toBe("female-social-suspense");
		expect(normalizePrimaryGenre("suspense")).toBe("suspense");
		expect(normalizeRelationshipMechanism("追妻")).toBe("chase-wife");
		expect(normalizeRelationshipMechanism("  Chase Wife ")).toBe("chase-wife");
		expect(normalizeRelationshipMechanism("time-loop")).toBe("time-loop");
	});

	it("resolves legacy genre without a story profile", () => {
		const legacy = legacyGenreToStoryProfile("chase-wife");
		expect(legacy.primaryGenre).toBe("chase-wife");
		expect(legacy.relationshipMechanisms).toEqual(["chase-wife"]);
		expect(hasChaseWifeCapability({ version: 1, genre: "chase-wife" })).toBe(true);
		expect(hasChaseWifeCapability({ version: 1, genre: "追妻文" })).toBe(true);
		expect(hasChaseWifeCapability({ version: 1, genre: "suspense" })).toBe(false);
		expect(legacyGenreToStoryProfile("suspense").relationshipMechanisms).toEqual([]);
	});

	it("treats an explicit storyProfile as authoritative", () => {
		const combined = resolveStoryProfile({
			version: 1,
			genre: "female-social-suspense",
			storyProfile: {
				primaryGenre: "female-social-suspense",
				relationshipMechanisms: ["chase-wife", "mature-marriage-crisis"],
				professionalDomain: "insurance-fraud-investigation",
				themes: ["female-agency"],
				storyForm: "mid-length",
			},
		});
		expect(combined.primaryGenre).toBe("female-social-suspense");
		expect(combined.relationshipMechanisms).toEqual(["chase-wife", "mature-marriage-crisis"]);
		expect(combined.professionalDomain).toBe("insurance-fraud-investigation");
		expect(hasChaseWifeCapability({ version: 1, storyProfile: combined })).toBe(true);
		expect(hasRelationshipMechanism({ version: 1, storyProfile: combined }, "mature-marriage-crisis")).toBe(true);
	});

	it("keeps unknown relationship mechanisms safe without granting chase-wife capability", () => {
		const profile = resolveStoryProfile({
			version: 1,
			genre: "suspense",
			storyProfile: { primaryGenre: "suspense", relationshipMechanisms: ["time-loop"] },
		});
		expect(profile.relationshipMechanisms).toEqual(["time-loop"]);
		expect(hasChaseWifeCapability({ version: 1, storyProfile: profile })).toBe(false);
	});

	it("inherits chase-wife from legacy genre when the story profile omits mechanisms", () => {
		const profile = resolveStoryProfile({
			version: 1,
			genre: "chase-wife",
			storyProfile: { primaryGenre: "suspense" },
		});
		expect(profile.primaryGenre).toBe("suspense");
		expect(profile.relationshipMechanisms).toEqual(["chase-wife"]);
		expect(hasChaseWifeCapability({ version: 1, storyProfile: profile })).toBe(true);
	});

	it("respects an explicit empty mechanism array even under a chase-wife legacy genre", () => {
		const profile = resolveStoryProfile({
			version: 1,
			genre: "chase-wife",
			storyProfile: { primaryGenre: "suspense", relationshipMechanisms: [] },
		});
		expect(profile.relationshipMechanisms).toEqual([]);
		expect(hasChaseWifeCapability({ version: 1, storyProfile: profile })).toBe(false);
	});
});

describe("story profile project integration (CASE A-F)", () => {
	it("CASE A: legacy chase-wife projects keep every chase-wife capability", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-profile-case-a-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "case-a", title: "legacy", genre: "chase-wife" });
			const project = JSON.parse(await readFile(join(cwd, "novels", "case-a", "project.json"), "utf8")) as Record<
				string,
				unknown
			>;
			expect(project.version).toBe(1);
			expect(project.genre).toBe("chase-wife");
			expect(hasChaseWifeCapability(project)).toBe(true);
			expect(project.storyProfile).toBeUndefined();
			// chase-wife 工具可用（capability 门通过，返回报告而非抛错）
			await expect(store.checkChaseWifeArc({ projectId: "case-a" })).resolves.toBeTruthy();
			// 事件级定稿门仍然生效
			await expect(store.saveChapterDraft({ projectId: "case-a", chapter: 1, content: "draft" })).rejects.toThrow(
				"assemble_chase_wife_chapter",
			);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE B: combined female-social-suspense + chase-wife gets chase-wife context and gates", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-profile-case-b-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({
				projectId: "case-b",
				title: "combined",
				genre: "female-social-suspense",
				storyProfile: {
					primaryGenre: "female-social-suspense",
					relationshipMechanisms: ["chase-wife"],
					professionalDomain: "insurance-fraud-investigation",
					themes: ["female-agency", "marital-boundaries"],
					storyForm: "mid-length",
				},
			});
			const project = JSON.parse(await readFile(join(cwd, "novels", "case-b", "project.json"), "utf8")) as Record<
				string,
				unknown
			>;
			expect(hasChaseWifeCapability(project)).toBe(true);
			// 上下文读取 chase-wife 私有内容
			const projectRoot = join(cwd, "novels", "case-b");
			await writeProjectFile(
				projectRoot,
				BEAT_SHEET_PATH,
				JSON.stringify({ version: 2, genre: "chase-wife", beats: [] }),
			);
			const context = await store.readStoryContext({ projectId: "case-b", chapter: 1, task: "chapter-writing" });
			expect(context.includedFiles).toContain(BEAT_SHEET_PATH);
			// 事件级定稿门生效（不得绕开）
			await expect(store.saveChapterDraft({ projectId: "case-b", chapter: 1, content: "draft" })).rejects.toThrow(
				"assemble_chase_wife_chapter",
			);
			// 关系台账门生效：confirmed 写入必须绑定正文证据
			await expect(
				store.saveChaseWifeHarmLedger({
					projectId: "case-b",
					status: "confirmed",
					confirmation: "USER_CONFIRMED",
					harms: [
						{
							id: "harm-1",
							category: "deception",
							victimImpact: { emotional: "she is treated as replaceable" },
							maleBeliefAtTheTime: "she will stay",
							heroineBeliefAtTheTime: "the promise is real",
							severity: "major",
							recognizedByHeroine: true,
							recognizedByMale: false,
							repaired: false,
							repairable: true,
						},
					],
				}),
			).rejects.toThrow("prose evidence");
			// 结局资格门生效（返回报告而非“不可用”错误）
			await expect(store.checkChaseWifeEndingEligibility({ projectId: "case-b" })).resolves.toBeTruthy();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE C: plain female-social-suspense is not polluted by chase-wife gates", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-profile-case-c-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({
				projectId: "case-c",
				title: "plain",
				genre: "female-social-suspense",
				storyProfile: { primaryGenre: "female-social-suspense", relationshipMechanisms: [] },
			});
			const project = JSON.parse(await readFile(join(cwd, "novels", "case-c", "project.json"), "utf8")) as Record<
				string,
				unknown
			>;
			expect(hasChaseWifeCapability(project)).toBe(false);
			// 即使磁盘上存在 chase-wife 私有文件，也不得读取
			const projectRoot = join(cwd, "novels", "case-c");
			await writeProjectFile(
				projectRoot,
				BEAT_SHEET_PATH,
				JSON.stringify({ version: 2, genre: "chase-wife", beats: [] }),
			);
			const context = await store.readStoryContext({ projectId: "case-c", chapter: 1, task: "chapter-writing" });
			expect(context.includedFiles).not.toContain(BEAT_SHEET_PATH);
			// chase-wife 专属工具被拒绝
			await expect(store.checkChaseWifeArc({ projectId: "case-c" })).rejects.toThrow("only available");
			await expect(
				store.saveChaseWifeHarmLedger({
					projectId: "case-c",
					status: "proposed",
					harms: [
						{
							id: "harm-1",
							category: "deception",
							victimImpact: { emotional: "she is treated as replaceable" },
							maleBeliefAtTheTime: "she will stay",
							heroineBeliefAtTheTime: "the promise is real",
							severity: "major",
							recognizedByHeroine: true,
							recognizedByMale: false,
							repaired: false,
							repairable: true,
						},
					],
				}),
			).rejects.toThrow("only available");
			// 普通草稿路径不受阻碍
			await expect(
				store.saveChapterDraft({ projectId: "case-c", chapter: 1, content: "draft" }),
			).resolves.toBeTruthy();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE D: unknown relationship mechanisms are saved safely without capability", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-profile-case-d-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({
				projectId: "case-d",
				title: "unknown",
				genre: "suspense",
				storyProfile: { primaryGenre: "suspense", relationshipMechanisms: ["time-loop"] },
			});
			const project = JSON.parse(await readFile(join(cwd, "novels", "case-d", "project.json"), "utf8")) as Record<
				string,
				unknown
			>;
			const profile = resolveStoryProfile(project);
			expect(profile.relationshipMechanisms).toEqual(["time-loop"]);
			expect(hasChaseWifeCapability(project)).toBe(false);
			await expect(store.checkChaseWifeArc({ projectId: "case-d" })).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE E: version-1 projects load without migration", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-profile-case-e-"));
		try {
			const store = new NovelProjectStore(cwd);
			const projectRoot = join(cwd, "novels", "case-e");
			await writeProjectFile(
				projectRoot,
				"project.json",
				JSON.stringify({
					version: 1,
					projectId: "case-e",
					title: "legacy on disk",
					genre: "chase-wife",
					status: "planning",
					nextChapter: 1,
					finalizedChapters: [],
				}),
			);
			await writeProjectFile(
				projectRoot,
				"status.json",
				JSON.stringify({
					projectId: "case-e",
					status: "planning",
					nextChapter: 1,
					finalizedChapters: [],
				}),
			);
			const status = await store.getNovelStatus({ projectId: "case-e" });
			expect(status.nextChapter).toBe(1);
			const project = JSON.parse(await readFile(join(projectRoot, "project.json"), "utf8")) as Record<
				string,
				unknown
			>;
			expect(hasChaseWifeCapability(project)).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE F: combined projects cannot bypass chase-wife finalization gates", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-profile-case-f-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({
				projectId: "case-f",
				title: "combined finalize",
				genre: "female-social-suspense",
				storyProfile: { primaryGenre: "female-social-suspense", relationshipMechanisms: ["chase-wife"] },
			});
			// 定稿必须走 chase-wife 事件级路径：直接写整章被拒绝
			await expect(store.saveChapterDraft({ projectId: "case-f", chapter: 1, content: "draft" })).rejects.toThrow(
				"assemble_chase_wife_chapter",
			);
			// finalizeChapter 必须带 USER_CONFIRMED 且要求 chase-wife 报告
			await expect(
				store.finalizeChapter({
					projectId: "case-f",
					chapter: 1,
					title: "x",
					content: "draft",
					summary: {
						pov: "heroine",
						time: "now",
						locations: [],
						characters: [],
						events: [],
						newFacts: [],
						relationshipChanges: [],
						cluesIntroduced: [],
						cluesResolved: [],
						itemsChanged: [],
						openQuestions: [],
					},
					draftRevision: 1,
					confirmation: "USER_CONFIRMED",
				}),
			).rejects.toThrow("chapter plan");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M13: initialize_novel rejects genre and storyProfile.primaryGenre conflicts", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-profile-case-m13-"));
		try {
			const store = new NovelProjectStore(cwd);
			await expect(
				store.initializeNovel({
					projectId: "case-m13",
					title: "conflict",
					genre: "female-social-suspense",
					storyProfile: { primaryGenre: "suspense", relationshipMechanisms: [] },
				}),
			).rejects.toThrow("agree after normalization");
			// 中文别名与英文值归一化后一致，必须允许
			await expect(
				store.initializeNovel({
					projectId: "case-m13-alias",
					title: "alias ok",
					genre: "追妻文",
					storyProfile: { primaryGenre: "chase-wife", relationshipMechanisms: ["chase-wife"] },
				}),
			).resolves.toBeTruthy();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CASE M14: legacy disk projects with genre/profile inconsistency stay readable", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-profile-case-m14-"));
		try {
			const store = new NovelProjectStore(cwd);
			const projectRoot = join(cwd, "novels", "case-m14");
			await writeProjectFile(
				projectRoot,
				"project.json",
				JSON.stringify({
					version: 1,
					projectId: "case-m14",
					title: "legacy mismatch",
					genre: "chase-wife",
					storyProfile: { primaryGenre: "suspense", relationshipMechanisms: [] },
					status: "planning",
					nextChapter: 1,
					finalizedChapters: [],
				}),
			);
			await writeProjectFile(
				projectRoot,
				"status.json",
				JSON.stringify({
					projectId: "case-m14",
					status: "planning",
					nextChapter: 1,
					finalizedChapters: [],
				}),
			);
			const status = await store.getNovelStatus({ projectId: "case-m14" });
			expect(status.nextChapter).toBe(1);
			const project = JSON.parse(await readFile(join(projectRoot, "project.json"), "utf8")) as Record<
				string,
				unknown
			>;
			const profile = resolveStoryProfile(project);
			expect(profile.primaryGenre).toBe("suspense");
			expect(hasChaseWifeCapability(project)).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
