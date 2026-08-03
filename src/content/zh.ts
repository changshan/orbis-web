import type { WebsiteContent } from "./types";

export const zh = {
  meta: {
    title: "Orbis｜你的安全，时刻守护",
    description: "了解 Orbis 如何围绕守护地点判断风险相关性，并清晰呈现真正必要的提醒。"
  },
  nav: {
    why: "为何 Orbis", principles: "我们的原则", feedback: "反馈", privacy: "隐私",
    skip: "跳到主要内容", langLabel: "English",
    homeAria: "Orbis 首页", primaryAria: "主导航"
  },
  hero: {
    title: "你的安全，时刻守护",
    titleLines: ["你的安全，", "时刻守护"],
    body: "Orbis 围绕你选择的地点，理解不同风险是否相关，并在重要变化发生时，提供简洁、可信的信息。",
    action: "了解 Orbis 如何判断",
    metrics: [
      { value: "1", label: "守护地点" },
      { value: "6", label: "风险类型" },
      { value: "4", label: "关键信息" }
    ],
    boundary: {
      tag: "BOUNDARY",
      note: "Orbis 不替代当地官方预警、政府指令或紧急服务。遇到紧急情况，请立即联系当地紧急服务。"
    }
  },
  alertSample: {
    sampleTag: "示例",
    nowLabel: "现在",
    levelLabel: "LEVEL 2 · 注意",
    headLabel: "ALERT · 暴雨",
    indexLabel: "01 / 02 / 03 / 04",
    hazard: "暴雨",
    whatValue: "暴雨 · 注意",
    where: "与你在意的地点相关",
    whenLabel: "WHEN",
    when: "今晚开始",
    updatedLabel: "UPDATED",
    updated: "刚刚",
    actionLabel: "FIRST ACTION / 首先关注",
    action: "减少不必要的户外安排，并留意当地官方信息。",
    sourceNote: "来源与完整信息可查看",
    boundaryNote: "不替代官方预警或紧急服务",
    fieldLabels: { what: "01 WHAT", where: "02 WHERE", when: "03 WHEN", action: "04 FIRST ACTION / 首先关注" }
  },
  risks: {
    title: "各种风险，全面感知",
    note: "展示可纳入 Orbis 判断框架的风险类型；实际可用类型取决于当地信息源与服务范围。",
    items: [
      { key: "earthquake", code: "R-01", name: "地震", term: "EARTHQUAKE" },
      { key: "rain", code: "R-02", name: "暴雨", term: "HEAVY RAIN" },
      { key: "heatwave", code: "R-03", name: "热浪", term: "HEATWAVE" },
      { key: "flood", code: "R-04", name: "洪水", term: "FLOOD" },
      { key: "wildfire", code: "R-05", name: "山火", term: "WILDFIRE" },
      { key: "tornado", code: "R-06", name: "龙卷风", term: "TORNADO" }
    ],
    severity: {
      label: "SEVERITY",
      levels: [
        { tone: "watch", text: "关注 · 变化在记录中" },
        { tone: "alert", text: "注意 · 与你的地点相关" },
        { tone: "urgent", text: "紧急 · 需要立即处理" }
      ]
    }
  },
  relevance: {
    title: "保留真正必要的提醒",
    body: "Orbis 结合守护地点、影响范围和风险程度，过滤与你无关的信息。",
    factors: [
      { name: "地点", term: "PLACE" },
      { name: "范围", term: "RANGE" },
      { name: "程度", term: "SEVERITY" }
    ],
    diagram: {
      caption: "INCOMING SIGNALS → ONE RELEVANT ALERT",
      rows: [
        { label: "远处事件", verdict: "OUT", pass: false },
        { label: "影响范围外", verdict: "OUT", pass: false },
        { label: "与你可能相关", verdict: "PASS", pass: true }
      ],
      sourceTitle: "守护地点",
      sourceSub: "地点 × 范围 × 程度",
      resultTag: "RELEVANT",
      resultText: "与你相关的风险变化"
    }
  },
  clarity: {
    title: "重要信息，永不遗漏",
    body: "灾害类型、影响地点、关键时间和首要行动，按照重要程度呈现。",
    items: [
      { index: "01", title: "发生了什么", body: "灾害类型与风险程度" },
      { index: "02", title: "影响哪里", body: "与你选择地点的关系" },
      { index: "03", title: "关键时间", body: "发生、开始或更新时间" },
      { index: "04", title: "首先关注什么", body: "审核后的固定行动表达" }
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
  footer: { boundary: "不替代官方预警或紧急服务", copyright: "© Orbis" }
} satisfies WebsiteContent;
