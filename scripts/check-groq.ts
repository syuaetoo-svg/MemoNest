/** Real provider smoke test with synthetic data. No DB, user data, or writes.
 * Uses production route prompts/provider/parser/evidence validation.
 * Authentication/database are fixtures, so this is NOT deployed end-to-end proof.
 */
import { randomUUID } from "node:crypto";
import { createAiHandlers } from "../src/lib/server/ai-api";
import { authenticated, verifyOperationIdentity } from "../src/lib/server/http";

async function main() {
  // Do not load or print secret files. Credentials are injected by the runtime.
  if (!process.env.GROQ_API_KEY?.trim()) {
    console.log(JSON.stringify({ status: "blocked", code: "GROQ_RUNTIME_CREDENTIAL_UNAVAILABLE", liveSuccess: false }));
    process.exitCode = 2;
    return;
  }
  process.env.APP_URL = "http://localhost:3000";
  const user = { id: randomUUID() };
  const entry = { id: randomUUID(), title: "公园散步", body: "今天我去公园散步，看见了一只橘猫。", event_date: "2026-10-12", version: 1 };
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    in: async () => ({ data: [entry], error: null }),
  };
  const client = {
    rpc: async () => ({ data: [], error: null }),
    from: () => query,
  };
  const handlers = createAiHandlers({
    authenticate: (async (request?: Request) => {
      if (request) verifyOperationIdentity(request, user.id);
      return { user, client };
    }) as unknown as typeof authenticated,
  });
  const messages = [{ id: randomUUID(), text: entry.body }];
  for (const stage of ["chat", "draft", "review"] as const) {
    const request = new Request(`http://localhost:3000/api/ai/${stage}`, {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json", "x-memonest-user": user.id },
      body: JSON.stringify(stage === "review"
        ? { consent: true, entries: [{ id: entry.id, version: 1 }] }
        : { consent: true, messages }),
    });
    const response = await handlers[stage](request, { params: Promise.resolve({}) });
    const payload = await response.json();
    // Never log generated text, raw upstream errors, inputs, or credentials.
    const substantive = stage === "chat" ? Boolean(payload.reply?.trim()) :
      stage === "draft" ? Boolean(payload.body?.trim() && payload.evidence?.length) :
      Boolean(payload.moments?.length);
    const passed = response.ok && substantive;
    const allowedCodes = new Set(["AI_BAD_REQUEST", "AI_AUTH_FAILED", "AI_RATE_LIMIT", "AI_UNAVAILABLE", "AI_GENERATION_FAILED", "AI_EVIDENCE_INVALID"]);
    console.log(JSON.stringify({ stage, status: response.status, liveSuccess: passed,
      ...(!passed ? { code: allowedCodes.has(payload.error?.code) ? payload.error.code : "SMOKE_FAILED" } : {}) }));
    if (!passed) { process.exitCode = 1; return; }
  }
}
main().catch(() => {
  console.log(JSON.stringify({ status: "failed", code: "SMOKE_UNEXPECTED_FAILURE", liveSuccess: false }));
  process.exitCode = 1;
});
