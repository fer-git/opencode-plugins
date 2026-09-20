import { downloadBytes, ensureArtifactsDir, writeArtifact } from "../lib/artifacts.ts";
import { XAI_URL } from "../lib/constants.ts";
import { parseXaiJson, xaiHttpError } from "../lib/errors.ts";
import { enumField, isHttpUrl } from "../lib/util.ts";

const VIDEO_ASPECT = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"] as const;
const VIDEO_RESOLUTION = ["480p", "720p", "1080p"] as const;
const VIDEO_POLL_MS = 5_000;

export const IMAGINE_VIDEO_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["prompt"],
  properties: {
    prompt: { type: "string", minLength: 1 },
    image_url: { type: "string" },
    duration: { type: "integer", minimum: 1, maximum: 15 },
    aspect_ratio: { type: "string", enum: [...VIDEO_ASPECT] },
    resolution: { type: "string", enum: [...VIDEO_RESOLUTION] },
  },
} as const;

export type ImagineVideoBody = {
  model: string;
  prompt: string;
  duration: number;
  aspect_ratio: (typeof VIDEO_ASPECT)[number];
  resolution: (typeof VIDEO_RESOLUTION)[number];
  image?: { url: string };
};

export function buildImagineVideoBody(
  input: Record<string, unknown>,
  model: string,
): ImagineVideoBody {
  if (typeof input.prompt !== "string" || !input.prompt.trim()) {
    throw new Error("imagine_video prompt is required");
  }
  const duration = input.duration === undefined || input.duration === null ? 8 : input.duration;
  if (
    typeof duration !== "number" ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 15
  ) {
    throw new Error("duration must be an integer from 1 to 15");
  }
  const body: ImagineVideoBody = {
    model,
    prompt: input.prompt.trim(),
    duration,
    aspect_ratio: "16:9",
    resolution: "480p",
  };
  if (input.aspect_ratio !== undefined && input.aspect_ratio !== null) {
    body.aspect_ratio = enumField(input.aspect_ratio, VIDEO_ASPECT, "aspect_ratio");
  }
  if (input.resolution !== undefined && input.resolution !== null) {
    body.resolution = enumField(input.resolution, VIDEO_RESOLUTION, "resolution");
  }
  if (input.image_url !== undefined && input.image_url !== null && input.image_url !== "") {
    if (!isHttpUrl(input.image_url)) {
      throw new Error("image_url must be an http(s) URL");
    }
    body.image = { url: input.image_url };
  }
  return body;
}

async function sleep(ms: number, signal: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new Error("aborted"));
      return;
    }
    const timer = setTimeout(onDone, ms);
    const onAbort = () => {
      cleanup();
      reject(signal.reason ?? new Error("aborted"));
    };
    function onDone() {
      cleanup();
      resolve();
    }
    function cleanup() {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    }
    signal.addEventListener("abort", onAbort);
  });
}

async function pollVideo(requestId: string, token: string, model: string, signal: AbortSignal) {
  while (true) {
    if (signal.aborted) throw new Error("imagine_video aborted");
    const response = await fetch(XAI_URL.video(requestId), {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    const raw = await response.text();
    if (!response.ok) {
      throw xaiHttpError({ kind: "video", model, status: response.status, body: raw });
    }
    const json = parseXaiJson(raw);
    const status = json.status;
    if (status === "pending") {
      await sleep(VIDEO_POLL_MS, signal);
      continue;
    }
    if (status === "expired") throw new Error("imagine_video request expired");
    if (status === "failed") {
      const err =
        json.error && typeof json.error === "object" && !Array.isArray(json.error)
          ? (json.error as { code?: unknown; message?: unknown })
          : undefined;
      throw new Error(
        `imagine_video failed: ${err?.code ?? "unknown"} ${err?.message ?? ""}`.trim(),
      );
    }
    if (status === "done") {
      const video =
        json.video && typeof json.video === "object" && !Array.isArray(json.video)
          ? (json.video as { url?: string | null; duration?: number; respect_moderation?: boolean })
          : undefined;
      if (video?.respect_moderation === false) {
        throw new Error("imagine_video was blocked by moderation");
      }
      if (!video?.url) throw new Error("imagine_video completed without a url");
      return { url: video.url, duration: video.duration };
    }
    await sleep(VIDEO_POLL_MS, signal);
  }
}

export async function runImagineVideo(input: {
  token: string;
  body: ImagineVideoBody;
  directory: string;
  artifactsDir: string;
  signal: AbortSignal;
}): Promise<{ path: string; mime: string; name: string; duration?: number }> {
  const start = await fetch(XAI_URL.videosGenerations, {
    method: "POST",
    signal: input.signal,
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.body),
  });
  const startRaw = await start.text();
  if (!start.ok) {
    throw xaiHttpError({
      kind: "video",
      model: input.body.model,
      status: start.status,
      body: startRaw,
    });
  }
  const started = parseXaiJson(startRaw);
  if (typeof started.request_id !== "string" || !started.request_id) {
    throw new Error("xAI video generation returned no request_id");
  }

  const video = await pollVideo(started.request_id, input.token, input.body.model, input.signal);
  const bytes = await downloadBytes(video.url, input.token, input.signal);
  const dir = await ensureArtifactsDir(input.directory, input.artifactsDir);
  const name = `imagine-video-${Date.now()}.mp4`;
  const path = await writeArtifact(dir, name, bytes);
  return { path, mime: "video/mp4", name, duration: video.duration };
}
