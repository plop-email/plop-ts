import { afterEach, describe, expect, it, vi } from "vitest";
import { Plop, PlopError } from "../src/index.js";

const TEST_API_KEY = "plop_" + "a".repeat(64);

describe("webhooks API", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("list", () => {
    it("sends GET to webhooks endpoint", async () => {
      const endpoints = [
        {
          id: "wh-1",
          url: "https://example.com/webhook",
          description: "Test webhook",
          secretMasked: "whsec_...abc",
          events: ["message.received"],
          active: true,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
      ];
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: endpoints }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.webhooks.list();

      expect(error).toBeNull();
      expect(data).toEqual(endpoints);

      const [url, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("GET");
      expect(url).toContain("/v1/webhooks");
    });
  });

  describe("create", () => {
    it("sends POST with body and returns secret", async () => {
      const created = {
        endpoint: {
          id: "wh-1",
          url: "https://example.com/webhook",
          description: "My webhook",
          secretMasked: "whsec_...abc",
          events: ["message.received"],
          active: true,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
        secret: "whsec_full_secret_value",
      };
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: created }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.webhooks.create({
        url: "https://example.com/webhook",
        description: "My webhook",
      });

      expect(error).toBeNull();
      expect(data).toEqual(created);
      expect(data!.secret).toBe("whsec_full_secret_value");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({
        url: "https://example.com/webhook",
        description: "My webhook",
      });
    });
  });

  describe("delete", () => {
    it("sends DELETE request", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { id: "wh-1" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.webhooks.delete("wh-1");

      expect(error).toBeNull();
      expect(data).toEqual({ id: "wh-1" });

      const [url, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("DELETE");
      expect(url).toContain("/v1/webhooks/wh-1");
    });
  });

  describe("toggle", () => {
    it("sends PATCH with active flag", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ data: { id: "wh-1", active: false } }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.webhooks.toggle("wh-1", false);

      expect(error).toBeNull();
      expect(data).toEqual({ id: "wh-1", active: false });

      const [url, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("PATCH");
      expect(url).toContain("/v1/webhooks/wh-1");
      expect(JSON.parse(init.body)).toEqual({ active: false });
    });
  });

  describe("deliveries", () => {
    it("sends GET with query params", async () => {
      const deliveries = [
        {
          id: "del-1",
          event: "message.received",
          messageId: "msg-1",
          status: "success",
          httpStatus: 200,
          responseBody: "OK",
          latencyMs: 150,
          attempt: 1,
          error: null,
          createdAt: "2025-01-01T00:00:00Z",
        },
      ];
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: deliveries }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.webhooks.deliveries("wh-1", {
        limit: 10,
        offset: 5,
      });

      expect(error).toBeNull();
      expect(data).toEqual(deliveries);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/webhooks/wh-1/deliveries");
      expect(url).toContain("limit=10");
      expect(url).toContain("offset=5");
    });

    it("works without params", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.webhooks.deliveries("wh-1");

      expect(error).toBeNull();
      expect(data).toEqual([]);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/webhooks/wh-1/deliveries");
      expect(url).not.toContain("limit=");
      expect(url).not.toContain("offset=");
    });
  });
});
