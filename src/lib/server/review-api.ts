import "server-only";
import { reviewInput } from "@/lib/core/review";
import { entryOutput, journalFields } from "@/lib/core/contracts";
import { ApiError, authenticated, body, databaseError, json, route } from "./http";
import { generateReview, reserveReview, reviewConfig } from "./ai-review";

export function createReviewRoute(dependencies = {
  authenticate: authenticated,
  config: reviewConfig,
  generate: generateReview,
  reserve: reserveReview,
}) {
  return route(async (request) => {
    const { client, user } = await dependencies.authenticate(request);
    const input = await body(request, reviewInput);
    const config = dependencies.config();
    async function source() {
      const { data, error } = await client.from("journal_entries").select(journalFields)
        .eq("id", input.entryId).eq("user_id", user.id).is("deleted_at", null).maybeSingle();
      databaseError(error);
      if (!data) throw new ApiError(404, "NOT_FOUND", "记录不存在或你无权访问");
      const entry = entryOutput.parse(data);
      if (entry.version !== input.expectedVersion)
        throw new ApiError(409, "VERSION_CONFLICT", "原记录已变化，请重新加载并确认当次处理范围");
      return entry;
    }
    const entry = await source();
    const release = dependencies.reserve(user.id);
    try {
      const result = await dependencies.generate(entry, config, request.signal);
      // Edits/deletion during generation discard the response; never revive old text.
      await source();
      if (request.signal.aborted)
        throw new ApiError(409, "AI_INTERRUPTED", "请求已取消，没有保存回顾");
      return json({ ...result, source: {
        id: entry.id, version: entry.version, title: entry.title, eventDate: entry.event_date,
      } });
    } finally { release(); }
  });
}
export const reviewEntry = createReviewRoute();
