# @plop/sdk

TypeScript SDK for the [Plop](https://plop.email) email service. Zero runtime dependencies.

## Installation

```bash
npm install @plop/sdk
# or
bun add @plop/sdk
# or
pnpm add @plop/sdk
```

## Quick Start

```typescript
import { Plop } from "@plop/sdk";

const plop = new Plop({ apiKey: "plop_..." });
// or set PLOP_API_KEY env var and omit the key:
// const plop = new Plop();

// List mailboxes
const { data: mailboxes } = await plop.mailboxes.list();

// List messages
const { data: messages } = await plop.messages.list({
  mailbox: "qa",
  tag: "login",
  limit: 10,
});

// Get a specific message
const { data: message } = await plop.messages.get("message-uuid");

// Get the latest message
const { data: latest } = await plop.messages.latest({
  mailbox: "qa",
  tag: "otp",
});
```

## waitFor -- Poll for New Messages

The standout feature for testing workflows. Polls until a matching message arrives or the timeout expires.

```typescript
// Wait up to 30s for a verification email
const email = await plop.messages.waitFor(
  { mailbox: "qa", tag: "verification" },
  { timeout: 30_000, interval: 1_000 },
);

console.log(email.subject);      // "Verify your email"
console.log(email.textContent);   // "Your code is 123456"
```

Throws `PlopError` with message `"Timeout waiting for message"` if no message is found within the timeout.

## API Reference

### `new Plop(options?)`

| Option    | Type     | Default                       | Description                |
|-----------|----------|-------------------------------|----------------------------|
| `apiKey`  | `string` | `process.env.PLOP_API_KEY`    | Your Plop API key          |
| `baseUrl` | `string` | `https://api.plop.email`      | API base URL               |

### `plop.mailboxes.list(params?)`

List mailboxes. Returns `PlopResponse<Mailbox[]>`.

| Param     | Type     | Description                                  |
|-----------|----------|----------------------------------------------|
| `mailbox` | `string` | Filter by local part or full address         |

### `plop.messages.list(params?)`

List messages. Returns `PlopResponse<MessageSummary[]>`.

| Param     | Type     | Description                                  |
|-----------|----------|----------------------------------------------|
| `mailbox` | `string` | Filter by mailbox name                       |
| `tag`     | `string` | Filter by tag                                |
| `tags`    | `string` | Filter by multiple tags                      |
| `q`       | `string` | Full-text search                             |
| `limit`   | `number` | Results per page (1-200, default 50)         |
| `start`   | `string` | Start date (YYYY-MM-DD)                      |
| `end`     | `string` | End date (YYYY-MM-DD)                        |
| `since`   | `string` | Messages since ISO 8601 timestamp            |
| `to`      | `string` | Filter by recipient                          |
| `from`    | `string` | Filter by sender                             |
| `subject` | `string` | Filter by subject                            |

### `plop.messages.get(id)`

Get a message by ID. Returns `PlopResponse<MessageDetail>`.

### `plop.messages.latest(params?)`

Get the latest matching message. Returns `PlopResponse<MessageDetail>`. Accepts the same params as `list` (except `limit`).

### `plop.messages.waitFor(params?, options?)`

Poll for a new message. Returns `Promise<MessageDetail>`. Throws `PlopError` on timeout.

| Option     | Type     | Default  | Description                      |
|------------|----------|----------|----------------------------------|
| `timeout`  | `number` | `30000`  | Max wait time in milliseconds    |
| `interval` | `number` | `1000`   | Polling interval in milliseconds |

### `plop.webhooks.verify(params)`

Verify a webhook signature. Returns `boolean`.

| Param       | Type     | Description                                   |
|-------------|----------|-----------------------------------------------|
| `secret`    | `string` | Your webhook secret                           |
| `signature` | `string` | Value of the `X-Plop-Signature` header        |
| `body`      | `string` | Raw request body                              |

## Error Handling

All resource methods (except `waitFor`) return `{ data, error }`:

```typescript
const { data, error } = await plop.messages.list();

if (error) {
  console.error(error.message);  // Error message from the API
  console.error(error.status);   // HTTP status code
  console.error(error.details);  // Validation details (if any)
  return;
}

// data is typed and non-null here
console.log(data);
```

`waitFor` throws directly since it is designed for test contexts:

```typescript
try {
  const email = await plop.messages.waitFor({ mailbox: "qa", tag: "otp" });
} catch (err) {
  if (err instanceof PlopError) {
    console.error(err.message); // "Timeout waiting for message"
  }
}
```

## Types

All types are exported:

```typescript
import type {
  Mailbox,
  MessageSummary,
  MessageDetail,
  PlopResponse,
  PlopError,
  ListMailboxesParams,
  ListMessagesParams,
  WaitForOptions,
  VerifyWebhookParams,
} from "@plop/sdk";
```

## Requirements

- Node.js 18+ (uses native `fetch` and `crypto`)
- TypeScript 5.0+ (optional)

## License

MIT
