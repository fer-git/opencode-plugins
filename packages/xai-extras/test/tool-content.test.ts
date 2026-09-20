import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { fileContents } from "../src/lib/tool-content.ts";

describe("fileContents", () => {
  it("emits a file URI that round-trips to the native path", () => {
    const path = join(tmpdir(), "imagine-1.png");
    const [part] = fileContents([{ path, mime: "image/png", name: "imagine-1.png" }]);
    expect(part?.type).toBe("file");
    expect(part?.mime).toBe("image/png");
    expect(part?.name).toBe("imagine-1.png");
    expect(part?.uri.startsWith("file:")).toBe(true);
    expect(fileURLToPath(part!.uri)).toBe(path);
  });
});
