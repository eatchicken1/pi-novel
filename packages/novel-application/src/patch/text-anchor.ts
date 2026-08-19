import { createHash } from "node:crypto";
import type { ChangeOperation, TextAnchor } from "@earendil-works/pi-novel-contracts";

export function textHash(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createTextAnchor(input: {
	chapterId: string;
	content: string;
	startOffset: number;
	endOffset: number;
	contextLength?: number;
}): TextAnchor {
	if (input.startOffset < 0 || input.endOffset < input.startOffset || input.endOffset > input.content.length)
		throw new Error("INVALID_TEXT_ANCHOR");
	const contextLength = input.contextLength ?? 96;
	const selected = input.content.slice(input.startOffset, input.endOffset);
	return {
		chapterId: input.chapterId,
		baseContentHash: textHash(input.content),
		startOffset: input.startOffset,
		endOffset: input.endOffset,
		selectedTextHash: textHash(selected),
		prefixContext: input.content.slice(Math.max(0, input.startOffset - contextLength), input.startOffset),
		suffixContext: input.content.slice(input.endOffset, input.endOffset + contextLength),
	};
}

export function resolveTextAnchor(content: string, anchor: TextAnchor): { startOffset: number; endOffset: number } {
	const exact = content.slice(anchor.startOffset, anchor.endOffset);
	if (textHash(exact) === anchor.selectedTextHash)
		return { startOffset: anchor.startOffset, endOffset: anchor.endOffset };
	const selectedLength = anchor.endOffset - anchor.startOffset;
	const matches: Array<{ startOffset: number; endOffset: number }> = [];
	for (let start = 0; start <= content.length - selectedLength; start += 1) {
		const end = start + selectedLength;
		if (textHash(content.slice(start, end)) !== anchor.selectedTextHash) continue;
		const prefix = content.slice(Math.max(0, start - anchor.prefixContext.length), start);
		const suffix = content.slice(end, end + anchor.suffixContext.length);
		if (anchor.prefixContext.length > 0 && !prefix.endsWith(anchor.prefixContext)) continue;
		if (anchor.suffixContext.length > 0 && !suffix.startsWith(anchor.suffixContext)) continue;
		matches.push({ startOffset: start, endOffset: end });
	}
	if (matches.length !== 1) throw new Error("PATCH_TARGET_CONFLICT");
	return matches[0]!;
}

export function operationWithResolvedAnchor(content: string, operation: ChangeOperation): ChangeOperation {
	if (operation.anchor === undefined) return operation;
	const resolved = resolveTextAnchor(content, operation.anchor);
	return { ...operation, startChar: resolved.startOffset, endChar: resolved.endOffset, baseHash: textHash(content) };
}
