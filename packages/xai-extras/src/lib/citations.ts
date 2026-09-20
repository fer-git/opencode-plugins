import { XAI_ORIGIN } from "./constants.ts";
import { isHttpUrl } from "./util.ts";

const SNIPPET_RADIUS = 220;

type Hit = {
  url: string;
  title: string;
};

export type WebSearchResult = {
  url: string;
  title?: string;
  content?: string;
  time: { published?: number };
};

function hostname(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

function pushHit(hits: Hit[], seen: Set<string>, url: unknown) {
  if (!isHttpUrl(url) || seen.has(url)) return;
  seen.add(url);
  hits.push({ url, title: hostname(url) });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function collectHits(body: Record<string, unknown>): Hit[] {
  const hits: Hit[] = [];
  const seen = new Set<string>();

  for (const item of asArray(body.output)) {
    const record = asRecord(item);
    if (!record) continue;

    if (record.type === "message") {
      for (const part of asArray(record.content)) {
        const content = asRecord(part);
        if (content?.type !== "output_text") continue;
        for (const annotation of asArray(content.annotations)) {
          const cited = asRecord(annotation);
          if (cited?.type === "url_citation") pushHit(hits, seen, cited.url);
        }
      }
    }

    if (record.type === "web_search_call") {
      const action = asRecord(record.action);
      for (const source of asArray(action?.sources)) {
        const row = asRecord(source);
        pushHit(hits, seen, row?.url ?? source);
      }
    }
  }

  for (const citation of asArray(body.citations)) {
    if (typeof citation === "string") pushHit(hits, seen, citation);
    else {
      const row = asRecord(citation);
      pushHit(hits, seen, row?.url);
    }
  }

  return hits;
}

export function collectOutputText(body: Record<string, unknown>): string {
  if (typeof body.output_text === "string" && body.output_text.trim()) {
    return body.output_text.trim();
  }

  const parts: string[] = [];
  for (const item of asArray(body.output)) {
    const record = asRecord(item);
    if (record?.type !== "message") continue;
    for (const part of asArray(record.content)) {
      const content = asRecord(part);
      if (content?.type !== "output_text") continue;
      if (typeof content.text === "string" && content.text.trim()) {
        parts.push(content.text.trim());
      }
    }
  }
  return parts.join("\n\n");
}

function snippetAround(answer: string, url: string): string | undefined {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = answer.match(new RegExp(`\\[\\[\\d+\\]\\]\\(${escaped}\\)`));
  if (!match || match.index === undefined) return undefined;
  const start = Math.max(0, match.index - SNIPPET_RADIUS);
  const end = Math.min(answer.length, match.index + match[0].length + SNIPPET_RADIUS);
  return answer.slice(start, end).trim();
}

export function toWebSearchResults(body: Record<string, unknown>): WebSearchResult[] {
  const hits = collectHits(body);
  const answer = collectOutputText(body);

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
