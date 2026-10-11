import { test, expect } from "@playwright/test";
test("missing services show honest guidance and preserve formal routes/UX lab", async ({
  page,
}) => {
  for (const path of ["/account", "/journal", "/memories"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "连接你的小屋之前" }),
    ).toBeVisible();
    await expect(
      page.getByText("真实认证与数据库尚未配置。", { exact: false }),
    ).toBeVisible();
    expect(await page.locator("input[type=password]").count()).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/chat");
  await expect(page.getByRole("button", { name: "发送消息" })).toBeDisabled();
  await page.goto("/ux-lab");
  await expect(page.getByRole("link", { name: /传统手动记录/ })).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "直接记录一个片刻" }),
  ).toBeVisible();
});
test("unconfigured API never pretends persistence/auth; cross-origin writes rejected", async ({
  request,
}) => {
  for (const path of [
    "/api/auth/session",
    "/api/journal-entries",
    "/api/memories",
    "/api/memories/context",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(503);
    expect((await response.json()).error.code).toBe("CONFIG_REQUIRED");
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  const rejected = await request.post("/api/journal-entries", {
    headers: { Origin: "https://other.invalid" },
    data: {},
  });
  expect(rejected.status()).toBe(403);
  for (const path of [
    "/api/auth/signup",
    "/api/auth/login",
    "/api/journal-entries",
  ]) {
    const response = await request.post(path, {
      headers: { Origin: "http://127.0.0.1:3101" },
      data: {},
    });
    expect(response.status()).toBe(503);
    expect((await response.json()).error.code).toBe("CONFIG_REQUIRED");
  }
});
