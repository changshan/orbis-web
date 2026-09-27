import { expect, test } from "@playwright/test";

test("原生表单提交并收到本地化 HTML 回执", async ({ page }) => {
  await page.route("**/api/feedback", (route) => route.fulfill({
    status: 200, contentType: "text/html; charset=utf-8",
    body: '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><main><h1>谢谢，反馈已发送。</h1><a href="/zh/">Orbis</a></main></html>'
  }));
  await page.goto("/zh/");
  await page.getByLabel("你的反馈").fill("无脚本反馈");
  await page.getByRole("button", { name: "发送反馈" }).click();
  await expect(page.getByRole("heading", { name: "谢谢，反馈已发送。" })).toBeVisible();
});

test("无 JS 时新版说明、下载入口与反馈表单可用", async ({ page }) => {
  await page.goto("/zh/");
  await expect(page.locator("h1")).toContainText("关注重要地点");
  await expect(page.locator("#how-it-works li")).toHaveCount(4);
  await expect(page.locator("#plans")).not.toContainText("新版规划");
  await expect(page.locator("#boundary")).toContainText("来源不可用或过期时如实显示");
  await expect(page.locator(".hero-cta")).toHaveAttribute("href", "https://apps.apple.com/us/app/myorbis/id6812221807");
  await expect(page.getByLabel("你的反馈")).toBeVisible();
});
