import { vi } from "vitest";
import { Plop } from "../src/index.js";

export const TEST_API_KEY = "plop_" + "a".repeat(64);

/** Create a Plop client with the test API key. */
export function createTestClient(): Plop {
  return new Plop({ apiKey: TEST_API_KEY });
}

/** Create a JSON Response for mocking fetch. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Create a mock fetch that returns a successful JSON `{ data }` response. */
export function mockFetchData(data: unknown): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue(jsonResponse({ data }));
}

/** Create a mock fetch that returns an error response. */
export function mockFetchError(
  error: string,
  status: number,
  details?: Record<string, string[]>,
): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue(jsonResponse({ error, details }, status));
}
