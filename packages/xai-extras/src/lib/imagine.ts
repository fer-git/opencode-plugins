import { extname } from "node:path";

import {
  downloadBytes,
  ensureArtifactsDir,
  writeArtifact,
  type ArtifactFile,
} from "./artifacts.ts";
import { enumField } from "./enum.ts";
import { parseXaiJson, xaiHttpError } from "./errors.ts";

const IMAGE_ASPECT = [
  "1:1",
  "3:4",
  "4:3",
  "9:16",
  "16:9",
  "2:3",
  "3:2",
  "9:19.5",
  "19.5:9",
  "9:20",
  "20:9",
  "1:2",
  "2:1",
  "21:9",
  "5:2",
  "auto",
] as const;

const IMAGE_RESOLUTION = ["1k", "1.5k", "2k"] as const;
const IMAGE_QUALITY = ["low", "medium", "auto"] as const;
export const DEFAULT_IMAGE_MODEL = "grok-imagine-image-2.0";

export const IMAGINE_IMAGE_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["prompt"],
  properties: {
    prompt: { type: "string", minLength: 1 },
    n: { type: "integer", minimum: 1, maximum: 10 },
    aspect_ratio: { type: "string", enum: [...IMAGE_ASPECT] },
    resolution: { type: "string", enum: [...IMAGE_RESOLUTION] },
    quality: { type: "string", enum: [...IMAGE_QUALITY] },
  },
} as const;

export type ImagineImageBody = {
  model: string;
  prompt: string;
  n: number;
  aspect_ratio?: (typeof IMAGE_ASPECT)[number];
  resolution?: (typeof IMAGE_RESOLUTION)[number];
  quality?: "low" | "medium";
};

export function buildImagineImageBody(
  input: Record<string, unknown>,
  model: string,
): ImagineImageBody {
  if (typeof input.prompt !== "string" || !input.prompt.trim()) {
    throw new Error("imagine_image prompt is required");
  }
  const n = input.n === undefined || input.n === null ? 1 : input.n;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 10) {
    throw new Error("n must be an integer from 1 to 10");
  }
  const body: ImagineImageBody = {
    model,
    prompt: input.prompt.trim(),
    n,
    resolution: "1k",
  };
  if (input.aspect_ratio !== undefined && input.aspect_ratio !== null) {
    const aspect = enumField(input.aspect_ratio, IMAGE_ASPECT, "aspect_ratio");
    if (aspect !== "auto") body.aspect_ratio = aspect;
  }
  if (input.resolution !== undefined && input.resolution !== null) {
    body.resolution = enumField(input.resolution, IMAGE_RESOLUTION, "resolution");
  }
  if (input.quality !== undefined && input.quality !== null) {
    const quality = enumField(input.quality, IMAGE_QUALITY, "quality");
    if (quality !== "auto") body.quality = quality;
  }
  return body;
}

function extFromMime(mime: string | undefined, url: string): string {
  if (mime?.includes("png")) return "png";
  if (mime?.includes("webp")) return "webp";
  if (mime?.includes("jpeg") || mime?.includes("jpg")) return "jpg";
  const fromUrl = extname(new URL(url).pathname).replace(".", "");
  return fromUrl || "jpg";
}

export async function generateImagineImages(input: {
  token: string;
  body: ImagineImageBody;
  directory: string;
  artifactsDir: string;
  signal: AbortSignal;
}): Promise<{ files: ArtifactFile[] }> {
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    signal: input.signal,
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.body),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw xaiHttpError({
      kind: "image",
      model: input.body.model,
      status: response.status,
      body: raw,
    });
  }
  const json = parseXaiJson(raw);
  const rows = Array.isArray(json.data) ? json.data : [];
  if (!rows.length) throw new Error("xAI image generation returned no images");

  const dir = await ensureArtifactsDir(input.directory, input.artifactsDir);
  const files: ArtifactFile[] = [];
  const stamp = Date.now();
  for (const [i, row] of rows.entries()) {
    const item =
      row && typeof row === "object" && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
    const mime = typeof item.mime_type === "string" ? item.mime_type : "image/jpeg";
    let bytes: Uint8Array;
    let ext: string;
    if (typeof item.b64_json === "string") {
      bytes = Uint8Array.from(Buffer.from(item.b64_json, "base64"));
      ext = extFromMime(mime, "file.jpg");
    } else if (typeof item.url === "string") {
      ext = extFromMime(mime, item.url);
      bytes = await downloadBytes(item.url, input.token, input.signal);
    } else {
      throw new Error("image result missing url and b64_json");
    }
    const name = `imagine-${stamp}-${i}.${ext}`;
    const path = await writeArtifact(dir, name, bytes);
    files.push({ path, mime, name });
  }
  return { files };
}
