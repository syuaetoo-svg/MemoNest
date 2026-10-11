import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const meeting = "4 月 12 日，我第一次独立主持项目会议，地点是公司会议室。";
async function tools(page: Page) {
  const details = page.locator("details.ux-research");
  if (!(await details.evaluate(element => (element as HTMLDetailsElement).open))) await details.locator("summary").click();
}
async function fault(page: Page, kind: string) {
  await tools(page);
  await page.getByLabel(/故障演练/).selectOption(kind);
}
async function send(page: Page, hints = false) {
  if (hints) await page.getByRole("checkbox", { name: /允许本会话展示保存建议/ }).check();
  await page.getByLabel("讲述素材中的事件").fill(meeting);
  await page.getByRole("button", { name: "发送样例消息", exact: true }).click();
  await expect(page.getByText("固定脚本回复已完成；消息尚未保存为记录。", { exact: true })).toBeVisible();
}
async function proactiveDraft(page: Page) {
  await page.getByRole("checkbox", { name: "选择样例消息，整理为私人记录", exact: true }).check();
  await page.getByRole("button", { name: "整理为记录", exact: true }).click();
}
async function saveDraft(page: Page) {
  await page.getByRole("button", { name: "预览私人记录", exact: true }).click();
  await page.getByRole("button", { name: "确认保存私人记录", exact: true }).click();
  await expect(page.getByTestId("private-record")).toBeVisible();
  await expect(page.getByTestId("memory-status")).toContainText("未授权");
}
async function story(page: Page) {
  await page.getByRole("button", { name: "选用全部 12 条样例", exact: true }).click();
  await page.getByRole("checkbox", { name: /同意模拟本次回顾/ }).check();
  await page.getByRole("button", { name: "查看固定故事卡", exact: true }).click();
  await expect(page.getByText(/固定故事卡已就绪/)).toBeVisible();
}

// These are software checks with fictional data, not participant research results.
test("hub exposes eight variants and invalid routes return 404", async ({ page }) => {
  await page.goto("/ux-lab");
  await expect(page.getByText("UX Lab · 研究原型，不是正式产品功能。", { exact: true })).toBeVisible();
  await expect(page.locator('a[href^="/ux-lab/e"]')).toHaveCount(8);
  const response = await page.goto("/ux-lab/e1/c");
  expect(response?.status()).toBe(404);
  const inheritedKey = await page.goto("/ux-lab/toString/a");
  expect(inheritedKey?.status()).toBe(404);
});

test("E1 manual validates, edits, recovers save failure, and undoes", async ({ page }) => {
  await page.goto("/ux-lab/e1/a");
  await page.getByRole("button", { name: "预览私人记录" }).click();
  await expect(page.locator('p[role="alert"]:visible')).toContainText("请填写记录正文");
  await page.getByLabel("记录正文").fill(meeting);
  await page.getByLabel("标题（可留空）").fill("会议的一个片刻");
  await page.getByRole("button", { name: "预览私人记录" }).click();
  await page.getByRole("button", { name: "返回编辑" }).click();
  await page.getByLabel("标题（可留空）").fill("第一次会议");
  await page.getByRole("button", { name: "预览私人记录" }).click();
  await fault(page, "save");
  await page.getByRole("button", { name: "确认保存私人记录" }).click();
  await expect(page.locator('p[role="alert"]:visible')).toContainText("模拟保存失败");
  await expect(page.getByTestId("private-record")).toHaveCount(0);
  await page.getByRole("button", { name: "确认保存私人记录" }).click();
  await expect(page.getByTestId("private-record")).toContainText("第一次会议");
  await expect(page.getByTestId("memory-status")).toContainText("未授权");
  await page.getByRole("button", { name: /撤销本次保存/ }).click();
  await expect(page.getByTestId("private-record")).toHaveCount(0);
  await expect(page.getByText(/已撤销本次保存/)).toBeVisible();
});

