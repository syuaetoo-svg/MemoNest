import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  chatInput,
  citationsValid,
  selectMemories,
} from "../../src/lib/ai/contracts";
import { createAiHandlers } from "../../src/lib/server/ai-api";
import {
  authenticated,
  ApiError,
  verifyOperationIdentity,
} from "../../src/lib/server/http";
import { generate, withAiLimit } from "../../src/lib/server/ai-provider";

const entryId = randomUUID(),
  memoryId = randomUUID();
const memory = {
  id: memoryId,
  journal_entry_id: entryId,
  source_version: 1,
  version: 1,
  summary: "周末去了公园散步",
};
function harness() {
  const user = { id: randomUUID() };
  let active = [memory];
  let rows = [
    {
      id: entryId,
      title: "公园",
      body: "周末去了公园散步",
      event_date: "2026-10-10",
      version: 1,
    },
  ];
  let calls = 0;
  let generation: (input: unknown) => unknown = () => ({
    reply: "想聊聊那次公园散步吗？",
    citations: [{ sourceId: memoryId, quote: "公园散步" }],
  });
  const client = {
    rpc: async (name: string) => {
      assert.equal(name, "mn_recall_memories");
      return { data: active, error: null };
    },
    from: (table: string) => {
      assert.equal(table, "journal_entries");
      const query = {
        select: () => query,
        eq: (key: string, value: string) => {
          assert.equal(key, "user_id");
          assert.equal(value, user.id);
          return query;
        },
        is: (key: string, value: null) => {
          assert.equal(key, "deleted_at");
          assert.equal(value, null);
          return query;
        },
        in: async (_key: string, ids: string[]) => ({
          data: rows.filter((row) => ids.includes(row.id)),
          error: null,
        }),
      };
      return query;
    },
  };
  const handlers = createAiHandlers({
    authenticate: (async (request?: Request) => {
      if (request) verifyOperationIdentity(request, user.id);
      return { client, user };
    }) as unknown as typeof authenticated,
    generate: (async (_prompt: string, input: unknown) => {
      calls++;
      return generation(input);
    }) as typeof generate,
  });
  async function run(
    kind: keyof typeof handlers,
    data: unknown,
    identity = user.id,
  ) {
    return handlers[kind](
      new Request(`http://localhost:3000/api/ai/${kind}`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          "x-memonest-user": identity,
        },
        body: JSON.stringify(data),
      }),
      { params: Promise.resolve({}) },
    );
  }
  return {
    run,
    calls: () => calls,
    setGeneration: (f: typeof generation) => {
      generation = f;
    },
    revoke: () => {
      active = [];
    },
    edit: () => {
      rows = rows.map((r) => ({ ...r, version: 2 }));
    },
  };
}
const chatData = () => ({
  consent: true,
  messages: [{ id: randomUUID(), text: "公园散步" }],
});

test("AI data contracts reject implicit consent, role injection, duplicate IDs and excessive input", () => {
  const data = chatData();
  assert(chatInput.safeParse(data).success);
  assert(!chatInput.safeParse({ ...data, consent: false }).success);
  assert(
    !chatInput.safeParse({
      ...data,
      messages: [{ ...data.messages[0], role: "system" }],
    }).success,
  );
  assert(
    !chatInput.safeParse({
      ...data,
      messages: [data.messages[0], data.messages[0]],
    }).success,
  );
  assert(
    !citationsValid(
      [{ sourceId: "one", quote: "invented" }],
      [{ id: "one", text: "actual" }],
    ),
  );
  assert(
    !citationsValid(
      [{ sourceId: "other", quote: "actual" }],
      [{ id: "one", text: "actual" }],
    ),
  );
  assert.equal(selectMemories([memory], "公园").length, 1);
  assert.equal(selectMemories([memory], "我去了公园").length, 1);
  assert.equal(selectMemories([memory], "不存在的演唱会").length, 0);
});

