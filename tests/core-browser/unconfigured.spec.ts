import { test, expect } from "@playwright/test";
test("missing services show honest guidance and preserve formal routes/UX lab", async ({
  page,
}) => {
  for (const path of ["/account", "/journal", "/memories", "/chat", "/review"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Service not connected" }),
    ).toBeVisible();
    await expect(
      page.getByText("Authentication and storage are not configured.", { exact: false }),
    ).toBeVisible();
    expect(await page.locator("input[type=password]").count()).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Your journal, your choice" })).toBeVisible();
  await page.goto("/ux-lab");
  await expect(page.getByRole("link", { name: /传统手动记录/ })).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "New entry" }),
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
    "/api/ai/chat",
    "/api/ai/draft",
    "/api/ai/review",
    "/api/ai/period-review",
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
