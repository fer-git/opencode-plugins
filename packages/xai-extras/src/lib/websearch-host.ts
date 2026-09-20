import type { SearchHit } from "./citations.ts";
import { XAI_ORIGIN } from "./constants.ts";

const SNIPPET_RADIUS = 220;

type WebSearchResult = {
  url: string;
  title?: string;
  content?: string;
  time: { published?: number };
};

function snippetAround(answer: string, url: string): string | undefined {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = answer.match(new RegExp(`\\[\\[\\d+\\]\\]\\(${escaped}\\)`));
  if (!match || match.index === undefined) return undefined;
  const start = Math.max(0, match.index - SNIPPET_RADIUS);
  const end = Math.min(answer.length, match.index + match[0].length + SNIPPET_RADIUS);
  return answer.slice(start, end).trim();
}

export function toHostWebSearchResults(hits: SearchHit[], answer: string): WebSearchResult[] {
  if (hits.length === 0) {
    if (!answer) return [];
    return [
      {
        url: `${XAI_ORIGIN}/`,
        title: "xAI web search",
        content: answer,
        time: {},
      },
    ];
  }

  return hits.map((hit, index) => {
    const snippet = index === 0 ? answer : snippetAround(answer, hit.url);
    return {
      url: hit.url,
      title: hit.title,
      ...(snippet ? { content: snippet } : {}),
      time: {},
    };
  });
}
