import { XAI_URL } from "./constants.ts";
import { parseXaiJson, xaiHttpError } from "./errors.ts";

export async function xaiResponses(input: {
  token: string;
  model: string;
  query: string;
  tools: unknown[];
  signal: AbortSignal;
}): Promise<Record<string, unknown>> {
  const response = await fetch(XAI_URL.responses, {
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
