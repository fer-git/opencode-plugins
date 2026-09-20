import { parseXaiJson, xaiHttpError } from "./errors.ts";

const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";

export async function xaiResponses(input: {
  token: string;
  model: string;
  query: string;
  tools: unknown[];
  signal: AbortSignal;
}): Promise<Record<string, unknown>> {
  const response = await fetch(XAI_RESPONSES_URL, {
    method: "POST",
    signal: input.signal,
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      input: [{ role: "user", content: input.query }],
      store: false,
      tools: input.tools,
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw xaiHttpError({ kind: "search", model: input.model, status: response.status, body: raw });
  }

  return parseXaiJson(raw);
}
