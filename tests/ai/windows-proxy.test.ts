import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveWindowsProxy } from "../../scripts/with-windows-proxy.mjs";

test("disabled Windows proxy retains the normal connection", () => {
  assert.equal(resolveWindowsProxy({ enabled: false, server: "untrusted.invalid:8080" }), null);
});

test("Windows proxy accepts local HTTP endpoints and prefers the HTTPS mapping", () => {
  assert.equal(resolveWindowsProxy({ enabled: true, server: "127.0.0.1:7890" }), "http://127.0.0.1:7890");
  assert.equal(resolveWindowsProxy({ enabled: true, server: "http=localhost:8080; https=127.0.0.1:7890" }), "http://127.0.0.1:7890");
  assert.equal(resolveWindowsProxy({ enabled: true, server: "[::1]:7890" }), "http://[::1]:7890");
});

test("unsafe proxy settings fail without exposing their values", () => {
  for (const server of ["", "socks=127.0.0.1:1080", "https://localhost:7890", "remote.invalid:8080",
    "http://private-user:private-password@localhost:7890", "http://localhost:7890/private-path",
    "http://localhost:7890?secret=private-value", "http://localhost:7890#private-value"]) {
    assert.throws(() => resolveWindowsProxy({ enabled: true, server }), (error: unknown) => {
      assert(error instanceof Error);
      assert(!error.message.includes(server) || server === "");
      assert(!error.message.includes("private-"));
      return true;
    });
  }
});
