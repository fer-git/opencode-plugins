// Auth: OpenCode /connect xAI SuperGrok. Do not import @opencode/plugin.

import { fileContents } from "./lib/artifacts.ts";
import { isXaiAuthEvent, xaiBearer, xaiConnected } from "./lib/auth.ts";
import { toWebSearchResults } from "./lib/citations.ts";
import type { PluginContext } from "./lib/host.ts";
import {
  buildImagineImageBody,
  DEFAULT_IMAGE_MODEL,
  generateImagineImages,
  IMAGINE_IMAGE_INPUT_SCHEMA,
} from "./lib/imagine.ts";
import { optionBoolean, optionString } from "./lib/options.ts";
import { xaiResponses } from "./lib/responses.ts";
import {
  buildSpeechToTextRequest,
  DEFAULT_STT_MODEL,
  SPEECH_TO_TEXT_INPUT_SCHEMA,
  transcribeAudio,
} from "./lib/stt.ts";
import {
  buildTextToSpeechBody,
  DEFAULT_TTS_VOICE,
  generateSpeech,
  TEXT_TO_SPEECH_INPUT_SCHEMA,
} from "./lib/tts.ts";
import {
  buildImagineVideoBody,
  DEFAULT_VIDEO_MODEL,
  generateImagineVideo,
  IMAGINE_VIDEO_INPUT_SCHEMA,
  VIDEO_TIMEOUT_MS,
} from "./lib/video.ts";
import { buildXSearchTool, formatXSearchMarkdown, X_SEARCH_INPUT_SCHEMA } from "./lib/xsearch.ts";

const DEFAULT_SEARCH_MODEL = "grok-4.6";
const X_SEARCH_TIMEOUT_MS = 180_000;
const IMAGE_TIMEOUT_MS = 120_000;
const STT_TIMEOUT_MS = 180_000;
const TTS_TIMEOUT_MS = 120_000;

function isAbortError(error: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true;
  return error instanceof Error && (error.name === "AbortError" || error.message === "aborted");
}

