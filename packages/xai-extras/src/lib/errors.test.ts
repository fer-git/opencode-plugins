import { describe, expect, it } from "vitest";

import { CONNECT_MESSAGE, parseXaiJson, xaiHttpError } from "./errors.ts";

describe("xaiHttpError", () => {
  it("maps 401/403 to /connect", () => {
    expect(xaiHttpError({ kind: "stt", model: "m", status: 401, body: "x" }).message).toBe(
      CONNECT_MESSAGE,
    );
    expect(xaiHttpError({ kind: "search", model: "m", status: 403, body: "x" }).message).toBe(
      CONNECT_MESSAGE,
    );
  });

  it("maps 429", () => {
    expect(xaiHttpError({ kind: "image", model: "m", status: 429, body: "x" }).message).toContain(
      "rate-limited",
    );
  });

  it("maps TTS 404 voice-not-found to ttsVoice sentence", () => {
    const err = xaiHttpError({
      kind: "tts",
      model: "not-a-real-voice-xyz",
      status: 404,
      body: JSON.stringify({
        error: "TTS synthesis failed: Voice 'not-a-real-voice-xyz' not found",
      }),
    });
    expect(err.message).toContain("not-a-real-voice-xyz");
    expect(err.message).toContain("ttsVoice");
  });

  it("does not treat an unrelated TTS 404 as a bad voice", () => {
    const err = xaiHttpError({
      kind: "tts",
      model: "eve",
      status: 404,
      body: JSON.stringify({ error: { message: "route missing" } }),
    });
    expect(err.message).not.toContain("ttsVoice");
    expect(err.message).toContain("text-to-speech failed (404)");
  });

  it("maps STT unknown model to sttModel", () => {
    const err = xaiHttpError({
      kind: "stt",
      model: "bogus-stt",
      status: 400,
      body: JSON.stringify({ error: { message: "model bogus-stt not found" } }),
    });
    expect(err.message).toContain("sttModel");
    expect(err.message).toContain("bogus-stt");
    expect(err.message).toContain("opencode-xai-extras");
  });

  it("does not leak Bearer tokens", () => {
    const err = xaiHttpError({
      kind: "search",
      model: "grok-4.6",
      status: 500,
      body: "Authorization: Bearer secret-token-value",
    });
    expect(err.message).not.toMatch(/secret-token-value/);
    expect(err.message).not.toMatch(/Bearer \S+/);
  });
});

describe("parseXaiJson", () => {
  it("parses objects", () => {
    expect(parseXaiJson('{"text":"hi"}')).toEqual({ text: "hi" });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseXaiJson("not-json")).toThrow("invalid JSON from xAI");
  });
});
