export type PluginOptions = Record<string, unknown>;

export type IntegrationCtx = {
  integration: {
    connection: {
      active: (id: string) => Promise<unknown>;
      resolve: (connection: unknown) => Promise<unknown>;
    };
  };
};

export type WebSearchEditor = {
  add: (provider: {
    id: string;
    name: string;
    execute: (input: { query: string }, ctx: { signal: AbortSignal }) => Promise<unknown>;
  }) => void;
};

export type ToolContext = {
  progress?: (meta: Record<string, unknown>) => Promise<unknown> | unknown;
};

export type ToolEditor = {
  add: (tool: {
    name: string;
    description: string;
    input: unknown;
    execute: (input: unknown, tool: ToolContext) => Promise<unknown>;
  }) => void;
};

export type PluginContext = IntegrationCtx & {
  options: PluginOptions;
  location: { directory: string };
  websearch: {
    transform: (callback: (editor: WebSearchEditor) => void) => Promise<unknown>;
    reload: () => Promise<unknown>;
  };
  tool: {
    transform: (callback: (editor: ToolEditor) => void) => Promise<unknown>;
  };
  event?: {
    subscribe: (options: { signal?: AbortSignal }) => AsyncIterable<{ type?: unknown }>;
  };
};
