import { describe, expect, it } from "vitest";

import plugin from "../src/index.ts";
import { PLUGIN_ID } from "../src/lib/constants.ts";

describe("plugin export", () => {
  it("exports the namespaced id and a setup function", () => {
    expect(plugin.id).toBe(PLUGIN_ID);
    expect(typeof plugin.setup).toBe("function");
  });
});
