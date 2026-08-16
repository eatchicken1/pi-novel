import { createNovelApi } from "./server.ts";

const port = Number.parseInt(process.env.PI_NOVEL_API_PORT ?? "4317", 10);
const host = process.env.PI_NOVEL_API_HOST ?? "127.0.0.1";
const workspaceRoot = process.env.PI_NOVEL_WORKSPACE;
const app = await createNovelApi({ workspaceRoot, logger: true });

await app.listen({ port, host });
console.log(`Pi-Novel API listening on http://${host}:${port}`);