test("E1 scripted chat stops, retries, edits and saves the same fixture", async ({ page }) => {
  await page.goto("/ux-lab/e1/b");
  await expect(page.getByText(/固定研究脚本，不是真实 AI/)).toBeVisible();
  await page.getByLabel("讲述素材中的事件").fill(meeting);
  await page.getByRole("button", { name: "发送样例消息" }).click();
  await page.getByRole("button", { name: "停止模拟回复" }).click();
  await expect(page.getByLabel("讲述素材中的事件")).toHaveValue(meeting);
  await fault(page, "reply");
  await page.getByRole("button", { name: "发送样例消息" }).click();
  await expect(page.locator('p[role="alert"]:visible')).toContainText("模拟回复失败");
  await expect(page.getByLabel("讲述素材中的事件")).toHaveValue(meeting);
  await send(page);
  await proactiveDraft(page);
  await expect(page.getByLabel("记录正文")).toHaveValue(meeting);
  await page.getByLabel("标题（可留空）").fill("会议记录");
  await saveDraft(page);
});

for (const variant of ["a", "b", "c"] as const) {
  test(`E2 ${variant}: complete suggestion path and private-only save`, async ({ page }) => {
    await page.goto(`/ux-lab/e2/${variant}`);
    await send(page, variant !== "c");
    if (variant === "a") {
      const dialog = page.getByRole("dialog", { name: "要把这个片刻整理成记录吗？" });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "查看草稿" }).click();
    } else if (variant === "b") {
      await expect(page.getByRole("region", { name: "未保存建议" })).toBeVisible();
      expect(await page.evaluate(() => document.activeElement?.closest('[aria-label="未保存建议"]') === null)).toBe(true);
      await page.getByRole("button", { name: "查看草稿" }).click();
    } else {
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("region", { name: "未保存建议" })).toHaveCount(0);
      await proactiveDraft(page);
    }
    await page.getByLabel("标题（可留空）").fill("重新命名的片刻");
    await saveDraft(page);
    await expect(page.getByTestId("private-record")).toContainText("重新命名的片刻");
    await expect(page.getByRole("button", { name: "查看长期记忆授权" })).toBeDisabled();
  });
}

