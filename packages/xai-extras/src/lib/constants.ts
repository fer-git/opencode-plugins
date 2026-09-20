export const PLUGIN_ID = "ferspective07.xai-extras";
export const PACKAGE_NAME = "opencode-xai-extras";

export const XAI_ORIGIN = "https://x.ai";
export const XAI_API_BASE = "https://api.x.ai/v1";
export const XAI_MODELS_DOCS = "https://docs.x.ai/developers/models";

export const XAI_URL = {
  responses: `${XAI_API_BASE}/responses`,
  imagesGenerations: `${XAI_API_BASE}/images/generations`,
  videosGenerations: `${XAI_API_BASE}/videos/generations`,
  video: (requestId: string) => `${XAI_API_BASE}/videos/${requestId}`,
  stt: `${XAI_API_BASE}/stt`,
  tts: `${XAI_API_BASE}/tts`,
} as const;

export const DEFAULT_ARTIFACTS_DIR = ".opencode/artifacts";
export const DEFAULT_SEARCH_MODEL = "grok-4.6";
export const DEFAULT_IMAGE_MODEL = "grok-imagine-image-2.0";
export const DEFAULT_VIDEO_MODEL = "grok-imagine-video-1.5";
export const DEFAULT_STT_MODEL = "grok-voice-transcribe-2.0";
export const DEFAULT_TTS_VOICE = "eve";

export const MIN_QUERY_LENGTH = 2;

export const TIMEOUT_MS = {
  xSearch: 180_000,
  image: 120_000,
  stt: 180_000,
  tts: 120_000,
  video: 10 * 60 * 1000,
} as const;
