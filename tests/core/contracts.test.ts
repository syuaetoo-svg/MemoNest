import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createEntryInput,
  grantInput,
  editEntryInput,
} from "../../src/lib/core/contracts";
test("API inputs reject injected owners, invalid calendar dates and default consent", () => {
  const record = {
    title: "",
    body: "fictional",
    eventDate: "2026-04-12",
    requestId: randomUUID(),
  };
  assert.equal(createEntryInput.safeParse(record).success, true);
  assert.equal(
    createEntryInput.safeParse({ ...record, user_id: randomUUID() }).success,
    false,
  );
  assert.equal(
    createEntryInput.safeParse({ ...record, eventDate: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    createEntryInput.safeParse({ ...record, body: "  " }).success,
    false,
  );
  assert.equal(
    editEntryInput.safeParse({
      title: "",
      body: "x",
      eventDate: "2026-04-12",
      expectedVersion: 0,
    }).success,
    false,
  );
  const memory = {
    entryId: randomUUID(),
    sourceVersion: 1,
    summary: "exact preview",
    requestId: randomUUID(),
  };
  assert.equal(grantInput.safeParse(memory).success, false);
  assert.equal(
    grantInput.safeParse({ ...memory, confirmed: false }).success,
    false,
  );
  assert.equal(
    grantInput.safeParse({ ...memory, confirmed: true }).success,
    true,
  );
});
