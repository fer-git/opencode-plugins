import { CONNECT_MESSAGE } from "./constants.ts";
import type { IntegrationCtx } from "./types.ts";

type Credential = {
  type?: string;
  access?: string;
  key?: string;
};

function bearerToken(credential: Credential | undefined): string | undefined {
  if (!credential) return undefined;
  if (credential.type === "oauth" && credential.access) return credential.access;
  if (credential.type === "key" && credential.key) return credential.key;
  return undefined;
}

export async function xaiConnected(ctx: IntegrationCtx): Promise<boolean> {
  return Boolean(await ctx.integration.connection.active("xai"));
}

export function isXaiAuthEvent(type: unknown): boolean {
  return (
    type === "credential.updated" ||
    type === "credential.switched" ||
    type === "integration.updated"
  );
}

export async function xaiBearer(ctx: IntegrationCtx): Promise<string> {
  const connection = await ctx.integration.connection.active("xai");
  const credential = connection
    ? ((await ctx.integration.connection.resolve(connection)) as Credential | undefined)
    : undefined;
  const token = bearerToken(credential);
  if (!token) {
    throw new Error(CONNECT_MESSAGE);
  }
  return token;
}
