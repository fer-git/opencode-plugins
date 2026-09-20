import { collectHits, collectOutputText } from "../lib/citations.ts";
import { MIN_QUERY_LENGTH } from "../lib/constants.ts";
import { xaiResponses } from "../lib/responses.ts";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_HANDLES = 20;

type XSearchInput = {
  query?: unknown;
  allowed_x_handles?: unknown;
  excluded_x_handles?: unknown;
  from_date?: unknown;
  to_date?: unknown;
  enable_image_understanding?: unknown;
  enable_video_understanding?: unknown;
};

type XSearchTool = {
  type: "x_search";
  allowed_x_handles?: string[];
  excluded_x_handles?: string[];
  from_date?: string;
  to_date?: string;
  enable_image_understanding?: boolean;
  enable_video_understanding?: boolean;
};

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@+/, "");
}

function parseHandles(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array of strings`);
  }
  if (value.length > MAX_HANDLES) {
    throw new Error(`${field} supports at most ${MAX_HANDLES} handles`);
  }
  const handles: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) {
      throw new Error(`${field} must contain non-empty strings`);
    }
    const handle = normalizeHandle(item);
    if (!handle) throw new Error(`${field} contains an empty handle`);
    if (seen.has(handle.toLowerCase())) continue;
    seen.add(handle.toLowerCase());
    handles.push(handle);
  }
  return handles.length ? handles : undefined;
}

function parseDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    throw new Error(`${field} must be YYYY-MM-DD`);
  }
  return value;
}

function parseBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean`);
  return value;
}

export function buildXSearchTool(input: XSearchInput): { query: string; tool: XSearchTool } {
  if (typeof input.query !== "string" || input.query.trim().length < MIN_QUERY_LENGTH) {
    throw new Error(`x_search query must be at least ${MIN_QUERY_LENGTH} characters`);
  }

  const allowed = parseHandles(input.allowed_x_handles, "allowed_x_handles");
  const excluded = parseHandles(input.excluded_x_handles, "excluded_x_handles");
  if (allowed && excluded) {
    throw new Error("allowed_x_handles and excluded_x_handles cannot be set together");
  }

  const fromDate = parseDate(input.from_date, "from_date");
  const toDate = parseDate(input.to_date, "to_date");
  if (fromDate && toDate && fromDate > toDate) {
    throw new Error("from_date must be on or before to_date");
  }

  const tool: XSearchTool = { type: "x_search" };
  if (allowed) tool.allowed_x_handles = allowed;
  if (excluded) tool.excluded_x_handles = excluded;
  if (fromDate) tool.from_date = fromDate;
  if (toDate) tool.to_date = toDate;

  const image = parseBool(input.enable_image_understanding, "enable_image_understanding");
  const video = parseBool(input.enable_video_understanding, "enable_video_understanding");
  if (image === true) tool.enable_image_understanding = true;
  if (video === true) tool.enable_video_understanding = true;

  return { query: input.query.trim(), tool };
}

export function formatXSearchMarkdown(body: Record<string, unknown>): string {
  const answer = collectOutputText(body);
  const hits = collectHits(body);
  const lines: string[] = [];
  if (answer) lines.push(answer);
  if (hits.length) {
    if (lines.length) lines.push("");
    lines.push("Sources:");
    for (const hit of hits) {
      lines.push(`- [${hit.title}](${hit.url})`);
    }
  }
  return lines.join("\n") || "No X search results.";
}

export async function runXSearch(input: {
  token: string;
  query: string;
  tool: XSearchTool;
  model: string;
  signal: AbortSignal;
}): Promise<string> {
  const body = await xaiResponses({
    token: input.token,
    model: input.model,
    query: input.query,
    tools: [input.tool],
    signal: input.signal,
  });
  return formatXSearchMarkdown(body);
}

export const X_SEARCH_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["query"],
  properties: {
    query: { type: "string", minLength: MIN_QUERY_LENGTH },
    allowed_x_handles: {
      type: "array",
      items: { type: "string" },
      maxItems: MAX_HANDLES,
    },
    excluded_x_handles: {
      type: "array",
      items: { type: "string" },
      maxItems: MAX_HANDLES,
    },
    from_date: { type: "string", description: "Inclusive start date YYYY-MM-DD" },
    to_date: { type: "string", description: "Inclusive end date YYYY-MM-DD" },
    enable_image_understanding: { type: "boolean" },
    enable_video_understanding: { type: "boolean" },
  },
} as const;
