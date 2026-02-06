import type { Plop } from "../client.js";
import type {
  CreateMailboxParams,
  ListMailboxesParams,
  Mailbox,
  PlopResponse,
  UpdateMailboxParams,
} from "../types.js";

export class Mailboxes {
  constructor(private readonly client: Plop) {}

  async list(
    params?: ListMailboxesParams,
  ): Promise<PlopResponse<Mailbox[]>> {
    return this.client.request<Mailbox[]>("GET", "/v1/mailboxes", {
      mailbox: params?.mailbox,
    });
  }

  async create(params: CreateMailboxParams): Promise<PlopResponse<Mailbox>> {
    return this.client.request<Mailbox>("POST", "/v1/mailboxes", undefined, params);
  }

  async update(id: string, params: UpdateMailboxParams): Promise<PlopResponse<Mailbox>> {
    return this.client.request<Mailbox>(
      "PATCH",
      `/v1/mailboxes/${encodeURIComponent(id)}`,
      undefined,
      params,
    );
  }

  async delete(id: string): Promise<PlopResponse<{ id: string }>> {
    return this.client.request<{ id: string }>(
      "DELETE",
      `/v1/mailboxes/${encodeURIComponent(id)}`,
    );
  }
}
