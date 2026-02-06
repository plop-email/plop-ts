import type { Plop } from "../client.js";
import { PlopError } from "../error.js";
import type {
  ListMessagesParams,
  MessageDetail,
  MessageSummary,
  PlopResponse,
  WaitForOptions,
} from "../types.js";

export class Messages {
  constructor(private readonly client: Plop) {}

  async list(
    params?: ListMessagesParams,
  ): Promise<PlopResponse<MessageSummary[]>> {
    return this.client.request<MessageSummary[]>(
      "GET",
      "/v1/messages",
      toQuery(params),
    );
  }

  async get(id: string): Promise<PlopResponse<MessageDetail>> {
    return this.client.request<MessageDetail>(
      "GET",
      `/v1/messages/${encodeURIComponent(id)}`,
    );
  }

  async latest(
    params?: ListMessagesParams,
  ): Promise<PlopResponse<MessageDetail>> {
    return this.client.request<MessageDetail>(
      "GET",
      "/v1/messages/latest",
      toQuery(params),
    );
  }

  async waitFor(
    params?: ListMessagesParams,
    options?: WaitForOptions,
  ): Promise<MessageDetail> {
    const timeout = options?.timeout ?? 30_000;
    const interval = options?.interval ?? 1_000;
    const startTime = new Date().toISOString();
    const deadline = Date.now() + timeout;

    const query: ListMessagesParams = { ...params, since: startTime };

    while (Date.now() < deadline) {
      const { data, error } = await this.latest(query);

      if (data) {
        return data;
      }

      // If we got an error other than 404, throw it
      if (error && error.status !== 404) {
        throw error;
      }

      // Check if we'll exceed deadline after sleeping
      if (Date.now() + interval > deadline) {
        break;
      }

      await sleep(interval);
    }

    throw new PlopError("Timeout waiting for message", 408);
  }
}

function toQuery(
  params?: ListMessagesParams,
): Record<string, string | undefined> | undefined {
  if (!params) return undefined;
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query[key] = String(value);
    }
  }
  return query;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
