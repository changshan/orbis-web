import { expect, test } from "@playwright/test";

const cases = [
  { status: 200, body: { ok: true, requestId: "r1" }, text: "Thank you. Your feedback was sent." },
  { status: 429, body: { ok: false, code: "rate_limited", requestId: "r2" }, text: "Try again in one minute." },
  { status: 503, body: { ok: false, code: "delivery_unavailable", requestId: "r3" }, text: "Try again later." }
];

test("空正文提交显示本地校验", async ({ page }) => {
  await page.goto("/en/");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("status")).toContainText("Enter feedback");
  await expect(page.getByLabel("Your feedback")).toBeFocused();
});

for (const item of cases) test(`响应 ${item.status} 显示对应状态`, async ({ page }) => {
  await page.route("**/api/feedback", (route) => route.fulfill({
    status: item.status, contentType: "application/json", body: JSON.stringify(item.body)
  }));
  await page.goto("/en/");
  await page.getByLabel("Your feedback").fill("A focused suggestion");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("status")).toContainText(item.text);
});

test("网络中断显示状态未知并保留输入", async ({ page }) => {
  await page.route("**/api/feedback", (route) => route.abort("connectionfailed"));
  await page.goto("/en/");
  await page.getByLabel("Your feedback").fill("Keep this text");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("status")).toContainText("cannot confirm delivery");
  await expect(page.getByLabel("Your feedback")).toHaveValue("Keep this text");
});
