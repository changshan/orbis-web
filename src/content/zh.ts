import type { WebsiteContent } from "./types";

export const zh = {
  meta: { title: "Orbis｜任何时候，为你守护", description: "Orbis 为你在意的地点带来安静、相关、可信的风险理解。" },
  nav: { why: "为何 Orbis", principles: "我们的原则", feedback: "反馈", privacy: "隐私", skip: "跳到主要内容", langLabel: "English" },
  hero: {
    eyebrow: "安静守护 / 清晰判断", titleLead: "任何时候，", titleMain: "为你守护", titleDot: "。",
    body: "Orbis 为你在意的地点带来安静、相关、可信的风险理解，让下一步更清楚。",
    action: "了解我们的理念", watchLabel: "KEEPING WATCH / 守护",
    youLabel: "你 / YOU", placeLabel: "你在意的地方", placeName: "Geneva"
  },
  why: {
    title: "更多信息，不一定带来更多安全感。",
    questions: ["发生了什么？", "是否与你相关？", "接下来该关注什么？"],
    outroPlain: "真正重要的是这三个问题。", outroStrong: "Orbis 从这里出发。"
  },
  principles: {
    title: "三条原则",
    items: [
      { tag: "RELEVANT", title: "相关", body: "只关注与你在意的地点真正相关的信息。" },
      { tag: "CLEAR", title: "清晰", body: "让重要信息可以被快速理解。" },
      { tag: "TRUSTED", title: "可信", body: "保持克制，诚实表达来源、边界与不确定性。" }
    ]
  },
  boundary: { title: "清楚理解边界", body: "Orbis 帮助你理解风险，但不替代当地官方预警、政府指令或紧急服务。遇到紧急情况，请立即联系当地紧急服务。" },
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
    title: "隐私说明", intro: "Orbis 只处理完成本次反馈所需的最少信息。",
    sections: [
      { title: "我们处理什么", body: "反馈正文、你主动留下的联系方式、页面语言和提交时间。" },
      { title: "如何使用", body: "联系方式仅用于回复本次反馈；不建立用户档案，也不出售或共享反馈信息。" },
      { title: "保留期限", body: "反馈邮件最长保留 90 天，处理完成后可以提前删除。" },
      { title: "基础设施", body: "Cloudflare 会按照其服务条款处理提供网站和防止滥用所需的请求元数据。Orbis 不把完整 IP、反馈正文或联系方式写入应用日志。" }
    ]
  },
  footer: { boundary: "不替代官方预警或紧急服务", copyright: "© Orbis" }
} satisfies WebsiteContent;
