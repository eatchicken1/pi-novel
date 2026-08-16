import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type {
	AppliedChange,
	FileTransactionPort,
	StagedFileChange,
} from "@earendil-works/pi-novel-application";
import type { ChangeOperation } from "@earendil-works/pi-novel-contracts";

function projectPath(projectRoot: string, relativePath: string): string {
	const resolved = resolve(projectRoot, relativePath);
	const root = resolve(projectRoot);
	if (resolved !== root && !resolved.startsWith(root + "\\") && !resolved.startsWith(root + "/")) {
		throw new Error("PATH_ESCAPE: operation target escapes the project root");
	}
	return resolved;
}

// symlink 逃逸防护：词法校验之外，对真实路径做 realpath 校验（Windows 同样生效）。
function assertInsideRealRoot(projectRoot: string, target: string): void {
	const realRoot = realpathSync(projectRoot);
	let realTarget: string;
	try {
		realTarget = realpathSync(target);
	} catch {
		// 目标不存在（新建文件）：校验其父目录
		realTarget = realpathSync(dirname(target));
	}
	if (realTarget !== realRoot && !realTarget.startsWith(realRoot + "\\") && !realTarget.startsWith(realRoot + "/")) {
		throw new Error("PATH_ESCAPE: operation target escapes the project root via symlink");
	}
}

function sha256(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

function applyJsonPointer(target: unknown, pointer: string, value: unknown): unknown {
	const tokens = pointer.split("/").filter((token) => token.length > 0);
	let cursor: unknown = target;
	for (let index = 0; index < tokens.length - 1; index += 1) {
		const token = tokens[index];
		const next = (cursor as Record<string, unknown>)[token];
		if (next === undefined || next === null || typeof next !== "object") {
			throw new Error("INVALID_JSON_POINTER: intermediate value is not an object");
		}
		cursor = next;
	}
	const lastToken = tokens[tokens.length - 1];
	(cursor as Record<string, unknown>)[lastToken] = value;
	return target;
}

function applyOperation(content: string, operation: ChangeOperation): string {
	switch (operation.kind) {
		case "replace-text": {
			if (operation.startChar === undefined || operation.endChar === undefined || operation.text === undefined) {
				throw new Error("INVALID_OPERATION: replace-text requires startChar/endChar/text");
			}
			return content.slice(0, operation.startChar) + operation.text + content.slice(operation.endChar);
		}
		case "insert-text": {
			if (operation.startChar === undefined || operation.text === undefined) {
				throw new Error("INVALID_OPERATION: insert-text requires startChar/text");
			}
			return content.slice(0, operation.startChar) + operation.text + content.slice(operation.startChar);
		}
		case "delete-text": {
			if (operation.startChar === undefined || operation.endChar === undefined) {
				throw new Error("INVALID_OPERATION: delete-text requires startChar/endChar");
			}
			return content.slice(0, operation.startChar) + content.slice(operation.endChar);
		}
		case "replace-document": {
			if (operation.text === undefined) throw new Error("INVALID_OPERATION: replace-document requires text");
			return operation.text;
		}
		case "structured-artifact-update": {
			if (operation.jsonPointer === undefined) {
				throw new Error("INVALID_OPERATION: structured-artifact-update requires jsonPointer");
			}
			const parsed: unknown = JSON.parse(content);
			return JSON.stringify(applyJsonPointer(parsed, operation.jsonPointer, operation.value), null, 2);
		}
		case "metadata-update": {
			if (operation.metadataKey === undefined) {
				throw new Error("INVALID_OPERATION: metadata-update requires metadataKey");
			}
			const parsed: unknown = JSON.parse(content);
			return JSON.stringify({ ...(parsed as Record<string, unknown>), [operation.metadataKey]: operation.metadataValue ?? "" }, null, 2);
		}
		default:
			throw new Error("UNSUPPORTED_OPERATION: " + operation.kind);
	}
}

// 文件事务：base hash 校验 → temp 写入 → 原子 replace；任一步失败不触碰 canonical。
export class FileTransaction implements FileTransactionPort {
	async applyOperations(input: {
		projectRoot: string;
		operations: ChangeOperation[];
		baseHashes: Record<string, string>;
	}): Promise<{ staged: StagedFileChange[]; applied: AppliedChange[] }> {
		const staged: StagedFileChange[] = [];
		const applied: AppliedChange[] = [];
		try {
			for (const operation of input.operations) {
				const target = projectPath(input.projectRoot, operation.target);
				assertInsideRealRoot(input.projectRoot, target);
				const relativeTarget = operation.target;
				const expectedHash = operation.baseHash ?? input.baseHashes[relativeTarget];
				let current: string;
				let currentHash: string | null;
				try {
					current = readFileSync(target, "utf8");
					currentHash = sha256(current);
				} catch {
					current = "";
					currentHash = null;
				}
				if (expectedHash !== undefined && expectedHash !== currentHash) {
					throw new Error("CHANGESET_BASE_STALE: " + relativeTarget);
				}
				const next = applyOperation(current, operation);
				const tempPath = relativeTarget + "." + randomUUID().slice(0, 8) + ".tmp";
				const absoluteTemp = projectPath(input.projectRoot, tempPath);
				mkdirSync(dirname(absoluteTemp), { recursive: true });
				writeFileSync(absoluteTemp, next, "utf8");
				staged.push({
					relativePath: relativeTarget,
					tempPath,
					beforeHash: currentHash,
					afterHash: sha256(next),
				});
				applied.push({ relativePath: relativeTarget, beforeHash: currentHash, afterHash: sha256(next) });
			}
			return { staged, applied };
		} catch (error) {
			for (const entry of staged) {
				try { rmSync(projectPath(input.projectRoot, entry.tempPath), { force: true }); } catch {}
			}
			throw error;
		}
	}

	async finalize(input: { projectRoot: string; staged: StagedFileChange[] }): Promise<void> {
		for (const entry of input.staged) {
			const temp = projectPath(input.projectRoot, entry.tempPath);
			assertInsideRealRoot(input.projectRoot, temp);
			renameSync(temp, projectPath(input.projectRoot, entry.relativePath));
		}
	}

	async rollback(input: { projectRoot: string; staged: StagedFileChange[] }): Promise<void> {
		for (const entry of input.staged) {
			try {
				const temp = projectPath(input.projectRoot, entry.tempPath);
				assertInsideRealRoot(input.projectRoot, temp);
				rmSync(temp, { force: true });
			} catch {}
		}
	}

	async currentHashes(projectRoot: string, relativePaths: string[]): Promise<Record<string, string>> {
		const result: Record<string, string> = {};
		for (const relativePath of relativePaths) {
			try {
				const target = projectPath(projectRoot, relativePath);
				assertInsideRealRoot(projectRoot, target);
				result[relativePath] = sha256(readFileSync(target, "utf8"));
			} catch {
				result[relativePath] = "";
			}
		}
		return result;
	}
}
