import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileTransaction } from "../src/filesystem/file-transaction.ts";

function tempRoot(): string {
	return mkdtempSync(join(tmpdir(), "pi-novel-sec-"));
}

describe("file transaction security", () => {
	it("SEC2: rejects path traversal targets", async () => {
		const root = tempRoot();
		try {
			mkdirSync(join(root, "manuscript"), { recursive: true });
			writeFileSync(join(root, "manuscript", "chapter-001.md"), "正文。", "utf8");
			const files = new FileTransaction();
			await expect(files.applyOperations({ projectRoot: root, operations: [{ operationId: "op-1", kind: "replace-text", target: "../outside.md", startChar: 0, endChar: 0, text: "x" }], baseHashes: {} })).rejects.toThrow("PATH_ESCAPE");
			await expect(files.applyOperations({ projectRoot: root, operations: [{ operationId: "op-1", kind: "replace-text", target: "C:\\Windows\\win.ini", startChar: 0, endChar: 0, text: "x" }], baseHashes: {} })).rejects.toThrow("PATH_ESCAPE");
		} finally { rmSync(root, { recursive: true, force: true }); }
	});

	it("SEC3: rejects symlink escape outside the project root", async () => {
		const root = tempRoot();
		const outside = tempRoot();
		try {
			mkdirSync(join(root, "manuscript"), { recursive: true });
			writeFileSync(join(outside, "secret.md"), "外部秘密文件。", "utf8");
			// Windows 无权限时跳过 symlink 用例，但 traversal 断言仍必须覆盖
			try {
				symlinkSync(outside, join(root, "manuscript", "link"), "dir");
			} catch {
				console.log("SEC3: symlink not permitted on this platform; skipping symlink case");
				return;
			}
			const files = new FileTransaction();
			await expect(files.applyOperations({ projectRoot: root, operations: [{ operationId: "op-1", kind: "replace-text", target: "manuscript/link/secret.md", startChar: 0, endChar: 2, text: "改" }], baseHashes: {} })).rejects.toThrow("PATH_ESCAPE");
		} finally { rmSync(root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
	});

	it("SEC2b: normal in-root edits still apply atomically", async () => {
		const root = tempRoot();
		try {
			mkdirSync(join(root, "manuscript"), { recursive: true });
			writeFileSync(join(root, "manuscript", "chapter-001.md"), "第一版正文内容。", "utf8");
			const files = new FileTransaction();
			const { staged } = await files.applyOperations({ projectRoot: root, operations: [{ operationId: "op-1", kind: "replace-text", target: "manuscript/chapter-001.md", startChar: 0, endChar: 3, text: "修正" }], baseHashes: {} });
			await files.finalize({ projectRoot: root, staged });
			const { readFileSync } = await import("node:fs");
			expect(readFileSync(join(root, "manuscript", "chapter-001.md"), "utf8")).toContain("修正");
		} finally { rmSync(root, { recursive: true, force: true }); }
	});
});