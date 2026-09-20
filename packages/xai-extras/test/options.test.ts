import { describe, expect, it } from "vitest";

import { optionBoolean, optionString } from "../src/lib/options.ts";

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
