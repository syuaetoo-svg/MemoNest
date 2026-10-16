"use client";
import { RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Entry } from "@/lib/core/contracts";
import type { ReviewResult } from "@/lib/core/review";
import { messageOf, useCoreApi } from "@/lib/core/client";
import { Card } from "@/components/ui";
import { Button, Feedback } from "./ui";

export function JournalReview({ entry }: { entry: Entry }) {
  const api = useCoreApi();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => () => {
    generation.current++;
    controller.current?.abort();
  }, []);
  function clear() {
    generation.current++;
    controller.current?.abort();
    setBusy(false);
    setConsent(false);
    setResult(null);
    setError("");
    setNotice("Reflection stopped or cleared. Your entry and memory permissions are unchanged. Data already sent to the provider cannot be recalled.");
  }
  async function generate() {
    if (!consent) return;
    const current = ++generation.current;
    controller.current = new AbortController();
    setBusy(true);
    setResult(null);
    setError("");
    setNotice("");
    try {
      const data = await api<ReviewResult>("/api/ai/review", "POST", {
        entryId: entry.id, expectedVersion: entry.version, processingConsent: true,
      }, controller.current.signal);
      if (current === generation.current) setResult(data);
    } catch (e) {
      if (current === generation.current) setError(messageOf(e));
    } finally {
      if (current === generation.current) { setBusy(false); setConsent(false); }
    }
  }
  return (
    <Card className="single-review">
      <p className="eyebrow">ONE MOMENT, LOOKED AT AGAIN</p>
      <h2 className="my-3 text-xl font-semibold">Revisit this moment</h2>
      <p className="mb-4 text-sm leading-7 text-muted">
        Reflect on this entry with up to three moments grounded in its text. AI must be connected; failures never produce a simulated response.
      </p>
      <div className="mb-4 rounded-2xl bg-paper p-4 text-sm leading-7">
        For this request: {entry.event_date} · {entry.title || "this private entry"} · Version {entry.version}.
        The title, date and body are sent to OpenAI. Requests may be retained under the provider’s policies; zero retention is not guaranteed.
        This reflection is not saved and does not create long-term memory. Other entries are not read.
      </div>
      <label className="mb-4 flex items-start gap-3 text-sm leading-7">
        <input className="mt-2 h-5 w-5 shrink-0 accent-sage-dark" type="checkbox"
          checked={consent} disabled={busy}
          onChange={(e) => { setConsent(e.target.checked); setError(""); }} />
        I agree to send this entry to OpenAI for this reflection. This does not grant long-term memory access.
      </label>
      <div className="mb-4 flex flex-wrap gap-3">
        <Button disabled={!consent || busy || entry.body.length > 6000} onClick={generate}><RefreshCw size={16} aria-hidden="true" className="control-icon"/>
          {busy ? "Creating reflection…" : error ? "Confirm & retry" : "Create reflection"}
        </Button>
        {(busy || result || consent) && <Button tone="secondary" onClick={clear}><X size={16} aria-hidden="true" className="control-icon"/>
          {busy ? "Stop reflection" : "Clear reflection & selection"}
        </Button>}
      </div>
      {entry.body.length > 6000 && <Feedback message="This entry exceeds the 6,000-character reflection limit. You can still read the full entry." />}
      {busy && <p className="mb-4 text-sm text-muted" role="status">Waiting for AI, with a timeout of about 25 seconds. You can stop at any time.</p>}
      <Feedback message={error} error />
      <Feedback message={notice} />
      {result && <section className="mt-5 space-y-4" aria-label="Your AI reflection">
        <p className="text-sm text-muted">AI generated · Based only on this entry, version {result.source.version} · May contain errors. Check the original text. Clears on refresh.</p>
        {result.moments.map((moment, index) => <div key={index} className="rounded-2xl border border-line p-4">
          <p className="whitespace-pre-wrap break-words leading-7">{moment.text}</p>
          <blockquote className="mt-3 border-l-2 border-sage pl-3 text-sm leading-7 text-muted">
            Source quote: “{moment.quote}”
          </blockquote>
        </div>)}
        <p className="text-sm text-muted">Source: the entry above. No new facts or permissions have been saved.</p>
      </section>}
    </Card>
  );
}
