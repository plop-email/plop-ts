import type { Plop } from "../client.js";
import type { ApiKeyRotateResponse, PlopResponse } from "../types.js";

export class ApiKeys {
  constructor(private readonly client: Plop) {}

  async rotate(): Promise<PlopResponse<ApiKeyRotateResponse>> {
    return this.client.request<ApiKeyRotateResponse>("POST", "/v1/api-keys/rotate");
  }
}
