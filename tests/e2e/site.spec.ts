import { expect, test } from "@playwright/test";

for (const locale of ["zh", "en"] as const) {
  test(`${locale} 首页渲染`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#feedback")).toBeVisible();
  });
}

test("根域名自动进入新版为何 Orbis 能力页并可手动切换语言", async ({ browser }) => {
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/zh\/product\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("你的安全");
  await expect(page.locator(".risk-card")).toHaveCount(6);
  await page.locator("a.lang-switch").click();
  await expect(page).toHaveURL(/\/en\/product\/$/);
  await context.close();
});

test("320px 无横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/zh/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("产品页呈现六类风险并复用反馈表单", async ({ page }) => {
  await page.goto("/zh/product/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("你的安全");
  await expect(page.locator(".risk-card")).toHaveCount(6);
  await expect(page.locator("#relevance")).toBeVisible();
  await expect(page.locator("#clarity")).toBeVisible();
  await expect(page.locator("#feedback")).toBeVisible();
});

test("产品页 320px 无横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/zh/product/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("首页为何 Orbis 进入能力页且只有一个导航定位", async ({ page }) => {
  await page.goto("/zh/");
  await page.getByRole("navigation").getByRole("link", { name: "为何 Orbis" }).click();
  await expect(page).toHaveURL(/\/zh\/product\/$/);
  await expect(page.getByRole("navigation").getByRole("link", { name: "为何 Orbis" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation").getByRole("link", { name: "产品", exact: true })).toHaveCount(0);
});
