import { describe, expect, it } from "vitest";
import { createTextAnchor, resolveTextAnchor, textHash } from "../src/patch/text-anchor.ts";

describe("narrative patch contracts", () => {
	it("creates an anchor with content hash and relocates after an unrelated prefix edit", () => {
		const original = "开场。\n她握紧文件。\n门外有脚步。";
		const start = original.indexOf("她握紧文件");
		const anchor = createTextAnchor({ chapterId: "1", content: original, startOffset: start, endOffset: start + 5 });
		const changed = `新增的前言。\n${original}`;
		expect(anchor.baseContentHash).toBe(textHash(original));
		expect(resolveTextAnchor(changed, anchor)).toEqual({ startOffset: start + 7, endOffset: start + 12 });
	});

	it("rejects an ambiguous relocation", () => {
		const original = "她回头。\n她回头。";
		const anchor = createTextAnchor({
			chapterId: "1",
			content: original,
			startOffset: 0,
			endOffset: 3,
			contextLength: 0,
		});
		expect(() => resolveTextAnchor(`前言\n${original}`, anchor)).toThrow("PATCH_TARGET_CONFLICT");
	});
});
