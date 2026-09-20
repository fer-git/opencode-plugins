import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { PACKAGE_NAME } from "./constants.ts";

export type ArtifactFile = { path: string; mime: string; name: string };

export async function ensureArtifactsDir(directory: string, artifactsDir: string): Promise<string> {
  let dir = join(directory, artifactsDir);
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    dir = join(tmpdir(), PACKAGE_NAME);
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

export async function downloadBytes(
  url: string,
  token: string,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  let response = await fetch(url, { signal, headers });
  if (response.status === 401 || response.status === 403) {
    response = await fetch(url, { signal });
  }
  if (!response.ok) {
    throw new Error(`failed to download (${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function writeArtifact(dir: string, name: string, bytes: Uint8Array): Promise<string> {
  const path = join(dir, name);
  await writeFile(path, bytes);
  return path;
}

export function fileContents(files: Array<ArtifactFile>): Array<{
  type: "file";
  uri: string;
  mime: string;
  name: string;
}> {
  return files.map((file) => ({
    type: "file" as const,
    uri: pathToFileURL(file.path).href,
    mime: file.mime,
    name: file.name,
  }));
}
