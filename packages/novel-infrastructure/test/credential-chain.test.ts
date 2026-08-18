import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Credential, CredentialInfo } from "../../../packages/ai/src/auth/types.ts";
import { ChainedCredentialStore, ModelCredentialStore, PiModelRuntimeAdapter } from "../src/index.ts";

const roots: string[] = [];

afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "pi-novel-cred-"));
	roots.push(root);
	return root;
}

describe("Credential resolution chain", () => {
	it("workspace API key takes precedence over CLI auth.json", async () => {
		const root = await createRoot();
		const cliAuthPath = join(root, "cli", "auth.json");
		await mkdir(join(root, "cli"), { recursive: true });
		await writeFile(cliAuthPath, JSON.stringify({ openai: { type: "api_key", key: "cli-key" } }), "utf8");
		const primary = new ModelCredentialStore(join(root, ".pi-novel", "model-credentials.json"));
		await primary.configure("openai", { apiKey: "workspace-key" });
		const fallback = new ReadOnlyAuthStorageLike(cliAuthPath);
		const chain = new ChainedCredentialStore(primary, fallback);
		const credential = await chain.read("openai");
		expect(credential).toMatchObject({ type: "api_key", key: "workspace-key" });
	});

	it("falls back to CLI auth.json (OAuth credential) when the workspace store is empty", async () => {
		const root = await createRoot();
		const cliAuthPath = join(root, "cli", "auth.json");
		await mkdir(join(root, "cli"), { recursive: true });
		await writeFile(
			cliAuthPath,
			JSON.stringify({
				anthropic: { type: "oauth", refresh: "refresh-token", access: "access-token", expires: 1_799_999_999_999 },
			}),
			"utf8",
		);
		const primary = new ModelCredentialStore(join(root, ".pi-novel", "model-credentials.json"));
		const chain = new ChainedCredentialStore(primary, new ReadOnlyAuthStorageLike(cliAuthPath));
		const credential = await chain.read("anthropic");
		expect(credential).toMatchObject({ type: "oauth", refresh: "refresh-token" });
		const listed = await chain.list();
		expect(listed).toEqual([{ providerId: "anthropic", type: "oauth" }]);
	});

	it("catalog connection refresh: configureApiKey flips the provider to connected", async () => {
		const root = await createRoot();
		const adapter = new PiModelRuntimeAdapter();
		const before = await adapter.getCatalog(root);
		const openai = before.providers.find((provider) => provider.providerId === "openai");
		expect(openai?.status).toBe("not_connected");
		const after = await adapter.configureApiKey(root, { providerId: "openai", apiKey: "sk-test-key" });
		const connected = after.providers.find((provider) => provider.providerId === "openai");
		expect(connected?.status).toBe("connected");
		expect(connected?.apiKeyConfigured).toBe(true);
		// no global default model auto-selection: catalog has no defaultModelId
		expect("defaultModelId" in after).toBe(false);
	});

	it("clearing the workspace key removes the workspace credential", async () => {
		const root = await createRoot();
		const adapter = new PiModelRuntimeAdapter();
		await adapter.configureApiKey(root, { providerId: "openai", apiKey: "sk-test-key" });
		const cleared = await adapter.clearApiKey(root, "openai");
		const openai = cleared.providers.find((provider) => provider.providerId === "openai");
		expect(openai?.apiKeyConfigured).toBe(false);
	});

	it("catalog models expose supported thinking levels from pi-ai", async () => {
		const root = await createRoot();
		const adapter = new PiModelRuntimeAdapter();
		const catalog = await adapter.getCatalog(root);
		const provider = catalog.providers.find((entry) => entry.providerId === "openai");
		expect(provider).toBeTruthy();
		const reasoningModel = provider?.models.find((entry) => entry.reasoning);
		if (reasoningModel) {
			expect(reasoningModel.thinkingLevels.length).toBeGreaterThan(0);
			expect(reasoningModel.thinkingLevels).not.toEqual(["off"]);
		}
		const nonReasoning = provider?.models.find((entry) => !entry.reasoning);
		if (nonReasoning) expect(nonReasoning.thinkingLevels).toEqual(["off"]);
	});
});

// Minimal read-only auth.json reader mirroring ReadOnlyAuthStorage semantics for
// the two chain tests above without depending on the CLI home directory.
class ReadOnlyAuthStorageLike {
	private readonly authPath: string;
	constructor(authPath: string) {
		this.authPath = authPath;
	}
	async read(providerId: string): Promise<Credential | undefined> {
		const parsed = await this.load();
		const entry = parsed[providerId];
		if (typeof entry !== "object" || entry === null) return undefined;
		return entry as Credential;
	}
	async list(): Promise<readonly CredentialInfo[]> {
		const parsed = await this.load();
		return Object.entries(parsed).map(([providerId, entry]) => ({
			providerId,
			type: (typeof entry === "object" && entry !== null && (entry as Record<string, unknown>).type === "oauth"
				? "oauth"
				: "api_key") as CredentialInfo["type"],
		}));
	}
	async modify(): Promise<never> {
		throw new Error("Read-only credential storage cannot modify auth.json");
	}
	async delete(): Promise<never> {
		throw new Error("Read-only credential storage cannot modify auth.json");
	}
	private async load(): Promise<Record<string, unknown>> {
		try {
			return JSON.parse(await readFile(this.authPath, "utf8")) as Record<string, unknown>;
		} catch {
			return {};
		}
	}
}
