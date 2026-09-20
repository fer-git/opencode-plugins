import { describe, expect, it } from "vitest";

import { toWebSearchResults } from "../src/lib/citations.ts";
import { XAI_ORIGIN } from "../src/lib/constants.ts";

describe("toWebSearchResults", () => {
  it("returns no rows when the body has neither text nor urls", () => {
    expect(toWebSearchResults({})).toEqual([]);
  });

  it("falls back to an xAI web search row when there is text but no urls", () => {
    expect(toWebSearchResults({ output_text: "  hello  " })).toEqual([
      {
        url: `${XAI_ORIGIN}/`,
        title: "xAI web search",
        content: "hello",
        time: {},
      },
    ]);
  });

  it("uses citation urls and hostname titles", () => {
    const results = toWebSearchResults({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "See [[1]](https://example.com/a).",
              annotations: [{ type: "url_citation", url: "https://example.com/a" }],
            },
          ],
        },
      ],
    });
    expect(results).toEqual([
      {
        url: "https://example.com/a",
        title: "example.com",
        content: "See [[1]](https://example.com/a).",
        time: {},
      },
    ]);
  });

  it("ignores non-http citations", () => {
    expect(
      toWebSearchResults({
        citations: ["ftp://example.com/a", { url: "file:///tmp/a" }],
        output_text: "only text",
      }),
    ).toEqual([
      {
        url: `${XAI_ORIGIN}/`,
        title: "xAI web search",
        content: "only text",
        time: {},
      },
    ]);
  });
});