export default {
  id: "ferspective07.xai-extras",
  async setup(ctx: PluginContext) {
    const searchModel = optionString(ctx.options.searchModel, DEFAULT_SEARCH_MODEL);
    const imageModel = optionString(ctx.options.imageModel, DEFAULT_IMAGE_MODEL);
    const videoModel = optionString(ctx.options.videoModel, DEFAULT_VIDEO_MODEL);
    const sttModel = optionString(ctx.options.sttModel, DEFAULT_STT_MODEL);
    const ttsVoice = optionString(ctx.options.ttsVoice, DEFAULT_TTS_VOICE);
    const enableWebsearch = optionBoolean(ctx.options.websearch, true);
    const artifactsDir = optionString(ctx.options.artifactsDir, ".opencode/artifacts");
    const source = { connected: await xaiConnected(ctx) };
    let disposeAuthWatch: (() => void) | undefined;

    if (enableWebsearch) {
      await ctx.websearch.transform((editor) => {
        // Offer only. Never editor.default.set — jsonc / TUI picker / KV own selection.
        // Never default.set(false) when disconnected — that disables all websearch.
        if (!source.connected) return;
        editor.add({
          id: "xai",
          name: "xAI",
          execute: async ({ query }, { signal }) => {
            const q = query.trim();
            // Do not throw: the host maps provider execute failures to HTTP 503.
            if (q.length < 2) return [];
            const token = await xaiBearer(ctx);
            const body = await xaiResponses({
              token,
              model: searchModel,
              query: q,
              tools: [{ type: "web_search" }],
              signal,
            });
            return toWebSearchResults(body);
          },
        });
      });

      const subscribe = ctx.event?.subscribe;
      if (typeof subscribe === "function") {
        const controller = new AbortController();
        void (async () => {
          try {
            for await (const event of subscribe({ signal: controller.signal })) {
              if (!isXaiAuthEvent(event?.type)) continue;
              const connected = await xaiConnected(ctx);
              if (connected === source.connected) continue;
              source.connected = connected;
              await ctx.websearch.reload();
            }
          } catch (error) {
            if (isAbortError(error, controller.signal)) return;
            console.error("ferspective07.xai-extras websearch auth watch ended");
          }
        })();
        disposeAuthWatch = () => controller.abort();
      }
    }

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "x_search",
        description:
          "Search X (Twitter) posts, users, and threads via xAI. Use for social posts and handles. For the public web, use websearch instead.",
        input: X_SEARCH_INPUT_SCHEMA,
        execute: async (input, tool) => {
          const { query, tool: xTool } = buildXSearchTool(input as Record<string, unknown>);
          await tool.progress?.({ status: "x_search", query });
          const token = await xaiBearer(ctx);
          const body = await xaiResponses({
            token,
            model: searchModel,
            query,
            tools: [xTool],
            signal: AbortSignal.timeout(X_SEARCH_TIMEOUT_MS),
          });
          return { content: formatXSearchMarkdown(body) };
        },
      });
      editor.add({
        name: "imagine_image",
        description:
          "Generate images with Grok Imagine (xAI SuperGrok). Saves files under .opencode/artifacts and returns them as attachments.",
        input: IMAGINE_IMAGE_INPUT_SCHEMA,
        execute: async (input, tool) => {
          const body = buildImagineImageBody(input as Record<string, unknown>, imageModel);
          await tool.progress?.({ status: "imagine_image", prompt: body.prompt });
          const token = await xaiBearer(ctx);
          const { files } = await generateImagineImages({
            token,
            body,
            directory: ctx.location.directory,
            artifactsDir,
            signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
          });
          return {
            content: [
              { type: "text", text: `Generated ${files.length} image(s).` },
              ...fileContents(files),
            ],
          };
        },
      });
      editor.add({
        name: "imagine_video",
        description:
          "Generate a short video with Grok Imagine (xAI SuperGrok). Text-to-video, optional image_url for image-to-video. Saves an mp4 under .opencode/artifacts.",
        input: IMAGINE_VIDEO_INPUT_SCHEMA,
        execute: async (input, tool) => {
          const body = buildImagineVideoBody(input as Record<string, unknown>, videoModel);
          await tool.progress?.({ status: "imagine_video", prompt: body.prompt });
          const token = await xaiBearer(ctx);
          const file = await generateImagineVideo({
            token,
            body,
            directory: ctx.location.directory,
            artifactsDir,
            signal: AbortSignal.timeout(VIDEO_TIMEOUT_MS),
          });
          return {
            content: [
              {
                type: "text",
                text: `Generated video${file.duration ? ` (${file.duration}s)` : ""}.`,
              },
              ...fileContents([file]),
            ],
          };
        },
      });
      editor.add({
        name: "speech_to_text",
        description:
          "Transcribe a local audio file or http(s) URL with Grok STT (xAI SuperGrok). Saves a .txt under .opencode/artifacts.",
        input: SPEECH_TO_TEXT_INPUT_SCHEMA,
        execute: async (input, tool) => {
          const request = await buildSpeechToTextRequest(
            input as Record<string, unknown>,
            sttModel,
          );
          await tool.progress?.({ status: "speech_to_text" });
          const token = await xaiBearer(ctx);
          const result = await transcribeAudio({
            token,
            request,
            directory: ctx.location.directory,
            artifactsDir,
            signal: AbortSignal.timeout(STT_TIMEOUT_MS),
          });
          const meta = [
            result.language ? `language ${result.language}` : "",
            result.duration !== undefined ? `${result.duration}s` : "",
          ]
            .filter(Boolean)
            .join(", ");
          return {
            content: [
              { type: "text", text: meta ? `${result.text}\n\n(${meta})` : result.text },
              ...fileContents([result.file]),
            ],
          };
        },
      });
      editor.add({
        name: "text_to_speech",
        description:
          "Synthesize speech from text with Grok TTS (xAI SuperGrok). Saves audio under .opencode/artifacts.",
        input: TEXT_TO_SPEECH_INPUT_SCHEMA,
        execute: async (input, tool) => {
          const body = buildTextToSpeechBody(input as Record<string, unknown>, ttsVoice);
          await tool.progress?.({ status: "text_to_speech", voice: body.voice_id });
          const token = await xaiBearer(ctx);
          const file = await generateSpeech({
            token,
            body,
            directory: ctx.location.directory,
            artifactsDir,
            signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
          });
          return {
            content: [{ type: "text", text: "Generated speech." }, ...fileContents([file])],
          };
        },
      });
    });

    return disposeAuthWatch;
  },
};
