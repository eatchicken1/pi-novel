import { type Static, Type } from "typebox";

export const ProviderConnectionStatusSchema = Type.Union([Type.Literal("connected"), Type.Literal("not_connected")]);
export type ProviderConnectionStatus = Static<typeof ProviderConnectionStatusSchema>;

export const ModelInputSchema = Type.Union([Type.Literal("text"), Type.Literal("image")]);

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
		isSubscription: Type.Boolean(),
		status: ProviderConnectionStatusSchema,
		cliLoginCommand: Type.String({ minLength: 1 }),
		models: Type.Array(ModelCatalogEntrySchema),
	},
	{ additionalProperties: false },
);
export type ProviderCatalogEntry = Static<typeof ProviderCatalogEntrySchema>;

export const ModelCatalogSchema = Type.Object(
	{
		providers: Type.Array(ProviderCatalogEntrySchema),
		defaultModelId: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
	},
	{ additionalProperties: false },
);
export type ModelCatalog = Static<typeof ModelCatalogSchema>;
