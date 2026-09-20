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
  const list = ["low", "medium", "auto"] as const;

  it("returns a listed value", () => {
    expect(enumField("low", list, "quality")).toBe("low");
  });

  it("rejects an unknown value", () => {
    expect(() => enumField("high", list, "quality")).toThrow(
      "quality must be one of low, medium, auto",
    );
  });
});
