import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PlopError } from "../src/index.js";
import { createTestClient } from "./helpers.js";

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

    const plop = createTestClient();
    const result = plop.webhooks.verify({ secret, signature, body });

    expect(result).toBe(true);
  });

  it("returns false for invalid signature", () => {
    const secret = "whsec_test_secret";
    const body = '{"event":"message.received","data":{}}';
    const signature = createSignature("wrong_secret", body);

    const plop = createTestClient();
    const result = plop.webhooks.verify({ secret, signature, body });

    expect(result).toBe(false);
  });

  it("returns false for tampered body", () => {
    const secret = "whsec_test_secret";
    const body = '{"event":"message.received","data":{}}';
    const signature = createSignature(secret, body);

    const plop = createTestClient();
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

    const plop = createTestClient();
    const result = plop.webhooks.verify({ secret, signature, body });

    expect(result).toBe(false);
  });

  it("accepts timestamp within tolerance", () => {
    const secret = "whsec_test_secret";
    const body = '{"event":"message.received","data":{}}';
    const recentTimestamp = Math.floor(Date.now() / 1000) - 60; // 1 min ago
    const signature = createSignature(secret, body, recentTimestamp);

    const plop = createTestClient();
    const result = plop.webhooks.verify({ secret, signature, body });

    expect(result).toBe(true);
  });

  it("throws PlopError for malformed signature", () => {
    const plop = createTestClient();

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
    const plop = createTestClient();

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
    const plop = createTestClient();
    const ts = Math.floor(Date.now() / 1000);

    const result = plop.webhooks.verify({
      secret: "whsec_test",
      signature: `t=${ts},v1=not_valid_hex_string`,
      body: "{}",
    });

    expect(result).toBe(false);
  });
});
