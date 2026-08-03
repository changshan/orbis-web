import { expect, test } from "@playwright/test";

for (const locale of ["zh", "en"] as const) {
  test(`${locale} 首页直接渲染完整能力与原则`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    await expect(page).toHaveTitle(locale === "zh"
      ? "Orbis｜你的安全，时刻守护"
      : "Orbis | Keeping watch over your safety");
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

test("Hero 用线框警报样机并标注为示例", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/zh/");
  const card = page.locator(".hero-figure .alert-card");
  await expect(card).toBeVisible();
  await expect(card.locator(".alert-sample")).toHaveText("示例");
  await expect(page.locator(".hero-figure img")).toHaveCount(0);
  await expect(page.locator(".home-hero")).toHaveCSS("border-bottom-color", "rgb(226, 161, 68)");
});

test("渐变过渡带已移除且窄屏无横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/zh/");
  await expect(page.locator(".home-color-transition")).toHaveCount(0);
  await expect(page.locator(".home-clarity")).toHaveCSS("border-top-color", "rgb(226, 161, 68)");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  )).toBe(true);
});

test("1152px 中间宽度：风险格无空白格且边界面板与相邻内容对齐", async ({ page }) => {
  await page.setViewportSize({ width: 1152, height: 900 });
  await page.goto("/zh/");

  const grid = page.locator(".risk-grid");
  const cards = page.locator(".risk-card");
  await expect(cards).toHaveCount(6);
  const geometry = await page.evaluate(() => {
    const gridEl = document.querySelector(".risk-grid") as HTMLElement;
    const cols = getComputedStyle(gridEl).gridTemplateColumns.split(" ").length;
    const rows = getComputedStyle(gridEl).gridTemplateRows.split(" ").length;
    const cardCount = document.querySelectorAll(".risk-card").length;
    return { cols, rows, cardCount };
  });
  // The grid must be exactly filled by the six cards: no implicit, unpainted tracks.
  expect(geometry.cols * geometry.rows).toBe(geometry.cardCount);

  const insets = await page.evaluate(() => {
    const principles = document.querySelector(".home-principles") as HTMLElement;
    const pRect = principles.getBoundingClientRect();
    const pPadLeft = parseFloat(getComputedStyle(principles).paddingLeft);
    const principlesContentLeft = pRect.left + pPadLeft;

    const homeBoundary = document.querySelector(".home-boundary") as HTMLElement;
    const homeBoundaryLeft = homeBoundary.getBoundingClientRect().left;

    const heroGrid = document.querySelector(".hero-grid") as HTMLElement;
    const hRect = heroGrid.getBoundingClientRect();
    const hPadLeft = parseFloat(getComputedStyle(heroGrid).paddingLeft);
    const heroContentLeft = hRect.left + hPadLeft;

    const heroBoundary = document.querySelector(".hero-boundary") as HTMLElement;
    const heroBoundaryPadLeft = parseFloat(getComputedStyle(heroBoundary).paddingLeft);

    return { principlesContentLeft, homeBoundaryLeft, heroContentLeft, heroBoundaryPadLeft };
  });
  expect(Math.abs(insets.homeBoundaryLeft - insets.principlesContentLeft)).toBeLessThan(1);
  expect(Math.abs(insets.heroBoundaryPadLeft - insets.heroContentLeft)).toBeLessThan(1);
});

test("320px 无横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/zh/");
  await expect(page.getByRole("navigation").getByRole("link", { name: "为何 Orbis" })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "我们的原则" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("反馈控件具有双层高对比度焦点指示", async ({ page }) => {
  await page.goto("/zh/");
  const message = page.locator('textarea[name="message"]');
  await message.focus();
  await expect(message).toHaveCSS("outline-color", "rgb(255, 255, 255)");
  await expect(message).toHaveCSS("outline-width", "2px");
  await expect(message).toHaveCSS("outline-offset", "2px");
  await expect(message).toHaveCSS("box-shadow", /rgb\(28, 42, 51\)/);
});

test("严重度图例 urgent 标记的外圈不透明且清晰可辨", async ({ page }) => {
  await page.goto("/zh/");
  const mark = page.locator(".sev-mark.sev-urgent").first();
  await expect(mark).toBeVisible();
  const outline = await mark.evaluate((el) => {
    const style = getComputedStyle(el);
    return { color: style.outlineColor, width: parseFloat(style.outlineWidth), styleKind: style.outlineStyle, offset: style.outlineOffset };
  });
  expect(outline.styleKind).toBe("solid");
  expect(outline.width).toBeGreaterThanOrEqual(2);
  const parts = outline.color.match(/rgba?\(([^)]+)\)/)?.[1]?.split(",").map((n) => parseFloat(n)) ?? [];
  const [r = NaN, g = NaN, b = NaN, a = 1] = parts;
  expect([r, g, b]).toEqual([166, 64, 47]);
  expect(a).toBeGreaterThanOrEqual(0.99);
  expect(outline.offset).toBe("2px");
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
