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
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page.getByLabel("Password (at least 8 characters)").fill(credentials.password);
  await page.locator("form").getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/journal$/);
  const r = await page.request.get("/api/auth/session");
  expect(r.status()).toBe(200);
  return (await r.json()).userId as string;
}
async function login(page: Page, c: ReturnType<typeof account>) {
  await page.goto("/account");
  await page.getByLabel("Email", { exact: true }).fill(c.email);
  await page.getByLabel("Password (at least 8 characters)").fill(c.password);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/journal$/);
}
async function logout(page: Page) {
  await page.goto("/account");
  await page.getByRole("button", { name: "Sign out everywhere" }).click();
  await expect(page.locator("form").getByRole("button", { name: "Sign in" })).toBeVisible();
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
    .getByLabel("Title (optional)")
    .fill("虚构测试：第一次主持会议");
  await page.getByLabel("Date of your moment").fill("2026-04-12");
  await page
    .getByLabel("What happened? (required)")
    .fill("虚构测试材料：主持了一次会议。不是参与者反馈。");
  await page.getByRole("button", { name: "Preview entry" }).click();
  await page.getByRole("button", { name: "Save privately" }).click();
  await expect(
    page.getByText("Saved privately. Not shared with Xiaoqi.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View entry" }).click();
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
    bPage.getByText("This item is unavailable or you do not have access.", { exact: true }),
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
    page.getByRole("button", { name: "Share a memory" }),
  ).toBeEnabled({ timeout: 15000 });
  await page.getByRole("button", { name: "Share a memory" }).click();
  await page
    .getByLabel("Exact summary to share (up to 1,200 characters)")
    .fill("虚构研究摘要：主持会议。");
  await page.getByRole("button", { name: "Share this summary" }).click();
  await expect(page.locator("dialog[open] p[role=alert]")).toContainText(
    "check the consent box",
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Share this summary" }).click();
  await expect(
    page.getByText("Shared with Xiaoqi only", { exact: false }),
  ).toBeVisible();
  const memories = await context(page.request);
  expect(memories).toHaveLength(1);
  const revokeOther = await bPage.request.post(
    `/api/memories/${memories[0].id}/revoke`,
    { headers: headers(bId), data: {} },
  );
  expect(revokeOther.status()).toBe(404);
  expect(await context(bPage.request)).toHaveLength(0);
  await page.getByRole("button", { name: "Edit shared summary" }).click();
  await page
    .getByLabel("Exact summary to share (up to 1,200 characters)")
    .fill("虚构研究摘要：会议已经结束。");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm & share new summary" }).click();
  await expect(
    page.getByText("New summary confirmed. Previous permission withdrawn.", { exact: true }),
  ).toBeVisible();
  const replacement = await context(page.request);
  expect(replacement).toHaveLength(1);
  expect(replacement[0].id).not.toBe(memories[0].id);
  await page.getByRole("button", { name: "Revoke access", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await context(page.request)).toHaveLength(1);
  await page.getByRole("button", { name: "Revoke access", exact: true }).click();
  await page.getByRole("button", { name: "Confirm revoke" }).click();
  await expect(
    page.getByText(
      "Permission withdrawn. Your entry is kept; this summary is excluded from future requests.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(await context(page.request)).toHaveLength(0);
  await page.getByRole("button", { name: "Share a memory" }).click();
  await page
    .getByLabel("Exact summary to share (up to 1,200 characters)")
    .fill("另一次明确授权。");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Share this summary" }).click();
  await expect(
    page.getByRole("button", { name: "Edit shared summary" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit entry", exact: true }).click();
  await page
    .getByLabel("What happened? (required)")
    .fill("虚构测试材料：修改后的私人记录。");
  await page.getByRole("button", { name: "Preview entry" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Changes saved. Previous memory permissions are no longer active.", { exact: true }),
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
  await page.getByRole("button", { name: "Delete entry", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByText("虚构测试材料：修改后的私人记录。", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete entry", exact: true }).click();
  await page.getByRole("button", { name: "Delete entry" }).click();
  await expect(page).toHaveURL(/\/memories$/);
  await expect(
    page.getByRole("heading", { name: "No saved moments yet" }),
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
    .getByLabel("Email", { exact: true })
    .fill(`missing-${randomUUID()}@example.test`);
  await page.getByLabel("Password (at least 8 characters)").fill("Incorrect-password-9!");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByText("Couldn’t sign in. Check your details and email confirmation, then try again.", {
      exact: true,
    }),
  ).toBeVisible();
});
