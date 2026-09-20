import { describe, expect, it } from "vitest";

import { buildImagineVideoBody } from "../src/lib/video.ts";

describe("buildImagineVideoBody", () => {
  it("requires a prompt", () => {
    expect(() => buildImagineVideoBody({}, "m")).toThrow("prompt is required");
  });

  it("defaults duration, aspect, and resolution", () => {
    const body = buildImagineVideoBody({ prompt: "  clip  " }, "m");
    expect(body).toEqual({
      model: "m",
      prompt: "clip",
      duration: 8,
      aspect_ratio: "16:9",
      resolution: "480p",
    });
  });

  it("wraps image_url as { url }", () => {
    const body = buildImagineVideoBody(
      { prompt: "x", image_url: "https://example.com/a.png" },
      "m",
    );
    expect(body.image).toEqual({ url: "https://example.com/a.png" });
  });

  it("rejects non-http image_url", () => {
    expect(() => buildImagineVideoBody({ prompt: "x", image_url: "ftp://x/a.png" }, "m")).toThrow(
      "image_url must be an http(s) URL",
    );
  });
});
