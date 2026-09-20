import { describe, expect, it } from "vitest";

import { enumField, isHttpUrl } from "../src/lib/util.ts";

describe("isHttpUrl", () => {
  it.each([
    ["https://example.com/a.mp3", true],
    ["http://example.com/a.mp3", true],
    ["ftp://x/a.mp3", false],
    ["file:///tmp/a.mp3", false],
    ["/tmp/a.mp3", false],
  ])("%s → %s", (value, expected) => {
    expect(isHttpUrl(value)).toBe(expected);
  });
});

describe("enumField", () => {
  it("rejects an unknown value", () => {
    expect(() => enumField("high", ["low", "medium", "auto"] as const, "quality")).toThrow(
      "quality must be one of low, medium, auto",
    );
  });
});
