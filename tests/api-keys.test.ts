import { afterEach, describe, expect, it } from "vitest";
import { PlopError } from "../src/index.js";
import { createTestClient, mockFetchData, mockFetchError } from "./helpers.js";

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
      const mock = mockFetchData(rotateResponse);
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.apiKeys.rotate();

      expect(error).toBeNull();
      expect(data).toEqual(rotateResponse);
      expect(data!.key).toContain("plop_");

      const [url, init] = mock.mock.calls[0];
      expect(init.method).toBe("POST");
      expect(url).toContain("/v1/api-keys/rotate");
    });

    it("returns error for unauthorized", async () => {
      globalThis.fetch = mockFetchError("Unauthorized", 401);

      const plop = createTestClient();
      const { data, error } = await plop.apiKeys.rotate();

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(PlopError);
      expect(error!.status).toBe(401);
    });
  });
});
