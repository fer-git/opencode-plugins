import { describe, expect, it } from "vitest";

import { XAI_ORIGIN } from "../src/lib/constants.ts";
import { toHostWebSearchResults } from "../src/lib/websearch-host.ts";

describe("toHostWebSearchResults", () => {
  it("returns no rows when there is neither text nor urls", () => {
    expect(toHostWebSearchResults([], "")).toEqual([]);
  });

  it("falls back to an xAI web search row when there is text but no urls", () => {
    expect(toHostWebSearchResults([], "hello")).toEqual([
      {
        url: `${XAI_ORIGIN}/`,
        title: "xAI web search",
        content: "hello",
        time: {},
      },
    ]);
  });

  it("puts the answer on the first hit and omits content when a later url is not cited", () => {
    expect(
      toHostWebSearchResults(
        [
          { url: "https://example.com/a", title: "example.com" },
          { url: "https://example.com/b", title: "example.com" },
        ],
        "See [[1]](https://example.com/a).",
      ),
    ).toEqual([
      {
        url: "https://example.com/a",
        title: "example.com",
        content: "See [[1]](https://example.com/a).",
        time: {},
      },
      {
        url: "https://example.com/b",
        title: "example.com",
        time: {},
      },
    ]);
  });
});
