import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Plop, PlopError } from "../src/index.js";

const TEST_API_KEY = "plop_" + "a".repeat(64);

describe("Plop client", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.PLOP_API_KEY;

  beforeEach(() => {
    delete process.env.PLOP_API_KEY;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv) {
      process.env.PLOP_API_KEY = originalEnv;
    } else {
      delete process.env.PLOP_API_KEY;
    }
  });

  it("throws when no API key is provided", () => {
    expect(() => new Plop()).toThrow(PlopError);
    expect(() => new Plop()).toThrow("Missing API key");
  });

  it("reads API key from environment variable", () => {
    process.env.PLOP_API_KEY = TEST_API_KEY;
    const plop = new Plop();
    expect(plop).toBeInstanceOf(Plop);
  });

  it("prefers explicit API key over env var", () => {
    process.env.PLOP_API_KEY = "plop_" + "b".repeat(64);
    const plop = new Plop({ apiKey: TEST_API_KEY });
    expect(plop).toBeInstanceOf(Plop);
  });

  it("creates resource instances", () => {
    const plop = new Plop({ apiKey: TEST_API_KEY });
    expect(plop.mailboxes).toBeDefined();
    expect(plop.messages).toBeDefined();
    expect(plop.webhooks).toBeDefined();
    expect(plop.apiKeys).toBeDefined();
  });

  it("sends correct authorization header", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = mockFetch;

    const plop = new Plop({ apiKey: TEST_API_KEY });
    await plop.mailboxes.list();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe(`Bearer ${TEST_API_KEY}`);
  });

  it("uses custom base URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = mockFetch;

    const plop = new Plop({
      apiKey: TEST_API_KEY,
      baseUrl: "https://custom.api.com",
    });
    await plop.mailboxes.list();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("https://custom.api.com/v1/mailboxes");
  });

  it("strips trailing slash from base URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = mockFetch;

    const plop = new Plop({
      apiKey: TEST_API_KEY,
      baseUrl: "https://custom.api.com/",
    });
    await plop.mailboxes.list();

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain("//v1");
  });

  it("returns error for non-OK response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const plop = new Plop({ apiKey: TEST_API_KEY });
    const { data, error } = await plop.mailboxes.list();

    expect(data).toBeNull();
    expect(error).toBeInstanceOf(PlopError);
    expect(error!.status).toBe(401);
    expect(error!.message).toBe("Unauthorized");
  });

  it("returns error with details for validation errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Bad request",
          details: { limit: ["Must be between 1 and 200"] },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const plop = new Plop({ apiKey: TEST_API_KEY });
    const { data, error } = await plop.messages.list({ limit: 999 });

    expect(data).toBeNull();
    expect(error).toBeInstanceOf(PlopError);
    expect(error!.status).toBe(400);
    expect(error!.details).toEqual({ limit: ["Must be between 1 and 200"] });
  });

  it("handles network errors gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const plop = new Plop({ apiKey: TEST_API_KEY });
    const { data, error } = await plop.mailboxes.list();

    expect(data).toBeNull();
    expect(error).toBeInstanceOf(PlopError);
    expect(error!.status).toBe(0);
    expect(error!.message).toBe("Network error");
  });

  describe("mailboxes.list", () => {
    it("passes query parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      await plop.mailboxes.list({ mailbox: "qa" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("mailbox=qa");
    });

    it("returns mailbox data", async () => {
      const mailboxes = [
        {
          id: "uuid-1",
          name: "qa",
          domain: "in.plop.email",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
          address: "qa@in.plop.email",
        },
      ];
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: mailboxes }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.mailboxes.list();

      expect(error).toBeNull();
      expect(data).toEqual(mailboxes);
    });
  });

  describe("messages.list", () => {
    it("passes all query parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ data: { data: [], has_more: false } }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      await plop.messages.list({
        mailbox: "qa",
        tag: "login",
        limit: 10,
        since: "2025-01-01T00:00:00Z",
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("mailbox=qa");
      expect(url).toContain("tag=login");
      expect(url).toContain("limit=10");
      expect(url).toContain("since=2025-01-01T00%3A00%3A00Z");
    });

    it("passes after_id query parameter", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ data: { data: [], has_more: false } }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      await plop.messages.list({ after_id: "msg-123" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("after_id=msg-123");
    });

    it("returns list messages response with has_more", async () => {
      const response = { data: [], has_more: true };
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: response }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.messages.list();

      expect(error).toBeNull();
      expect(data).toEqual(response);
      expect(data!.has_more).toBe(true);
    });
  });

  describe("messages.get", () => {
    it("requests the correct path", async () => {
      const message = {
        id: "uuid-1",
        mailboxId: "mbox-1",
        mailbox: "qa",
        mailboxWithTag: "qa+login",
        tag: "login",
        from: "sender@example.com",
        to: "qa@in.plop.email",
        subject: "Test",
        receivedAt: "2025-01-01T00:00:00Z",
        headers: [],
        htmlContent: "<p>Hello</p>",
        textContent: "Hello",
        domain: "in.plop.email",
        tenantSubdomain: null,
      };
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: message }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.messages.get("uuid-1");

      expect(error).toBeNull();
      expect(data).toEqual(message);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/messages/uuid-1");
    });

    it("returns 404 error for missing message", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.messages.get("nonexistent");

      expect(data).toBeNull();
      expect(error!.status).toBe(404);
    });
  });
});
