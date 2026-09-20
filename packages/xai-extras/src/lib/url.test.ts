import { describe, expect, it } from "vitest";

import { isHttpUrl } from "./url.ts";

describe("isHttpUrl", () => {
  it("accepts http(s)", () => {
    expect(isHttpUrl("https://example.com/a.mp3")).toBe(true);
    expect(isHttpUrl("http://example.com/a.mp3")).toBe(true);
  });

  it("rejects other schemes", () => {
    expect(isHttpUrl("ftp://x/a.mp3")).toBe(false);
    expect(isHttpUrl("file:///tmp/a.mp3")).toBe(false);
    expect(isHttpUrl("/tmp/a.mp3")).toBe(false);
  });
});
