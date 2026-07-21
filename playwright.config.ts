import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://127.0.0.1:8788", trace: "retain-on-failure" },
  webServer: {
    command: "python3 -m http.server 8788 --directory dist",
    url: "http://127.0.0.1:8788/en/",
    reuseExistingServer: !process.env.CI
  },
  projects: [
    { name: "chromium", testIgnore: /no-script\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "no-script", testMatch: /no-script\.spec\.ts/, use: { ...devices["Desktop Chrome"], javaScriptEnabled: false } }
  ]
});
