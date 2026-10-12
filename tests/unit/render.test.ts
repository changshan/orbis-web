import { describe, expect, it } from "vitest";
import { renderHome } from "../../src/render/home";
import { renderPrivacy } from "../../src/render/privacy";
import { renderEntry } from "../../src/render/entry";
import { renderNotFound } from "../../src/render/notFound";

const APP_URL = "https://apps.apple.com/us/app/myorbis/id6812221807";

describe("renderHome", () => {
  const zh = renderHome("zh");
  const en = renderHome("en");

  it("按使用流程、关注方式、预警示例、原则和反馈排列", () => {
    for (const html of [zh, en]) {
      const ids = ["how-it-works", "plans", "alert-example", "principles", "boundary", "feedback"];
      const positions = ids.map((id) => html.indexOf(`id="${id}"`));
      expect(positions.every((position) => position > 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(html.match(/class="step-index mono"/g)).toHaveLength(4);
      expect(html.match(/class="plan-card"/g)).toHaveLength(2);
      expect(html).not.toContain('id="risks"');
      expect(html).not.toContain('class="hero-metrics"');
    }
  });

  it("首屏轮播首页、预警详情、AI 草稿三张截图，中英文页各用本语言的图", () => {
    const expected = {
      zh: [
        ["hero-home", "首页", "持续关注", "长期地点持续关注；行程按已确认的地点和时间段分别关注。"],
        ["hero-alert", "预警详情", "查看相关提醒", "仅为示例，以实际信息效果为准。"],
        ["hero-review-draft", "上海", "AI 生成行程", "关注确认的地点和时间段，掌握全部行程。"]
      ],
      en: [
        ["hero-home", "home screen", "Keep watch", "Follow a place long term, or watch each confirmed trip stop during its scheduled time period."],
        ["hero-alert", "alert detail", "Read relevant alerts", "For illustration only; actual information may differ."],
        ["hero-review-draft", "Seattle", "AI-GENERATED TRIP", "Follow confirmed places and time periods across your entire trip."]
      ]
    } as const;
    for (const [html, locale] of [[zh, "zh"], [en, "en"]] as const) {
      const carousel = html.match(/<div class="hero-shot" data-carousel>.*?<\/div><\/div>/s)?.[0] ?? "";
      expect(carousel).toMatch(/<div class="shot-track" tabindex="0" role="group" aria-label="[^"]+">/);
      const slides = carousel.match(/<figure class="shot-slide">.*?<\/figure>/gs) ?? [];
      expect(slides).toHaveLength(3);
      slides.forEach((slide, index) => {
        const [image, alt, tag, note] = expected[locale][index]!;
        expect(slide).toContain(`src="/assets/${image}-${locale}.webp" width="720" height="997"`);
        expect(slide).toMatch(new RegExp(`alt="[^"]*${alt}[^"]*"`));
        expect(slide.includes('loading="lazy"')).toBe(index > 0);
        expect(slide).toContain(`<figcaption><span class="shot-tag mono">${tag}</span>${note}</figcaption>`);
      });
      expect(carousel).toContain('<div class="shot-dots" hidden>');
      expect(carousel.match(/<button type="button" aria-label="[^"]+"><\/button>/g)).toHaveLength(3);
      expect(html).toContain('src="/assets/carousel.js"');
      expect(html).not.toContain("plan-preview");
      expect(html).not.toContain("preview-stops");
      expect(html).not.toContain(`-${locale === "zh" ? "en" : "zh"}.webp`);
      expect(html).not.toContain("hero-describe");
      expect(html).not.toContain("hero-privacy");
    }
  });

  it("下载入口、示例与官方等级均可见", () => {
    for (const html of [zh, en]) {
      expect(html.split(`href="${APP_URL}"`)).toHaveLength(4);
      expect(html).not.toContain('class="example-head"');
      expect(html).not.toContain('class="release-note"');
      expect(html).not.toContain('class="alert-sample mono"');
      expect(html).toContain('class="official-level"');
      expect(html).toContain('class="orbis-intensity"');
      expect(html).toContain('class="hero-boundary"');
      expect(html).not.toContain("不替代官方预警或紧急服务</p>");
      expect(html).not.toMatch(/<script(?![^>]*\ssrc=)/i);
      expect(html).not.toMatch(/<style/i);
    }
  });

  it("保留反馈表单与双语导航契约", () => {
    for (const attr of [
      "data-feedback-form", 'method="post"', 'action="/api/feedback"',
      "data-sending", "data-success", "data-validation", "data-rate-limited",
      "data-unavailable", "data-uncertain", 'name="locale"', 'name="website"',
      "honeypot", 'tabindex="-1"', 'name="message"', 'maxlength="2000"',
      'name="contact"', 'maxlength="200"', 'role="status"', "data-feedback-status",
      'src="/assets/feedback.js"'
    ]) expect(zh, attr).toContain(attr);
    expect(zh).toContain('href="/zh/" aria-current="page">为何 Orbis</a>');
    expect(zh).toContain('href="#how-it-works">如何使用</a>');
    expect(zh).toContain('class="lang-switch" href="/en/"');
    expect(en).toContain('href="#how-it-works">How it works</a>');
    expect(zh).toContain('aria-label="主导航"');
    expect(en).toContain('aria-label="Primary navigation"');
  });

  it("反馈区留有联系邮箱（App Store 支持网址指向这里）", () => {
    for (const html of [zh, en]) {
      expect(html).toContain('<section class="home-feedback" id="feedback"');
      expect(html).toContain('<a href="mailto:support@myorbis.xyz">support@myorbis.xyz</a>');
    }
    expect(zh).toContain("也可以发邮件到");
    expect(en).toContain("Or email us at");
  });

  it("canonical 与 hreflang 指向真实首页", () => {
    expect(zh).toContain('rel="canonical" href="http://localhost:8788/zh/"');
    expect(zh).toContain('hreflang="en" href="http://localhost:8788/en/"');
    expect(en).toContain('rel="canonical" href="http://localhost:8788/en/"');
  });
});

describe("其余页面", () => {
  it("隐私页是 App 隐私政策，并保留网站反馈说明与本地化导航", () => {
    const privacy = renderPrivacy("zh");
    const englishPrivacy = renderPrivacy("en");
    expect(privacy).toContain("<title>隐私政策 | Orbis</title>");
    expect(englishPrivacy).toContain("<title>Privacy Policy | Orbis</title>");
    expect(privacy).toContain("<h1>Orbis 隐私政策</h1>");
    expect(englishPrivacy).toContain("<h1>Orbis Privacy Policy</h1>");
    // 存放地与访问地（规划 §3）：两地分开写，其他地区写明在新加坡存放并访问
    expect(privacy).toContain("阿里云中国（乌兰察布）");
    expect(privacy).toContain("数据存放在阿里云新加坡，并在新加坡访问");
    expect(englishPrivacy).toContain("stored on Alibaba Cloud in Singapore and accessed in Singapore");
    // 数据清单用表格，删除方式用列表
    expect(privacy.match(/<table/g)!.length).toBe(2);
    expect(englishPrivacy.match(/<table/g)!.length).toBe(2);
    expect(privacy).toContain("<th scope=\"col\">保存多久</th>");
    expect(privacy).toMatch(/<ul>\s*<li>删除一个地点或行程/);
    // 联系邮箱与反馈区一致，开头与“你的权利”各一处
    for (const html of [privacy, englishPrivacy]) {
      expect(html.match(/support@myorbis\.xyz/g)!.length).toBe(2);
      expect(html).not.toContain("@gmail.com");
    }
    // 不承诺替代官方预警；网站反馈的说明仍在
    expect(privacy).toContain("不替代官方预警渠道");
    expect(privacy).toContain("反馈邮件最长保留 90 天");
    expect(englishPrivacy).toContain("Feedback email is retained for no more than 90 days");
    // AI 创建已开放（2026-10-07），不再写“开放后适用”
    expect(privacy).not.toContain("开放后适用");
    expect(englishPrivacy).not.toContain("once the feature is available");
    expect(privacy).toContain("<p>如果你选择用文字描述安排");
    // 中英文结构一致，页面上没有未填的占位
    expect(privacy.match(/<h2/g)!.length).toBe(englishPrivacy.match(/<h2/g)!.length);
    expect(privacy.match(/<h2/g)!.length).toBeGreaterThanOrEqual(11);
    for (const html of [privacy, englishPrivacy]) expect(html).not.toMatch(/[{}]|待确认|pending/i);
    expect(privacy).toContain('href="/zh/#how-it-works"');
    expect(privacy).toContain('class="lang-switch" href="/en/privacy/"');
    expect(privacy).toContain(`href="${APP_URL}"`);
  });

  it("入口、404 与共用页面骨架正常", () => {
    const entry = renderEntry();
    const nf = renderNotFound();
    expect(entry).toContain('href="/zh/"');
    expect(entry).toContain('href="/en/"');
    expect(entry).toContain('src="/assets/lang.js"');
    expect(nf).toContain('href="/zh/"');
    expect(nf).toContain('href="/en/"');
    for (const html of [renderHome("zh"), renderPrivacy("zh")]) {
      expect(html).toContain('<header class="site-header">');
      expect(html).toContain('<footer class="site-footer">');
    }
  });
});
