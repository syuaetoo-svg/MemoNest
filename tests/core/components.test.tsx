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
  const { render, fireEvent, waitFor, cleanup, act } =
    await import("@testing-library/react");
  const { EntryEditor, JournalTimeline } = await import("../../src/components/core/journal");
  const { MemoryPermission } =
    await import("../../src/components/core/memories");
  const { SessionBoundary } =
    await import("../../src/components/core/session-boundary");
  const { IdentityContext } = await import("../../src/lib/core/client");
  const { JournalReview } = await import("../../src/components/core/journal-review");
  const { ConfirmEmail } = await import("../../src/components/core/account");
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
    await t.test("PKCE confirmation waits for an explicit click and does not claim success on failure", async () => {
      let calls = 0;
      globalThis.fetch = async (url, options) => {
        calls++;
        assert.equal(url, "/api/auth/confirm");
        assert.equal(options?.method, "POST");
        assert.deepEqual(JSON.parse(options?.body as string), { code: "synthetic-pkce-code" });
        return Response.json({ error: { code: "CONFIRM_FAILED", message: "synthetic confirmation failure" } }, { status: 400 });
      };
      const view = render(<ConfirmEmail tokenHash="" code="synthetic-pkce-code"/>);
      assert.equal(calls, 0);
      fireEvent.click(view.getByRole("button", { name: /^Confirm email$/ }));
      await waitFor(()=>assert.ok(view.getByRole("alert")));
      assert.equal(calls, 1);
      assert.equal((view.getByRole("button", { name: /^Confirm email$/ }) as HTMLButtonElement).disabled, false);
      cleanup();
    });
    await t.test("real overview presentation refreshes saved entries without changing source permissions", async () => {
      let reads = 0;
      globalThis.fetch = async () => Response.json({ entries: ++reads === 1 ? [] : [{ ...entry, title: "newly saved synthetic entry" }], nextCursor: null });
      const view = render(<IdentityContext value={userId}><JournalTimeline presentation="overview"/></IdentityContext>);
      await waitFor(()=>assert.ok(view.getByText("No saved moments yet")));
      await act(async()=>{ window.dispatchEvent(new dom.window.Event("memonest:entries-changed")); });
      await waitFor(()=>assert.ok(view.getByText("newly saved synthetic entry")));
      assert.equal(reads, 2);
      fireEvent.click(view.getByRole("button", { name: "Grid view" }));
      assert.equal(view.getByRole("button", { name: "Grid view" }).getAttribute("aria-pressed"), "true");
      assert.ok(view.getByText("Saved"));
      cleanup();
    });
    await t.test("AI review requires separate consent, reports failure and discards cancelled late output", async () => {
      let calls = 0;
      let complete!: (response: Response) => void;
      const pending = new Promise<Response>((resolve) => { complete = resolve; });
      globalThis.fetch = async (_url, options) => {
        calls++;
        const input = JSON.parse(options?.body as string);
        assert.deepEqual(input, { entryId: entry.id, expectedVersion: 1, processingConsent: true });
        assert.equal(new Headers(options?.headers).get("X-MemoNest-User"), userId);
        if (calls === 1) return Response.json({ error: { code: "AI_NOT_CONFIGURED", message: "AI 回顾尚未配置" } }, { status: 503 });
        return pending;
      };
      const view = render(<IdentityContext value={userId}><JournalReview entry={entry} /></IdentityContext>);
      const consent = view.getByRole("checkbox") as HTMLInputElement;
      assert.equal(consent.checked, false);
      assert.equal((view.getByRole("button", { name: "Create reflection" }) as HTMLButtonElement).disabled, true);
      assert.equal(calls, 0);
      fireEvent.click(consent);
      fireEvent.click(view.getByRole("button", { name: "Create reflection" }));
      await waitFor(() => assert.ok(view.getByText("AI is not connected yet. You can still write and save entries yourself.")));
      assert.equal(consent.checked, false);
      fireEvent.click(consent);
      fireEvent.click(view.getByRole("button", { name: "Create reflection" }));
      fireEvent.click(view.getByRole("button", { name: "Stop reflection" }));
      await act(async () => {
        complete(Response.json({ moments: [{ text: "late result must not appear", quote: entry.body }],
          source: { id: entry.id, version: 1, title: "", eventDate: entry.event_date } }));
        await pending;
      });
      assert.equal(view.queryByText("late result must not appear"), null);
      assert.equal(consent.checked, false);
      assert.equal(dom.window.localStorage.length, 0);
      assert.equal(entry.body, "fictional source");
      cleanup();
    });
    for (const failure of [false, true]) {
      await t.test(
        `keyword search ignores an old pagination ${failure ? "failure" : "success"}`,
        async () => {
          let complete!: (response: Response) => void;
          const pending = new Promise<Response>((resolve) => { complete = resolve; });
          globalThis.fetch = async (url) => {
            const path = String(url);
            if (path.includes("cursor=")) return pending;
            const filtered = path.includes("q=walk");
            return Response.json({
              entries: [{ ...entry, title: filtered ? "walk result" : "initial result" }],
              nextCursor: filtered ? "new-cursor" : "old-cursor",
            });
          };
          const view = render(<IdentityContext value={userId}><JournalTimeline /></IdentityContext>);
          await waitFor(() => assert.ok(view.getByText("initial result")));
          fireEvent.click(view.getByRole("button", { name: "Load earlier entries" }));
          assert.ok(view.getByRole("button", { name: "Loading…" }));
          fireEvent.change(view.getByRole("textbox", { name: "Keywords" }), { target: { value: "walk" } });
          fireEvent.click(view.getByRole("button", { name: "Search" }));
          await waitFor(() => assert.ok(view.getByText("walk result")));
          assert.equal((view.getByRole("button", { name: "Load earlier entries" }) as HTMLButtonElement).disabled, false);
          await act(async () => {
            complete(failure
              ? Response.json({ error: { code: "SERVICE_ERROR", message: "stale pagination error" } }, { status: 503 })
              : Response.json({ entries: [{ ...entry, id: randomUUID(), title: "stale pagination result" }], nextCursor: null }));
            await pending;
          });
          assert.equal(view.queryByText("stale pagination result"), null);
          assert.equal(view.queryByText("stale pagination error"), null);
          assert.ok(view.getByRole("button", { name: "Load earlier entries" }));
          cleanup();
        },
      );
    }
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
            (view.getByLabelText("Date of your moment") as HTMLInputElement).value,
            "",
          ),
        );
        fireEvent.change(view.getByLabelText("What happened? (required)"), {
          target: { value: "FICTIONAL_COMPONENT_DRAFT" },
        });
        fireEvent.submit(view.container.querySelector("form")!);
        fireEvent.click(
          view.getByRole("button", { name: "Save privately" }),
        );
        await waitFor(() => assert.ok(view.getByText("Connection lost. Keep this page open and try again; the action is not confirmed.")));
        fireEvent.click(view.getByRole("button", { name: "Back to editing" }));
        assert.equal(
          (
            view.getByLabelText(
              "What happened? (required)",
            ) as HTMLTextAreaElement
          ).value,
          "FICTIONAL_COMPONENT_DRAFT",
        );
        fireEvent.submit(view.container.querySelector("form")!);
        fireEvent.click(
          view.getByRole("button", { name: "Save privately" }),
        );
        await waitFor(() =>
          assert.ok(view.getByText("Saved privately. Not shared with Xiaoqi.")),
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
                name: "Share a memory",
              }) as HTMLButtonElement
            ).disabled,
            false,
          ),
        );
        assert.equal(grantAttempts, 0);
        fireEvent.click(view.getByRole("button", { name: "Share a memory" }));
        assert.equal(
          (view.getByRole("checkbox") as HTMLInputElement).checked,
          false,
        );
        fireEvent.change(
          view.getByLabelText("Exact summary to share (up to 1,200 characters)"),
          { target: { value: "exact authorized summary" } },
        );
        fireEvent.click(view.getByRole("button", { name: "Share this summary" }));
        assert.equal(grantAttempts, 0);
        assert.ok(view.getByText("Enter the exact summary and check the consent box before sharing."));
        fireEvent.click(view.getByRole("checkbox"));
        fireEvent.click(view.getByRole("button", { name: "Share this summary" }));
        await waitFor(() => assert.ok(view.getByText("Your journal is temporarily unavailable. Keep your draft and try again.")));
        assert.equal(
          (
            view.getByLabelText(
              "Exact summary to share (up to 1,200 characters)",
            ) as HTMLTextAreaElement
          ).value,
          "exact authorized summary",
        );
        fireEvent.click(view.getByRole("button", { name: "Share this summary" }));
        await waitFor(() =>
          assert.ok(view.getByText("Shared with Xiaoqi only · Source version 1")),
        );
        assert.equal(grantKeys[0], grantKeys[1]);
        fireEvent.click(view.getByRole("button", { name: "Revoke access" }));
        fireEvent.click(view.getByRole("button", { name: "Cancel" }));
        assert.equal(revokeAttempts, 0);
        fireEvent.click(view.getByRole("button", { name: "Revoke access" }));
        fireEvent.click(view.getByRole("button", { name: "Confirm revoke" }));
        await waitFor(() =>
          assert.ok(
            view.getByText(
              "Permission withdrawn. Your entry is kept; this summary is excluded from future requests.",
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
        await waitFor(() => assert.ok(view.getByText("Your session has changed")));
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
