import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { randomUUID } from "node:crypto";

test("AI UI contracts with explicit mock transport (not live model acceptance)", async (t) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    self: dom.window,
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
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
  const { render, fireEvent, waitFor, cleanup, act } = await import(
    "@testing-library/react"
  );
  const { ChatWorkspace, ReviewWorkspace } = await import(
    "../../src/components/core/ai"
  );
  const { IdentityContext } = await import("../../src/lib/core/client");
  const userId = randomUUID();
  try {
    await t.test(
      "chat retries without duplicate turns; drafts exclude AI guesses and require a date before save",
      async () => {
        const sent: { path: string; data: Record<string, unknown> }[] = [];
        let attempts = 0;
        globalThis.fetch = async (url, options) => {
          assert.equal(
            new Headers(options?.headers).get("x-memonest-user"),
            userId,
          );
          const data = JSON.parse(options?.body as string);
          const path = String(url);
          sent.push({ path, data });
          if (path.endsWith("/chat")) {
            if (++attempts === 1)
              return Response.json(
                { error: { code: "AI_UNAVAILABLE", message: "模型暂不可用" } },
                { status: 503 },
              );
            return Response.json({
              reply: "验收测试：我听到了。",
              citations: [],
              sources: [],
            });
          }
          if (path.endsWith("/draft"))
            return Response.json({
              title: "公园",
              body: "我去了公园",
              note: "请确认日期",
              evidence: [{ sourceId: data.messages[0].id, quote: "公园" }],
            });
          throw new Error("Unexpected write: " + path);
        };
        const view = render(
          <IdentityContext value={userId}>
            <ChatWorkspace configured />
          </IdentityContext>,
        );
        assert.equal(view.container.querySelector('.companion-profile img')?.getAttribute('src'), '/brand/xiaoqi-playing.png');
        assert.equal(view.container.querySelector('.chat-surface .empty-state img')?.getAttribute('src'), '/brand/xiaoqi-reading.png');
        assert.equal(view.container.querySelectorAll('.character-ripple').length, 0);
        fireEvent.change(view.getByLabelText("A thought to share"), {
          target: { value: "我去了公园" },
        });
        assert(
          (view.getByRole("button", { name: "Send" }) as HTMLButtonElement)
            .disabled,
        );
        fireEvent.click(view.getByRole("checkbox"));
        fireEvent.click(view.getByRole("button", { name: "Send" }));
        await waitFor(() =>
          assert(view.getByRole("alert").textContent?.includes("AI is temporarily unavailable")),
        );
        assert.equal(
          (view.getByLabelText("A thought to share") as HTMLTextAreaElement).value,
          "我去了公园",
        );
        fireEvent.click(view.getByRole("button", { name: "Try sending again" }));
        await waitFor(() => assert(view.getByText("验收测试：我听到了。")));
        assert.equal(view.getAllByText("You", { exact: true }).length, 1);
        fireEvent.click(view.getByLabelText("Add to draft"));
        fireEvent.click(view.getByRole("button", { name: /Create draft/ }));
        await waitFor(() => assert(view.getByText("请确认日期")));
        const draft = sent.find((r) => r.path.endsWith("/draft"))!;
        const messages = draft.data.messages as { text: string }[];
        assert.deepEqual(
          messages.map((m) => m.text),
          ["我去了公园"],
        );
        assert.equal(
          (view.getByLabelText("Date of your moment") as HTMLInputElement).value,
          "",
        );
        assert(sent.every((r) => r.path.startsWith("/api/ai/")));
        cleanup();
      },
    );
    await t.test(
      "review consent resets when selected records change",
      async () => {
        const entry = (title: string) => ({
          id: randomUUID(),
          title,
          body: title,
          event_date: "2026-10-10",
          version: 1,
          created_at: "",
          updated_at: "",
          undo_until: "",
        });
        globalThis.fetch = async () =>
          Response.json({
            entries: [entry("散步"), entry("午饭")],
            nextCursor: null,
          });
        const view = render(
          <IdentityContext value={userId}>
            <ReviewWorkspace configured />
          </IdentityContext>,
        );
        await waitFor(() =>
          assert(view.getByText("散步", { selector: "span.font-medium" })),
        );
        fireEvent.click(view.getAllByRole("checkbox")[0]);
        fireEvent.click(view.getAllByRole("checkbox")[2]);
        assert(
          !(
            view.getByRole("button", {
              name: "Create reflection",
            }) as HTMLButtonElement
          ).disabled,
        );
        fireEvent.click(view.getAllByRole("checkbox")[1]);
        assert(
          (
            view.getByRole("button", {
              name: "Create reflection",
            }) as HTMLButtonElement
          ).disabled,
        );
        cleanup();
      },
    );
  } finally {
    cleanup();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    dom.window.close();
  }
});
