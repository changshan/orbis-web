import type { WebsiteContent } from "./types";

export const zh = {
  meta: {
    title: "Orbis 产品能力｜你的安全，时刻守护",
    description: "了解 Orbis 如何围绕守护地点判断风险相关性，并清晰呈现真正必要的提醒。"
  },
  nav: { why: "为何 Orbis", principles: "我们的原则", feedback: "反馈", privacy: "隐私", skip: "跳到主要内容", langLabel: "English" },
  hero: {
    eyebrow: "QUIET PROTECTION / 清晰判断",
    title: "你的安全，时刻守护",
    titleLines: ["你的安全，", "时刻守护"],
    body: "Orbis 围绕你选择的地点，理解不同风险是否相关，并在重要变化发生时，提供简洁、可信的信息。",
    action: "了解 Orbis 如何判断",
    metrics: ["1  守护地点", "6  风险类型", "4  关键信息"]
  },
  risks: {
    eyebrow: "01 · WHAT WE WATCH",
    title: "各种风险，全面感知",
    note: "展示可纳入 Orbis 判断框架的风险类型；实际可用类型取决于当地信息源与服务范围。",
    items: [
      { key: "earthquake", name: "地震", body: "了解震级、位置、时间，以及与守护地点的距离。" },
      { key: "rain", name: "暴雨", body: "了解影响区域、持续时间和风险程度。" },
      { key: "heatwave", name: "热浪", body: "在高温到来前，了解影响时间和注意事项。" },
      { key: "flood", name: "洪水", body: "了解水位变化、影响范围和官方行动信息。" },
      { key: "wildfire", name: "山火", body: "了解火情位置、蔓延范围和相关限制。" },
      { key: "tornado", name: "龙卷风", body: "了解发生位置、影响范围和紧急避险信息。" }
    ]
  },
  relevance: {
    eyebrow: "02 · RELEVANCE",
    title: "保留真正必要的提醒",
    body: "Orbis 结合守护地点、影响范围和风险程度，过滤与你无关的信息。"
  },
  clarity: {
    eyebrow: "03 · ONE CLEAR ALERT",
    title: "重要信息，永不遗漏",
    body: "灾害类型、影响地点、关键时间和首要行动，按照重要程度呈现。",
    items: [
      { tag: "01 · WHAT", title: "发生了什么", body: "灾害类型与风险程度" },
      { tag: "02 · WHERE", title: "影响哪里", body: "与你选择地点的关系" },
      { tag: "03 · WHEN", title: "关键时间", body: "发生、开始或更新时间" },
      { tag: "04 · ACTION", title: "首先关注什么", body: "审核后的固定行动表达" }
    ]
  },
  principles: {
    title: "三条原则",
    items: [
      { tag: "RELEVANT", title: "相关", body: "只关注与你在意的地点真正相关的信息。" },
      { tag: "CLEAR", title: "清晰", body: "让重要信息可以被快速理解。" },
      { tag: "TRUSTED", title: "可信", body: "保持克制，诚实表达来源、边界与不确定性。" }
    ]
  },
  boundary: {
    eyebrow: "05 · CLEAR BOUNDARIES",
    title: "可信，也包括明确边界。",
    body: "Orbis 对信息来源、不确定性和能力范围保持透明。Orbis 不替代当地官方预警、政府指令或紧急服务；遇到紧急情况，请立即联系当地紧急服务。",
    rules: ["来源可见 · 保留官方入口", "不确定性可见 · 不包装成确定", "行动保持克制 · 不预测、不保证"]
  },
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
