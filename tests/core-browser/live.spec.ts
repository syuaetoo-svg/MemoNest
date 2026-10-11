import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
const origin = "http://127.0.0.1:3101";
function account() {
  return {
    email: `memonest-${randomUUID()}@example.test`,
    password: `Test-${randomUUID()}-9!`,
  };
}
async function signup(page: Page, credentials: ReturnType<typeof account>) {
  await page.goto("/account");
  await page.getByRole("button", { name: "注册", exact: true }).click();
  await page.getByLabel("邮箱", { exact: true }).fill(credentials.email);
  await page.getByLabel("密码（至少 8 位）").fill(credentials.password);
  await page.getByRole("button", { name: "注册账号", exact: true }).click();
  await expect(page).toHaveURL(/\/journal$/);
  const r = await page.request.get("/api/auth/session");
  expect(r.status()).toBe(200);
  return (await r.json()).userId as string;
}
async function login(page: Page, c: ReturnType<typeof account>) {
  await page.goto("/account");
  await page.getByLabel("邮箱", { exact: true }).fill(c.email);
  await page.getByLabel("密码（至少 8 位）").fill(c.password);
  await page.getByRole("button", { name: "登录小屋" }).click();
  await expect(page).toHaveURL(/\/journal$/);
}
async function logout(page: Page) {
  await page.goto("/account");
  await page.getByRole("button", { name: "退出所有会话" }).click();
  await expect(page.getByRole("button", { name: "登录小屋" })).toBeVisible();
}
function headers(userId: string) {
  return { Origin: origin, "X-MemoNest-User": userId };
}
async function context(request: APIRequestContext) {
  const r = await request.get("/api/memories/context");
  expect(r.status()).toBe(200);
  return (await r.json()).memories as { id: string }[];
}

