# Zitadel SDK SDK - AI Agent Reference

## Installation

Install the SDK as a dependency in your project. If published to npm, use:

```bash
npm install <package-name>
```

If using locally, add it as a file dependency in your `package.json`.

## Quick Start

```typescript
import { Client } from "./src/client";

const client = Client.withToken("https://api.example.com", "your-token");
```

## Authentication

All authentication is handled via `Authenticator` implementations passed to the client constructor.

### Bearer Token

```typescript
import { BearerAuthenticator } from "./src/auth/bearer-authenticator";
import { Client } from "./src/client";

const authenticator = new BearerAuthenticator(
  "https://api.example.com",
  "your-token",
);
const client = new Client(authenticator);
```

## Servers

If the OpenAPI spec defines multiple servers, the generated `Servers` class exposes each as a `ServerConfiguration` static property (e.g., `Servers.SERVER_0`, `Servers.SERVER_1`, ...) plus a `Servers.ALL` array. Pass the desired server's URL to the client:

```typescript
import { Servers } from "./src/servers";

const client = Client.withToken(Servers.SERVER_0.url(), "your-token");
```

## Testing

The `Authenticator` interface is the seam for tests: substitute a fake authenticator that returns a known header map, and assert your code calls the API the way you expect.

```typescript
const fake = {
  async getAuthHeaders(_req: RequestContext): Promise<Record<string, string>> {
    return { Authorization: "Bearer test-token" };
  },
  getHost(): string {
    return "https://api.example.com";
  },
};

const client = new Client(fake);
```

## Error Handling

All API errors extend `ApiError`. The error hierarchy is:

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
import { NotFoundError } from "./src/errors/not-found-error";
import { ClientError } from "./src/errors/client-error";
import { ServerError } from "./src/errors/server-error";

try {
  const result = await client.petApi.getPetById(petId);
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
import { TransportOptions } from "./src/transport-options";

const transport = TransportOptions.builder()
  .proxy("http://proxy:3128")
  .timeout(5000)
  .build();

const client = new Client(authenticator, transport);
```

## API Methods

Each API group is exposed as a typed property on the client. API classes have async methods that correspond to OpenAPI operations, accepting typed request parameters and returning typed response models.

All API methods return `Promise` values and should be used with `await`.

## Models

Models are generated as TypeScript classes in the `src/models/` directory.

```typescript
import { Pet } from "./src/models/pet";

const pet = new Pet();
pet.name = "Fido";
pet.status = "available";
```

## Binary / File Uploads

File upload parameters are typed as `Buffer`. Binary response bodies are returned as `Buffer`.

## Comment Style

Never use inline comments (`//`). Always use block comments (`/* ... */`).

```good
/* This explains the logic */
const x = 1;
```

```bad
// This explains the logic
const x = 1;
```
