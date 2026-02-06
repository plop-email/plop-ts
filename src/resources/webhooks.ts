import { createHmac, timingSafeEqual } from "node:crypto";
import type { Plop } from "../client.js";
import { PlopError } from "../error.js";
import type {
  CreateWebhookParams,
  ListDeliveriesParams,
  PlopResponse,
  VerifyWebhookParams,
  WebhookCreatedResponse,
  WebhookDelivery,
  WebhookEndpoint,
} from "../types.js";

const SIGNATURE_TOLERANCE_SECONDS = 300; // 5 minutes

export class Webhooks {
  constructor(private readonly client: Plop) {}

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

  async list(): Promise<PlopResponse<WebhookEndpoint[]>> {
    return this.client.request<WebhookEndpoint[]>("GET", "/v1/webhooks");
  }

  async create(params: CreateWebhookParams): Promise<PlopResponse<WebhookCreatedResponse>> {
    return this.client.request<WebhookCreatedResponse>("POST", "/v1/webhooks", undefined, params);
  }

  async delete(id: string): Promise<PlopResponse<{ id: string }>> {
    return this.client.request<{ id: string }>(
      "DELETE",
      `/v1/webhooks/${encodeURIComponent(id)}`,
    );
  }

  async toggle(id: string, active: boolean): Promise<PlopResponse<{ id: string; active: boolean }>> {
    return this.client.request<{ id: string; active: boolean }>(
      "PATCH",
      `/v1/webhooks/${encodeURIComponent(id)}`,
      undefined,
      { active },
    );
  }

  async deliveries(
    id: string,
    params?: ListDeliveriesParams,
  ): Promise<PlopResponse<WebhookDelivery[]>> {
    const query: Record<string, string | undefined> = {};
    if (params?.limit !== undefined) query.limit = String(params.limit);
    if (params?.offset !== undefined) query.offset = String(params.offset);

    return this.client.request<WebhookDelivery[]>(
      "GET",
      `/v1/webhooks/${encodeURIComponent(id)}/deliveries`,
      Object.keys(query).length > 0 ? query : undefined,
    );
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