test("real registration/login, persistent CRUD, explicit memory grant/edit/revoke and A/B isolation", async ({
  page,
  browser,
}) => {
  const a = account(),
    b = account();
  const aId = await signup(page, a);
  await page
    .getByLabel("给这个片刻起个名字（可留空）")
    .fill("虚构测试：第一次主持会议");
  await page.getByLabel("事情发生的日期").fill("2026-04-12");
  await page
    .getByLabel("今天发生了什么？（必填）")
    .fill("虚构测试材料：主持了一次会议。不是参与者反馈。");
  await page.getByRole("button", { name: "预览私人记录" }).click();
  await page.getByRole("button", { name: "确认保存为私人记录" }).click();
  await expect(
    page.getByText("已保存给你自己，尚未授权角色使用", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "查看记录详情" }).click();
  const id = page.url().split("/").at(-1)!;
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "虚构测试：第一次主持会议",
      exact: true,
    }),
  ).toBeVisible();
  expect(await context(page.request)).toHaveLength(0);
  const cookies = await page.context().cookies();
  expect(
    cookies.filter((c) => c.name.startsWith("sb-")).every((c) => c.httpOnly),
  ).toBe(true);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  const secondary = await browser.newContext();
  const bPage = await secondary.newPage();
  const bId = await signup(bPage, b);
  await bPage.goto(`/journal/${id}`);
  await expect(
    bPage.getByText("内容不存在或你无权访问", { exact: true }),
  ).toBeVisible();
  const read = await bPage.request.get(`/api/journal-entries/${id}`);
  expect(read.status()).toBe(404);
  const patch = await bPage.request.patch(`/api/journal-entries/${id}`, {
    headers: headers(bId),
    data: {
      title: "intrusion",
      body: "intrusion",
      eventDate: "2026-04-12",
      expectedVersion: 1,
    },
  });
  expect(patch.status()).toBe(404);
  const del = await bPage.request.delete(`/api/journal-entries/${id}`, {
    headers: headers(bId),
    data: { expectedVersion: 1 },
  });
  expect(del.status()).toBe(404);
  const grant = await bPage.request.post("/api/memories", {
    headers: headers(bId),
    data: {
      entryId: id,
      sourceVersion: 1,
      summary: "intrusion",
      confirmed: true,
      requestId: randomUUID(),
    },
  });
  expect(grant.status()).toBe(404);
  await expect(
    page.getByRole("button", { name: "让小栖记住这条" }),
  ).toBeEnabled({ timeout: 15000 });
  await page.getByRole("button", { name: "让小栖记住这条" }).click();
  await page
    .getByLabel("你允许使用的确切摘要（最多 1200 字）")
    .fill("虚构研究摘要：主持会议。");
  await page.getByRole("button", { name: "确认授权这条摘要" }).click();
  await expect(page.locator("dialog[open] p[role=alert]")).toContainText(
    "主动勾选",
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "确认授权这条摘要" }).click();
  await expect(
    page.getByText("已授权 · 仅限小栖", { exact: false }),
  ).toBeVisible();
  const memories = await context(page.request);
  expect(memories).toHaveLength(1);
  const revokeOther = await bPage.request.post(
    `/api/memories/${memories[0].id}/revoke`,
    { headers: headers(bId), data: {} },
  );
  expect(revokeOther.status()).toBe(404);
  expect(await context(bPage.request)).toHaveLength(0);
  await page.getByRole("button", { name: "编辑授权摘要" }).click();
  await page
    .getByLabel("你允许使用的确切摘要（最多 1200 字）")
    .fill("虚构研究摘要：会议已经结束。");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "确认新摘要并重新授权" }).click();
  await expect(
    page.getByText("新摘要已单独确认；旧授权已撤回", { exact: true }),
  ).toBeVisible();
  const replacement = await context(page.request);
  expect(replacement).toHaveLength(1);
  expect(replacement[0].id).not.toBe(memories[0].id);
  await page.getByRole("button", { name: "撤回授权", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  expect(await context(page.request)).toHaveLength(1);
  await page.getByRole("button", { name: "撤回授权", exact: true }).click();
  await page.getByRole("button", { name: "确认撤回授权" }).click();
  await expect(
    page.getByText(
      "授权已撤回，私人记录仍保留；后续上下文不再允许使用这条摘要",
      { exact: true },
    ),
  ).toBeVisible();
  expect(await context(page.request)).toHaveLength(0);
  await page.getByRole("button", { name: "让小栖记住这条" }).click();
  await page
    .getByLabel("你允许使用的确切摘要（最多 1200 字）")
    .fill("另一次明确授权。");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "确认授权这条摘要" }).click();
  await expect(
    page.getByRole("button", { name: "编辑授权摘要" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "编辑记录", exact: true }).click();
  await page
    .getByLabel("今天发生了什么？（必填）")
    .fill("虚构测试材料：修改后的私人记录。");
  await page.getByRole("button", { name: "预览私人记录" }).click();
  await page.getByRole("button", { name: "确认保存修改" }).click();
  await expect(
    page.getByText("修改已保存，旧角色授权已失效", { exact: true }),
  ).toBeVisible();
  expect(await context(page.request)).toHaveLength(0);
  await page.reload();
  await expect(
    page.getByText("虚构测试材料：修改后的私人记录。", { exact: true }),
  ).toBeVisible();
  const mismatch = await page.request.patch(`/api/journal-entries/${id}`, {
    headers: headers(bId),
    data: {
      title: "x",
      body: "x",
      eventDate: "2026-04-12",
      expectedVersion: 2,
    },
  });
  expect(mismatch.status()).toBe(409);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "删除记录", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.getByText("虚构测试材料：修改后的私人记录。", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "删除记录", exact: true }).click();
  await page.getByRole("button", { name: "确认删除记录" }).click();
  await expect(page).toHaveURL(/\/memories$/);
  await expect(
    page.getByRole("heading", { name: "还没有保存的生活记录" }),
  ).toBeVisible();
  expect((await page.request.get(`/api/journal-entries/${id}`)).status()).toBe(
    404,
  );
  await logout(page);
  expect((await page.request.get("/api/journal-entries")).status()).toBe(401);
  await login(page, a);
  await logout(page);
  await logout(bPage);
  await secondary.close();
  expect(aId).not.toBe(bId);
});

test("real unauthenticated API and invalid login rejected without data", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/journal-entries")).status()).toBe(401);
  expect((await request.get("/api/memories/context")).status()).toBe(401);
  const denied = await request.post("/api/journal-entries", {
    headers: { Origin: origin },
    data: {},
  });
  expect(denied.status()).toBe(401);
  await page.goto("/account");
  await page
    .getByLabel("邮箱", { exact: true })
    .fill(`missing-${randomUUID()}@example.test`);
  await page.getByLabel("密码（至少 8 位）").fill("Incorrect-password-9!");
  await page.getByRole("button", { name: "登录小屋" }).click();
  await expect(
    page.getByText("登录失败，请检查邮箱、密码及邮箱确认状态，或稍后重试", {
      exact: true,
    }),
  ).toBeVisible();
});
