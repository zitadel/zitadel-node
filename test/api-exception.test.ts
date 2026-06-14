// noinspection ES6PreferShortImport
import { ApiException } from "../src/api-exception.js";

describe("ApiExceptionTest", () => {
  test("testApiException", () => {
    const e = new ApiException(418, "Error 418", { H: "v" }, "body");
    expect(e.message).toBe("Error 418");
    expect(e.statusCode).toBe(418);
    expect(e.responseHeaders).toEqual({ H: "v" });
    expect(e.responseBody).toBe("body");
  });
});
