// Story Profile / Story DNA：把“题材”拆成可组合的语义维度，并集中解析 legacy genre 兼容。
//
// 所有 capability 判断（例如“项目是否具备 chase-wife relationship mechanism”）
// 必须经过本模块，不允许在 store / tools 里散落 genre 字符串判断。

export interface StoryProfile {
	primaryGenre: string;
	relationshipMechanisms: string[];
	professionalDomain?: string;
	themes?: string[];
	storyForm?: string;
}

const PRIMARY_GENRE_ALIASES: Record<string, string> = {
	都市悬疑: "suspense",
	都市情感: "urban-romance",
	轻幻想: "light-fantasy",
	追妻文: "chase-wife",
	女性社会派悬疑: "female-social-suspense",
};

const RELATIONSHIP_MECHANISM_ALIASES: Record<string, string> = {
	追妻: "chase-wife",
	追妻文: "chase-wife",
	"chase wife": "chase-wife",
	"chasewife": "chase-wife",
	成熟婚姻危机: "mature-marriage-crisis",
};

export function normalizePrimaryGenre(value: string): string {
	const normalized = value.trim().toLowerCase();
	return PRIMARY_GENRE_ALIASES[value.trim()] ?? PRIMARY_GENRE_ALIASES[normalized] ?? normalized;
}

export function normalizeRelationshipMechanism(value: string): string {
	const normalized = value.trim().toLowerCase();
	return RELATIONSHIP_MECHANISM_ALIASES[value.trim()] ?? RELATIONSHIP_MECHANISM_ALIASES[normalized] ?? normalized;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 数组字段区分“未提供”（undefined）与“显式空数组”（[]）：空数组必须被尊重，不能回退到 legacy 推导。
function stringArray(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function stringField(value: unknown): string | undefined {
	return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

// legacy：只有 genre 字段时，chase-wife 解析为等价能力（primaryGenre=chase-wife 且 mechanisms 含 chase-wife）。
export function legacyGenreToStoryProfile(genre: string | undefined): StoryProfile {
	const normalized = normalizePrimaryGenre(genre ?? "");
	return {
		primaryGenre: normalized,
		relationshipMechanisms: normalized === "chase-wife" ? ["chase-wife"] : [],
	};
}

// 权威解析：project.json 同时接受 legacy genre 与 storyProfile。
// 规则：
// 1. 无 storyProfile → 从 legacy genre 推导；
// 2. 有 storyProfile 且显式提供 relationshipMechanisms 数组 → 数组为准（空数组 = 明确不要任何关系机制）；
// 3. 有 storyProfile 但未提供 relationshipMechanisms，且 legacy genre 是 chase-wife → 继承 chase-wife，避免旧调用意外失去能力。
export function resolveStoryProfile(project: Record<string, unknown>): StoryProfile {
	const legacyGenre = typeof project.genre === "string" ? project.genre : undefined;
	const rawProfile = isJsonRecord(project.storyProfile) ? project.storyProfile : undefined;
	if (rawProfile === undefined) return legacyGenreToStoryProfile(legacyGenre);
	const primaryGenre = normalizePrimaryGenre(stringField(rawProfile.primaryGenre) ?? legacyGenre ?? "");
	const mechanisms = stringArray(rawProfile.relationshipMechanisms) ?? (normalizePrimaryGenre(legacyGenre ?? "") === "chase-wife" ? ["chase-wife"] : []);
	return {
		primaryGenre,
		relationshipMechanisms: mechanisms.map(normalizeRelationshipMechanism),
		professionalDomain: stringField(rawProfile.professionalDomain),
		themes: stringArray(rawProfile.themes),
		storyForm: stringField(rawProfile.storyForm),
	};
}

export function hasRelationshipMechanism(project: Record<string, unknown>, mechanism: string): boolean {
	return resolveStoryProfile(project).relationshipMechanisms.includes(normalizeRelationshipMechanism(mechanism));
}

export function hasChaseWifeCapability(project: Record<string, unknown>): boolean {
	return hasRelationshipMechanism(project, "chase-wife");
}

// primaryGenre 判断：主题材专属能力（如 mystery engine）统一通过本函数，不散落 primaryGenre 字符串比较。
export function hasPrimaryGenre(project: Record<string, unknown>, genre: string): boolean {
	return resolveStoryProfile(project).primaryGenre === normalizePrimaryGenre(genre);
}

// Mature Marriage Crisis：structural relationship mechanism（不是 genre，不是 Chase Wife alias）。
export function hasMatureMarriageCapability(project: Record<string, unknown>): boolean {
	return hasRelationshipMechanism(project, "mature-marriage-crisis");
}
