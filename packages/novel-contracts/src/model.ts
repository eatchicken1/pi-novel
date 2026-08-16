import { type Static, Type } from "typebox";

export const ProviderConnectionStatusSchema = Type.Union([Type.Literal("connected"), Type.Literal("not_connected")]);
export type ProviderConnectionStatus = Static<typeof ProviderConnectionStatusSchema>;

export const ModelAuthMethodSchema = Type.Union([Type.Literal("api_key"), Type.Literal("oauth")]);
export type ModelAuthMethod = Static<typeof ModelAuthMethodSchema>;

export const ModelInputSchema = Type.Union([Type.Literal("text"), Type.Literal("image")]);
export type ModelInput = Static<typeof ModelInputSchema>;

export const ModelCatalogEntrySchema = Type.Object(
	{
		providerId: Type.String({ minLength: 1 }),
		modelId: Type.String({ minLength: 1 }),
		name: Type.String({ minLength: 1 }),
		reasoning: Type.Boolean(),
		contextWindow: Type.Integer({ minimum: 1 }),
		maxTokens: Type.Integer({ minimum: 1 }),
		input: Type.Array(ModelInputSchema, { minItems: 1 }),
	},
	{ additionalProperties: false },
);
export type ModelCatalogEntry = Static<typeof ModelCatalogEntrySchema>;

export const ProviderCatalogEntrySchema = Type.Object(
	{
		providerId: Type.String({ minLength: 1 }),
		name: Type.String({ minLength: 1 }),
		authLabel: Type.String({ minLength: 1 }),
		authMethods: Type.Array(ModelAuthMethodSchema, { minItems: 1 }),
		isSubscription: Type.Boolean(),
		status: ProviderConnectionStatusSchema,
		apiKeyConfigured: Type.Boolean(),
		apiKeyLabel: Type.Optional(Type.String({ minLength: 1 })),
		baseUrl: Type.Optional(Type.String({ minLength: 1 })),
		cliLoginCommand: Type.Optional(Type.String({ minLength: 1 })),
		models: Type.Array(ModelCatalogEntrySchema),
	},
	{ additionalProperties: false },
);
export type ProviderCatalogEntry = Static<typeof ProviderCatalogEntrySchema>;

export const ConfigureModelApiKeyInputSchema = Type.Object(
	{
		providerId: Type.String({ minLength: 1 }),
		apiKey: Type.String({ minLength: 1 }),
		baseUrl: Type.Optional(Type.String({ minLength: 1 })),
	},
	{ additionalProperties: false },
);
export type ConfigureModelApiKeyInput = Static<typeof ConfigureModelApiKeyInputSchema>;

export const ClearModelApiKeyInputSchema = Type.Object(
	{ providerId: Type.String({ minLength: 1 }) },
	{ additionalProperties: false },
);
export type ClearModelApiKeyInput = Static<typeof ClearModelApiKeyInputSchema>;

export const ModelProviderCredentialStatusSchema = Type.Object(
	{
		providerId: Type.String({ minLength: 1 }),
		apiKeyConfigured: Type.Boolean(),
		baseUrl: Type.Optional(Type.String({ minLength: 1 })),
	},
	{ additionalProperties: false },
);
export type ModelProviderCredentialStatus = Static<typeof ModelProviderCredentialStatusSchema>;

export const ModelCatalogSchema = Type.Object(
	{
		providers: Type.Array(ProviderCatalogEntrySchema),
		defaultModelId: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
	},
	{ additionalProperties: false },
);
export type ModelCatalog = Static<typeof ModelCatalogSchema>;
