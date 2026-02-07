import { afterEach, describe, expect, it } from "vitest";
import { createTestClient, mockFetchData } from "./helpers.js";

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
      const mock = mockFetchData(endpoints);
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.webhooks.list();

      expect(error).toBeNull();
      expect(data).toEqual(endpoints);

      const [url, init] = mock.mock.calls[0];
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
      const mock = mockFetchData(created);
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.webhooks.create({
        url: "https://example.com/webhook",
        description: "My webhook",
      });

      expect(error).toBeNull();
      expect(data).toEqual(created);
      expect(data!.secret).toBe("whsec_full_secret_value");

      const [, init] = mock.mock.calls[0];
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({
        url: "https://example.com/webhook",
        description: "My webhook",
      });
    });
  });

  describe("delete", () => {
    it("sends DELETE request", async () => {
      const mock = mockFetchData({ id: "wh-1" });
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.webhooks.delete("wh-1");

      expect(error).toBeNull();
      expect(data).toEqual({ id: "wh-1" });

      const [url, init] = mock.mock.calls[0];
      expect(init.method).toBe("DELETE");
      expect(url).toContain("/v1/webhooks/wh-1");
    });
  });

  describe("toggle", () => {
    it("sends PATCH with active flag", async () => {
      const mock = mockFetchData({ id: "wh-1", active: false });
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.webhooks.toggle("wh-1", false);

      expect(error).toBeNull();
      expect(data).toEqual({ id: "wh-1", active: false });

      const [url, init] = mock.mock.calls[0];
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
      const mock = mockFetchData(deliveries);
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.webhooks.deliveries("wh-1", {
        limit: 10,
        offset: 5,
      });

      expect(error).toBeNull();
      expect(data).toEqual(deliveries);

      const [url] = mock.mock.calls[0];
      expect(url).toContain("/v1/webhooks/wh-1/deliveries");
      expect(url).toContain("limit=10");
      expect(url).toContain("offset=5");
    });

    it("works without params", async () => {
      const mock = mockFetchData([]);
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.webhooks.deliveries("wh-1");

      expect(error).toBeNull();
      expect(data).toEqual([]);

      const [url] = mock.mock.calls[0];
      expect(url).toContain("/v1/webhooks/wh-1/deliveries");
      expect(url).not.toContain("limit=");
      expect(url).not.toContain("offset=");
    });
  });
});
