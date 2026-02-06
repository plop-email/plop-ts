import type { Plop } from "../client.js";
import type { ListMailboxesParams, Mailbox, PlopResponse } from "../types.js";

export class Mailboxes {
  constructor(private readonly client: Plop) {}

  async list(
    params?: ListMailboxesParams,
  ): Promise<PlopResponse<Mailbox[]>> {
    return this.client.request<Mailbox[]>("GET", "/v1/mailboxes", {
      mailbox: params?.mailbox,
    });
  }
}
