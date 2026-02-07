import { afterEach, describe, expect, it, vi } from "vitest";
import { PlopError } from "../src/index.js";
import { createTestClient, mockFetchData, mockFetchError } from "./helpers.js";

const makeMessage = (overrides = {}) => ({
  id: "uuid-1",
  mailboxId: "mbox-1",
  mailbox: "qa",
  mailboxWithTag: "qa+verify",
  tag: "verify",
  from: "noreply@example.com",
  to: "qa+verify@in.plop.email",
  subject: "Verify your email",
  receivedAt: "2025-01-01T00:00:00Z",
  headers: [{ name: "From", value: "noreply@example.com" }],
  htmlContent: "<p>Code: 123456</p>",
  textContent: "Code: 123456",
  domain: "in.plop.email",
  tenantSubdomain: null,
  ...overrides,
});

describe("messages.waitFor", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns immediately if message is found on first poll", async () => {
    const message = makeMessage();
    globalThis.fetch = mockFetchData(message);

    const plop = createTestClient();
    const result = await plop.messages.waitFor(
      { mailbox: "qa", tag: "verify" },
      { timeout: 5_000, interval: 100 },
    );

    expect(result).toEqual(message);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("polls until message is found", async () => {
    const message = makeMessage();
    let callCount = 0;

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        return new Response(
          JSON.stringify({ error: "No messages found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ data: message }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const plop = createTestClient();
    const result = await plop.messages.waitFor(
      { mailbox: "qa", tag: "verify" },
      { timeout: 10_000, interval: 10 },
    );

    expect(result).toEqual(message);
    expect(callCount).toBe(3);
  });

  it("throws PlopError on timeout", async () => {
    globalThis.fetch = mockFetchError("No messages found", 404);

    const plop = createTestClient();

    await expect(
      plop.messages.waitFor(
        { mailbox: "qa", tag: "verify" },
        { timeout: 50, interval: 10 },
      ),
    ).rejects.toThrow("Timeout waiting for message");

    await expect(
      plop.messages.waitFor(
        { mailbox: "qa", tag: "verify" },
        { timeout: 50, interval: 10 },
      ),
    ).rejects.toBeInstanceOf(PlopError);
  });

  it("throws immediately on non-404 errors", async () => {
    globalThis.fetch = mockFetchError("Unauthorized", 401);

    const plop = createTestClient();

    await expect(
      plop.messages.waitFor(
        { mailbox: "qa", tag: "verify" },
        { timeout: 5_000, interval: 100 },
      ),
    ).rejects.toThrow("Unauthorized");
  });

  it("passes since parameter to filter by start time", async () => {
    const message = makeMessage();
    const mock = mockFetchData(message);
    globalThis.fetch = mock;

    const plop = createTestClient();
    await plop.messages.waitFor(
      { mailbox: "qa", tag: "verify" },
      { timeout: 5_000, interval: 100 },
    );

    const [url] = mock.mock.calls[0];
    expect(url).toContain("since=");
    expect(url).toContain("mailbox=qa");
    expect(url).toContain("tag=verify");
  });

  it("uses default timeout and interval", async () => {
    const message = makeMessage();
    globalThis.fetch = mockFetchData(message);

    const plop = createTestClient();
    const result = await plop.messages.waitFor({ mailbox: "qa" });

    expect(result).toEqual(message);
  });

  describe("messages.delete", () => {
    it("sends DELETE request", async () => {
      const mock = mockFetchData({ id: "uuid-1" });
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.messages.delete("uuid-1");

      expect(error).toBeNull();
      expect(data).toEqual({ id: "uuid-1" });

      const [url, init] = mock.mock.calls[0];
      expect(init.method).toBe("DELETE");
      expect(url).toContain("/v1/messages/uuid-1");
    });
  });

  describe("messages.stream", () => {
    it("yields messages from SSE stream", async () => {
      const msg1 = {
        id: "msg-1",
        mailboxId: "mbox-1",
        mailbox: "qa",
        mailboxWithTag: "qa",
        tag: null,
        from: "sender@example.com",
        to: "qa@in.plop.email",
        subject: "First",
        receivedAt: "2025-01-01T00:00:00Z",
      };
      const msg2 = {
        id: "msg-2",
        mailboxId: "mbox-1",
        mailbox: "qa",
        mailboxWithTag: "qa",
        tag: null,
        from: "sender@example.com",
        to: "qa@in.plop.email",
        subject: "Second",
        receivedAt: "2025-01-01T00:01:00Z",
      };

      const sseData =
        `event: message.received\ndata: ${JSON.stringify(msg1)}\n\n` +
        `event: heartbeat\ndata: {}\n\n` +
        `event: message.received\ndata: ${JSON.stringify(msg2)}\n\n`;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseData));
          controller.close();
        },
      });

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

      const plop = createTestClient();
      const messages = [];
      for await (const msg of plop.messages.stream({ mailbox: "qa" })) {
        messages.push(msg);
      }

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(msg1);
      expect(messages[1]).toEqual(msg2);
    });

    it("passes query params to stream endpoint", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const mock = vi.fn().mockResolvedValue(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );
      globalThis.fetch = mock;

      const plop = createTestClient();
      for await (const _ of plop.messages.stream({ mailbox: "qa", tag: "otp" })) {
        // drain
      }

      const [url] = mock.mock.calls[0];
      expect(url).toContain("/v1/messages/stream");
      expect(url).toContain("mailbox=qa");
      expect(url).toContain("tag=otp");
    });

    it("throws PlopError for non-OK response", async () => {
      globalThis.fetch = mockFetchError("Unauthorized", 401);

      const plop = createTestClient();

      let thrown: unknown;
      try {
        for await (const _ of plop.messages.stream()) {
          // drain
        }
      } catch (err) {
        thrown = err;
      }

      expect(thrown).toBeInstanceOf(PlopError);
    });
  });

  describe("messages.latest", () => {
    it("requests the correct path with params", async () => {
      const message = makeMessage();
      const mock = mockFetchData(message);
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.messages.latest({
        mailbox: "qa",
        tag: "otp",
      });

      expect(error).toBeNull();
      expect(data).toEqual(message);
      const [url] = mock.mock.calls[0];
      expect(url).toContain("/v1/messages/latest");
      expect(url).toContain("mailbox=qa");
      expect(url).toContain("tag=otp");
    });

    it("returns error for 404", async () => {
      globalThis.fetch = mockFetchError("No messages found", 404);

      const plop = createTestClient();
      const { data, error } = await plop.messages.latest({ mailbox: "qa" });

      expect(data).toBeNull();
      expect(error!.status).toBe(404);
      expect(error!.message).toBe("No messages found");
    });
  });
});
