import { afterEach, describe, expect, it } from "vitest";
import { PlopError } from "../src/index.js";
import { createTestClient, mockFetchData, mockFetchError } from "./helpers.js";

describe("mailboxes", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("create", () => {
    it("sends POST with body", async () => {
      const mailbox = {
        id: "uuid-1",
        name: "staging",
        domain: "in.plop.email",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        address: "staging@in.plop.email",
      };
      const mock = mockFetchData(mailbox);
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.mailboxes.create({ name: "staging" });

      expect(error).toBeNull();
      expect(data).toEqual(mailbox);

      const [url, init] = mock.mock.calls[0];
      expect(init.method).toBe("POST");
      expect(url).toContain("/v1/mailboxes");
      expect(JSON.parse(init.body)).toEqual({ name: "staging" });
      expect(init.headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("update", () => {
    it("sends PATCH with body", async () => {
      const mailbox = {
        id: "uuid-1",
        name: "production",
        domain: "in.plop.email",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
        address: "production@in.plop.email",
      };
      const mock = mockFetchData(mailbox);
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.mailboxes.update("uuid-1", {
        name: "production",
      });

      expect(error).toBeNull();
      expect(data).toEqual(mailbox);

      const [url, init] = mock.mock.calls[0];
      expect(init.method).toBe("PATCH");
      expect(url).toContain("/v1/mailboxes/uuid-1");
      expect(JSON.parse(init.body)).toEqual({ name: "production" });
    });
  });

  describe("delete", () => {
    it("sends DELETE request", async () => {
      const mock = mockFetchData({ id: "uuid-1" });
      globalThis.fetch = mock;

      const plop = createTestClient();
      const { data, error } = await plop.mailboxes.delete("uuid-1");

      expect(error).toBeNull();
      expect(data).toEqual({ id: "uuid-1" });

      const [url, init] = mock.mock.calls[0];
      expect(init.method).toBe("DELETE");
      expect(url).toContain("/v1/mailboxes/uuid-1");
    });

    it("returns error for not found", async () => {
      globalThis.fetch = mockFetchError("Not found", 404);

      const plop = createTestClient();
      const { data, error } = await plop.mailboxes.delete("nonexistent");

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(PlopError);
      expect(error!.status).toBe(404);
    });
  });
});
