#!/usr/bin/env node
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2]?.trim() ?? "";
if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error("usage: pnpm new-plugin <kebab-name>");
  console.error("  example: pnpm new-plugin session-foo");
  console.error("  npm name: opencode-session-foo");
  console.error("  plugin id: ferspective07.session-foo");
  process.exit(1);
}

const dirName = slug.replace(/^opencode-/, "");
const dest = join(root, "packages", dirName);
if (existsSync(dest)) {
  console.error(`already exists: packages/${dirName}`);
  process.exit(1);
}

const npmName = slug.startsWith("opencode-") ? slug : `opencode-${slug}`;
const pluginId = `ferspective07.${dirName}`;
cpSync(join(root, "templates", "plugin"), dest, { recursive: true });

for (const file of [
  "package.json",
  "README.md",
  "index.ts",
  "src/index.ts",
  "test/plugin.test.ts",
]) {
  const path = join(dest, file);
  writeFileSync(
    path,
    readFileSync(path, "utf8")
      .replaceAll("{{npmName}}", npmName)
      .replaceAll("{{pluginId}}", pluginId)
      .replaceAll("{{dirName}}", dirName),
  );
}

console.log(`created packages/${dirName}`);
console.log(`  npm:       ${npmName}`);
console.log(`  plugin id: ${pluginId}`);
console.log("add a row to the root README. user-facing first publish needs a changeset.");
