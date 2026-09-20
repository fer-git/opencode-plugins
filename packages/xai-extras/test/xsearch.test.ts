import { describe, expect, it } from "vitest";

import { buildXSearchTool, formatXSearchMarkdown } from "../src/lib/xsearch.ts";

describe("buildXSearchTool", () => {
  it("requires a 2+ character query", () => {
    expect(() => buildXSearchTool({ query: "x" })).toThrow("at least 2 characters");
  });

  it("trims query and sets tool type", () => {
    expect(buildXSearchTool({ query: "  hi  " })).toEqual({
      query: "hi",
      tool: { type: "x_search" },
    });
  });

  it("strips @ from handles", () => {
    const { tool } = buildXSearchTool({ query: "news", allowed_x_handles: ["@grok", "xai"] });
    expect(tool.allowed_x_handles).toEqual(["grok", "xai"]);
  });

  it("rejects allowed and excluded together", () => {
    expect(() =>
      buildXSearchTool({ query: "news", allowed_x_handles: ["a"], excluded_x_handles: ["b"] }),
    ).toThrow("cannot be set together");
  });

  it("rejects from_date after to_date", () => {
    expect(() =>
      buildXSearchTool({ query: "news", from_date: "2026-02-01", to_date: "2026-01-01" }),
    ).toThrow("from_date must be on or before to_date");
  });
});

describe("formatXSearchMarkdown", () => {
  it("returns a fallback when there is nothing to show", () => {
    expect(formatXSearchMarkdown({})).toBe("No X search results.");
  });

  it("lists sources under the answer", () => {
    expect(
      formatXSearchMarkdown({
        output_text: "Latest post.",
        citations: ["https://x.com/grok/status/1"],
      }),
    ).toBe("Latest post.\n\nSources:\n- [x.com](https://x.com/grok/status/1)");
  });
});
