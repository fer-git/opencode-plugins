import { describe, expect, it } from "vitest";

import { buildTextToSpeechBody } from "./tts.ts";

describe("buildTextToSpeechBody", () => {
  it("rejects empty or whitespace text", () => {
    expect(() => buildTextToSpeechBody({ text: "  " }, "eve")).toThrow(
      "text_to_speech text is required",
    );
  });

  it("rejects text over 60000 characters", () => {
    expect(() => buildTextToSpeechBody({ text: "x".repeat(60001) }, "eve")).toThrow(
      "at most 60000",
    );
  });

  it("defaults voice and language", () => {
    expect(buildTextToSpeechBody({ text: "Hello" }, "eve")).toEqual({
      text: "Hello",
      voice_id: "eve",
      language: "en",
    });
  });

  it("passes voice_id and language auto", () => {
    expect(
      buildTextToSpeechBody({ text: "Hello", voice_id: "ara", language: "auto" }, "eve"),
    ).toEqual({
      text: "Hello",
      voice_id: "ara",
      language: "auto",
    });
  });

  it("rejects speed outside 0.7–1.5", () => {
    expect(() => buildTextToSpeechBody({ text: "hi", speed: 0.5 }, "eve")).toThrow("0.7 to 1.5");
  });

  it("rejects an unknown language", () => {
    expect(() => buildTextToSpeechBody({ text: "hi", language: "xx" }, "eve")).toThrow(
      "language must be one of",
    );
  });
});
