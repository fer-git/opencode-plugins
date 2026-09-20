# opencode-xai-extras

## 0.0.2

### Patch Changes

- 9f1f7e4: Consistent brand copy: xAI in prose, `xai` in ids, Grok Imagine, X (Twitter), and “web search” except for the `websearch` tool/config key.
- 9f1f7e4: Plugin id is `ferspective07.xai-extras`. Install remains `opencode-xai-extras`. Disable with `-ferspective07.xai-extras`.
- 9f1f7e4: Web search queries shorter than 2 characters return no results. Clearer errors for failed downloads and unknown TTS voices.
- 9f1f7e4: Use Node file URL helpers so speech-to-text `file://` inputs and artifact attachments work on Windows. Ship the package-root `index.ts` loader file.

## 0.0.1

- Web search provider `xai`, plus tools `x_search`, `imagine_image`, `imagine_video`, `speech_to_text`, and `text_to_speech`.
- Uses OpenCode `/connect` for xAI (SuperGrok or API key).
