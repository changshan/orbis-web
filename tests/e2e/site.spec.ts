import { expect, test } from "@playwright/test";

const APP_URL = "https://apps.apple.com/us/app/myorbis/id6812221807";

for (const locale of ["zh", "en"] as const) {
  test(`${locale} 首页展示地点与时间流程并可下载`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    await expect(page).toHaveTitle(locale === "zh"
      ? "Orbis｜关注重要地点与行程的灾害预警"
      : "Orbis | Disaster alerts for the places and trips that matter");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#how-it-works li")).toHaveCount(4);
    await expect(page.locator("#plans .plan-card")).toHaveCount(2);
    await expect(page.locator("#alert-example .example-head")).toHaveCount(0);
    await expect(page.locator("#plans .release-note")).toHaveCount(0);
    await expect(page.locator(".risk-card")).toHaveCount(0);
    await expect(page.locator(".site-nav .nav-download")).toHaveCount(0);
    await expect(page.locator(".hero-cta")).toHaveAttribute("href", APP_URL);
    await expect(page.locator(".footer-download")).toHaveAttribute("href", APP_URL);
    await expect(page.locator("#download .download-qr")).toHaveAttribute("href", APP_URL);
    const qr = page.locator("#download img");
    await qr.scrollIntoViewIfNeeded();
    await expect(qr).toBeVisible();
    await expect.poll(() => qr.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    for (const link of await page.locator(`a[href="${APP_URL}"]`).all()) {
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
}

test("根域名自动进入本地化首页并可手动切换语言", async ({ browser }) => {
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/zh\/$/);
  await expect(page.locator("h1")).toContainText("关注重要地点");
  await page.locator("a.lang-switch").click();
  await expect(page).toHaveURL(/\/en\/$/);
  await context.close();
});

test("首屏截图和预警示例展示更新文案", async ({ page }) => {
  await page.goto("/zh/");
  const shots = page.locator(".hero-shot img");
  await expect(shots).toHaveCount(3);
  await expect(shots.first()).toBeVisible();
  for (const shot of await shots.all()) {
    await expect.poll(() => shot.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(720);
  }
  await expect(page.locator(".hero-shot .shot-tag")).toHaveText(["持续关注", "查看相关提醒", "AI 生成行程"]);
  await expect(page.locator(".hero-shot figcaption").nth(1)).toContainText("仅为示例，以实际信息效果为准。");
  await expect(page.locator(".hero-shot figcaption").nth(2)).toContainText("关注确认的地点和时间段，掌握全部行程。");
  await expect(page.locator(".example-card figcaption")).toContainText("仅为示例，以实际信息效果为准。");
  await expect(page.locator(".official-level")).toBeVisible();
  await expect(page.locator(".orbis-intensity")).toBeVisible();
  await expect(page.locator(".site-footer")).not.toContainText("不替代官方预警或紧急服务");
});

const slideIndex = (track: HTMLElement): number => Math.round(track.scrollLeft / track.clientWidth);

test("首屏轮播可用圆点切换，减少动态效果时不自动播放", async ({ page }) => {
  await page.goto("/zh/");
  const track = page.locator(".shot-track");
  const dots = page.locator(".shot-dots button");
  await expect(dots).toHaveCount(3);
  await expect(dots.first()).toBeVisible();
  await expect(dots.first()).toHaveAttribute("aria-current", "true");
  await dots.nth(2).click();
  await expect.poll(() => track.evaluate(slideIndex)).toBe(2);
  await expect(dots.nth(2)).toHaveAttribute("aria-current", "true");
  await expect(dots.first()).toHaveAttribute("aria-current", "false");
  await expect(page.locator(".hero-shot img").nth(2)).toBeInViewport();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(6000);
  expect(await track.evaluate(slideIndex)).toBe(2);
});

test("首屏轮播自动切换，鼠标停在上面时暂停", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto("/zh/");
  const track = page.locator(".shot-track");
  await expect.poll(() => track.evaluate(slideIndex), { timeout: 9000 }).toBe(1);
  await page.locator(".hero-shot").hover();
  await page.waitForTimeout(6000);
  expect(await track.evaluate(slideIndex)).toBe(1);
  await context.close();
});

test("手动切换后首屏轮播先停留，再继续自动切换", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto("/zh/");
  const track = page.locator(".shot-track");
  await page.locator(".shot-dots button").nth(1).click();
  await page.mouse.move(5, 5);
  await expect.poll(() => track.evaluate(slideIndex)).toBe(1);
  await page.waitForTimeout(6500);
  expect(await track.evaluate(slideIndex)).toBe(1);
  await expect.poll(() => track.evaluate(slideIndex), { timeout: 5000 }).toBe(2);
  await context.close();
});

test("桌面预警说明与示例卡片顶部对齐", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/zh/");
  const [introTop, cardTop] = await Promise.all([
    page.locator(".alert-intro").evaluate((el) => el.getBoundingClientRect().top),
    page.locator(".example-card").evaluate((el) => el.getBoundingClientRect().top)
  ]);
  expect(Math.abs(introTop - cardTop)).toBeLessThanOrEqual(1);
});

test("320px 无横向滚动且下载入口可用", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/zh/");
  await expect(page.locator(".site-nav .nav-download")).toHaveCount(0);
  await expect(page.locator("#download img")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const title = page.locator("#plans-title");
  await expect(title).toHaveText("两种安排，一种关注方式");
  expect(await title.evaluate((el) => el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).lineHeight) * 1.1)).toBe(true);
});

test("反馈控件与导航保留双层高对比度焦点", async ({ page }) => {
  await page.goto("/zh/");
  for (const locator of [page.locator('textarea[name="message"]'), page.locator(".site-nav a[aria-current=page]")]) {
    await locator.focus();
    await expect(locator).toHaveCSS("outline-color", "rgb(255, 255, 255)");
    await expect(locator).toHaveCSS("outline-width", "2px");
    await expect(locator).toHaveCSS("box-shadow", /rgb\(15, 27, 36\)/);
  }
});

for (const locale of ["zh", "en"] as const) {
  test(`${locale} 旧产品页返回 404 且不重定向`, async ({ page, request }) => {
    const path = `/${locale}/product/`;
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/${locale}/product/$`));
  });
}
