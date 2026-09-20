# Zitadel SDK - AI Agent Reference

## Installation

Install the SDK as a dependency in your project. If published to npm, use:

```bash
npm install @zitadel/client
```

If using locally, add it as a file dependency in your `package.json`.

## Quick Start

```typescript
import { Zitadel } from "./src/zitadel.js";

const client = Zitadel.withToken("https://api.example.com", "your-token");
```

## Authentication

All authentication is handled via `Authenticator` implementations passed to the client constructor.

### Bearer Token

```typescript
import { BearerAuthenticator } from "./src/auth/bearer-authenticator.js";
import { Zitadel } from "./src/zitadel.js";

const authenticator = new BearerAuthenticator(
  "https://api.example.com",
  "your-token",
);
const client = new Zitadel(authenticator);
```

## Servers

If the OpenAPI spec defines multiple servers, the generated `Servers` class exposes each as a `ServerConfiguration` static property (e.g., `Servers.SERVER_0`, `Servers.SERVER_1`, ...) plus a `Servers.ALL` array. Pass the desired server's URL to the client:

```typescript
import { Servers } from "./src/servers.js";

const client = Zitadel.withToken(Servers.SERVER_0.getUrl(), "your-token");
```

## Testing

The `Authenticator` interface is the seam for tests: substitute a fake authenticator that returns a known header map, and assert your code calls the API the way you expect.

```typescript
const fake = {
  getHost(): string {
    return "https://api.example.com";
  },
  getAuthHeaders(): Record<string, string> {
    return { Authorization: "Bearer test-token" };
  },
};

const client = new Zitadel(fake);
```

## Error Handling

All API errors derive from `ApiError`. The error hierarchy is:

- `ApiError` (base)
  - `ClientError` (4xx)
    - `BadRequestError` (400)
    - `UnauthorizedError` (401)
    - `ForbiddenError` (403)
    - `NotFoundError` (404)
    - `ConflictError` (409)
    - `UnprocessableEntityError` (422)
  - `ServerError` (5xx)
    - `InternalServerError` (500)

```typescript
import { NotFoundError } from "./src/errors/not-found-error.js";
import { ClientError } from "./src/errors/client-error.js";
import { ServerError } from "./src/errors/server-error.js";

try {
  const result = await client.actionService.activatePublicKey(/* ... */);
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(`Not found: ${error.message}`);
  } else if (error instanceof ClientError) {
    console.log(`Client error ${error.statusCode}: ${error.message}`);
  } else if (error instanceof ServerError) {
    console.log(`Server error: ${error.message}`);
  }
}
```

## Configuration

### Custom Transport Options

```typescript
import { TransportOptions } from "./src/transport-options.js";

const transport = TransportOptions.builder()
  .proxy("http://proxy:3128")
  .timeout(5000)
  .build();

const client = new Zitadel(authenticator, transport);
```

## API Methods

Each API group is exposed as a typed property on the client (e.g., `client.actionService`). API classes have methods that correspond to OpenAPI operations, accepting typed request parameters and returning typed response models.

All API methods are asynchronous; await the returned `Promise`.

## Models

Models are generated as TypeScript classes in the `src/models/` directory.

```typescript
import { ActionServiceActivatePublicKeyRequest } from "./src/models/action-service-activate-public-key-request.js";

const model = new ActionServiceActivatePublicKeyRequest();
```

## Binary / File Uploads

File upload parameters are typed as `Buffer`. Binary response bodies are returned as `Buffer`.

## Comment Style

Never place a comment on the same line as code. Use block comments (`/* ... */`); JSDoc (`/** ... */`) is fine.

```good
/* This explains the logic */
const x = 1;
```

```bad
// This explains the logic
const x = 1;
```
