import { createHmac, timingSafeEqual } from "node:crypto";
import { PlopError } from "../error.js";
import type { VerifyWebhookParams } from "../types.js";

const SIGNATURE_TOLERANCE_SECONDS = 300; // 5 minutes

export class Webhooks {
  verify(params: VerifyWebhookParams): boolean {
    const { secret, signature, body } = params;

    const parts = parseSignature(signature);
    if (!parts) {
      throw new PlopError("Invalid webhook signature format", 400);
    }

    const { timestamp, v1 } = parts;

    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
      return false;
    }

    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");

    // Constant-time comparison
    try {
      return timingSafeEqual(
        Buffer.from(v1, "hex"),
        Buffer.from(expected, "hex"),
      );
    } catch {
      return false;
    }
  }
}

function parseSignature(
  signature: string,
): { timestamp: number; v1: string } | null {
  const parts = signature.split(",");
  let timestamp: number | undefined;
  let v1: string | undefined;

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (key === "t" && value) {
      timestamp = Number.parseInt(value, 10);
      if (Number.isNaN(timestamp)) return null;
    } else if (key === "v1" && value) {
      v1 = value;
    }
  }

  if (timestamp === undefined || v1 === undefined) return null;
  return { timestamp, v1 };
}
