import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./apps/web/e2e",
	testMatch: "**/*.spec.ts",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	 reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:4319",
		trace: "retain-on-failure",
		...devices["Desktop Chrome"],
		...(process.env.PI_NOVEL_E2E_BROWSER_PATH ? { launchOptions: { executablePath: process.env.PI_NOVEL_E2E_BROWSER_PATH } } : {}),
	},
	webServer: {
		command: "npm run dev --workspace=@earendil-works/pi-novel-web -- --port 4319",
		url: "http://127.0.0.1:4319",
		reuseExistingServer: false,
		timeout: 120_000,
	},
});
