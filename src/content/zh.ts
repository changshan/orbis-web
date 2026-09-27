import type { WebsiteContent } from "./types";

export const zh = {
  meta: {
    title: "Orbis｜关注重要地点与行程的灾害预警",
    description: "Orbis 围绕你确认的地点与时间呈现相关官方灾害预警，并清晰标示来源与提醒边界。"
  },
  nav: {
    why: "为何 Orbis", how: "如何使用", principles: "我们的原则", feedback: "反馈", privacy: "隐私",
    download: "在 App Store 下载", skip: "跳到主要内容", langLabel: "English",
    homeAria: "Orbis 首页", primaryAria: "主导航"
  },
  hero: {
    eyebrow: "ORBIS · OFFICIAL ALERTS, MADE RELEVANT",
    titleLines: ["关注重要地点和行程，", "掌握相关预警。"],
    body: "Orbis 让你关注在意的地点，查看与之相关的官方灾害预警。支持长期关注与按时间安排的行程提醒。",
    learn: "了解使用方式",
    boundary: "Orbis提供更全面、更及时的预警，不替代官方紧急服务。"
  },
  preview: {
    tag: "AI 生成行程",
    title: "上午米兰，下午罗马",
    firstPlace: "米兰", firstTime: "09:00—12:00 · 当地时间",
    secondPlace: "罗马", secondTime: "14:00—18:00 · 当地时间",
    routeNote: "关注确认的地点和时间段，掌握全部行程。"
  },
  how: {
    title: "智能生成提醒， 让你更安心",
    intro: "大模型驱动流程创建，提醒清晰明了",
    steps: [
      { title: "自然语言描述", body: "AI 自动识别地点和行程，生成待确认的关注草稿。" },
      { title: "确认地点与时间", body: "检查具体地点、实际日期与当地时区，必要时修改草稿。" },
      { title: "持续关注", body: "长期地点持续关注；行程按已确认的地点和时间段分别关注。" },
      { title: "查看相关提醒", body: "在相关官方预警出现或明显变化时，查看地点、时间与预警原文。" }
    ]
  },
  plans: {
    title: "两种安排，一种清晰的关注方式",
    intro: "选择你在意的地点，并决定关注多久。每个地点的关注状态由你管理。",
    items: [
      { title: "长期关注地点", body: "适合家人所在城市等长期在意的地点；可主动暂停、恢复或删除。" },
      { title: "单次或多节点行程", body: "为每个地点确认时间段；行程结束后停止关注，不自动延伸到沿途。" }
    ],
  },
  alertSample: {
    title: "每条提醒，讲清关键事实",
    body: "提醒强度来源于风险的等级定义，参考官方的等级定义",
    intensityLabel: "ORBIS 提醒强度", intensity: "注意",
    officialLabel: "官方原文等级", officialLevel: "暴雨橙色预警（示例）",
    placeLabel: "关注地点", place: "米兰",
    timeLabel: "有效时间", time: "今天 20:00 前（示例）",
    sourceLabel: "发布机构", source: "以实际官方预警为准",
    actionLabel: "首先关注", action: "减少不必要的户外安排，并留意当地官方信息。",
    foot: "仅为示例，以实际信息效果为准。"
  },
  principles: {
    title: "三条原则",
    items: [
      { tag: "RELEVANT", title: "相关", body: "围绕你确认的地点和时间呈现相关预警。" },
      { tag: "CLEAR", title: "清晰", body: "让地点、时间、官方等级与提醒原因容易理解。" },
      { tag: "TRUSTED", title: "可信", body: "标明来源、时效与不确定性，明确说明能力边界。" }
    ]
  },
  boundary: {
    title: "可信，也包括明确边界。",
    body: "Orbis 数据来源于官方和权威机构，提供全面的风险事件覆盖和预警通知。来源不可用或过期时如实显示，并提供清晰说明。",
    rules: ["官方来源与原文可见", "只关注已确认的地点与时间", "不替代官方预警或紧急服务"]
  },
  download: { title: "扫码下载 Orbis", body: "用手机扫描二维码打开 App Store；也可以点击二维码。", qrAlt: "扫描二维码，在 App Store 下载 Orbis" },
  feedback: {
    title: "直接告诉我们", body: "建议、问题，或任何你希望 Orbis 知道的事。",
    messageLabel: "你的反馈", messagePlaceholder: "写下你的建议或问题",
    contactLabel: "联系方式（选填）", contactPlaceholder: "邮箱、电话、微信、Telegram…",
    hint: "联系方式仅用于回复本次反馈，不填写也可以提交。请不要发送密码、身份证件、精确住址或紧急求助信息；紧急情况请联系当地紧急服务。",
    submit: "发送反馈", sending: "正在发送…", success: "谢谢，反馈已发送。",
    validation: "请填写反馈内容，最多 2000 个字符。",
    rateLimited: "提交较频繁，请一分钟后再试。", unavailable: "暂时无法发送，请稍后重试。",
    uncertain: "暂时无法确认是否送达；重试可能产生重复邮件。"
  },
  privacy: {
    meta: {
      title: "隐私说明 | Orbis",
      description: "了解 Orbis 在反馈过程中处理哪些信息、如何使用以及保留期限。"
    },
    title: "隐私说明", intro: "Orbis 只处理完成本次反馈所需的最少信息。",
    sections: [
      { title: "我们处理什么", body: "反馈正文、你主动留下的联系方式、页面语言和提交时间。" },
      { title: "如何使用", body: "联系方式仅用于回复本次反馈；不建立用户档案，也不出售或共享反馈信息。" },
      { title: "保留期限", body: "反馈邮件最长保留 90 天，处理完成后可以提前删除。" },
      { title: "基础设施", body: "Cloudflare 会按照其服务条款处理提供网站和防止滥用所需的请求元数据。Orbis 不把完整 IP、反馈正文或联系方式写入应用日志。" }
    ]
  },
  footer: { copyright: "© Orbis" }
} satisfies WebsiteContent;
