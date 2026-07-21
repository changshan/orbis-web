import { expect, test } from "@playwright/test";

for (const locale of ["zh", "en"] as const) {
  test(`${locale} 首页渲染`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#feedback")).toBeVisible();
  });
}

test("浏览器语言自动进入中文并可手动切换", async ({ browser }) => {
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/zh\/$/);
  await page.locator("a.lang-switch").click();
  await expect(page).toHaveURL(/\/en\/$/);
  await context.close();
});

test("320px 无横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/zh/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
