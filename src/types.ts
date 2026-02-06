export interface Mailbox {
  id: string;
  name: string;
  domain: string | null;
  createdAt: string;
  updatedAt: string;
  address: string;
}

export interface MessageSummary {
  id: string;
  mailboxId: string;
  mailbox: string;
  mailboxWithTag: string;
  tag: string | null;
  from: string;
  to: string;
  subject: string | null;
  receivedAt: string;
}

export interface MessageDetail extends MessageSummary {
  headers: Array<{ name: string; value: string }>;
  htmlContent: string | null;
  textContent: string | null;
  domain: string;
  tenantSubdomain: string | null;
}

export interface ListMailboxesParams {
  mailbox?: string;
}

export interface ListMessagesParams {
  mailbox?: string;
  tag?: string;
  tags?: string;
  q?: string;
  limit?: number;
  start?: string;
  end?: string;
  since?: string;
  to?: string;
  from?: string;
  subject?: string;
  after_id?: string;
}

export interface ListMessagesResponse {
  data: MessageSummary[];
  has_more: boolean;
}

export interface WaitForOptions {
  timeout?: number;
  interval?: number;
}

export interface StreamOptions {
  signal?: AbortSignal;
}

export interface VerifyWebhookParams {
  secret: string;
  signature: string;
  body: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  description: string | null;
  secretMasked: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  event: string;
  messageId: string | null;
  status: string;
  httpStatus: number | null;
  responseBody: string | null;
  latencyMs: number | null;
  attempt: number;
  error: string | null;
  createdAt: string;
}

export interface WebhookCreatedResponse {
  endpoint: WebhookEndpoint;
  secret: string;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  keyMasked: string;
  scopes: string[];
  mailboxName: string | null;
  expiresAt: string | null;
}

export interface ApiKeyRotateResponse {
  key: string;
  apiKey: ApiKeyInfo;
}

export interface CreateMailboxParams {
  name: string;
}

export interface UpdateMailboxParams {
  name: string;
}

export interface CreateWebhookParams {
  url: string;
  description?: string;
}

export interface ListDeliveriesParams {
  limit?: number;
  offset?: number;
}

export interface PlopOptions {
  apiKey?: string;
  baseUrl?: string;
}

export type PlopResponse<T> =
  | { data: T; error: null }
  | { data: null; error: import("./error.js").PlopError };

export interface ErrorResponse {
  error: string;
  details?: Record<string, string[]>;
}
