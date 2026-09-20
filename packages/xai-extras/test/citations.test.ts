import { describe, expect, it } from "vitest";

import { collectHits, collectOutputText } from "../src/lib/citations.ts";

describe("collectHits", () => {
  it("returns no hits when the body has no urls", () => {
    expect(collectHits({})).toEqual([]);
    expect(collectHits({ output_text: "hello" })).toEqual([]);
  });

  it("uses citation urls and hostname titles", () => {
    expect(
      collectHits({
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
      }),
    ).toEqual([{ url: "https://example.com/a", title: "example.com" }]);
  });

  it("ignores non-http citations", () => {
    expect(
      collectHits({
        citations: ["ftp://example.com/a", { url: "file:///tmp/a" }],
      }),
    ).toEqual([]);
  });

  it("collects web_search_call sources without duplicating citation urls", () => {
    expect(
      collectHits({
        citations: ["https://example.com/a"],
        output: [
          {
            type: "web_search_call",
            action: { sources: [{ url: "https://example.com/a" }, "https://example.com/b"] },
          },
        ],
      }),
    ).toEqual([
      { url: "https://example.com/a", title: "example.com" },
      { url: "https://example.com/b", title: "example.com" },
    ]);
  });
});

describe("collectOutputText", () => {
  it("prefers output_text", () => {
    expect(collectOutputText({ output_text: "  hello  " })).toBe("hello");
  });

  it("joins message output_text parts", () => {
    expect(
      collectOutputText({
        output: [
          {
            type: "message",
            content: [
              { type: "output_text", text: "one" },
              { type: "output_text", text: "two" },
            ],
          },
        ],
      }),
    ).toBe("one\n\ntwo");
  });
});
