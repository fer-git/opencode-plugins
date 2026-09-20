export function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export function enumField<T extends string>(value: unknown, list: readonly T[], name: string): T {
  if (!(list as readonly string[]).includes(String(value))) {
    throw new Error(`${name} must be one of ${list.join(", ")}`);
  }
  return value as T;
}
