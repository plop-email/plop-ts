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
}

export interface WaitForOptions {
  timeout?: number;
  interval?: number;
}

export interface VerifyWebhookParams {
  secret: string;
  signature: string;
  body: string;
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
