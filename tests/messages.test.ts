import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Plop, PlopError } from "../src/index.js";

const TEST_API_KEY = "plop_" + "a".repeat(64);

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
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: message }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const plop = new Plop({ apiKey: TEST_API_KEY });
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

    const plop = new Plop({ apiKey: TEST_API_KEY });
    const result = await plop.messages.waitFor(
      { mailbox: "qa", tag: "verify" },
      { timeout: 10_000, interval: 10 },
    );

    expect(result).toEqual(message);
    expect(callCount).toBe(3);
  });

  it("throws PlopError on timeout", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: "No messages found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );

    const plop = new Plop({ apiKey: TEST_API_KEY });

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
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const plop = new Plop({ apiKey: TEST_API_KEY });

    await expect(
      plop.messages.waitFor(
        { mailbox: "qa", tag: "verify" },
        { timeout: 5_000, interval: 100 },
      ),
    ).rejects.toThrow("Unauthorized");
  });

  it("passes since parameter to filter by start time", async () => {
    const message = makeMessage();
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: message }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const plop = new Plop({ apiKey: TEST_API_KEY });
    await plop.messages.waitFor(
      { mailbox: "qa", tag: "verify" },
      { timeout: 5_000, interval: 100 },
    );

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("since=");
    expect(url).toContain("mailbox=qa");
    expect(url).toContain("tag=verify");
  });

  it("uses default timeout and interval", async () => {
    const message = makeMessage();
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: message }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const plop = new Plop({ apiKey: TEST_API_KEY });
    const result = await plop.messages.waitFor({ mailbox: "qa" });

    expect(result).toEqual(message);
  });

  describe("messages.latest", () => {
    it("requests the correct path with params", async () => {
      const message = makeMessage();
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: message }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      globalThis.fetch = mockFetch;

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.messages.latest({
        mailbox: "qa",
        tag: "otp",
      });

      expect(error).toBeNull();
      expect(data).toEqual(message);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/messages/latest");
      expect(url).toContain("mailbox=qa");
      expect(url).toContain("tag=otp");
    });

    it("returns error for 404", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: "No messages found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        ),
      );

      const plop = new Plop({ apiKey: TEST_API_KEY });
      const { data, error } = await plop.messages.latest({ mailbox: "qa" });

      expect(data).toBeNull();
      expect(error!.status).toBe(404);
      expect(error!.message).toBe("No messages found");
    });
  });
});
