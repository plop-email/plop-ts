import { PlopError } from "./error.js";
import { ApiKeys } from "./resources/api-keys.js";
import { Mailboxes } from "./resources/mailboxes.js";
import { Messages } from "./resources/messages.js";
import { Webhooks } from "./resources/webhooks.js";
import type { ErrorResponse, PlopOptions, PlopResponse } from "./types.js";

const DEFAULT_BASE_URL = "https://api.plop.email";

export class Plop {
  readonly mailboxes: Mailboxes;
  readonly messages: Messages;
  readonly webhooks: Webhooks;
  readonly apiKeys: ApiKeys;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(opts?: PlopOptions) {
    const apiKey = opts?.apiKey ?? process.env.PLOP_API_KEY;
    if (!apiKey) {
      throw new PlopError(
        "Missing API key. Pass it to the constructor or set the PLOP_API_KEY environment variable.",
        401,
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (opts?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

    this.mailboxes = new Mailboxes(this);
    this.messages = new Messages(this);
    this.webhooks = new Webhooks(this);
    this.apiKeys = new ApiKeys(this);
  }

  async request<T>(
    method: string,
    path: string,
    query?: Record<string, string | undefined>,
    body?: unknown,
  ): Promise<PlopResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) {
      return {
        data: null,
        error: new PlopError(
          err instanceof Error ? err.message : "Network request failed",
          0,
        ),
      };
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let details: Record<string, string[]> | undefined;
      try {
        const body = (await response.json()) as ErrorResponse;
        if (body.error) {
          errorMessage = body.error;
        }
        details = body.details;
      } catch {
        // Ignore JSON parse errors, use default message
      }
      return {
        data: null,
        error: new PlopError(errorMessage, response.status, details),
      };
    }

    const responseBody = (await response.json()) as { data: T };
    return { data: responseBody.data, error: null };
  }

  /** Low-level streaming fetch for SSE endpoints. */
  async streamFetch(
    path: string,
    query?: Record<string, string | undefined>,
    signal?: AbortSignal,
  ): Promise<Response> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal,
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const body = (await response.json()) as ErrorResponse;
        if (body.error) errorMessage = body.error;
      } catch {
        // ignore
      }
      throw new PlopError(errorMessage, response.status);
    }

    return response;
  }
}
