import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { fileContents } from "./artifacts.ts";

describe("fileContents", () => {
  it("emits a file:// URI from a native path", () => {
    const path = join(tmpdir(), "imagine-1.png");
    expect(fileContents([{ path, mime: "image/png", name: "imagine-1.png" }])).toEqual([
      {
        type: "file",
        uri: pathToFileURL(path).href,
        mime: "image/png",
        name: "imagine-1.png",
      },
    ]);
  });
});
