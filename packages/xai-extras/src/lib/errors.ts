export const CONNECT_MESSAGE =
  "xAI is not connected in OpenCode. Run /connect and choose xAI (SuperGrok or API key).";

const DOCS = "https://docs.x.ai/developers/models";

export type XaiErrorKind = "search" | "image" | "video" | "stt" | "tts";

const OPTION: Record<XaiErrorKind, string> = {
  search: "searchModel",
  image: "imageModel",
  video: "videoModel",
  stt: "sttModel",
  tts: "ttsVoice",
};

function redact(body: string): string {
  return body.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

function looksLikeUnknownVoice(body: string, voice: string): boolean {
  const text = body.toLowerCase();
  if (
    text.includes("voice") &&
    (text.includes("not found") || text.includes("does not exist") || text.includes("unknown"))
  ) {
    return true;
  }
  const id = voice.toLowerCase();
  return Boolean(id) && text.includes(id) && text.includes("not found");
}

function looksLikeUnknownModel(status: number, body: string, model: string): boolean {
  if (status !== 400 && status !== 404) return false;
  const text = body.toLowerCase();
  const id = model.toLowerCase();
  if (text.includes("model_not_found") || text.includes("model not found")) return true;
  if (text.includes("invalid_argument") && text.includes("model")) return true;
  if (
    text.includes(id) &&
    (text.includes("model") ||
      text.includes("not found") ||
      text.includes("does not exist") ||
      text.includes("unknown"))
  ) {
    return true;
  }
  return false;
}

function shortApiMessage(body: string): string | undefined {
  try {
    const json = JSON.parse(body) as { error?: { message?: unknown }; message?: unknown };
    const msg = json.error?.message ?? json.message;
    if (typeof msg === "string" && msg.trim() && !/bearer/i.test(msg))
      return msg.trim().slice(0, 200);
  } catch {
    // not JSON
  }
  return undefined;
}

export function xaiHttpError(input: {
  kind: XaiErrorKind;
  model: string;
  status: number;
  body: string;
}): Error {
  const body = redact(input.body);
  if (input.status === 401 || input.status === 403) {
    return new Error(CONNECT_MESSAGE);
  }
  if (input.status === 429) {
    return new Error("xAI rate-limited this request. Retry later.");
  }
  if (input.kind === "tts" && input.status === 404 && looksLikeUnknownVoice(body, input.model)) {
    return new Error(
      `xAI rejected TTS voice "${input.model}". Use a built-in id (eve, ara, …) or set option ttsVoice. List: GET /v1/tts/voices.`,
    );
  }
  if (looksLikeUnknownModel(input.status, body, input.model)) {
    const option = OPTION[input.kind];
    const catalog =
      input.kind === "search"
        ? "chat"
        : input.kind === "stt"
          ? "speech-to-text"
          : input.kind === "tts"
            ? "voice"
            : input.kind;
    const noun = input.kind === "tts" ? "voice" : "model";
    return new Error(
      `xAI rejected ${input.kind} ${noun} "${input.model}". Set opencode-xai-extras option ${option} to a current ${catalog} ${noun}: ${DOCS}`,
    );
  }
  const label =
    input.kind === "search"
      ? "search"
      : input.kind === "image"
        ? "image generation"
        : input.kind === "video"
          ? "video generation"
          : input.kind === "stt"
            ? "speech-to-text"
            : "text-to-speech";
  const extra = shortApiMessage(body);
  return new Error(
    extra
      ? `xAI ${label} failed (${input.status}): ${extra}`
      : `xAI ${label} failed (${input.status}).`,
  );
}

export function parseXaiJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("invalid JSON from xAI");
  }
}
