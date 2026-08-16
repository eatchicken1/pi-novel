import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
	AuthOperationOptions,
	Credential,
	CredentialInfo,
	CredentialStore,
} from "../../../../packages/ai/src/auth/types.ts";

interface StoredProviderCredential {
	credential: Credential;
	baseUrl?: string;
}

interface StoredModelCredentials {
	version: 1;
	providers: Record<string, StoredProviderCredential>;
}

export interface ModelCredentialConfiguration {
	apiKey: string;
	baseUrl?: string;
}

export class ModelCredentialStore implements CredentialStore {
	private readonly filePath: string | undefined;
	private providers = new Map<string, StoredProviderCredential>();
	private loaded = false;
	private loading: Promise<void> | null = null;
	private writeChain: Promise<void> = Promise.resolve();

	constructor(filePath?: string) {
		this.filePath = filePath;
	}

	async read(providerId: string, options?: AuthOperationOptions): Promise<Credential | undefined> {
		await this.load(options?.signal);
		return cloneCredential(this.providers.get(providerId)?.credential);
	}

	async list(options?: AuthOperationOptions): Promise<readonly CredentialInfo[]> {
		await this.load(options?.signal);
		return [...this.providers].map(([providerId, entry]) => ({ providerId, type: entry.credential.type }));
	}

	async modify(
		providerId: string,
		fn: (current: Credential | undefined) => Promise<Credential | undefined>,
		options?: AuthOperationOptions,
	): Promise<Credential | undefined> {
		return this.enqueue(async () => {
			await this.load(options?.signal);
			options?.signal?.throwIfAborted();
			const current = cloneCredential(this.providers.get(providerId)?.credential);
			const next = await fn(current);
			options?.signal?.throwIfAborted();
			if (next === undefined) return current;
			const previous = this.providers.get(providerId);
			this.providers.set(providerId, {
				credential: cloneCredential(next) as Credential,
				baseUrl: previous?.baseUrl,
			});
			await this.persist();
			return cloneCredential(next);
		});
	}

	async delete(providerId: string, options?: AuthOperationOptions): Promise<void> {
		await this.enqueue(async () => {
			await this.load(options?.signal);
			options?.signal?.throwIfAborted();
			this.providers.delete(providerId);
			await this.persist();
		});
	}

	async configure(providerId: string, configuration: ModelCredentialConfiguration): Promise<void> {
		await this.enqueue(async () => {
			await this.load();
			this.providers.set(providerId, {
				credential: { type: "api_key", key: configuration.apiKey },
				baseUrl: configuration.baseUrl,
			});
			await this.persist();
		});
	}

	async clear(providerId: string): Promise<void> {
		await this.delete(providerId);
	}

	async getConfiguration(providerId: string): Promise<ModelCredentialConfiguration | undefined> {
		await this.load();
		const entry = this.providers.get(providerId);
		if (entry?.credential.type !== "api_key" || !entry.credential.key) return undefined;
		return { apiKey: entry.credential.key, ...(entry.baseUrl ? { baseUrl: entry.baseUrl } : {}) };
	}

	private async enqueue<T>(task: () => Promise<T>): Promise<T> {
		const previous = this.writeChain;
		const current = previous.catch(() => {}).then(task);
		this.writeChain = current.then(
			() => undefined,
			() => undefined,
		);
		await current;
		return current;
	}

	private async load(signal?: AbortSignal): Promise<void> {
		if (this.loaded) return;
		if (this.loading) return this.loading;
		this.loading = (async () => {
			signal?.throwIfAborted();
			if (this.filePath) {
				try {
					const parsed: unknown = JSON.parse(await readFile(this.filePath, "utf8"));
					if (!isStoredModelCredentials(parsed)) throw new Error("Model credential file is invalid");
					this.providers = new Map(Object.entries(parsed.providers));
				} catch (error) {
					if (!isMissingFile(error)) throw error;
				}
			}
			this.loaded = true;
		})();
		try {
			await this.loading;
		} finally {
			this.loading = null;
		}
	}

	private async persist(): Promise<void> {
		if (!this.filePath) return;
		await mkdir(dirname(this.filePath), { recursive: true });
		const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
		const providers = Object.fromEntries(this.providers);
		await writeFile(temporaryPath, `${JSON.stringify({ version: 1, providers }, null, 2)}\n`, {
			encoding: "utf8",
			mode: 0o600,
		});
		await rename(temporaryPath, this.filePath);
	}
}

function cloneCredential(credential: Credential | undefined): Credential | undefined {
	if (!credential) return undefined;
	return credential.type === "api_key"
		? {
				type: "api_key",
				...(credential.key ? { key: credential.key } : {}),
				...(credential.env ? { env: { ...credential.env } } : {}),
			}
		: { ...credential };
}

function isStoredModelCredentials(value: unknown): value is StoredModelCredentials {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return record.version === 1 && typeof record.providers === "object" && record.providers !== null;
}

function isMissingFile(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
