import type { AgentRuntimeProfile, ModelCatalog } from "@earendil-works/pi-novel-contracts";
import { describe, expect, it } from "vitest";
import { AgentRuntimeService, type ModelRuntimePort, type RuntimeProfileStorePort } from "../src/index.ts";

describe("AgentRuntimeProfile gates", () => {
	it("no provider connected -> no selectable runtime model", async () => {
		const runtime = new FakeRuntime([]);
		const service = new AgentRuntimeService({
			storeFor: () => runtime.profileStore,
			rootFor: () => "D:/Test",
			runtime,
		});
		await expect(
			service.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" }),
		).rejects.toMatchObject({ code: "RUNTIME_MODEL_NOT_SELECTABLE" });
		await expect(service.resolveInvocation("forge.explorer")).rejects.toMatchObject({
			code: "RUNTIME_PROFILE_NOT_CONFIGURED",
		});
	});

	it("connected provider -> models selectable and invocation resolves", async () => {
		const runtime = new FakeRuntime([connectedOpenAI()]);
		const service = new AgentRuntimeService({
			storeFor: () => runtime.profileStore,
			rootFor: () => "D:/Test",
			runtime,
		});
		const profile = await service.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		expect(profile.agentId).toBe("forge.explorer");
		expect(profile.thinkingLevel).toBe("off");
		const invocation = await service.resolveInvocation("forge.explorer");
		expect(invocation).toEqual({ agentId: "forge.explorer", modelId: "openai/gpt-4o", thinkingLevel: "off" });
	});

	it("disconnected selected provider -> profile invalid", async () => {
		const runtime = new FakeRuntime([connectedOpenAI()]);
		const service = new AgentRuntimeService({
			storeFor: () => runtime.profileStore,
			rootFor: () => "D:/Test",
			runtime,
		});
		await service.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		runtime.disconnect("openai");
		await expect(service.resolveInvocation("forge.explorer")).rejects.toMatchObject({
			code: "RUNTIME_PROFILE_INVALID",
		});
	});

	it("non-reasoning model -> thinking off only", async () => {
		const runtime = new FakeRuntime([connectedOpenAI()]);
		const service = new AgentRuntimeService({
			storeFor: () => runtime.profileStore,
			rootFor: () => "D:/Test",
			runtime,
		});
		await expect(
			service.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "high" }),
		).rejects.toMatchObject({ code: "RUNTIME_THINKING_UNSUPPORTED" });
		await service.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
	});

	it("reasoning model -> supported thinking levels only", async () => {
		const runtime = new FakeRuntime([
			{
				...connectedOpenAI(),
				models: [
					{
						providerId: "openai",
						modelId: "gpt-4o",
						name: "GPT-4o",
						reasoning: false,
						thinkingLevels: ["off"],
						contextWindow: 128000,
						maxTokens: 4096,
						input: ["text"],
					},
					{
						providerId: "openai",
						modelId: "o3-mini",
						name: "O3 Mini",
						reasoning: true,
						thinkingLevels: ["off", "low", "medium", "high"],
						contextWindow: 200000,
						maxTokens: 8192,
						input: ["text"],
					},
				],
			},
		]);
		const service = new AgentRuntimeService({
			storeFor: () => runtime.profileStore,
			rootFor: () => "D:/Test",
			runtime,
		});
		await service.setProfile("forge.explorer", { modelId: "openai/o3-mini", thinkingLevel: "high" });
		await expect(
			service.setProfile("forge.explorer", { modelId: "openai/o3-mini", thinkingLevel: "max" }),
		).rejects.toMatchObject({ code: "RUNTIME_THINKING_UNSUPPORTED" });
		const invocation = await service.resolveInvocation("forge.explorer");
		expect(invocation.thinkingLevel).toBe("high");
	});

	it("agent profiles are independent", async () => {
		const runtime = new FakeRuntime([connectedOpenAI()]);
		const service = new AgentRuntimeService({
			storeFor: () => runtime.profileStore,
			rootFor: () => "D:/Test",
			runtime,
		});
		await service.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		await service.setProfile("forge.comparator", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		expect(service.listProfiles().map((profile) => profile.agentId)).toEqual(["forge.comparator", "forge.explorer"]);
		await expect(service.resolveInvocation("forge.critic")).rejects.toMatchObject({
			code: "RUNTIME_PROFILE_NOT_CONFIGURED",
		});
	});
});

function connectedOpenAI(): ModelCatalog["providers"][number] {
	return {
		providerId: "openai",
		name: "OpenAI",
		authLabel: "API Key",
		authMethods: ["api_key"],
		isSubscription: false,
		status: "connected",
		apiKeyConfigured: true,
		models: [
			{
				providerId: "openai",
				modelId: "gpt-4o",
				name: "GPT-4o",
				reasoning: false,
				thinkingLevels: ["off"],
				contextWindow: 128000,
				maxTokens: 4096,
				input: ["text"],
			},
		],
	};
}

class FakeRuntime implements ModelRuntimePort {
	readonly profileStore: RuntimeProfileStorePort = new InMemoryProfileStore();
	private providers: ModelCatalog["providers"];

	constructor(providers: ModelCatalog["providers"]) {
		this.providers = providers;
	}

	disconnect(providerId: string): void {
		this.providers = this.providers.map((provider) =>
			provider.providerId === providerId ? { ...provider, status: "not_connected" as const } : provider,
		);
	}

	async getCatalog(): Promise<ModelCatalog> {
		return { providers: this.providers };
	}
	async configureApiKey(): Promise<ModelCatalog> {
		return this.getCatalog();
	}
	async clearApiKey(): Promise<ModelCatalog> {
		return this.getCatalog();
	}
	async generateText(): Promise<string> {
		return "{}";
	}
}

class InMemoryProfileStore implements RuntimeProfileStorePort {
	private readonly profiles = new Map<string, AgentRuntimeProfile>();
	listProfiles(): AgentRuntimeProfile[] {
		return [...this.profiles.values()].sort((left, right) => left.agentId.localeCompare(right.agentId));
	}
	getProfile(agentId: string): AgentRuntimeProfile | null {
		return this.profiles.get(agentId) ?? null;
	}
	setProfile(profile: AgentRuntimeProfile): void {
		this.profiles.set(profile.agentId, profile);
	}
	close(): void {}
}
