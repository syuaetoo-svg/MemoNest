export type Experiment = "e1" | "e2" | "e3";
export type Variant = "a" | "b" | "c";
export type MaterialId = "meeting" | "walk";
export type Fault = "none" | "reply" | "save" | "memory" | "review";

export const PROTOTYPE_VERSION = "b1.1";
export const SCRIPT_DELAY_MS = 3000;
export const RESULTS_STORAGE_KEY = "memonest.uxlab.anonymous-results.v1";

export const experiments = {
  e1: { title: "让记录轻一点", question: "表达、整理、确认，哪种方式更适合你？", variants: { a: "传统手动记录", b: "对话式记录" } },
  e2: { title: "留下，还是继续聊", question: "保存建议在什么时候出现，更不打扰？", variants: { a: "自动弹窗", b: "消息下轻提示", c: "用户主动整理" } },
  e3: { title: "重新遇见那些片刻", question: "哪种回顾能帮你找到真正想看的来源？", variants: { a: "时间线回顾", b: "主题分类回顾", c: "固定故事卡回顾" } },
} as const;

export const materials = {
  meeting: {
    id: "meeting", title: "第一次主持会议", date: "2026-04-12",
    brief: "2026 年 4 月 12 日，样例人物第一次独立主持项目会议，地点是公司会议室。材料没有描述心情，不要补写焦虑或其他感受。",
    body: "4 月 12 日，我第一次独立主持项目会议，地点是公司会议室。",
    reply: "第一次独立主持会议，是一个可以留给自己的片刻。你可以继续聊，也可以自行决定要不要整理成记录。",
  },
  walk: {
    id: "walk", title: "河边散步的约定", date: "2026-04-19",
    brief: "2026 年 4 月 19 日，样例人物和朋友去河边散步，约好下次带相机。材料没有给出具体几点，不要补写时间。",
    body: "4 月 19 日，我和朋友去河边散步，约好下次带相机。",
    reply: "和朋友在河边走走，也留下了一个下次带相机的约定。是否整理成记录，由你决定。",
  },
} as const;

export type Theme = "工作" | "朋友" | "散步";
export type SampleRecord = { id: string; date: string; title: string; body: string; theme: Theme };
export const themes: Theme[] = ["工作", "朋友", "散步"];
export const sampleRecords: SampleRecord[] = [
  { id: "r01", date: "2026-04-03", title: "整理会议笔记", body: "把项目讨论中的三个待办写进了笔记，并确认下一次沟通时间。", theme: "工作" },
  { id: "r02", date: "2026-04-06", title: "一起做晚餐", body: "和朋友一起做番茄意面，约好下次试试蘑菇口味。", theme: "朋友" },
  { id: "r03", date: "2026-04-09", title: "街角的小路", body: "沿着街角的小路散步，看到新开的花店，没有进去购物。", theme: "散步" },
  { id: "r04", date: "2026-04-12", title: "第一次主持会议", body: "第一次独立主持项目会议，地点是公司会议室。结束后整理了待办。", theme: "工作" },
  { id: "r05", date: "2026-04-14", title: "朋友推荐的书", body: "朋友推荐了一本旅行随笔，记下书名，打算周末借阅。", theme: "朋友" },
  { id: "r06", date: "2026-04-16", title: "公园的长椅", body: "在公园散步，在长椅上休息了片刻，看见有人遛狗。", theme: "散步" },
  { id: "r07", date: "2026-04-19", title: "河边散步的约定", body: "和朋友去河边散步，朋友建议下次带相机，我们约好下次带相机。", theme: "朋友" },
  { id: "r08", date: "2026-04-21", title: "调整项目清单", body: "按交付顺序整理了项目清单，删掉了一个重复任务。", theme: "工作" },
  { id: "r09", date: "2026-04-23", title: "雨后的小广场", body: "雨停后去小广场散步，地上还有积水，沿着屋檐绕了一圈。", theme: "散步" },
  { id: "r10", date: "2026-04-25", title: "寄出一张明信片", body: "给朋友寄出一张明信片，写上了最近见到的一家小店。", theme: "朋友" },
  { id: "r11", date: "2026-04-27", title: "展示方案草图", body: "向同事展示了一份方案草图，记录了两条需要继续确认的建议。", theme: "工作" },
  { id: "r12", date: "2026-04-29", title: "傍晚的树影", body: "傍晚沿小区步道散步，看见树影落在路面上。", theme: "散步" },
];

export const taskLabels = {
  record: "保存给自己，不让角色长期记住",
  ignore: "继续聊天，暂时不保存",
  manage: "保存、授权、撤回，再删除",
  date: "找到四月第二周首次主持会议的记录，并指出地点",
  topic: "找到朋友建议下次带相机的散步，并指出约定",
  absent: "查找学会潜水那天；没有记录时明确说明未找到",
} as const;
export type TaskId = keyof typeof taskLabels;
export function taskIds(experiment: Experiment): TaskId[] {
  return experiment === "e3" ? ["date", "topic", "absent"] : experiment === "e2" ? ["record", "ignore", "manage"] : ["record"];
}
export function variantName(experiment: Experiment, variant: Variant) {
  const variants: Partial<Record<Variant, string>> = experiments[experiment].variants;
  return variants[variant] ?? "";
}
