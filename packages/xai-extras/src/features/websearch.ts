import { collectHits, collectOutputText, type SearchHit } from "../lib/citations.ts";
import { xaiResponses } from "../lib/responses.ts";

export async function runWebSearch(input: {
  token: string;
  query: string;
  model: string;
  signal: AbortSignal;
}): Promise<{ hits: SearchHit[]; answer: string }> {
  const body = await xaiResponses({
    token: input.token,
    model: input.model,
    query: input.query,
    tools: [{ type: "web_search" }],
    signal: input.signal,
  });
  return {
    hits: collectHits(body),
    answer: collectOutputText(body),
  };
}