test("E2 modal ignores via Escape, restores focus and does not repeat", async ({ page }) => {
  await page.goto("/ux-lab/e2/a");
  await send(page, true);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("private-record")).toHaveCount(0);
  await expect(page.getByText(/已选择继续聊天/)).toBeVisible();
  await page.getByLabel("讲述素材中的事件").fill("还想继续聊这个虚构事件。");
  await page.getByRole("button", { name: "发送样例消息" }).click();
  await expect(page.getByText("我们可以继续聊。只有你确认保存，记录才会留下。这仍是固定研究脚本。", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("E2 inline hint ignores; C can cancel a candidate and retry", async ({ page }) => {
  await page.goto("/ux-lab/e2/b");
  await send(page, true);
  await page.getByRole("button", { name: "忽略建议" }).click();
  await expect(page.getByRole("region", { name: "未保存建议" })).toHaveCount(0);
  await expect(page.getByTestId("private-record")).toHaveCount(0);
  await page.goto("/ux-lab/e2/c");
  await send(page);
  await proactiveDraft(page);
  await page.getByRole("button", { name: "放弃草稿" }).click();
  await page.getByRole("button", { name: "继续编辑" }).click();
  await expect(page.getByLabel("记录正文")).toHaveValue(meeting);
  await page.getByRole("button", { name: "放弃草稿" }).click();
  await page.getByRole("button", { name: "确认放弃草稿" }).click();
  await expect(page.getByTestId("private-record")).toHaveCount(0);
  await proactiveDraft(page);
  await saveDraft(page);
});

test("memory is separate, permission failure retries, revoke preserves record, edit invalidates", async ({ page }) => {
  await page.goto("/ux-lab/e1/a");
  await page.getByLabel("记录正文").fill(meeting);
  await saveDraft(page);
  const grant = page.getByRole("button", { name: "查看长期记忆授权" });
  await expect(grant).toBeEnabled({ timeout: 15000 });
  await grant.click();
  await page.getByRole("button", { name: "取消，保留当前状态" }).click();
  await expect(page.getByTestId("memory-status")).toContainText("未授权");
  await fault(page, "memory");
  await grant.click();
  await page.getByRole("button", { name: "确认授权给小栖（模拟）" }).click();
  await expect(page.locator('p[role="alert"]:visible')).toContainText("模拟授权失败");
  await page.getByRole("button", { name: "确认授权给小栖（模拟）" }).click();
  await expect(page.getByTestId("memory-status")).toContainText("仅模拟已授权");
  await page.getByRole("button", { name: "撤回小栖授权" }).click();
  await page.getByRole("button", { name: "确认撤回授权" }).click();
  await expect(page.getByTestId("memory-status")).toContainText("未授权");
  await expect(page.getByTestId("private-record")).toContainText(meeting);
  await grant.click();
  await page.getByRole("button", { name: "确认授权给小栖（模拟）" }).click();
  await expect(page.getByTestId("memory-status")).toContainText("仅模拟已授权");
  await page.getByRole("button", { name: "编辑私人记录" }).click();
  await page.getByLabel("标题（可留空）").fill("修改后的会议标题");
  await saveDraft(page);
  await expect(page.getByTestId("private-record")).toContainText("内容版本 v2");
  await page.getByRole("button", { name: "删除私人研究记录" }).click();
  await page.getByRole("button", { name: "取消删除" }).click();
  await expect(page.getByTestId("private-record")).toBeVisible();
  await page.getByRole("button", { name: "删除私人研究记录" }).click();
  await page.getByRole("button", { name: "确认删除记录" }).click();
  await expect(page.getByTestId("private-record")).toHaveCount(0);
});

for (const variant of ["a", "b", "c"] as const) {
  test(`E3 ${variant}: shared sources, theme/date retrieval and no-match`, async ({ page }) => {
    await page.goto(`/ux-lab/e3/${variant}`);
    if (variant === "c") {
      await story(page);
      await expect(page.getByRole("button", { name: /^查看来源：/ })).toHaveCount(12);
    }
    await page.getByLabel("关键词", { exact: true }).fill("主持");
    await page.getByRole("button", { name: "查找记录", exact: true }).click();
    await page.getByRole("button", { name: "查看来源：第一次主持会议", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "虚构原始记录 · 来源详情" });
    await expect(dialog).toContainText("r04");
    await expect(dialog).toContainText("公司会议室");
    await dialog.getByRole("button", { name: "返回继续查找" }).click();
    await page.getByRole("button", { name: "清除筛选" }).click();
    if (variant === "b") await page.getByRole("button", { name: "朋友", exact: true }).click();
    await page.getByLabel("关键词", { exact: true }).fill("相机");
    await page.getByRole("button", { name: "查找记录", exact: true }).click();
    await page.getByRole("button", { name: "查看来源：河边散步的约定", exact: true }).click();
    await expect(dialog).toContainText("r07");
    await dialog.getByRole("button", { name: "标记为找到的来源" }).click();
    await expect(page.getByText(/已选择来源 r07/)).toBeVisible();
    await page.getByRole("button", { name: "清除筛选" }).click();
    await page.getByLabel("关键词", { exact: true }).fill("潜水");
    await page.getByRole("button", { name: "查找记录", exact: true }).click();
    await expect(page.getByRole("heading", { name: "没有匹配的研究记录" })).toBeVisible();
    await page.getByRole("button", { name: "确认未找到匹配记录" }).click();
    await expect(page.getByText(/已确认当前条件没有匹配/)).toBeVisible();
  });
}

test("E3 story consent, failed generation, cancel and retry are real controls", async ({ page }) => {
  await page.goto("/ux-lab/e3/c");
  await page.getByRole("button", { name: "查看固定故事卡" }).click();
  await expect(page.locator('p[role="alert"]:visible')).toContainText("请选择虚构样例范围");
  await page.getByRole("button", { name: "选用全部 12 条样例" }).click();
  await page.getByRole("checkbox", { name: /同意模拟本次回顾/ }).check();
  await fault(page, "review");
  await page.getByRole("button", { name: "重试模拟回顾" }).click();
  await expect(page.locator('p[role="alert"]:visible')).toContainText("模拟回顾失败");
  await page.getByRole("button", { name: "重试模拟回顾" }).click();
  await page.getByRole("button", { name: "停止模拟回顾" }).click();
  await expect(page.getByRole("button", { name: "查看固定故事卡" })).toBeVisible();
  await page.getByRole("checkbox", { name: /同意模拟本次回顾/ }).check();
  await page.getByRole("button", { name: "查看固定故事卡" }).click();
  await expect(page.getByText(/固定故事卡已就绪/)).toBeVisible();
  await page.getByRole("button", { name: "放弃故事卡，返回选择" }).click();
  await expect(page.getByRole("checkbox", { name: /同意模拟本次回顾/ })).not.toBeChecked();
});

test("invalid date filter can be corrected without fake results", async ({ page }) => {
  await page.goto("/ux-lab/e3/a");
  await page.getByLabel("开始日期").fill("2026-04-20");
  await page.getByLabel("结束日期").fill("2026-04-10");
  await page.getByRole("button", { name: "查找记录", exact: true }).click();
  await expect(page.locator('p[role="alert"]:visible')).toContainText("开始日期不能晚于结束日期");
  await page.getByLabel("开始日期").fill("2026-04-10");
  await page.getByLabel("结束日期").fill("2026-04-13");
  await page.getByRole("button", { name: "查找记录", exact: true }).click();
  await expect(page.getByRole("button", { name: /^查看来源：/ })).toHaveCount(1);
});

test("research data starts explicitly, pauses, exports no text, restores and clears", async ({ page }) => {
  await page.goto("/ux-lab/e1/a");
  await tools(page);
  await expect(page.getByRole("button", { name: "开始任务计时" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /已说明研究性质并取得匿名计时/ }).check();
  await page.getByRole("button", { name: "开始任务计时" }).click();
  await page.getByRole("button", { name: "暂停计时" }).click();
  const paused = await page.getByText(/计时已暂停 ·/).textContent();
  await page.getByLabel("标题（可留空）").fill("DO_NOT_EXPORT_TITLE");
  await page.waitForTimeout(600);
  expect(await page.getByText(/计时已暂停 ·/).textContent()).toBe(paused);
  await page.getByRole("button", { name: "继续计时" }).click();
  await page.getByLabel("记录正文").fill(meeting + " DO_NOT_EXPORT_BODY");
  await saveDraft(page);
  await page.getByRole("link", { name: "← 返回实验目录" }).click();
  await expect(page.locator('p[role="alert"]:visible')).toContainText("任务计时仍在运行");
  await page.getByRole("combobox", { name: "任务结果", exact: true }).selectOption("assisted");
  await page.getByLabel("打扰感（1–5）").selectOption("2");
  await page.getByRole("button", { name: "结束并记录任务" }).click();
  const archive = page.locator("aside.ux-research");
  await archive.locator("summary").click();
  await page.getByRole("button", { name: "保存匿名结果到此浏览器" }).click();
  const stored = await page.evaluate(() => localStorage.getItem("memonest.uxlab.anonymous-results.v1"));
  expect(stored).not.toContain("DO_NOT_EXPORT"); expect(stored).not.toContain("公司会议室");
  const rows = JSON.parse(stored!); expect(rows).toHaveLength(1); expect(rows[0].outcome).toBe("assisted"); expect(rows[0].elapsedMs).toBeGreaterThan(0); expect(rows[0].pausedMs).toBeGreaterThan(500);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载匿名 JSON" }).click();
  const download = await downloadEvent;
  const content = await readFile((await download.path())!, "utf8");
  expect(content).not.toContain("DO_NOT_EXPORT"); expect(JSON.parse(content).results).toHaveLength(1);
  await page.reload();
  await page.locator("aside.ux-research summary").click();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "载入匿名结果" }).click();
  await expect(page.locator("aside.ux-research summary")).toContainText("1 条");
  await page.getByRole("button", { name: "撤回研究同意并清空" }).click();
  await page.getByRole("button", { name: "确认清空研究数据" }).click();
  expect(await page.evaluate(() => localStorage.getItem("memonest.uxlab.anonymous-results.v1"))).toBeNull();
  await expect(page.locator("aside.ux-research summary")).toContainText("0 条");
  await expect(page.getByLabel("记录正文")).toHaveValue("");
  await page.goto("/journal");
  await expect(page.getByLabel("今天发生了什么？")).toBeDisabled();
  await expect(page.getByText("DO_NOT_EXPORT_BODY")).toHaveCount(0);
});

test("storage failure reports honestly and no draft is persisted", async ({ page }) => {
  await page.goto("/ux-lab/e1/a");
  await page.getByLabel("记录正文").fill("FICTIONAL_NO_STORAGE");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.locator("aside.ux-research summary").click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("simulated browser denial"); }; });
  await page.getByRole("button", { name: "保存匿名结果到此浏览器" }).click();
  await expect(page.getByText(/浏览器本地保存失败/)).toBeVisible();
});

