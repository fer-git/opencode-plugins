import { describe, expect, it } from "vitest";

import { buildImagineImageBody } from "../src/features/imagine.ts";

describe("buildImagineImageBody", () => {
  it("requires a prompt", () => {
    expect(() => buildImagineImageBody({}, "grok-imagine-image-2.0")).toThrow("prompt is required");
  });

  it("defaults n and resolution", () => {
    const body = buildImagineImageBody({ prompt: "  knight  " }, "m");
    expect(body).toMatchObject({ model: "m", prompt: "knight", n: 1, resolution: "1k" });
    expect(body.aspect_ratio).toBeUndefined();
    expect(body.quality).toBeUndefined();
  });

  it("omits aspect_ratio auto and quality auto", () => {
    const body = buildImagineImageBody(
      { prompt: "dragon", aspect_ratio: "auto", quality: "auto", resolution: "1.5k" },
      "m",
    );
    expect(body.aspect_ratio).toBeUndefined();
    expect(body.quality).toBeUndefined();
    expect(body.resolution).toBe("1.5k");
  });

  it("keeps explicit quality and aspect", () => {
    const body = buildImagineImageBody({ prompt: "x", aspect_ratio: "16:9", quality: "low" }, "m");
    expect(body.aspect_ratio).toBe("16:9");
    expect(body.quality).toBe("low");
  });

  it("rejects an unknown aspect_ratio", () => {
    expect(() => buildImagineImageBody({ prompt: "x", aspect_ratio: "9:99" }, "m")).toThrow(
      "aspect_ratio must be one of",
    );
  });

  it.each([0, 11, 1.5])("rejects n=%s", (n) => {
    expect(() => buildImagineImageBody({ prompt: "x", n }, "m")).toThrow(
      "n must be an integer from 1 to 10",
    );
  });
});