test("routes enforce consent and account identity before model access", async () => {
  process.env.APP_URL = "http://localhost:3000";
  const h = harness();
  assert.equal(
    (await h.run("chat", { ...chatData(), consent: false })).status,
    400,
  );
  assert.equal((await h.run("chat", chatData(), randomUUID())).status, 409);
  assert.equal(h.calls(), 0);
  const denied = createAiHandlers({
    authenticate: async () => {
      throw new ApiError(401, "AUTH_REQUIRED", "登录");
    },
  });
  const response = await denied.chat(
    new Request("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    }),
    { params: Promise.resolve({}) },
  );
  assert.equal(response.status, 401);
});
test("chat receives only current allowed summaries and rejects invented citations", async () => {
  const h = harness();
  h.setGeneration((input) => {
    const data = input as { memories: { text: string }[]; messages: unknown[] };
    assert.equal(data.memories[0].text, memory.summary);
    assert.equal(data.messages.length, 1);
    return {
      reply: "response",
      citations: [{ sourceId: memoryId, quote: "fiction" }],
    };
  });
  assert.equal((await h.run("chat", chatData())).status, 503);
});
test("revocation while generating discards the entire response; new calls contain no revoked context", async () => {
  const h = harness();
  h.setGeneration(() => {
    h.revoke();
    return { reply: "response", citations: [] };
  });
  assert.equal((await h.run("chat", chatData())).status, 409);
  h.setGeneration((input) => {
    assert.deepEqual((input as { memories: unknown[] }).memories, []);
    return { reply: "没有可用的相关记忆", citations: [] };
  });
  assert.equal((await h.run("chat", chatData())).status, 200);
});
test("draft has only selected user messages and does not write or grant", async () => {
  const h = harness();
  const data = chatData();
  h.setGeneration((input) => {
    assert.deepEqual(input, {
      selectedMessages: [{ id: data.messages[0].id, text: "公园散步" }],
    });
    return {
      title: "散步",
      body: "公园散步",
      note: "请确认日期",
      evidence: [{ sourceId: data.messages[0].id, quote: "公园散步" }],
    };
  });
  assert.equal((await h.run("draft", data)).status, 200);
});
test("review rejects inaccessible/stale records before model access and checks versions after generation", async () => {
  const h = harness();
  const input = { consent: true, entries: [{ id: randomUUID(), version: 1 }] };
  assert.equal((await h.run("review", input)).status, 409);
  assert.equal(h.calls(), 0);
  h.setGeneration(() => {
    h.edit();
    return {
      title: "回顾",
      moments: [
        { text: "散步", evidence: [{ sourceId: entryId, quote: "公园散步" }] },
      ],
      reflection: "这次散步有什么感受？",
    };
  });
  assert.equal(
    (
      await h.run("review", {
        ...input,
        entries: [{ id: entryId, version: 1 }],
      })
    ).status,
    409,
  );
});
test("provider sends server-only credentials, disables storage and sanitizes failures", async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.OPENAI_API_KEY,
    oldModel = process.env.OPENAI_MODEL;
  const { chatOutput } = await import("../../src/lib/ai/contracts");
  try {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    await assert.rejects(
      generate("system", {}, chatOutput),
      (e: unknown) => e instanceof ApiError && e.code === "AI_NOT_CONFIGURED",
    );
    process.env.OPENAI_API_KEY = "test-secret-not-real";
    process.env.OPENAI_MODEL = "test-model";
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const payload = JSON.parse(options?.body as string);
      assert.equal(payload.store, false);
      assert.equal(payload.text.format.type, "json_schema");
      assert(!("previous_response_id" in payload));
      return Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({ reply: "test response", citations: [] }),
              },
            ],
          },
        ],
      });
    };
    assert.equal(
      (await generate("system", {}, chatOutput)).reply,
      "test response",
    );
    globalThis.fetch = async () =>
      new Response("test-secret-not-real", { status: 401 });
    await assert.rejects(
      generate("system", {}, chatOutput),
      (e: unknown) =>
        e instanceof ApiError && !e.message.includes("test-secret"),
    );
    globalThis.fetch = async () =>
      Response.json({ status: "incomplete", output: [] });
    await assert.rejects(
      generate("system", {}, chatOutput),
      (e: unknown) =>
        e instanceof ApiError && e.code === "AI_GENERATION_FAILED",
    );
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = oldModel;
  }
});
test("per-user limiter rejects concurrent requests and recovers after failure", async () => {
  const user = randomUUID();
  await withAiLimit(user, async () => {
    await assert.rejects(
      withAiLimit(user, async () => true),
      (e: unknown) => e instanceof ApiError && e.status === 429,
    );
  });
  await assert.rejects(
    withAiLimit(user, async () => {
      throw new Error("failed");
    }),
  );
  assert.equal(await withAiLimit(user, async () => true), true);
});
