import { createHash, randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { AppliedChange, FileTransactionPort, StagedFileChange } from "@earendil-works/pi-novel-application";
import type { ChangeOperation } from "@earendil-works/pi-novel-contracts";

function projectPath(projectRoot: string, relativePath: string): string {
	const resolved = resolve(projectRoot, relativePath);
	const root = resolve(projectRoot);
	if (resolved !== root && !resolved.startsWith(`${root}\\`) && !resolved.startsWith(`${root}/`)) {
		throw new Error("PATH_ESCAPE: operation target escapes the project root");
	}
	return resolved;
}

// symlink 逃逸防护：词法校验之外，对真实路径做 realpath 校验（Windows 同样生效）。
function assertInsideRealRoot(projectRoot: string, target: string): void {
	const realRoot = realpathSync(projectRoot);
	let realTarget: string | undefined;
	try {
		realTarget = realpathSync(target);
	} catch {
		// New files may have more than one missing parent directory.
		let parent = dirname(target);
		while (parent !== dirname(parent)) {
			try {
				realTarget = realpathSync(parent);
				break;
			} catch {
				parent = dirname(parent);
			}
		}
		if (realTarget === undefined) throw new Error("PATH_ESCAPE: operation target has no valid parent");
	}
	if (realTarget !== realRoot && !realTarget.startsWith(`${realRoot}\\`) && !realTarget.startsWith(`${realRoot}/`)) {
		throw new Error("PATH_ESCAPE: operation target escapes the project root via symlink");
	}
}

function sha256(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

function applyJsonPointer(target: unknown, pointer: string, value: unknown): unknown {
	if (pointer === "") return value;
	if (!pointer.startsWith("/")) throw new Error("INVALID_JSON_POINTER: pointer must start with '/'");
	const tokens = pointer
		.slice(1)
		.split("/")
		.map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"));
	if (tokens.length === 0) throw new Error("INVALID_JSON_POINTER: pointer is empty");
	let cursor: unknown = target;
	for (let index = 0; index < tokens.length - 1; index += 1) {
		const token = tokens[index];
		if (cursor === null || typeof cursor !== "object") {
			throw new Error("INVALID_JSON_POINTER: intermediate value is not an object");
		}
		const next = (cursor as Record<string, unknown>)[token];
		if (next === undefined || next === null || typeof next !== "object") {
			throw new Error("INVALID_JSON_POINTER: intermediate value is not an object");
		}
		cursor = next;
	}
	const lastToken = tokens[tokens.length - 1];
	if (cursor === null || typeof cursor !== "object") {
		throw new Error("INVALID_JSON_POINTER: target is not an object");
	}
	(cursor as Record<string, unknown>)[lastToken] = value;
	return target;
}

function applyOperation(content: string, operation: ChangeOperation): string {
	switch (operation.kind) {
		case "replace-text": {
			if (operation.startChar === undefined || operation.endChar === undefined || operation.text === undefined) {
				throw new Error("INVALID_OPERATION: replace-text requires startChar/endChar/text");
			}
			assertTextRange(operation.startChar, operation.endChar, content.length);
			return content.slice(0, operation.startChar) + operation.text + content.slice(operation.endChar);
		}
		case "insert-text": {
			if (operation.startChar === undefined || operation.text === undefined) {
				throw new Error("INVALID_OPERATION: insert-text requires startChar/text");
			}
			assertTextPosition(operation.startChar, content.length);
			return content.slice(0, operation.startChar) + operation.text + content.slice(operation.startChar);
		}
		case "delete-text": {
			if (operation.startChar === undefined || operation.endChar === undefined) {
				throw new Error("INVALID_OPERATION: delete-text requires startChar/endChar");
			}
			assertTextRange(operation.startChar, operation.endChar, content.length);
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
			if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
				throw new Error("INVALID_OPERATION: metadata-update requires a JSON object");
			}
			return JSON.stringify(
				{ ...(parsed as Record<string, unknown>), [operation.metadataKey]: operation.metadataValue ?? "" },
				null,
				2,
			);
		}
		default:
			throw new Error(`UNSUPPORTED_OPERATION: ${operation.kind}`);
	}
}

function assertTextPosition(position: number, length: number): void {
	if (position < 0 || position > length) throw new Error("INVALID_OPERATION: text position is out of range");
}

function assertTextRange(start: number, end: number, length: number): void {
	if (start < 0 || end < start || end > length) throw new Error("INVALID_OPERATION: text range is out of range");
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
		const createdPaths: string[] = [];
		try {
			const currentByTarget = new Map<string, string>();
			const initialByTarget = new Map<string, { content: string; hash: string | null }>();
			for (const operation of input.operations) {
				const target = projectPath(input.projectRoot, operation.target);
				assertInsideRealRoot(input.projectRoot, target);
				const relativeTarget = operation.target;
				let initial = initialByTarget.get(target);
				if (initial === undefined) {
					try {
						const content = readFileSync(target, "utf8");
						initial = { content, hash: sha256(content) };
					} catch (error) {
						if (!isMissingFile(error)) throw error;
						initial = { content: "", hash: null };
					}
					initialByTarget.set(target, initial);
					currentByTarget.set(target, initial.content);
				}
				const expectedHash = operation.baseHash ?? input.baseHashes[relativeTarget];
				if (expectedHash !== undefined && expectedHash !== initial.hash) {
					throw new Error(`CHANGESET_BASE_STALE: ${relativeTarget}`);
				}
				const current = currentByTarget.get(target) ?? initial.content;
				currentByTarget.set(target, applyOperation(current, operation));
			}
			for (const [target, next] of currentByTarget) {
				const relativeTarget = input.operations.find(
					(operation) => projectPath(input.projectRoot, operation.target) === target,
				)?.target;
				if (relativeTarget === undefined) continue;
				const initial = initialByTarget.get(target);
				if (initial === undefined) continue;
				const token = randomUUID().slice(0, 8);
				const tempPath = `${relativeTarget}.${token}.tmp`;
				const absoluteTemp = projectPath(input.projectRoot, tempPath);
				mkdirSync(dirname(absoluteTemp), { recursive: true });
				writeFileSync(absoluteTemp, next, "utf8");
				createdPaths.push(absoluteTemp);
				const backupPath = initial.hash === null ? null : `${relativeTarget}.${token}.bak`;
				if (backupPath !== null) {
					const absoluteBackup = projectPath(input.projectRoot, backupPath);
					writeFileSync(absoluteBackup, initial.content, "utf8");
					createdPaths.push(absoluteBackup);
				}
				const afterHash = sha256(next);
				staged.push({ relativePath: relativeTarget, tempPath, beforeHash: initial.hash, afterHash, backupPath });
				applied.push({ relativePath: relativeTarget, beforeHash: initial.hash, afterHash });
			}
			return { staged, applied };
		} catch (error) {
			for (const path of createdPaths) {
				try {
					rmSync(path, { force: true });
				} catch {}
			}
			throw error;
		}
	}

	async finalize(input: { projectRoot: string; staged: StagedFileChange[] }): Promise<void> {
		const finalized: StagedFileChange[] = [];
		try {
			for (const entry of input.staged) {
				const temp = projectPath(input.projectRoot, entry.tempPath);
				const target = projectPath(input.projectRoot, entry.relativePath);
				assertInsideRealRoot(input.projectRoot, temp);
				assertInsideRealRoot(input.projectRoot, target);
				if (currentHash(target) !== entry.beforeHash) {
					throw new Error(`CHANGESET_BASE_STALE: ${entry.relativePath}`);
				}
				renameSync(temp, target);
				finalized.push(entry);
			}
		} catch (error) {
			// Restore files already replaced if a later rename fails.
			for (const entry of finalized.reverse()) {
				try {
					restoreOriginal(input.projectRoot, entry);
				} catch {}
			}
			throw error;
		}
	}

	async rollback(input: { projectRoot: string; staged: StagedFileChange[] }): Promise<void> {
		for (const entry of input.staged.slice().reverse()) {
			try {
				const target = projectPath(input.projectRoot, entry.relativePath);
				if (entry.afterHash !== undefined && currentHash(target) === entry.afterHash)
					restoreOriginal(input.projectRoot, entry);
			} catch {}
			try {
				rmSync(projectPath(input.projectRoot, entry.tempPath), { force: true });
				if (entry.backupPath !== undefined && entry.backupPath !== null)
					rmSync(projectPath(input.projectRoot, entry.backupPath), { force: true });
			} catch {}
		}
	}

	async cleanup(input: { projectRoot: string; staged: StagedFileChange[] }): Promise<void> {
		for (const entry of input.staged) {
			try {
				rmSync(projectPath(input.projectRoot, entry.tempPath), { force: true });
				if (entry.backupPath !== undefined && entry.backupPath !== null)
					rmSync(projectPath(input.projectRoot, entry.backupPath), { force: true });
			} catch {}
		}
	}

	async currentHashes(projectRoot: string, relativePaths: string[]): Promise<Record<string, string>> {
		const result: Record<string, string> = {};
		for (const relativePath of relativePaths) {
			const target = projectPath(projectRoot, relativePath);
			assertInsideRealRoot(projectRoot, target);
			const hash = currentHash(target);
			result[relativePath] = hash ?? "";
		}
		return result;
	}
}

function currentHash(path: string): string | null {
	try {
		return sha256(readFileSync(path, "utf8"));
	} catch (error) {
		if (isMissingFile(error)) return null;
		throw error;
	}
}

function restoreOriginal(projectRoot: string, entry: StagedFileChange): void {
	const target = projectPath(projectRoot, entry.relativePath);
	assertInsideRealRoot(projectRoot, target);
	if (entry.beforeHash === null) {
		rmSync(target, { force: true });
		return;
	}
	if (entry.backupPath === undefined || entry.backupPath === null) {
		throw new Error(`COMMIT_ROLLBACK_UNAVAILABLE: ${entry.relativePath}`);
	}
	copyFileSync(projectPath(projectRoot, entry.backupPath), target);
}

function isMissingFile(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
