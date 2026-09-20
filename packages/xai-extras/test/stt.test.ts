import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { buildSpeechToTextRequest } from "../src/lib/stt.ts";

describe("buildSpeechToTextRequest", () => {
  it("requires file or url", async () => {
    await expect(buildSpeechToTextRequest({}, "m")).rejects.toThrow(
      "speech_to_text requires file or url",
    );
  });

  it("rejects file and url together", async () => {
    await expect(
      buildSpeechToTextRequest({ file: "/x", url: "https://example.com/a.mp3" }, "m"),
    ).rejects.toThrow("file and url cannot be set together");
  });

  it("rejects non-http url", async () => {
    await expect(buildSpeechToTextRequest({ url: "ftp://x" }, "m")).rejects.toThrow(
      "url must be an http(s) URL",
    );
  });

  it("requires language when format is true", async () => {
    await expect(
      buildSpeechToTextRequest({ url: "https://example.com/a.mp3", format: true }, "m"),
    ).rejects.toThrow("format requires language");
  });

  it("rejects a missing file", async () => {
    await expect(
      buildSpeechToTextRequest({ file: join(tmpdir(), "no-such-audio-xyz.mp3") }, "m"),
    ).rejects.toThrow("speech_to_text file not found");
  });

  it("rejects an invalid file:// URI", async () => {
    await expect(buildSpeechToTextRequest({ file: "file://[bad" }, "m")).rejects.toThrow(
      "file must be a path or file:// URI",
    );
  });

  it("reads a local file from a file:// URI", async () => {
    const dir = await mkdtemp(join(tmpdir(), "stt-"));
    try {
      const path = join(dir, "a.mp3");
      await writeFile(path, "x");
      const req = await buildSpeechToTextRequest({ file: pathToFileURL(path).href }, "m");
      expect(req.file).toMatchObject({ path, name: "a.mp3" });
      expect(req.file?.bytes).toEqual(new Uint8Array([0x78]));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("builds a url request with model and format", async () => {
    const req = await buildSpeechToTextRequest(
      { url: "https://example.com/a.mp3", language: "en", format: true },
      "grok-voice-transcribe-2.0",
    );
    expect(req).toMatchObject({
      model: "grok-voice-transcribe-2.0",
      url: "https://example.com/a.mp3",
      language: "en",
      format: true,
    });
  });
});
