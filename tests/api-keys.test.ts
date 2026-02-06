import { afterEach, describe, expect, it, vi } from "vitest";
import { Plop, PlopError } from "../src/index.js";

const TEST_API_KEY = "plop_" + "a".repeat(64);

describe("apiKeys", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("rotate", () => {
    it("sends POST to rotate endpoint", async () => {
      const rotateResponse = {
        key: "plop_" + "b".repeat(64),
        apiKey: {
          id: "key-1",
          name: "Default",
          keyMasked: "plop_bb...bb",
          scopes: ["messages:read", "messages:write"],
          mailboxName: null,
          expiresAt: null,
        },
      };
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: rotateResponse }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.apiKeys.rotate();

      expect(error).toBeNull();
      expect(data).toEqual(rotateResponse);
      expect(data!.key).toContain("plop_");

      const [url, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("POST");
      expect(url).toContain("/v1/api-keys/rotate");
    });

    it("returns error for unauthorized", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.apiKeys.rotate();

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(PlopError);
      expect(error!.status).toBe(401);
    });
  });
});
