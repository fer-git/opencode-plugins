import { describe, expect, it } from "vitest";

import { optionBoolean, optionString } from "../src/lib/options.ts";

describe("optionString", () => {
  it("returns fallback for empty or whitespace", () => {
    expect(optionString(undefined, "eve")).toBe("eve");
    expect(optionString("", "eve")).toBe("eve");
    expect(optionString("  ", "eve")).toBe("eve");
  });

  it("trims a non-empty string", () => {
    expect(optionString("  ara  ", "eve")).toBe("ara");
  });
});

describe("optionBoolean", () => {
  it("passes booleans through", () => {
    expect(optionBoolean(true, false)).toBe(true);
    expect(optionBoolean(false, true)).toBe(false);
  });

  it("uses fallback for non-booleans", () => {
    expect(optionBoolean("true", false)).toBe(false);
    expect(optionBoolean(undefined, true)).toBe(true);
  });
});
