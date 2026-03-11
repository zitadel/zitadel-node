// noinspection ES6PreferShortImport
import { ApiException } from '../src/api-exception.js';

describe('ApiExceptionTest', () => {
  test('testApiException', () => {
    const e = new ApiException(418, { H: ['v'] }, 'body');
    expect(e.message).toBe('Error 418');
    expect(e.getCode()).toBe(418);
    expect(e.getResponseHeaders()).toEqual({ H: ['v'] });
    expect(e.getResponseBody()).toBe('body');
  });
});
