import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
if (process.env.CORE_E2E === "1" && existsSync(".env.local"))
  process.loadEnvFile(".env.local");
const live = process.env.CORE_E2E === "1";
if (live) {
  const url = process.env.SUPABASE_URL;
  if (
    !url ||
    !process.env.SUPABASE_PUBLISHABLE_KEY ||
    !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  )
    throw new Error(
      "Live tests require a real LOCAL Supabase URL and publishable/anon key. Hosted email-confirmation flows need separate manual acceptance.",
    );
}
export default defineConfig({
  testDir: "./tests/core-browser",
  outputDir: live ? "./test-results/core-live" : "./test-results/core-browser",
  testMatch: live ? "live.spec.ts" : "unconfigured.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    browserName: "chromium",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run start -- --port 3101",
    url: "http://127.0.0.1:3101/account",
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      APP_URL: "http://127.0.0.1:3101",
      ...(!live ? { SUPABASE_URL: "", SUPABASE_PUBLISHABLE_KEY: "" } : {}),
    },
  },
});
