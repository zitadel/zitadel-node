// Bespoke compatibility shim (listed in .openapi-generator-ignore).
//
// The integration specs assert that every SDK failure — both API responses and
// auth/token-exchange errors — is an `instanceof ZitadelException`. The
// generator emits a single typed error base, `ApiError`, that every thrown
// error already extends (status-specific subclasses for API responses; the
// auth layer throws `ApiError` directly on token-exchange failure). Exposing
// `ZitadelException` as that base unifies the two trees so the specs' broad
// `toThrow(ZitadelException)` assertions hold.
export { ApiError as ZitadelException } from "./api-error.js";
