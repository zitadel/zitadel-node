// Bespoke compatibility shim (listed in .openapi-generator-ignore).
//
// The integration specs are written against an `ApiException` raised by every
// failing API call. The generator emits a typed error hierarchy rooted at
// `ApiError` (with status-specific subclasses such as `NotFoundError`), so the
// SDK's public `ApiException` is simply that generated base class re-exported
// under the name the specs expect. Every API error the SDK throws is therefore
// `instanceof ApiException`.
export { ApiError as ApiException } from "./api-error.js";
