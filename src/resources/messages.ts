import type { Plop } from "../client.js";
import { PlopError } from "../error.js";
import type {
  ListMessagesParams,
  ListMessagesResponse,
  MessageDetail,
  MessageSummary,
  PlopResponse,
  StreamOptions,
  WaitForOptions,
} from "../types.js";

export class Messages {
  constructor(private readonly client: Plop) {}

  async list(
    params?: ListMessagesParams,
  ): Promise<PlopResponse<ListMessagesResponse>> {
    return this.client.request<ListMessagesResponse>(
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

  async delete(id: string): Promise<PlopResponse<{ id: string }>> {
    return this.client.request<{ id: string }>(
      "DELETE",
      `/v1/messages/${encodeURIComponent(id)}`,
    );
  }

  async *stream(
    params?: Pick<ListMessagesParams, "mailbox" | "tag" | "since">,
    options?: StreamOptions,
  ): AsyncGenerator<MessageSummary> {
    const query = params ? toQuery(params as ListMessagesParams) : undefined;

    const response = await this.client.streamFetch(
      "/v1/messages/stream",
      query,
      options?.signal,
    );

    if (!response.body) {
      throw new PlopError("No response body for stream", 0);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames: "event: <type>\ndata: <json>\n\n"
        const frames = buffer.split("\n\n");
        // Keep the last (potentially incomplete) chunk in buffer
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          if (!frame.trim()) continue;

          let eventType: string | undefined;
          let data: string | undefined;

          for (const line of frame.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              data = line.slice(6);
            }
          }

          if (eventType === "message.received" && data) {
            yield JSON.parse(data) as MessageSummary;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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
