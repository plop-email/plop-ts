import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { Plop, PlopError } from "../src/index.js";

const TEST_API_KEY = "plop_" + "a".repeat(64);

function createSignature(
  secret: string,
  body: string,
  timestamp?: number,
): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const hmac = createHmac("sha256", secret)
    .update(`${ts}.${body}`)
    .digest("hex");
  return `t=${ts},v1=${hmac}`;
}

describe("webhooks.verify", () => {
  it("returns true for valid signature", () => {
    const secret = "whsec_test_secret";
    const body = '{"event":"message.received","data":{}}';
    const signature = createSignature(secret, body);

    const plop = new Plop({ apiKey: TEST_API_KEY });
    const result = plop.webhooks.verify({ secret, signature, body });

    expect(result).toBe(true);
  });

  it("returns false for invalid signature", () => {
    const secret = "whsec_test_secret";
    const body = '{"event":"message.received","data":{}}';
    const signature = createSignature("wrong_secret", body);

    const plop = new Plop({ apiKey: TEST_API_KEY });
    const result = plop.webhooks.verify({ secret, signature, body });

    expect(result).toBe(false);
  });

  it("returns false for tampered body", () => {
    const secret = "whsec_test_secret";
    const body = '{"event":"message.received","data":{}}';
    const signature = createSignature(secret, body);

    const plop = new Plop({ apiKey: TEST_API_KEY });
    const result = plop.webhooks.verify({
      secret,
      signature,
      body: '{"event":"message.received","data":{"tampered":true}}',
    });

    expect(result).toBe(false);
  });

  it("returns false for expired timestamp", () => {
    const secret = "whsec_test_secret";
    const body = '{"event":"message.received","data":{}}';
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 min ago
    const signature = createSignature(secret, body, oldTimestamp);

    const plop = new Plop({ apiKey: TEST_API_KEY });
    const result = plop.webhooks.verify({ secret, signature, body });

    expect(result).toBe(false);
  });

  it("accepts timestamp within tolerance", () => {
    const secret = "whsec_test_secret";
    const body = '{"event":"message.received","data":{}}';
    const recentTimestamp = Math.floor(Date.now() / 1000) - 60; // 1 min ago
    const signature = createSignature(secret, body, recentTimestamp);

    const plop = new Plop({ apiKey: TEST_API_KEY });
    const result = plop.webhooks.verify({ secret, signature, body });

    expect(result).toBe(true);
  });

  it("throws PlopError for malformed signature", () => {
    const plop = new Plop({ apiKey: TEST_API_KEY });

    expect(() =>
      plop.webhooks.verify({
        secret: "whsec_test",
        signature: "invalid_format",
        body: "{}",
      }),
    ).toThrow(PlopError);

    expect(() =>
      plop.webhooks.verify({
        secret: "whsec_test",
        signature: "invalid_format",
        body: "{}",
      }),
    ).toThrow("Invalid webhook signature format");
  });

  it("throws PlopError for missing parts", () => {
    const plop = new Plop({ apiKey: TEST_API_KEY });

    expect(() =>
      plop.webhooks.verify({
        secret: "whsec_test",
        signature: "t=12345",
        body: "{}",
      }),
    ).toThrow("Invalid webhook signature format");

    expect(() =>
      plop.webhooks.verify({
        secret: "whsec_test",
        signature: "v1=abcdef",
        body: "{}",
      }),
    ).toThrow("Invalid webhook signature format");
  });

  it("returns false for non-hex v1 value", () => {
    const plop = new Plop({ apiKey: TEST_API_KEY });
    const ts = Math.floor(Date.now() / 1000);

    // Non-hex string will cause Buffer.from to produce different length
    const result = plop.webhooks.verify({
      secret: "whsec_test",
      signature: `t=${ts},v1=not_valid_hex_string`,
      body: "{}",
    });

    expect(result).toBe(false);
  });
});
