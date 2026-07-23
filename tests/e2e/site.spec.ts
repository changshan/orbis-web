import { expect, test } from "@playwright/test";

for (const locale of ["zh", "en"] as const) {
  test(`${locale} 首页直接渲染完整能力与原则`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".risk-card")).toHaveCount(6);
    await expect(page.locator("#principles li")).toHaveCount(3);
    await expect(page.locator("#feedback")).toBeVisible();
  });
}

test("根域名自动进入本地化首页并可手动切换语言", async ({ browser }) => {
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/zh\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("你的安全");
  await expect(page.locator(".risk-card")).toHaveCount(6);
  await page.locator("a.lang-switch").click();
  await expect(page).toHaveURL(/\/en\/$/);
  await context.close();
});

test("320px 无横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/zh/");
  await expect(page.getByRole("navigation").getByRole("link", { name: "为何 Orbis" })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "我们的原则" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("首页为何 Orbis 保持当前首页且只有一个导航定位", async ({ page }) => {
  await page.goto("/zh/");
  const why = page.getByRole("navigation").getByRole("link", { name: "为何 Orbis" });
  await expect(why).toHaveAttribute("href", "/zh/");
  await expect(why).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation").getByRole("link", { name: "产品", exact: true })).toHaveCount(0);
});

for (const locale of ["zh", "en"] as const) {
  test(`${locale} 旧产品页返回 404 且不重定向`, async ({ page, request }) => {
    const path = `/${locale}/product/`;
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/${locale}/product/$`));
    await expect(page.locator("body")).not.toContainText(locale === "zh" ? "你的安全" : "Keeping watch over your safety");
  });
}
