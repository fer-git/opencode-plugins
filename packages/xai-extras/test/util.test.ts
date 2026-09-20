import { describe, expect, it } from "vitest";

import { enumField, isHttpUrl, optionBoolean, optionString } from "../src/lib/util.ts";

describe("optionString", () => {
  it.each([
    [undefined, "eve"],
    ["", "eve"],
    ["  ", "eve"],
  ])("returns fallback for %j", (value, expected) => {
    expect(optionString(value, "eve")).toBe(expected);
  });

  it("trims a non-empty string", () => {
    expect(optionString("  ara  ", "eve")).toBe("ara");
  });
});

describe("optionBoolean", () => {
  it.each([
    [true, false, true],
    [false, true, false],
    ["true", false, false],
    [undefined, true, true],
  ])("optionBoolean(%j, %j) → %j", (value, fallback, expected) => {
    expect(optionBoolean(value, fallback)).toBe(expected);
  });
});

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
