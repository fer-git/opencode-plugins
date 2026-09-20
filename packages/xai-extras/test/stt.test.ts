import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it, onTestFinished } from "vitest";

import { buildSpeechToTextRequest, readLocalAudio } from "../src/features/stt.ts";

describe("buildSpeechToTextRequest", () => {
  it("requires file or url", () => {
    expect(() => buildSpeechToTextRequest({}, "m")).toThrow("speech_to_text requires file or url");
  });

  it("rejects file and url together", () => {
    expect(() =>
      buildSpeechToTextRequest({ file: "/x", url: "https://example.com/a.mp3" }, "m"),
    ).toThrow("file and url cannot be set together");
  });

  it("rejects non-http url", () => {
    expect(() => buildSpeechToTextRequest({ url: "ftp://x" }, "m")).toThrow(
      "url must be an http(s) URL",
    );
  });

  it("requires language when format is true", () => {
    expect(() =>
      buildSpeechToTextRequest({ url: "https://example.com/a.mp3", format: true }, "m"),
    ).toThrow("format requires language");
  });

  it("rejects an invalid file:// URI", () => {
    expect(() => buildSpeechToTextRequest({ file: "file://[bad" }, "m")).toThrow(
      "file must be a path or file:// URI",
    );
  });

  it("parses a file:// URI without reading the disk", () => {
    const path = join(tmpdir(), "missing-on-purpose.mp3");
    const req = buildSpeechToTextRequest({ file: pathToFileURL(path).href }, "m");
    expect(req).toEqual({ model: "m", path });
  });

  it("builds a url request with model and format", () => {
    expect(
      buildSpeechToTextRequest(
        { url: "https://example.com/a.mp3", language: "en", format: true },
        "grok-voice-transcribe-2.0",
      ),
    ).toEqual({
      model: "grok-voice-transcribe-2.0",
      url: "https://example.com/a.mp3",
      language: "en",
      format: true,
    });
  });
});

describe("readLocalAudio", () => {
  it("rejects a missing file", async () => {
    await expect(readLocalAudio(join(tmpdir(), "no-such-audio-xyz.mp3"))).rejects.toThrow(
      "speech_to_text file not found",
    );
  });

  it("reads bytes from a native path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "stt-"));
    onTestFinished(() => rm(dir, { recursive: true, force: true }));
    const path = join(dir, "a.mp3");
    await writeFile(path, "x");
    const file = await readLocalAudio(path);
    expect(file).toMatchObject({ path, name: "a.mp3" });
    expect(file.bytes).toEqual(new Uint8Array([0x78]));
  });
});