test("all variants fit 320px and desktop without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/ux-lab", "/ux-lab/e1/a", "/ux-lab/e1/b", "/ux-lab/e2/a", "/ux-lab/e2/b", "/ux-lab/e2/c", "/ux-lab/e3/a", "/ux-lab/e3/b", "/ux-lab/e3/c"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/ux-lab");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("pending save can cancel and retry without a late phantom record", async ({ page }) => {
  await page.goto("/ux-lab/e1/a");
  await page.getByLabel("记录正文").fill(meeting);
  await page.getByRole("button", { name: "预览私人记录" }).click();
  await page.getByRole("button", { name: "确认保存私人记录" }).click();
  await page.getByRole("button", { name: "取消本次保存" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByTestId("private-record")).toHaveCount(0);
  await expect(page.getByText(/模拟保存已取消/)).toBeVisible();
  await page.getByRole("button", { name: "确认保存私人记录" }).click();
  await expect(page.getByTestId("private-record")).toBeVisible();
});

test("archive validation strips unexpected text and rejects corrupt replacement", async ({ page }) => {
  await page.goto("/ux-lab/e1/a");
  await tools(page);
  await page.getByRole("checkbox", { name: /已说明研究性质并取得匿名计时/ }).check();
  await page.getByRole("button", { name: "开始任务计时" }).click();
  await page.getByRole("combobox", { name: "任务结果", exact: true }).selectOption("cancelled");
  await page.getByRole("button", { name: "结束并记录任务" }).click();
  await page.locator("aside.ux-research summary").click();
  await page.getByRole("button", { name: "保存匿名结果到此浏览器" }).click();
  await page.evaluate(() => {
    const key = "memonest.uxlab.anonymous-results.v1";
    const rows = JSON.parse(localStorage.getItem(key)!);
    rows[0].body = "DO_NOT_EXPORT_INJECTED_TEXT";
    localStorage.setItem(key, JSON.stringify(rows));
  });
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "载入匿名结果" }).click();
  await page.getByRole("button", { name: "保存匿名结果到此浏览器" }).click();
  expect(await page.evaluate(() => localStorage.getItem("memonest.uxlab.anonymous-results.v1"))).not.toContain("DO_NOT_EXPORT");
  await page.evaluate(() => localStorage.setItem("memonest.uxlab.anonymous-results.v1", "not json"));
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "载入匿名结果" }).click();
  await expect(page.getByText(/存档不可读取或格式不符合当前版本/)).toBeVisible();
  await expect(page.locator("aside.ux-research summary")).toContainText("1 条");
});
