import { ensureArtifactsDir, writeArtifact, type ArtifactFile } from "../lib/artifacts.ts";
import { XAI_URL } from "../lib/constants.ts";
import { xaiHttpError } from "../lib/errors.ts";
import { enumField } from "../lib/util.ts";
const TTS_LANGUAGES = [
  "auto",
  "en",
  "ar-EG",
  "ar-SA",
  "ar-AE",
  "bn",
  "zh",
  "fr",
  "de",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "pt-BR",
  "pt-PT",
  "ru",
  "es-MX",
  "es-ES",
  "tr",
  "vi",
] as const;
const MAX_TEXT = 60_000;

export const TEXT_TO_SPEECH_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["text"],
  properties: {
    text: { type: "string", minLength: 1, maxLength: MAX_TEXT },
    voice_id: { type: "string" },
    language: { type: "string", enum: [...TTS_LANGUAGES] },
    speed: { type: "number", minimum: 0.7, maximum: 1.5 },
  },
} as const;

export type TextToSpeechBody = {
  text: string;
  voice_id: string;
  language: string;
  speed?: number;
};

export function buildTextToSpeechBody(
  input: Record<string, unknown>,
  defaultVoice: string,
): TextToSpeechBody {
  if (typeof input.text !== "string" || !input.text.trim()) {
    throw new Error("text_to_speech text is required");
  }
  const text = input.text.trim();
  if (text.length > MAX_TEXT) {
    throw new Error(`text must be at most ${MAX_TEXT} characters`);
  }
  const voice =
    typeof input.voice_id === "string" && input.voice_id.trim()
      ? input.voice_id.trim()
      : defaultVoice;
  let language = "en";
  if (input.language !== undefined && input.language !== null && input.language !== "") {
    language = enumField(String(input.language), TTS_LANGUAGES, "language");
  }
  const body: TextToSpeechBody = { text, voice_id: voice, language };
  if (input.speed !== undefined && input.speed !== null) {
    if (typeof input.speed !== "number" || input.speed < 0.7 || input.speed > 1.5) {
      throw new Error("speed must be a number from 0.7 to 1.5");
    }
    body.speed = input.speed;
  }
  return body;
}

export async function runTextToSpeech(input: {
  token: string;
  body: TextToSpeechBody;
  directory: string;
  artifactsDir: string;
  signal: AbortSignal;
}): Promise<ArtifactFile> {
  const response = await fetch(XAI_URL.tts, {
    method: "POST",
    signal: input.signal,
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.body),
  });
  if (!response.ok) {
    const raw = await response.text();
    throw xaiHttpError({
      kind: "tts",
      model: input.body.voice_id,
      status: response.status,
      body: raw,
    });
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error("xAI TTS returned no audio");
  const dir = await ensureArtifactsDir(input.directory, input.artifactsDir);
  const name = `tts-${Date.now()}.mp3`;
  const path = await writeArtifact(dir, name, bytes);
  return { path, mime: "audio/mpeg", name };
}
