import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { randomUUID } from "node:crypto";

// Isolated component tests with explicit mock transport; not authentication/E2E.
test("core component recovery and separate permission controls", async (t) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [name, value] of Object.entries({
    self: dom.window,
    Element: dom.window.Element,
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLDialogElement: dom.window.HTMLDialogElement,
    Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  }
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  const originalFetch = globalThis.fetch;
  const { render, fireEvent, waitFor, cleanup } =
    await import("@testing-library/react");
  const { EntryEditor } = await import("../../src/components/core/journal");
  const { MemoryPermission } =
    await import("../../src/components/core/memories");
  const { SessionBoundary } =
    await import("../../src/components/core/session-boundary");
  const { IdentityContext } = await import("../../src/lib/core/client");
  const userId = randomUUID(),
    id = randomUUID();
  const entry = {
    id,
    title: "",
    body: "fictional source",
    event_date: "2026-04-12",
    version: 1,
    undo_until: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
  try {
    await t.test(
      "failed save retains editable draft and retries the same request ID",
      async () => {
        const requests: Record<string, unknown>[] = [];
        globalThis.fetch = async (_url, options) => {
          assert.equal(
            new Headers(options?.headers).get("X-MemoNest-User"),
            userId,
          );
          const input = JSON.parse(options?.body as string);
          requests.push(input);
          return requests.length === 1
            ? new Response(
                JSON.stringify({
                  error: {
                    code: "NETWORK_ERROR",
                    message: "未确认保存，请重试",
                  },
                }),
                { status: 503 },
              )
            : new Response(
                JSON.stringify({ entry: { ...entry, body: input.body } }),
                { status: 201 },
              );
        };
        const view = render(
          <IdentityContext value={userId}>
            <EntryEditor />
          </IdentityContext>,
        );
        await waitFor(() =>
          assert.notEqual(
            (view.getByLabelText("事情发生的日期") as HTMLInputElement).value,
            "",
          ),
        );
        fireEvent.change(view.getByLabelText("今天发生了什么？（必填）"), {
          target: { value: "FICTIONAL_COMPONENT_DRAFT" },
        });
        fireEvent.submit(view.container.querySelector("form")!);
        fireEvent.click(
          view.getByRole("button", { name: "确认保存为私人记录" }),
        );
        await waitFor(() => assert.ok(view.getByText("未确认保存，请重试")));
        fireEvent.click(view.getByRole("button", { name: "返回编辑" }));
        assert.equal(
          (
            view.getByLabelText(
              "今天发生了什么？（必填）",
            ) as HTMLTextAreaElement
          ).value,
          "FICTIONAL_COMPONENT_DRAFT",
        );
        fireEvent.submit(view.container.querySelector("form")!);
        fireEvent.click(
          view.getByRole("button", { name: "确认保存为私人记录" }),
        );
        await waitFor(() =>
          assert.ok(view.getByText("已保存给你自己，尚未授权角色使用")),
        );
        assert.equal(requests.length, 2);
        assert.equal(requests[0].requestId, requests[1].requestId);
        assert.equal(dom.window.localStorage.length, 0);
        cleanup();
      },
    );
    await t.test(
      "private record has no default grant; explicit confirmation, retry and revoke preserve source",
      async () => {
        let active = false;
        let grantAttempts = 0;
        let revokeAttempts = 0;
        const grantKeys: string[] = [];
        globalThis.fetch = async (url, options) => {
          const path = String(url);
          if (!options?.method || options.method === "GET")
            return Response.json({
              memories: active
                ? [
                    {
                      ...entry,
                      id: "22222222-2222-4222-8222-222222222222",
                      journal_entry_id: id,
                      source_version: 1,
                      summary: "exact authorized summary",
                      status: "active",
                    },
                  ]
                : [],
            });
          assert.equal(
            new Headers(options.headers).get("X-MemoNest-User"),
            userId,
          );
          if (path.endsWith("/revoke")) {
            revokeAttempts++;
            active = false;
            return Response.json({ revoked: true });
          }
          const input = JSON.parse(options.body as string);
          assert.equal(input.confirmed, true);
          grantKeys.push(input.requestId);
          grantAttempts++;
          if (grantAttempts === 1)
            return Response.json(
              {
                error: {
                  code: "DATABASE_UNAVAILABLE",
                  message: "授权未确认，请重试",
                },
              },
              { status: 503 },
            );
          active = true;
          return Response.json({
            memory: { id: "22222222-2222-4222-8222-222222222222" },
          });
        };
        const view = render(
          <IdentityContext value={userId}>
            <MemoryPermission entry={entry} />
          </IdentityContext>,
        );
        await waitFor(() =>
          assert.equal(
            (
              view.getByRole("button", {
                name: "让小栖记住这条",
              }) as HTMLButtonElement
            ).disabled,
            false,
          ),
        );
        assert.equal(grantAttempts, 0);
        fireEvent.click(view.getByRole("button", { name: "让小栖记住这条" }));
        assert.equal(
          (view.getByRole("checkbox") as HTMLInputElement).checked,
          false,
        );
        fireEvent.change(
          view.getByLabelText("你允许使用的确切摘要（最多 1200 字）"),
          { target: { value: "exact authorized summary" } },
        );
        fireEvent.click(view.getByRole("button", { name: "确认授权这条摘要" }));
        assert.equal(grantAttempts, 0);
        assert.ok(view.getByText("请填写要授权的确切摘要，并主动勾选确认范围"));
        fireEvent.click(view.getByRole("checkbox"));
        fireEvent.click(view.getByRole("button", { name: "确认授权这条摘要" }));
        await waitFor(() => assert.ok(view.getByText("授权未确认，请重试")));
        assert.equal(
          (
            view.getByLabelText(
              "你允许使用的确切摘要（最多 1200 字）",
            ) as HTMLTextAreaElement
          ).value,
          "exact authorized summary",
        );
        fireEvent.click(view.getByRole("button", { name: "确认授权这条摘要" }));
        await waitFor(() =>
          assert.ok(view.getByText("已授权 · 仅限小栖 · 来源版本 1")),
        );
        assert.equal(grantKeys[0], grantKeys[1]);
        fireEvent.click(view.getByRole("button", { name: "撤回授权" }));
        fireEvent.click(view.getByRole("button", { name: "取消" }));
        assert.equal(revokeAttempts, 0);
        fireEvent.click(view.getByRole("button", { name: "撤回授权" }));
        fireEvent.click(view.getByRole("button", { name: "确认撤回授权" }));
        await waitFor(() =>
          assert.ok(
            view.getByText(
              "授权已撤回，私人记录仍保留；后续上下文不再允许使用这条摘要",
            ),
          ),
        );
        assert.equal(revokeAttempts, 1);
        assert.equal(entry.body, "fictional source");
        assert.equal(dom.window.localStorage.length, 0);
        cleanup();
      },
    );
    await t.test(
      "session change unmounts private content and temporary inputs",
      async () => {
        globalThis.fetch = async () => Response.json({ userId: randomUUID() });
        const view = render(
          <SessionBoundary userId={userId}>
            <p>PRIVATE_COMPONENT_MARKER</p>
            <textarea defaultValue="PRIVATE_COMPONENT_DRAFT" />
          </SessionBoundary>,
        );
        assert.ok(view.getByText("PRIVATE_COMPONENT_MARKER"));
        fireEvent.focus(window);
        await waitFor(() => assert.ok(view.getByText("会话已变化")));
        assert.equal(view.queryByText("PRIVATE_COMPONENT_MARKER"), null);
        assert.equal(view.container.querySelector("textarea"), null);
        cleanup();
      },
    );
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
    dom.window.close();
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
