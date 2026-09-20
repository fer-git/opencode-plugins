# opencode-xai-extras

Adds [xAI](https://docs.x.ai) SuperGrok tools to [OpenCode](https://opencode.ai) V2: web search, X (Twitter) search, image and video generation, speech-to-text, and text-to-speech.

It uses the **same xAI account** as Grok chat. Sign in once with `/connect`.

## Requirements

- OpenCode V2 (Windows, macOS, or Linux)
- xAI connected in OpenCode: run `/connect` and choose **xAI** (SuperGrok or an API key)

This is not Grok Build. You do not paste a key into this plugin.

## Install

```sh
opencode plugin add opencode-xai-extras
```

**Git:**

```sh
opencode plugin add 'github:fer-git/opencode-plugins#main::path:packages/xai-extras'
```

**Local checkout** — in `opencode.jsonc` (global or project), set `plugins` to the absolute path of the `packages/xai-extras` directory (Windows: `C:/Users/you/opencode-plugins/packages/xai-extras`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-plugins/packages/xai-extras"],
}
```

Or the object form if you also pass [options](#options):

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-plugins/packages/xai-extras",
      "options": { "ttsVoice": "ara" },
    },
  ],
}
```

Disable (plugin id `ferspective07.xai-extras`):

```jsonc
{
  "plugins": ["-ferspective07.xai-extras"],
}
```

## Connect

1. In OpenCode, run `/connect`.
2. Choose **xAI**.
3. Finish SuperGrok sign-in (or paste an API key if that is how you connect).

Chat with Grok and these tools share that connection. If xAI is disconnected, tools ask you to run `/connect` again.

## Web search

The plugin **offers** an xAI engine (`id: "xai"`) for OpenCode’s built-in `websearch` tool. It does not switch the engine for you.

To use it, select **xAI** as the web search provider:

- In the TUI web search picker, or
- In config:

```jsonc
{
  "websearch": { "provider": "xai" },
}
```

xAI appears as a choice only while xAI is connected. Ask the agent to search the public web as usual.

## Agent tools

After install, the agent can call these tools. You can also ask in natural language (“generate an image of…”, “transcribe this file…”).

Files are written under `.opencode/artifacts` in the project (or `artifactsDir` if you set it). OpenCode’s TUI **does not play** audio or video; open the file from disk or the attachment.

This plugin does **not** record the microphone or type into the prompt box.

### `x_search`

Search X (Twitter). For the public web, use `websearch` instead.

| Field                        | Required | Notes                                              |
| ---------------------------- | -------- | -------------------------------------------------- |
| `query`                      | yes      | At least 2 characters                              |
| `allowed_x_handles`          | no       | Up to 20; do not combine with `excluded_x_handles` |
| `excluded_x_handles`         | no       | Up to 20                                           |
| `from_date` / `to_date`      | no       | `YYYY-MM-DD`                                       |
| `enable_image_understanding` | no       |                                                    |
| `enable_video_understanding` | no       |                                                    |

### `imagine_image`

Generate images with **Grok Imagine**.

| Field          | Required | Default | Notes                              |
| -------------- | -------- | ------- | ---------------------------------- |
| `prompt`       | yes      |         |                                    |
| `n`            | no       | `1`     | 1–10                               |
| `aspect_ratio` | no       |         | e.g. `1:1`, `16:9`, `9:16`, `auto` |
| `resolution`   | no       | `1k`    | `1k`, `1.5k`, `2k`                 |
| `quality`      | no       |         | `low`, `medium`, `auto`            |

### `imagine_video`

Generate video with **Grok Imagine**. Text-to-video, or image-to-video with `image_url`.

| Field          | Required | Default | Notes                                             |
| -------------- | -------- | ------- | ------------------------------------------------- |
| `prompt`       | yes      |         |                                                   |
| `image_url`    | no       |         | `http(s)` URL for image-to-video                  |
| `duration`     | no       | `8`     | 1–15 seconds                                      |
| `aspect_ratio` | no       | `16:9`  | `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3` |
| `resolution`   | no       | `480p`  | `480p`, `720p`, `1080p`                           |

Saves an `.mp4`. Generation can take several minutes.

### `speech_to_text`

Transcribe one local file **or** one `http(s)` URL (not both). Max file size 500 MB.

| Field      | Required              | Notes                                        |
| ---------- | --------------------- | -------------------------------------------- |
| `file`     | one of `file` / `url` | Path or `file://` URI                        |
| `url`      | one of `file` / `url` | `http` or `https` only                       |
| `language` | no                    | Required if `format` is true                 |
| `format`   | no                    | Inverse text normalization; needs `language` |
| `diarize`  | no                    | Speaker labels when xAI returns them         |

Saves a `.txt` and returns the transcript.

### `text_to_speech`

Speak text (max 60 000 characters). Saves an `.mp3`.

| Field      | Required | Default                      | Notes                                                                                                                                               |
| ---------- | -------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`     | yes      |                              | Empty or whitespace-only is rejected                                                                                                                |
| `voice_id` | no       | `eve` (or option `ttsVoice`) | Built-in ids such as `eve`, `ara`, or a custom xAI voice id                                                                                         |
| `language` | no       | `en`                         | `auto`, `en`, `ar-EG`, `ar-SA`, `ar-AE`, `bn`, `zh`, `fr`, `de`, `hi`, `id`, `it`, `ja`, `ko`, `pt-BR`, `pt-PT`, `ru`, `es-MX`, `es-ES`, `tr`, `vi` |
| `speed`    | no       | `1.0`                        | 0.7–1.5                                                                                                                                             |

## Options

Pass with the object form of `plugins` in `opencode.jsonc`.

| Option         | Default                     | Effect                                                 |
| -------------- | --------------------------- | ------------------------------------------------------ |
| `searchModel`  | `grok-4.6`                  | Model for web search and `x_search`                    |
| `imageModel`   | `grok-imagine-image-2.0`    | Grok Imagine images                                    |
| `videoModel`   | `grok-imagine-video-1.5`    | Grok Imagine video                                     |
| `sttModel`     | `grok-voice-transcribe-2.0` | Speech-to-text                                         |
| `ttsVoice`     | `eve`                       | Default TTS voice when the tool omits `voice_id`       |
| `websearch`    | `true`                      | Set `false` to stop offering the xAI web search engine |
| `artifactsDir` | `.opencode/artifacts`       | Directory under the project for generated files        |

## Troubleshooting

| What you see                               | What to do                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Run `/connect` and choose xAI              | xAI is not connected in OpenCode                                                     |
| xAI does not appear as a web search engine | Connect xAI; confirm the `websearch` option is not `false`; then pick provider `xai` |
| Web search still uses another engine       | Set `"websearch": { "provider": "xai" }` or choose xAI in the picker                 |
| No sound / no video playback in the TUI    | Expected. Open the file under `.opencode/artifacts`                                  |
| TTS rejected voice                         | Use a built-in id (e.g. `eve`) or set option `ttsVoice`                              |
