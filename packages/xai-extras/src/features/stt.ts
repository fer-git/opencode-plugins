import type { Stats } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

import { ensureArtifactsDir, writeArtifact, type ArtifactFile } from "../lib/artifacts.ts";
import { XAI_URL } from "../lib/constants.ts";
import { parseXaiJson, xaiHttpError } from "../lib/errors.ts";
import { isHttpUrl } from "../lib/util.ts";

const MAX_FILE_BYTES = 500 * 1024 * 1024;

export const SPEECH_TO_TEXT_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    file: { type: "string" },
    url: { type: "string" },
    language: { type: "string" },
    format: { type: "boolean" },
    diarize: { type: "boolean" },
  },
} as const;

export type SpeechToTextRequest = {
  model: string;
  language?: string;
  format?: boolean;
  diarize?: boolean;
  path?: string;
  url?: string;
};

function localPath(file: string): string {
  if (/^file:/i.test(file)) {
    try {
      return fileURLToPath(file);
    } catch {
      throw new Error("file must be a path or file:// URI");
    }
  }
  return file;
}

export function buildSpeechToTextRequest(
  input: Record<string, unknown>,
  model: string,
): SpeechToTextRequest {
  const hasFile = input.file !== undefined && input.file !== null && input.file !== "";
  const hasUrl = input.url !== undefined && input.url !== null && input.url !== "";
  if (hasFile === hasUrl) {
    throw new Error(
      hasFile ? "file and url cannot be set together" : "speech_to_text requires file or url",
    );
  }

  const language =
    input.language === undefined || input.language === null || input.language === ""
      ? undefined
      : String(input.language).trim();
  if (input.format === true && !language) {
    throw new Error("format requires language");
  }

  const req: SpeechToTextRequest = { model };
  if (language) req.language = language;
  if (input.format === true) req.format = true;
  if (input.diarize === true) req.diarize = true;

  if (hasFile) {
    if (typeof input.file !== "string") throw new Error("file must be a path or file:// URI");
    req.path = localPath(input.file);
    return req;
  }

  if (!isHttpUrl(input.url)) {
    throw new Error("url must be an http(s) URL");
  }
  req.url = input.url;
  return req;
}

export async function readLocalAudio(
  path: string,
): Promise<{ path: string; bytes: Uint8Array; name: string }> {
  let info: Stats;
  try {
    info = await stat(path);
  } catch {
    throw new Error(`speech_to_text file not found: ${path}`);
  }
  if (!info.isFile()) throw new Error(`speech_to_text file not found: ${path}`);
  if (info.size > MAX_FILE_BYTES) throw new Error("speech_to_text file exceeds 500 MB");
  const bytes = new Uint8Array(await readFile(path));
  return { path, bytes, name: basename(path) || "audio" };
}

function multipartBody(
  req: SpeechToTextRequest,
  file?: { bytes: Uint8Array; name: string },
): FormData {
  const form = new FormData();
  form.append("model", req.model);
  if (req.language) form.append("language", req.language);
  if (req.format) form.append("format", "true");
  if (req.diarize) form.append("diarize", "true");
  if (req.url) form.append("url", req.url);
  if (file) {
    form.append("file", new File([file.bytes.slice()], file.name));
  }
  return form;
}

export async function runSpeechToText(input: {
  token: string;
  request: SpeechToTextRequest;
  directory: string;
  artifactsDir: string;
  signal: AbortSignal;
}): Promise<{ text: string; language?: string; duration?: number; file: ArtifactFile }> {
  const file = input.request.path ? await readLocalAudio(input.request.path) : undefined;
  const response = await fetch(XAI_URL.stt, {
    method: "POST",
    signal: input.signal,
    headers: { Authorization: `Bearer ${input.token}` },
    body: multipartBody(input.request, file),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw xaiHttpError({
      kind: "stt",
      model: input.request.model,
      status: response.status,
      body: raw,
    });
  }
  const json = parseXaiJson(raw);
  const text = typeof json.text === "string" ? json.text : "";
  const dir = await ensureArtifactsDir(input.directory, input.artifactsDir);
  const name = `stt-${Date.now()}.txt`;
  const path = await writeArtifact(dir, name, new TextEncoder().encode(text));
  return {
    text,
    file: { path, mime: "text/plain", name },
    ...(typeof json.language === "string" ? { language: json.language } : {}),
    ...(typeof json.duration === "number" ? { duration: json.duration } : {}),
  };
}
