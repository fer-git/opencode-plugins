import { describe, expect, it } from "vitest";

import plugin from "../src/index.ts";

describe("plugin export", () => {
  it("exports the public plugin id and a setup function", () => {
    expect(plugin.id).toBe("ferspective07.xai-extras");
    expect(typeof plugin.setup).toBe("function");
  });
});
