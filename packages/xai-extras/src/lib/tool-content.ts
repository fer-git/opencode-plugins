import { pathToFileURL } from "node:url";

import type { ArtifactFile } from "./artifacts.ts";

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
