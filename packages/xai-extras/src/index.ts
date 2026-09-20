// Auth: OpenCode /connect xAI SuperGrok. Do not import @opencode/plugin.

import {
  buildImagineImageBody,
  IMAGINE_IMAGE_INPUT_SCHEMA,
  runImagineImage,
} from "./features/imagine.ts";
import {
  buildSpeechToTextRequest,
  runSpeechToText,
  SPEECH_TO_TEXT_INPUT_SCHEMA,
} from "./features/stt.ts";
import {
  buildTextToSpeechBody,
  runTextToSpeech,
  TEXT_TO_SPEECH_INPUT_SCHEMA,
} from "./features/tts.ts";
import {
  buildImagineVideoBody,
  IMAGINE_VIDEO_INPUT_SCHEMA,
  runImagineVideo,
} from "./features/video.ts";
import { runWebSearch } from "./features/websearch.ts";
import { buildXSearchTool, runXSearch, X_SEARCH_INPUT_SCHEMA } from "./features/xsearch.ts";
import { isXaiAuthEvent, xaiBearer, xaiConnected } from "./lib/auth.ts";
import {
  DEFAULT_ARTIFACTS_DIR,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_SEARCH_MODEL,
  DEFAULT_STT_MODEL,
  DEFAULT_TTS_VOICE,
  DEFAULT_VIDEO_MODEL,
  MIN_QUERY_LENGTH,
  PLUGIN_ID,
  TIMEOUT_MS,
} from "./lib/constants.ts";
import { optionBoolean, optionString } from "./lib/options.ts";
import { fileContents } from "./lib/tool-content.ts";
import type { PluginContext } from "./lib/types.ts";
import { toHostWebSearchResults } from "./lib/websearch-host.ts";

function isAbortError(error: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true;
  return error instanceof Error && (error.name === "AbortError" || error.message === "aborted");
}

export default {
  id: PLUGIN_ID,
  async setup(ctx: PluginContext) {
    const searchModel = optionString(ctx.options.searchModel, DEFAULT_SEARCH_MODEL);
    const imageModel = optionString(ctx.options.imageModel, DEFAULT_IMAGE_MODEL);
    const videoModel = optionString(ctx.options.videoModel, DEFAULT_VIDEO_MODEL);
    const sttModel = optionString(ctx.options.sttModel, DEFAULT_STT_MODEL);
    const ttsVoice = optionString(ctx.options.ttsVoice, DEFAULT_TTS_VOICE);
    const enableWebsearch = optionBoolean(ctx.options.websearch, true);
    const artifactsDir = optionString(ctx.options.artifactsDir, DEFAULT_ARTIFACTS_DIR);
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
            if (q.length < MIN_QUERY_LENGTH) return [];
            const token = await xaiBearer(ctx);
            const { hits, answer } = await runWebSearch({
              token,
              query: q,
              model: searchModel,
              signal,
            });
            return toHostWebSearchResults(hits, answer);
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
            console.error(`${PLUGIN_ID} websearch auth watch ended`);
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
          const markdown = await runXSearch({
            token,
            query,
            tool: xTool,
            model: searchModel,
            signal: AbortSignal.timeout(TIMEOUT_MS.xSearch),
          });
          return { content: markdown };
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
          const { files } = await runImagineImage({
            token,
            body,
            directory: ctx.location.directory,
            artifactsDir,
            signal: AbortSignal.timeout(TIMEOUT_MS.image),
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
          const file = await runImagineVideo({
            token,
            body,
            directory: ctx.location.directory,
            artifactsDir,
            signal: AbortSignal.timeout(TIMEOUT_MS.video),
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
          const request = buildSpeechToTextRequest(input as Record<string, unknown>, sttModel);
          await tool.progress?.({ status: "speech_to_text" });
          const token = await xaiBearer(ctx);
          const result = await runSpeechToText({
            token,
            request,
            directory: ctx.location.directory,
            artifactsDir,
            signal: AbortSignal.timeout(TIMEOUT_MS.stt),
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
          const file = await runTextToSpeech({
            token,
            body,
            directory: ctx.location.directory,
            artifactsDir,
            signal: AbortSignal.timeout(TIMEOUT_MS.tts),
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
