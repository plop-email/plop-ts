/**
 * Convert an object of key-value pairs into a query record suitable for
 * `Plop.request`. Converts all non-undefined values to strings.
 */
export function toQuery(
  params?: object,
): Record<string, string | undefined> | undefined {
  if (!params) return undefined;
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query[key] = String(value);
    }
  }
  return query;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
